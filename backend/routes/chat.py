from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Any
from supabase_client import supabase, verify_token
from llm_config import get_llm, get_fallback_llm

router = APIRouter()

class Message(BaseModel):
    role: str
    content: str
    
class ChatRequest(BaseModel):
    messages: List[Message]
    thread_id: str

@router.post("/")
def process_chat(req: ChatRequest, token: str = Depends(verify_token)):
    try:
        # Convert to LangChain format implicitly by creating the prompt
        # Actually, LangChain's ChatOpenAI accepts dictionaries with role/content!
        messages_dict = [{"role": m.role, "content": m.content} for m in req.messages]
        
        try:
            llm = get_llm()
            res = llm.invoke(messages_dict)
        except Exception as primary_e:
            print(f"Primary model failed: {primary_e}. Trying fallback...")
            fallback_llm = get_fallback_llm()
            res = fallback_llm.invoke(messages_dict)
            
        ai_response = res.content
        
        return {
            "message": {
                "role": "assistant",
                "content": ai_response
            }
        }
    except Exception as e:
        print(f"Chat Error: {e}")
        raise HTTPException(status_code=500, detail="Error de comunicación con el agente (NVIDIA API)")
