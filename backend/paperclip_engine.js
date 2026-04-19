import { callLLM } from './llm.js';
import { searchSchema, executeSearch } from './tools/search.js';

export async function runPaperclipTask(task) {
  console.log(`[Paperclip Engine] Iniciando ejecución de tarea cron: "${task.name}"`);
  
  const systemPrompt = `Eres un Agente Autónomo de OpenHandi (Orquestación Paperclip). 
Tu misión es ejecutar tareas en segundo plano. Analiza la petición, utiliza la herramienta de búsqueda en internet si necesitas información actualizada, procesa los datos y devuelve un informe conciso y preciso de tus hallazgos. Siempre responde en español puro.`;

  let messagesPayload = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: task.description }
  ];

  const tools = [searchSchema];
  let assistantMsg = await callLLM(messagesPayload, 5, tools);
  
  let loopCount = 0;
  // Bucle del agente: permite explorar internet antes de dar su reporte final
  while (assistantMsg.tool_calls && loopCount < 4) {
    loopCount++;
    messagesPayload.push(assistantMsg);

    for (const tCall of assistantMsg.tool_calls) {
      if (tCall.function.name === 'search_web') {
         const args = JSON.parse(tCall.function.arguments);
         const result = await executeSearch(args.query);
         messagesPayload.push({
           role: 'tool',
           tool_call_id: tCall.id,
           name: tCall.function.name,
           content: result
         });
      }
    }
    assistantMsg = await callLLM(messagesPayload, 5, tools);
  }

  if (!assistantMsg.content) {
     return "La tarea se ejecutó, pero el agente no pudo producir un reporte de texto.";
  }

  console.log(`[Paperclip Engine] Tarea completada. Generado reporte de ${assistantMsg.content.length} caracteres.`);
  return assistantMsg.content;
}
