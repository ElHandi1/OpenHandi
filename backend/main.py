import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import asyncio

# Rutas - las importaremos pronto
from routes import chat, tasks, docs

# Configuración del scheduler
from scheduler_py import start_scheduler

load_dotenv()

app = FastAPI(title="OpenHandi Python API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Endpoint Básico
@app.api_route("/", methods=["GET", "HEAD"])
def read_root():
    return {"status": "ok", "message": "OpenHandi API Python corriendo exitosamente"}

# Incluir las rutas
app.include_router(chat.router, prefix="/api/chat", tags=["chat"])
app.include_router(tasks.router, prefix="/api/tasks", tags=["tasks"])
app.include_router(docs.router, prefix="/api/docs", tags=["docs"])

@app.on_event("startup")
async def startup_event():
    print("Iniciando aplicación OpenHandi Python...")
    asyncio.create_task(start_scheduler())

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 3000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)
