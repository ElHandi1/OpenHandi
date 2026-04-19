import os
from dotenv import load_dotenv
from langchain_openai import ChatOpenAI

load_dotenv()

NVIDIA_API_KEY = os.environ.get("NVIDIA_API_KEY")

# CrewAI uses LangChain LLMs under the hood. 
# We configure ChatOpenAI pointing to NVIDIA's OpenAI-compatible proxy endpoint.
# Primary model: minimaxai/minimax-m2.7
# Fallback model (can be swapped if parsing issues occur): meta/llama-3.3-70b-instruct

def get_llm():
    return ChatOpenAI(
        model="minimaxai/minimax-m2.7",
        openai_api_base="https://integrate.api.nvidia.com/v1",
        openai_api_key=NVIDIA_API_KEY,
        max_tokens=2048
    )

def get_fallback_llm():
    return ChatOpenAI(
        model="meta/llama-3.3-70b-instruct",
        openai_api_base="https://integrate.api.nvidia.com/v1",
        openai_api_key=NVIDIA_API_KEY,
        max_tokens=2048
    )
