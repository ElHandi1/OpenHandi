import time
import logging
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional
from supabase_client import supabase, verify_token
from llm_config import get_llm, get_fallback_llm
from routes.system_prompt import SYSTEM_PROMPT
from routes.tools import ALL_TOOLS, TOOLS_MAP

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
        supabase.table("sessions").delete().eq("id", id).execute()
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

        # V3.2 soporta role="system" — usamos system prompt nativo
        messages_dict = [
            {"role": "system", "content": SYSTEM_PROMPT}
        ] + [{"role": m["role"], "content": m["content"]} for m in history_res.data]

        log.info(f"[Chat] Llamando a DeepSeek V3.2 con {len(messages_dict)} msgs. DeepThinking={req.is_deep_thinking}")
        t_llm = time.time()

        try:
            llm = get_llm(is_deep_thinking=req.is_deep_thinking).bind_tools(ALL_TOOLS)
            res = llm.invoke(messages_dict)

            # Agent loop — ejecutar herramientas y re-invocar
            max_loops = 8 if req.is_deep_thinking else 5
            loop_i = 0
            while hasattr(res, "tool_calls") and res.tool_calls and loop_i < max_loops:
                tool_names = [t["name"] for t in res.tool_calls]
                log.info(f"[Chat] Loop {loop_i+1}/{max_loops}: {tool_names}")
                messages_dict.append(res)

                for tc in res.tool_calls:
                    name = tc["name"]
                    tool_fn = TOOLS_MAP.get(name)
                    if tool_fn:
                        log.info(f"[Chat] -> {name}({tc['args']})")
                        messages_dict.append(tool_fn.invoke(tc))
                    else:
                        log.warning(f"[Chat] Herramienta desconocida: {name}")

                res = llm.invoke(messages_dict)
                loop_i += 1

        except Exception as primary_e:
            log.warning(f"[Chat] Modelo primario fallo ({primary_e}), usando fallback...")
            fallback_llm = get_fallback_llm()
            res = fallback_llm.invoke(messages_dict)

        ai_response = res.content
        log.info(f"[Chat] LLM respondio en {time.time()-t_llm:.1f}s | Total: {time.time()-t0:.1f}s")

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
