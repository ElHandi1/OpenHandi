from crewai import Agent, Task, Crew, Process
from crewai_tools import SerperDevTool
from llm_config import get_investigator_llm, get_writer_llm, get_auditor_llm
from supabase_client import supabase

search_tool = SerperDevTool()

def execute_society_pipeline(task_id: str, description: str, doc_id: str):
    # Retrieve Document
    doc_res = supabase.table("workspace_docs").select("*").eq("id", doc_id).single().execute()
    if not doc_res.data:
        return "Error crítico: El documento destino ya no existe."
    
    current_doc = doc_res.data
    
    # Provide strict time awareness to AI
    from datetime import datetime
    current_date = datetime.now().strftime("%d de %B de %Y")
    
    current_year = datetime.now().year
    
    # Define Agents
    investigator = Agent(
        role="Investigador Web Senior Web3",
        goal=f"Buscar en internet datos actualizados de HOY, técnicos y relevantes sobre la misión solicitada en {current_year}.",
        backstory=f"Eres un hacker investigador en ecosistemas Web3. Hoy es **{current_date}**. Tu deber imperativo es buscar datos EXCLUSIVOS de la actualidad (año {current_year}), ignorando sucesos viejos a menos que se pidan. Extraes datos crudos reales, ejemplos y tendencias de hoy. NUNCA uses chino, SIEMPRE comunícate en español.",
        verbose=True,
        allow_delegation=False,
        tools=[search_tool],
        llm=get_investigator_llm()
    )
    
    writer = Agent(
        role="Redactor Maestro Técnico",
        goal="Reescribir el archivo Markdown del usuario utilizando los datos nuevos descubiertos por el investigador.",
        backstory="Eres un Technical Writer experto en documentación de software. Sabes inyectar datos en archivos MD sin destruir su formato estructural. NUNCA uses chino ni caracteres asiáticos. Habla y escribe SIEMPRE en español nativo perfectamente.",
        verbose=True,
        allow_delegation=False,
        llm=get_writer_llm()
    )

    auditor = Agent(
        role="Juez Técnico Implacable",
        goal="Evaluar estrictamente si el nuevo documento redactado cumple con la misión original y aporta verdadero valor.",
        backstory="Eres un CTO exigente. Si el documento tiene formato roto, usa palabras en CHINO, es genérico o dice tonterías, debes RECHAZARLO. Si aporta datos de calidad actuales y está 100% en español, debes dar el veredicto: 'APROBADO'. NUNCA uses chino en tu propia respuesta.",
        verbose=True,
        allow_delegation=False,
        llm=get_auditor_llm()
    )

    
    # Define Tasks
    task_research = Task(
        description=f"Obligatorio: Busca en internet incidentes, noticias o datos ocurridos estrictamente en el año {current_year}. Ignora resultados de 2021, 2022, 2023 o 2024. Misión: '{description}'. Extrae datos duros e insights técnicos de la fecha actual.",
        expected_output="Un listado detallado de datos crudos recientes sobre el tema investigado en español.",
        agent=investigator
    )
    
    task_write = Task(
        description=f"Misión: Toma los datos de {current_year} del Investigador y este archivo Markdown actual:\n\n{current_doc['content_markdown']}\n\nReescríbelo inyectando estratégicamente la nueva info. IMPORTANTE: El texto final DEBE estar 100% en español. NO puede haber ningún caracter chino. Devuelve SÓLO el código markdown válido resultante, sin bloques ``` extra.",
        expected_output="El código Markdown (.md) completamente refactorizado y enriquecido 100% en español puro.",
        agent=writer
    )
    
    task_audit = Task(
        description=f"Evalúa el markdown generado por el Redactor contra la misión original ('{description}'). Verifica que TODO esté en impecable español, sin rastros de caracteres chinos y que la data sea de {current_year}. Si el MD es excelente, tu reporte debe comenzar exactamente con la palabra 'APROBADO'. Si es deficiente, escribe 'RECHAZADO' y los motivos.",
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
