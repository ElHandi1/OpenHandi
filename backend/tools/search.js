import fetch from 'node-fetch';
import * as cheerio from 'cheerio';

export const searchSchema = {
  type: "function",
  function: {
    name: "search_web",
    description: "Realiza una búsqueda en internet para encontrar información actualizada, noticias o investigar un tema que desconoces.",
    parameters: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "La consulta de búsqueda a realizar."
        }
      },
      required: ["query"]
    }
  }
};

export async function executeSearch(query) {
  console.log(`[Tool] Ejecutando search_web con query: "${query}"`);
  try {
    const res = await fetch('https://lite.duckduckgo.com/lite/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      },
      body: `q=${encodeURIComponent(query)}`
    });
    
    if (!res.ok) throw new Error(`DuckDuckGo devolvió estado ${res.status}`);

    const html = await res.text();
    const $ = cheerio.load(html);
    
    // DuckDuckGo Lite muestra resultados tabulares.
    let cleanText = '';
    $('tr').each((i, el) => {
      const rowText = $(el).text().trim().replace(/\s+/g, ' ');
      if (rowText.length > 20 && !rowText.includes('DuckDuckGo')) {
        cleanText += rowText + '\n';
      }
    });

    if (!cleanText.trim()) return "No se encontraron resultados relevantes en la web.";
    
    // Limitar el resultado a unos 3000 caracteres para no saturar la ventana de contexto
    return "Resultados de Búsqueda Web:\n" + cleanText.substring(0, 3000);
  } catch (error) {
    console.error(`[Tool] Error en search_web:`, error.message);
    return `Error al buscar en internet: ${error.message}`;
  }
}
