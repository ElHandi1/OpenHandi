import uuid
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
from supabase_client import supabase, verify_token
from llm_config import get_llm, get_fallback_llm

router = APIRouter()
    
class ChatRequest(BaseModel):
    message: str
    session_id: Optional[str] = None

@router.get("/verify")
def verify_access(token: str = Depends(verify_token)):
    return {"success": True}

@router.get("/sessions")
def get_sessions(token: str = Depends(verify_token)):
    try:
        res = supabase.table("sessions").select("*").order("updated_at", desc=True).execute()
        return res.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/history")
def get_history(session_id: str, token: str = Depends(verify_token)):
    try:
        res = supabase.table("messages").select("*").eq("session_id", session_id).order("created_at", desc=False).execute()
        return res.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/sessions/{id}")
def delete_session(id: str, token: str = Depends(verify_token)):
    try:
        res = supabase.table("sessions").delete().eq("id", id).execute()
        return {"success": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("")
@router.post("/")
def process_chat(req: ChatRequest, token: str = Depends(verify_token)):
    import time
    t0 = time.time()
    try:
        session_id = req.session_id
        print(f"[Chat] Solicitud recibida. session_id={session_id}")
        
        # Crear sesion con el propio texto como titulo (sin llamada LLM extra)
        if not session_id:
            title = req.message[:50].strip()
            session_res = supabase.table("sessions").insert({"title": title}).execute()
            session_id = session_res.data[0]["id"]
            print(f"[Chat] Nueva sesion creada: {session_id}")
            
        # Guardar mensaje del usuario
        supabase.table("messages").insert({
            "session_id": session_id,
            "role": "user",
            "content": req.message
        }).execute()
        
        # Recuperar historial
        history_res = supabase.table("messages").select("role, content").eq("session_id", session_id).order("created_at", desc=False).execute()
        
        from datetime import datetime
        current_date_str = datetime.now().strftime("%d de %B de %Y")
        
        system_prompt = {
            "role": "system",
            "content": f"Eres OpenHandi, un asistente experto y sarcástico construido por 'El Handi'. Hoy es literalmente {current_date_str}. REGLA ABSOLUTA: Usa ÚNICAMENTE caracteres del alfabeto latino español. PROHIBIDO TOTALMENTE: chino, japonés, coreano, ruso, cirílico, árabe, o cualquier script no-latino. Responde SIEMPRE en español coloquial, conciso y directo. Sé breve: respuestas cortas si la pregunta es corta."
        }
        
        messages_dict = [system_prompt] + [{"role": m["role"], "content": m["content"]} for m in history_res.data]
        
        print(f"[Chat] Llamando al LLM con {len(messages_dict)} mensajes...")
        t_llm = time.time()
        
        try:
            llm = get_llm()
            res = llm.invoke(messages_dict)
        except Exception as primary_e:
            print(f"[Chat] Modelo primario falló ({primary_e}), usando fallback...")
            fallback_llm = get_fallback_llm()
            res = fallback_llm.invoke(messages_dict)
            
        ai_response = res.content
        print(f"[Chat] LLM tardó {time.time()-t_llm:.1f}s | Total hasta ahora: {time.time()-t0:.1f}s")
        
        # Guardar respuesta y actualizar sesion
        supabase.table("messages").insert({
            "session_id": session_id,
            "role": "assistant",
            "content": ai_response
        }).execute()
        supabase.table("sessions").update({"updated_at": "now()"}).eq("id", session_id).execute()
        
        print(f"[Chat] Respuesta total en {time.time()-t0:.1f}s")
        return {
            "session_id": session_id,
            "response": ai_response
        }
    except Exception as e:
        print(f"[Chat] ERROR: {e}")
        raise HTTPException(status_code=500, detail=f"Error del agente: {str(e)}")

