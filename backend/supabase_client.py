import os
from dotenv import load_dotenv
from supabase import create_client, Client
from fastapi import Request, HTTPException

load_dotenv()

SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY") or os.environ.get("SUPABASE_ANON_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("❌ ERROR CRÍTICO: Faltan variables SUPABASE_URL o SUPABASE_KEY en Render!")
    # Usamos dummy values para que Uvicorn no crashee y el servidor web levante
    SUPABASE_URL = "https://placeholder-no-funciona.co"
    SUPABASE_KEY = "placeholder"

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# Auth Dependency for FastAPI
async def verify_token(request: Request):
    token = request.headers.get("x-assistant-token")
    if not token:
        raise HTTPException(status_code=401, detail="Token no proporcionado")
    
    valid_token = os.environ.get("ASSISTANT_TOKEN", "soy_openhandi_secreto")
    
    if token != valid_token:
        raise HTTPException(status_code=401, detail="Token inválido o expirado")
        
    return token
