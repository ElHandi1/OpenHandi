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

@router.post("/")
def process_chat(req: ChatRequest, token: str = Depends(verify_token)):
    try:
        session_id = req.session_id
        
        # Si no hay sesion, crearla
        if not session_id:
            title_res = get_llm().invoke([{"role": "user", "content": f"Resume este mensaje en 3 o 4 palabras: {req.message}"}])
            title = title_res.content.replace('"', '').strip()
            
            session_res = supabase.table("sessions").insert({"title": title}).execute()
            session_id = session_res.data[0]["id"]
            
        # Guardar mensaje del usuario
        supabase.table("messages").insert({
            "session_id": session_id,
            "role": "user",
            "content": req.message
        }).execute()
        
        # Recuperar historial para el contexto
        history_res = supabase.table("messages").select("role, content").eq("session_id", session_id).order("created_at", desc=False).execute()
        
        system_prompt = {
            "role": "system",
            "content": "Eres OpenHandi, un asistente experto y sarcástico construido por 'El Handi'. NUNCA uses chino ni caracteres asiáticos. Habla SIEMPRE en español claro y conciso, usando jerga hacker o tecnológica si aplica. Sé directo."
        }
        
        messages_dict = [system_prompt] + [{"role": m["role"], "content": m["content"]} for m in history_res.data]
        
        try:
            llm = get_llm()
            res = llm.invoke(messages_dict)
        except Exception as primary_e:
            print(f"Primary model failed: {primary_e}. Trying fallback...")
            fallback_llm = get_fallback_llm()
            res = fallback_llm.invoke(messages_dict)
            
        ai_response = res.content
        
        # Guardar respuesta IA
        supabase.table("messages").insert({
            "session_id": session_id,
            "role": "assistant",
            "content": ai_response
        }).execute()
        
        # Actualizar updated_at de la sesion
        supabase.table("sessions").update({"updated_at": "now()"}).eq("id", session_id).execute()
        
        return {
            "session_id": session_id,
            "response": ai_response
        }
    except Exception as e:
        print(f"Chat Error: {e}")
        raise HTTPException(status_code=500, detail="Error de comunicación con el agente (NVIDIA API)")
