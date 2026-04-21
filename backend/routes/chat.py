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
def read_webpage(url: str) -> str:
    """Lee el contenido textual completo de una página web a partir de su URL. Úsala siempre para profundizar en noticias, escándalos o artículos que encontraste en la búsqueda web."""
    try:
        req = httpx.get(f"https://r.jina.ai/{url}", timeout=15.0)
        req.raise_for_status()
        content = req.text
        return content[:8000] + "\n\n[Contenido truncado por longitud...]" if len(content) > 8000 else content
    except Exception as e:
        return f"Error leyendo la URL: {str(e)}"

@tool
def web_search(query: str) -> str:
    """Busca en internet información reciente y devuelve resúmenes junto con sus URLs. Si necesitas el contexto completo, invoca a read_webpage con la URL pertinente."""
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
            if "title" in v and "link" in v:
                results.append(f"[Noticia] {v['title']}\nURL: {v['link']}\n{v.get('snippet', '')}")
                
        for v in res.get("organic", [])[:10]:
            if "title" in v and "link" in v:
                results.append(f"[Web] {v['title']}\nURL: {v['link']}\n{v.get('snippet', '')}")
                
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
    is_deep_thinking: Optional[bool] = False

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
        
        prompt_content = f"Eres OpenHandi, un asistente experto y sarcástico construido por 'El Handi'. Hoy es literalmente {current_date_str}. Tienes las herramientas web_search y read_webpage. Úsalas en cadena para investigar (busca, luego lee el artículo completo de la URL que te interese)."
        if req.is_deep_thinking:
            prompt_content += " MODO DEEP THINKING ACTIVADO: Debes ser extremadamente exhaustivo. Desglosa cada detalle, nombre (ej. ZachXBT), cifra y línea de tiempo de los eventos en un formato largo con encabezados (##) y viñetas. Actúa como un OSINT avanzado elaborando un documento periodístico inmenso y meticuloso. No seas resumido."
        else:
            prompt_content += " Proporciona respuestas claras, estructuradas y detalladas en código Markdown si es necesario. No seas extremadamente extenso a menos que se te pida."
        prompt_content += " REGLA ABSOLUTA: Usa ÚNICAMENTE caracteres latinos. Cero chino ni scripts raros. Escribe en español coloquial nativo."

        system_prompt = {
            "role": "system",
            "content": prompt_content
        }
        
        messages_dict = [system_prompt] + [{"role": m["role"], "content": m["content"]} for m in history_res.data]
        
        log.info(f"[Chat] Llamando al LLM con {len(messages_dict)} mensajes en contexto. DeepThinking={req.is_deep_thinking}")
        t_llm = time.time()
        
        try:
            llm = get_llm(is_deep_thinking=req.is_deep_thinking).bind_tools([web_search, read_webpage])
            res = llm.invoke(messages_dict)
            
            # Agent Loop (hasta 6 ciclos de uso de herramientas si deep thinking)
            max_loops = 6 if req.is_deep_thinking else 3
            loop_i = 0
            while hasattr(res, "tool_calls") and res.tool_calls and loop_i < max_loops:
                log.info(f"[Chat] El modelo llamó a herramientas (ciclo {loop_i+1}): {[t['name'] for t in res.tool_calls]}")
                messages_dict.append(res)
                
                for tool_call in res.tool_calls:
                    if tool_call["name"] == "web_search":
                        log.info(f"[Chat] Buscando en internet: {tool_call['args'].get('query')}")
                        tool_msg = web_search.invoke(tool_call)
                        messages_dict.append(tool_msg)
                    elif tool_call["name"] == "read_webpage":
                        log.info(f"[Chat] Leyendo URL: {tool_call['args'].get('url')}")
                        tool_msg = read_webpage.invoke(tool_call)
                        messages_dict.append(tool_msg)
                
                res = llm.invoke(messages_dict)
                loop_i += 1
                
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

