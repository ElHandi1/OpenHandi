import os
import logging
from dotenv import load_dotenv
from langchain_openai import ChatOpenAI

load_dotenv()
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
log = logging.getLogger("openhandi")

NVIDIA_API_KEY = os.environ.get("NVIDIA_API_KEY")

# Primary: Llama 3.3 70B — rápido, bilingüe pero controlable, hosteado en USA
# Fallback: MiniMax M2.7 — potente pero lento desde Europa/USA

def get_llm():
    return ChatOpenAI(
        model="meta/llama-3.3-70b-instruct",
        openai_api_base="https://integrate.api.nvidia.com/v1",
        openai_api_key=NVIDIA_API_KEY,
        max_tokens=1024,
        request_timeout=30,
        temperature=0.7
    )

def get_fallback_llm():
    return ChatOpenAI(
        model="minimaxai/minimax-m2.7",
        openai_api_base="https://integrate.api.nvidia.com/v1",
        openai_api_key=NVIDIA_API_KEY,
        max_tokens=1024,
        request_timeout=45
    )
