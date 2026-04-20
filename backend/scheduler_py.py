import json
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from supabase_client import supabase
from agents.crew_society import execute_society_pipeline
from llm_config import get_llm
from crewai_tools import SerperDevTool

scheduler = AsyncIOScheduler()
search_tool = SerperDevTool()

def run_simple_task(task_id: str, description: str):
    llm = get_llm()
    # Ejecutamos con LLM simple
    try:
        res = llm.invoke(f"Se te ha programado esta tarea bg: {description}. Resuelve y devuelve un resumen. NO uses herramientas, solo tu conocimiento.")
        return res.content
    except Exception as e:
        return f"Error ejecutando simple agente: {e}"

def execute_task(task):
    task_id = task['id']
    name = task['name']
    task_type = task.get('task_type', 'simple')
    description = task['description']
    doc_id = task.get('doc_id')
    
    print(f"[Scheduler] Ejecutando tarea: {name} (Tipo: {task_type})")
    
    try:
        if task_type == 'society':
            result_payload = execute_society_pipeline(task_id, description, doc_id)
        else:
            result_payload = run_simple_task(task_id, description)
            
        res_json = json.dumps({"success": True, "message": "Ejecución finalizada", "payload": result_payload})
        
        supabase.table("cron_logs").insert({
            "task_id": task_id,
            "status": "success",
            "output": res_json
        }).execute()
        
    except Exception as e:
        print(f"[Scheduler] Error en tarea {name}: {e}")
        supabase.table("cron_logs").insert({
            "task_id": task_id,
            "status": "error",
            "error": str(e)
        }).execute()

def sync_tasks_from_db():
    print("[Scheduler] Sincronizando tareas desde Supabase...")
    scheduler.remove_all_jobs()
    
    res = supabase.table("cron_tasks").select("*").eq("enabled", True).execute()
    tasks = res.data
    
    for task in tasks:
        schedule_expr = task['schedule']
        # Convert cron bits to apscheduler equivalent
        parts = schedule_expr.strip().split()
        if len(parts) == 5:
            # minute, hour, day of month, month, day of week
            trigger = CronTrigger(minute=parts[0], hour=parts[1], day=parts[2], month=parts[3], day_of_week=parts[4])
            scheduler.add_job(
                execute_task,
                trigger=trigger,
                args=[task],
                id=task['id'],
                replace_existing=True
            )
            print(f"[Scheduler] Scheduled {task['name']} on {schedule_expr}")
            
async def start_scheduler():
    sync_tasks_from_db()
    scheduler.start()
    
    # Periodically resync if DB changes
    scheduler.add_job(sync_tasks_from_db, 'interval', minutes=1, id='sync_job_from_db', replace_existing=True)
