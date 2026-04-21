import os
import logging
from dotenv import load_dotenv
from langchain_openai import ChatOpenAI

load_dotenv()
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
log = logging.getLogger("openhandi")

NVIDIA_API_KEY = os.environ.get("NVIDIA_API_KEY")
NVIDIA_BASE = "https://integrate.api.nvidia.com/v1"

def _llm(model: str, max_tokens: int = 1024, timeout: int = 30, temperature: float = 0.7):
    return ChatOpenAI(
        model=model,
        openai_api_base=NVIDIA_BASE,
        openai_api_key=NVIDIA_API_KEY,
        max_tokens=max_tokens,
        request_timeout=timeout,
        temperature=temperature
    )

# Chat Oracle — rapido, en USA
def get_llm():
    return _llm("meta/llama-3.3-70b-instruct", max_tokens=2048, timeout=45)

def get_fallback_llm():
    return _llm("minimaxai/minimax-m2.7", timeout=45)

# Society Agents — especializados por rol
def get_investigator_llm():
    """Llama 3.3 70B: tool use excelente, rapido para buscar en internet"""
    return _llm("meta/llama-3.3-70b-instruct", timeout=60)

def get_writer_llm():
    """Qwen 2.5 72B: el mejor en escritura estructurada y Markdown en español"""
    return _llm("qwen/qwen2.5-72b-instruct", max_tokens=2048, timeout=90, temperature=0.5)

def get_auditor_llm():
    """Llama 3.1 Nemotron Ultra 253B: el modelo definitivo de NVIDIA para razonamiento y critica agentica (basado en 405B)"""
    return _llm("nvidia/llama-3.1-nemotron-ultra-253b-v1", max_tokens=1024, timeout=90, temperature=0.3)
