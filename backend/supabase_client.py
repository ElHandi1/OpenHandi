import os
from dotenv import load_dotenv
from supabase import create_client, Client
from fastapi import Request, HTTPException

load_dotenv()

SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    raise ValueError("Faltan variables de entorno SUPABASE_URL y SUPABASE_KEY")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# Auth Dependency for FastAPI
async def verify_token(request: Request):
    token = request.headers.get("x-assistant-token")
    if not token:
        raise HTTPException(status_code=401, detail="Token no proporcionado")
    
    response = supabase.table("sessions").select("*").eq("token", token).execute()
    if not response.data:
        raise HTTPException(status_code=401, detail="Token inválido o expirado")
        
    return token
