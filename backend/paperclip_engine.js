import { callLLM } from './llm.js';
import { searchSchema, executeSearch } from './tools/search.js';
import { supabase } from './supabase.js';

export async function runPaperclipTask(task) {
  if (task.task_type === 'society') {
    return await runSocietyPipeline(task);
  } else {
    return await runSimplePipeline(task);
  }
}

async function runSimplePipeline(task) {
  console.log(`[Paperclip Engine - SIMPLE] Iniciando: "${task.name}"`);
  
  const systemPrompt = `Eres un Agente Autónomo. Tu misión es ejecutar tareas en segundo plano. Usa internet si es necesario. Devuelve un informe conciso. Responde en español puro.`;

  let messagesPayload = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: task.description }
  ];

  const tools = [searchSchema];
  let assistantMsg = await callLLM(messagesPayload, 5, tools);
  
  let loopCount = 0;
  while (assistantMsg.tool_calls && loopCount < 4) {
    loopCount++;
    messagesPayload.push(assistantMsg);

    for (const tCall of assistantMsg.tool_calls) {
      if (tCall.function.name === 'search_web') {
         const args = JSON.parse(tCall.function.arguments);
         const result = await executeSearch(args.query);
         messagesPayload.push({ role: 'tool', tool_call_id: tCall.id, name: tCall.function.name, content: result });
      }
    }
    assistantMsg = await callLLM(messagesPayload, 5, tools);
  }

  if (!assistantMsg.content) return "El agente se atascó iterando sin proveer texto puro.";
  console.log(`[Paperclip Engine - SIMPLE] Tarea completada. Generado reporte de ${assistantMsg.content.length} caracteres.`);
  return assistantMsg.content;
}

async function runSocietyPipeline(task) {
  console.log(`[Paperclip Engine - SOCIETY] Iniciando: "${task.name}"`);
  if (!task.doc_id) return "Error crítico: Tarea tipo 'Sociedad' inicializada sin un Documento asignado.";

  // 1. Fetch Document
  const { data: doc } = await supabase.from('workspace_docs').select('*').eq('id', task.doc_id).single();
  if (!doc) return "Error crítico: El documento destino ya no existe.";

  let logOutput = `# Reporte Ejecutivo de Sociedad de Agentes\n\n**Misión:** ${task.description}\n**Documento:** ${doc.title}\n\n`;

  // === FASE 1: INVESTIGADOR ===
  console.log(`[Investigador] Analizando misión...`);
  logOutput += `## Fase 1: Investigación\n`;
  let investigatorMsg = await callLLM([
    { role: 'system', content: `Eres el Investigador G-1. Usa internet para conseguir datos crudos, tendencias web3, tips de hackathons, y novedades relevantes que cumplan la misión. No escribas ensayos, devuelve datos estructurados en español.` },
    { role: 'user', content: `Misión: ${task.description}` }
  ], 5, [searchSchema]);

  let invLoop = 0;
  let invPayload = [
    { role: 'system', content: `Eres el Investigador G-1. Usa internet para conseguir datos crudos, tendencias web3, tips de hackathons, y novedades relevantes que cumplan la misión. No escribas ensayos, devuelve datos estructurados en español.` },
    { role: 'user', content: `Misión: ${task.description}` }
  ];
  while (investigatorMsg.tool_calls && invLoop < 5) {
    invLoop++;
    invPayload.push(investigatorMsg);
    for (const tCall of investigatorMsg.tool_calls) {
      if (tCall.function.name === 'search_web') {
         const args = JSON.parse(tCall.function.arguments);
         const result = await executeSearch(args.query);
         invPayload.push({ role: 'tool', tool_call_id: tCall.id, name: tCall.function.name, content: result });
      }
    }
    investigatorMsg = await callLLM(invPayload, 5, [searchSchema]);
  }
  const rawFacts = investigatorMsg.content || "Se consiguieron datos dispersos o limitados.";
  logOutput += `- El Investigador realizó ${invLoop} búsquedas en la web profunda y extrajo ${rawFacts.length} caracteres de datos técnicos.\n`;

  // === FASE 2: REDACTOR ===
  console.log(`[Redactor] Reescribiendo el archivo Markdown...`);
  logOutput += `## Fase 2: Redacción Crítica\n`;
  let writerMsg = await callLLM(
    [
      { role: 'system', content: `Eres el Redactor Maestro W-2. Eres un experto técnico creando contenido `.md`. Toma el MD actual y módificalo (o extiéndelo) usando los nuevos DATOS DEL INVESTIGADOR. DEBES DEVOLVER EXCLUSIVAMENTE CÓDIGO MARKDOWN FINAL.` },
      { role: 'user', content: `=== DOCUMENTO MD ACTUAL ===\n${doc.content_markdown}\n\n=== DATOS DEL INVESTIGADOR ===\n${rawFacts}\n\nReescribe el documento entero integrando lo nuevo estratégicamente.` }
    ]
  );
  const newMarkdown = writerMsg.content;
  logOutput += `- El Redactor sintetizó los datos y generó una actualización del documento (+${newMarkdown.length} bytes).\n`;

  // === FASE 3: AUDITOR (LLAMA) ===
  console.log(`[Auditor] Evaluando calidad estructural...`);
  logOutput += `## Fase 3: Auditoría y Despliegue\n`;
  let auditorMsg = await callLLM(
    [
      { role: 'system', content: `Eres Auditor A-3, un estricto juez técnico. Evalúa el nuevo documento. Si es de calidad aceptable y aporta valor real a la misión original, devuelve únicamente la palabra "APROBADO". Si la calidad es pobre, genérica o un desastre, devuelve "RECHAZADO" seguido de los motivos.` },
      { role: 'user', content: `Misión original: ${task.description}\n\n=== NUEVO DOCUMENTO REDACTADO ===\n${newMarkdown}` }
    ]
  );

  const auditorVerdict = auditorMsg.content.trim().toUpperCase();
  logOutput += `- Veredicto del Auditor A-3 (Llama/Mixtral): ${auditorVerdict.slice(0, 100)}\n`;

  if (auditorVerdict.startsWith('APROBADO')) {
    // Save to DB
    await supabase.from('workspace_docs').update({ 
      content_markdown: newMarkdown, 
      updated_at: new Date().toISOString() 
    }).eq('id', task.doc_id);
    logOutput += `\n**RESULTADO:** 🎉 Documento ".md" actualizado exitosamente en el Espacio de Trabajo.`;
  } else {
    logOutput += `\n**RESULTADO:** ❌ El Auditor vetó los cambios. El documento no fue alterado. Motivo del fallo adjunto.`;
  }

  return logOutput;
}
