from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from pydantic import BaseModel
from typing import Optional
from supabase_client import supabase, verify_token
from scheduler_py import execute_task

router = APIRouter()

class TaskCreate(BaseModel):
    name: str
    description: str
    schedule: str
    task_type: Optional[str] = "simple"
    doc_id: Optional[str] = None

@router.get("/")
def get_tasks(token: str = Depends(verify_token)):
    try:
        res = supabase.table("cron_tasks").select("*").order("created_at", desc=True).execute()
        return res.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/")
def create_task(task: TaskCreate, token: str = Depends(verify_token)):
    try:
        res = supabase.table("cron_tasks").insert({
            "name": task.name,
            "description": task.description,
            "schedule": task.schedule,
            "task_type": task.task_type,
            "doc_id": task.doc_id,
            "is_active": True
        }).execute()
        
        # Sincronizar scheduler después de crear tarea
        from scheduler_py import sync_tasks_from_db
        sync_tasks_from_db()
        
        return res.data[0]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/{id}")
def delete_task(id: str, token: str = Depends(verify_token)):
    try:
        supabase.table("cron_logs").delete().eq("task_id", id).execute()
        res = supabase.table("cron_tasks").delete().eq("id", id).execute()
        return {"success": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/{id}/toggle")
def toggle_task(id: str, token: str = Depends(verify_token)):
    try:
        task_res = supabase.table("cron_tasks").select("is_active").eq("id", id).single().execute()
        if not task_res.data:
            raise HTTPException(status_code=404, detail="Task no encontrada")
        new_state = not task_res.data["is_active"]
        res = supabase.table("cron_tasks").update({"is_active": new_state}).eq("id", id).execute()
        
        # Sincronizar scheduler después de modificar estado
        from scheduler_py import sync_tasks_from_db
        sync_tasks_from_db()
        
        return res.data[0]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
        
@router.post("/{id}/run")
def trigger_task_run(id: str, background_tasks: BackgroundTasks, token: str = Depends(verify_token)):
    try:
        task_res = supabase.table("cron_tasks").select("*").eq("id", id).single().execute()
        if not task_res.data:
            raise HTTPException(status_code=404, detail="Task no encontrada")
            
        task_data = task_res.data
        # Ejecutar en segundo plano para no bloquear el request de la interfaz
        background_tasks.add_task(execute_task, task_data)
        
        return {"success": True, "message": "Ejecución iniciada en background"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{id}/logs")
def get_task_logs(id: str, token: str = Depends(verify_token)):
    try:
        res = supabase.table("cron_logs").select("*").eq("task_id", id).order("executed_at", desc=True).limit(50).execute()
        return res.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
