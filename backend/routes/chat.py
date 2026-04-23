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
            
            import re
            from langchain_core.messages import ToolMessage
            
            while loop_i < max_loops:
                native_calls = getattr(res, "tool_calls", [])
                content = res.content or ""
                
                # Buscar tool calls manuales (DeepSeek V3.2 suele hacer esto en NIM)
                fake_calls = []
                # Formato 1: [TOOL_CALL] {tool => "...", args => {...}} [/TOOL_CALL]
                matches = re.finditer(r'\[TOOL_CALL\]\s*\{tool\s*=>\s*"([^"]+)",\s*args\s*=>\s*\{(.*?)\}\}\s*\[/TOOL_CALL\]', content, re.DOTALL)
                for i, m in enumerate(matches):
                    t_name = m.group(1)
                    t_args_str = m.group(2)
                    args_dict = {}
                    arg_matches = re.finditer(r'--(\w+)\s+"([^"]+)"', t_args_str)
                    for am in arg_matches:
                        k = am.group(1)
                        v = am.group(2)
                        # Parches de auto-corrección para alucinaciones comunes de DeepSeek
                        if t_name == "coingecko_api":
                            if k == "method": k = "endpoint"
                            if k == "query" and "params" not in args_dict: k = "params"
                            if k == "params" and v and "=" not in v: v = f"query={v}"
                        args_dict[k] = v
                    fake_calls.append({"name": t_name, "args": args_dict, "id": f"call_fake_{loop_i}_{len(fake_calls)}"})

                # Formato 2: JSON puro usando contador de llaves para soportar anidamiento
                import json
                # Busca cualquier { que contenga "name" o "tool" como primera key
                json_starts = re.finditer(r'\{(?=\s*"(?:name|tool)")', content)
                for match in json_starts:
                    start = match.start()
                    depth = 0
                    for i, char in enumerate(content[start:]):
                        if char == '{': depth += 1
                        elif char == '}': depth -= 1
                        if depth == 0:
                            candidate = content[start:start + i + 1]
                            try:
                                parsed = json.loads(candidate)
                                t_name = parsed.get("name") or parsed.get("tool")
                                t_args = parsed.get("parameters") or parsed.get("args") or parsed.get("arguments", {})
                                
                                if t_name:
                                    if t_name == "coingecko_api":
                                        if "method" in t_args: t_args["endpoint"] = t_args.pop("method")
                                        if "query" in t_args and "params" not in t_args:
                                            q_val = t_args.pop("query")
                                            t_args["params"] = f"query={q_val}" if "=" not in q_val else q_val
                                    fake_calls.append({"name": t_name, "args": t_args, "id": f"call_fake_json_{loop_i}_{len(fake_calls)}"})
                            except Exception:
                                pass
                            break

                # Formato 3: Minimax XML <invoke name="web_search"> <parameter name="query">...</parameter> </invoke>
                minimax_matches = re.finditer(r'<invoke\s+name="([^"]+)">\s*(.*?)\s*</invoke>', content, re.DOTALL)
                for m in minimax_matches:
                    t_name = m.group(1)
                    params_str = m.group(2)
                    args_dict = {}
                    param_matches = re.finditer(r'<parameter\s+name="([^"]+)">(.*?)</parameter>', params_str, re.DOTALL)
                    for pm in param_matches:
                        args_dict[pm.group(1)] = pm.group(2)
                        
                    if t_name == "coingecko_api":
                        if "method" in args_dict: args_dict["endpoint"] = args_dict.pop("method")
                        if "query" in args_dict and "params" not in args_dict:
                            q_val = args_dict.pop("query")
                            args_dict["params"] = f"query={q_val}" if "=" not in q_val else q_val
                            
                    fake_calls.append({"name": t_name, "args": args_dict, "id": f"call_fake_mmx_{loop_i}_{len(fake_calls)}"})

                all_calls = native_calls + fake_calls
                
                if not all_calls:
                    break

                if fake_calls:
                    # LangChain y OpenAI fallan si hay un ToolMessage sin un AIMessage previo con tool_calls reales.
                    # Reconstruimos el AIMessage inyectando los tool_calls falsos como reales.
                    from langchain_core.messages import AIMessage
                    res = AIMessage(
                        content=res.content,
                        tool_calls=all_calls,
                        id=res.id if hasattr(res, "id") else None
                    )

                tool_names = [t["name"] for t in all_calls]
                log.info(f"[Chat] Loop {loop_i+1}/{max_loops}: {tool_names} (Nativos: {len(native_calls)}, Fake: {len(fake_calls)})")
                messages_dict.append(res)

                for tc in all_calls:
                    name = tc["name"]
                    tool_fn = TOOLS_MAP.get(name)
                    if tool_fn:
                        log.info(f"[Chat] -> {name}({tc['args']})")
                        try:
                            # Ahora pasamos el dict a invoke() y creamos ToolMessage con el tool_call_id correcto
                            ans = tool_fn.invoke(tc["args"])
                            messages_dict.append(ToolMessage(content=str(ans), tool_call_id=tc.get("id"), name=name))
                        except Exception as e:
                            log.error(f"[Chat] Error en tool {name}: {e}")
                            err_msg = ToolMessage(content=f"Error: {str(e)}", tool_call_id=tc.get("id", "unknown"), name=name)
                            messages_dict.append(err_msg)
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
