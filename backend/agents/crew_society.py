from crewai import Agent, Task, Crew, Process
from langchain_community.tools.ddg_search import DuckDuckGoSearchRun
from llm_config import get_llm
from supabase_client import supabase

ddg_search = DuckDuckGoSearchRun()
llm = get_llm()

def execute_society_pipeline(task_id: str, description: str, doc_id: str):
    # Retrieve Document
    doc_res = supabase.table("workspace_docs").select("*").eq("id", doc_id).single().execute()
    if not doc_res.data:
        return "Error crítico: El documento destino ya no existe."
    
    current_doc = doc_res.data
    
    # Define Agents
    investigator = Agent(
        role="Investigador Web Senior Web3",
        goal="Buscar en internet datos actualizados, técnicos y relevantes sobre la misión solicitada.",
        backstory="Eres un hacker investigador en ecosistemas Web3. Estás encargado de sacar datos crudos reales, ejemplos y tendencias.",
        verbose=True,
        allow_delegation=False,
        tools=[ddg_search],
        llm=llm
    )
    
    writer = Agent(
        role="Redactor Maestro Técnico",
        goal="Reescribir el archivo Markdown del usuario utilizando los datos nuevos descubiertos por el investigador.",
        backstory="Eres un Technical Writer experto en documentación de software. Sabes inyectar datos en archivos MD sin destruir su formato estructural.",
        verbose=True,
        allow_delegation=False,
        llm=llm
    )

    auditor = Agent(
        role="Juez Técnico Implacable",
        goal="Evaluar estrictamente si el nuevo documento redactado cumple con la misión original y aporta verdadero valor.",
        backstory="Eres un CTO exigente. Si el documento tiene formato roto, es genérico o dice tonterías, debes RECHAZARLO. Si aporta datos de calidad, debes dar el veredicto: 'APROBADO'.",
        verbose=True,
        allow_delegation=False,
        llm=llm
    )
    
    # Define Tasks
    task_research = Task(
        description=f"Busca en internet la siguiente misión: '{description}'. Extrae datos duros e insights técnicos.",
        expected_output="Un listado detallado de datos crudos sobre el tema investigado.",
        agent=investigator
    )
    
    task_write = Task(
        description=f"Misión: Toma los datos del Investigador y este archivo Markdown actual:\n\n{current_doc['content_markdown']}\n\nReescríbelo inyectando estratégicamente la nueva info. IMPORTANTE: Devuelve SÓLO el código markdown válido resultante, sin bloques ``` extra.",
        expected_output="El código Markdown (.md) completamente refactorizado y enriquecido.",
        agent=writer
    )
    
    task_audit = Task(
        description=f"Evalúa el markdown generado por el Redactor contra la misión original ('{description}'). Si el MD es excelente, tu reporte debe comenzar exactamente con la palabra 'APROBADO' y el porqué. Si es deficiente, escribe 'RECHAZADO' y los motivos.",
        expected_output="Un veredicto claro comenzando por APROBADO o RECHAZADO, seguido de los comentarios técnicos.",
        agent=auditor
    )
    
    # Orchestrate Crew
    crew = Crew(
        agents=[investigator, writer, auditor],
        tasks=[task_research, task_write, task_audit],
        process=Process.sequential,
        verbose=True
    )
    
    # Kickoff
    result = crew.kickoff()
    
    # Compile Log format similar to the previous custom system for visual compatibility
    logOutput = f"# Reporte Ejecutivo de CrewAI Society\n\n**Misión:** {description}\n**Documento:** {current_doc['title']}\n\n"
    
    logOutput += "## Fase 1 y 2: Descubrimiento y Redacción Autonoma\n"
    logOutput += f"CrewAI ejecutó exitosamente a los Agentes Investigador y Redactor.\n\n"
    
    auditor_verdict = task_audit.output.raw if hasattr(task_audit.output, 'raw') else str(task_audit.output)
    new_markdown = task_write.output.raw if hasattr(task_write.output, 'raw') else str(task_write.output)
    
    logOutput += "## Fase 3: Auditoría y Despliegue\n"
    logOutput += f"- Veredicto del Auditor (CrewAI): {auditor_verdict[:150]}...\n"
    
    if "APROBADO" in auditor_verdict.upper():
        supabase.table('workspace_docs').update({
            "content_markdown": new_markdown
        }).eq('id', doc_id).execute()
        logOutput += "\n**RESULTADO:** 🎉 Documento '.md' actualizado exitosamente por CrewAI."
    else:
        logOutput += "\n**RESULTADO:** ❌ El Auditor vetó los cambios. El documento no fue alterado."
        
    return logOutput
