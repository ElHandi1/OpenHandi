import uuid
import time
import logging
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
from supabase_client import supabase, verify_token
from llm_config import get_llm, get_fallback_llm
import httpx
import os
from langchain_core.tools import tool

@tool
def web_search(query: str) -> str:
    """Busca en internet información reciente, eventos actuales, noticias, o datos posteriores a tu fecha de corte."""
    api_key = os.environ.get("SERPER_API_KEY")
    if not api_key:
        return "Internal Error: SERPER_API_KEY no configurada."
    try:
        req = httpx.post(
            "https://google.serper.dev/search",
            headers={"X-API-KEY": api_key, "Content-Type": "application/json"},
            json={"q": query},
            timeout=10.0
        )
        req.raise_for_status()
        res = req.json()
        
        results = []
        for v in res.get("topStories", [])[:5]:
            if "title" in v and "snippet" in v:
                results.append(f"[Noticia] {v['title']}: {v['snippet']}")
                
        for v in res.get("organic", [])[:10]:
            if "title" in v and "snippet" in v:
                results.append(f"[Web] {v['title']}: {v['snippet']}")
                
        if not results:
            return "No se encontraron resultados en internet."
        return "\n\n".join(results)
    except Exception as e:
        return f"Error en búsqueda: {str(e)}"

log = logging.getLogger("openhandi")


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
    t0 = time.time()
    try:
        session_id = req.session_id
        log.info(f"[Chat] Solicitud recibida. session_id={session_id}")
        
        if not session_id:
            title = req.message[:50].strip()
            session_res = supabase.table("sessions").insert({"title": title}).execute()
            session_id = session_res.data[0]["id"]
            log.info(f"[Chat] Nueva sesion creada: {session_id}")
            
        supabase.table("messages").insert({
            "session_id": session_id,
            "role": "user",
            "content": req.message
        }).execute()
        
        history_res = supabase.table("messages").select("role, content").eq("session_id", session_id).order("created_at", desc=False).execute()
        
        from datetime import datetime
        current_date_str = datetime.now().strftime("%d de %B de %Y")
        
        system_prompt = {
            "role": "system",
            "content": f"Eres OpenHandi, un asistente experto y sarcástico construido por 'El Handi'. Hoy es literalmente {current_date_str}. Tienes la herramienta web_search para buscar en internet; úsala exhaustivamente, puedes investigar muy a fondo si el tema lo requiere como un auténtico hacker u OSINT. Si el usuario pregunta por controversias, escándalos, investigaciones o noticias, trae el chisme completo: detalles, cifras exactas, personas involucradas (actores de la industria, investigadores como ZachXBT), fechas y contextos. NO seas perezoso. REGLA ABSOLUTA: Usa ÚNICAMENTE caracteres del alfabeto latino español. PROHIBIDO TOTALMENTE: chino, japonés, coreano, ruso, cirílico, árabe, o cualquier script no-latino. Escribe en español coloquial nativo, siendo analítico y aportando mucho valor en profundidad."
        }
        
        messages_dict = [system_prompt] + [{"role": m["role"], "content": m["content"]} for m in history_res.data]
        
        log.info(f"[Chat] Llamando al LLM con {len(messages_dict)} mensajes en contexto...")
        t_llm = time.time()
        
        try:
            llm = get_llm().bind_tools([web_search])
            res = llm.invoke(messages_dict)
            
            if hasattr(res, "tool_calls") and res.tool_calls:
                log.info(f"[Chat] El modelo llamó a las siguientes herramientas: {res.tool_calls}")
                messages_dict.append(res)
                
                for tool_call in res.tool_calls:
                    if tool_call["name"] == "web_search":
                        log.info(f"[Chat] Buscando en internet: {tool_call['args'].get('query')}")
                        tool_msg = web_search.invoke(tool_call)
                        messages_dict.append(tool_msg)
                
                log.info("[Chat] Re-invocando el modelo con los resultados de la búsqueda...")
                res = llm.invoke(messages_dict)
                
        except Exception as primary_e:
            log.warning(f"[Chat] Modelo primario falló ({primary_e}), usando fallback...")
            fallback_llm = get_fallback_llm()
            res = fallback_llm.invoke(messages_dict)
            
        ai_response = res.content
        log.info(f"[Chat] LLM respondió en {time.time()-t_llm:.1f}s | Total: {time.time()-t0:.1f}s")
        
        supabase.table("messages").insert({
            "session_id": session_id,
            "role": "assistant",
            "content": ai_response
        }).execute()
        supabase.table("sessions").update({"updated_at": "now()"}).eq("id", session_id).execute()
        
        return {
            "session_id": session_id,
            "response": ai_response
        }
    except Exception as e:
        log.error(f"[Chat] ERROR: {e}")
        raise HTTPException(status_code=500, detail=f"Error del agente: {str(e)}")

