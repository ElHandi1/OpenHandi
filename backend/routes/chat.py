import uuid
import time
import logging
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
from supabase_client import supabase, verify_token
from llm_config import get_llm, get_fallback_llm
import httpx
import os
from langchain_core.tools import tool

@tool
def read_webpage(url: str) -> str:
    """Lee el contenido textual completo de una página web a partir de su URL. Úsala siempre para profundizar en noticias, escándalos o artículos que encontraste en la búsqueda web."""
    try:
        req = httpx.get(f"https://r.jina.ai/{url}", timeout=15.0)
        req.raise_for_status()
        content = req.text
        return content[:8000] + "\n\n[Contenido truncado por longitud...]" if len(content) > 8000 else content
    except Exception as e:
        return f"Error leyendo la URL: {str(e)}"

@tool
def get_token_news(symbol: str, filter: str = "hot") -> str:
    """Obtiene las últimas noticias y sentimiento de un token cripto específico. Úsala cuando el usuario pregunte sobre noticias, rumores o qué está pasando con un token como $OFC, $BTC, $RAVE, etc."""
    try:
        res = httpx.get(
            "https://cryptopanic.com/api/v1/posts/",
            params={
                "auth_token": "free",
                "currencies": symbol.upper(),
                "kind": "news",
                "filter": filter,
                "public": "true"
            },
            timeout=10.0
        )
        res.raise_for_status()
        posts = res.json().get("results", [])
        if not posts:
            return f"No se encontraron noticias para {symbol.upper()} en CryptoPanic."
        items = []
        for p in posts[:10]:
            title = p.get("title", "")
            source = p.get("source", {}).get("title", "")
            url = p.get("url", "")
            published = p.get("published_at", "")[:10]
            votes = p.get("votes", {})
            sentiment = f"bullish:{votes.get('positive',0)} bearish:{votes.get('negative',0)}"
            items.append(f"[{published}] {title} | {source} | {sentiment}\nURL: {url}")
        return "\n\n".join(items)
    except Exception as e:
        return f"Error consultando CryptoPanic: {str(e)}"


@tool
def get_token_data(symbol: str) -> str:
    """Obtiene datos de mercado en tiempo real de un token cripto: precio actual, market cap, volumen 24h, cambio 24h, exchanges donde cotiza. Usa CoinGecko. SIEMPRE llama a esta herramienta cuando el usuario mencione un token con $."""
    try:
        # Step 1: buscar el coin ID por ticker
        search_res = httpx.get(
            "https://api.coingecko.com/api/v3/search",
            params={"query": symbol},
            timeout=10.0
        )
        search_res.raise_for_status()
        coins = search_res.json().get("coins", [])
        if not coins:
            return f"Token '{symbol}' no encontrado en CoinGecko."
        
        # elegir el mas relevante (primero con ticker exacto o el primero)
        coin_id = None
        for c in coins[:5]:
            if c.get("symbol", "").upper() == symbol.upper():
                coin_id = c["id"]
                break
        if not coin_id:
            coin_id = coins[0]["id"]

        # Step 2: datos de mercado completos
        market_res = httpx.get(
            f"https://api.coingecko.com/api/v3/coins/{coin_id}",
            params={
                "localization": "false",
                "tickers": "true",
                "market_data": "true",
                "community_data": "false",
                "developer_data": "false"
            },
            timeout=12.0
        )
        market_res.raise_for_status()
        d = market_res.json()
        md = d.get("market_data", {})

        price = md.get("current_price", {}).get("usd", "N/A")
        mcap = md.get("market_cap", {}).get("usd", "N/A")
        vol24h = md.get("total_volume", {}).get("usd", "N/A")
        change24h = md.get("price_change_percentage_24h", "N/A")
        change7d = md.get("price_change_percentage_7d", "N/A")
        ath = md.get("ath", {}).get("usd", "N/A")
        ath_date = md.get("ath_date", {}).get("usd", "")[:10]
        atl = md.get("atl", {}).get("usd", "N/A")
        supply = md.get("circulating_supply", "N/A")
        total_supply = md.get("total_supply", "N/A")
        rank = d.get("market_cap_rank", "N/A")
        name = d.get("name", symbol)

        # top exchanges
        tickers = d.get("tickers", [])[:5]
        exchanges = ", ".join([t.get("market", {}).get("name", "") for t in tickers if t.get("market")])

        lines = [
            f"### {name} ({symbol.upper()}) — Datos en tiempo real (CoinGecko)",
            f"- **Precio actual:** ${price:,.6f}" if isinstance(price, float) else f"- **Precio actual:** ${price}",
            f"- **Market Cap:** ${mcap:,.0f}" if isinstance(mcap, (int, float)) else f"- **Market Cap:** ${mcap}",
            f"- **Volumen 24h:** ${vol24h:,.0f}" if isinstance(vol24h, (int, float)) else f"- **Volumen 24h:** ${vol24h}",
            f"- **Cambio 24h:** {change24h:.2f}%" if isinstance(change24h, float) else f"- **Cambio 24h:** {change24h}%",
            f"- **Cambio 7d:** {change7d:.2f}%" if isinstance(change7d, float) else f"- **Cambio 7d:** {change7d}%",
            f"- **ATH:** ${ath} (alcanzado {ath_date})",
            f"- **ATL:** ${atl}",
            f"- **Ranking CoinGecko:** #{rank}",
            f"- **Suministro circulante:** {supply:,.0f}" if isinstance(supply, (int, float)) else f"- **Suministro circulante:** {supply}",
            f"- **Suministro total:** {total_supply:,.0f}" if isinstance(total_supply, (int, float)) else f"- **Suministro total:** {total_supply}",
            f"- **Exchanges principales:** {exchanges}" if exchanges else "",
        ]
        return "\n".join(l for l in lines if l)
    except Exception as e:
        return f"Error obteniendo datos de CoinGecko para '{symbol}': {str(e)}"


@tool
def web_search(query: str) -> str:
    """Busca en internet información reciente y devuelve resúmenes junto con sus URLs. Si necesitas el contexto completo, invoca a read_webpage con la URL pertinente."""
    api_key = os.environ.get("SERPER_API_KEY")
    if not api_key:
        return "Internal Error: SERPER_API_KEY no configurada."
    try:
        req = httpx.post(
            "https://google.serper.dev/search",
            headers={"X-API-KEY": api_key, "Content-Type": "application/json"},
            json={"q": query},
            timeout=10.0
        )
        req.raise_for_status()
        res = req.json()
        
        results = []
        for v in res.get("topStories", [])[:5]:
            if "title" in v and "link" in v:
                results.append(f"[Noticia] {v['title']}\nURL: {v['link']}\n{v.get('snippet', '')}")
                
        for v in res.get("organic", [])[:10]:
            if "title" in v and "link" in v:
                results.append(f"[Web] {v['title']}\nURL: {v['link']}\n{v.get('snippet', '')}")
                
        if not results:
            return "No se encontraron resultados en internet."
        return "\n\n".join(results)
    except Exception as e:
        return f"Error en búsqueda: {str(e)}"

log = logging.getLogger("openhandi")


router = APIRouter()
    
class ChatRequest(BaseModel):
    message: str
    session_id: Optional[str] = None
    is_deep_thinking: Optional[bool] = False

@router.get("/verify")
def verify_access(token: str = Depends(verify_token)):
    return {"success": True}

@router.get("/sessions")
def get_sessions(token: str = Depends(verify_token)):
    try:
        res = supabase.table("sessions").select("*").order("updated_at", desc=True).execute()
        return res.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/history")
def get_history(session_id: str, token: str = Depends(verify_token)):
    try:
        res = supabase.table("messages").select("*").eq("session_id", session_id).order("created_at", desc=False).execute()
        return res.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/sessions/{id}")
def delete_session(id: str, token: str = Depends(verify_token)):
    try:
        res = supabase.table("sessions").delete().eq("id", id).execute()
        return {"success": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("")
@router.post("/")
def process_chat(req: ChatRequest, token: str = Depends(verify_token)):
    t0 = time.time()
    try:
        session_id = req.session_id
        log.info(f"[Chat] Solicitud recibida. session_id={session_id}")
        
        if not session_id:
            title = req.message[:50].strip()
            session_res = supabase.table("sessions").insert({"title": title}).execute()
            session_id = session_res.data[0]["id"]
            log.info(f"[Chat] Nueva sesion creada: {session_id}")
            
        supabase.table("messages").insert({
            "session_id": session_id,
            "role": "user",
            "content": req.message
        }).execute()
        
        history_res = supabase.table("messages").select("role, content").eq("session_id", session_id).order("created_at", desc=False).execute()
        
        from datetime import datetime
        current_date_str = datetime.now().strftime("%d de %B de %Y")
        
        prompt_content = f"""Eres OpenHandi, un asistente experto construido por 'El Handi'. Hoy es {current_date_str}.

Tienes cuatro herramientas de investigación:
1. web_search(query) — busca en Google, devuelve URLs y snippets
2. read_webpage(url) — lee el contenido COMPLETO de una página web
3. get_token_news(symbol, filter) — noticias en tiempo real de CryptoPanic para tokens cripto
4. get_token_data(symbol) — datos de mercado en tiempo real de CoinGecko: precio, market cap, volumen 24h, ATH, exchanges

## REGLA OBLIGATORIA PARA TOKENS:
Si el usuario menciona cualquier símbolo de token con $ (como $OFC, $BTC, $RAVE), DEBES ejecutar get_token_data(symbol) Y get_token_news(symbol) ANTES de responder. Nunca respondas con precios, volumen o datos de mercado usando tu conocimiento de entrenamiento. Todo dato numérico sobre tokens DEBE venir de las herramientas. Si una herramienta devuelve error, dílo explícitamente al usuario.

## REGLA ABSOLUTA: CALIDAD DE INVESTIGACIÓN

Cuando el usuario pregunte algo que requiera buscar información actual, tu trabajo NO es resumir titulares. Es investigar como un periodista.

### PROHIBIDO:
- Repetir el mismo hecho con distintas palabras
- Listar puntos que son el mismo punto disfrazado
- Secciones vacías tipo "Cronología" que repiten lo ya dicho
- Responder "hubo manipulación" sin explicar EL MECANISMO EXACTO
- Secciones de "resumen" al final que repiten la intro
- Respuestas que añaden palabras sin añadir hechos nuevos

### OBLIGATORIO:
- Haz MÚLTIPLES búsquedas con ángulos distintos:
  * Búsqueda 1: el evento principal
  * Búsqueda 2: los actores, wallets, empresas, nombres
  * Búsqueda 3: números concretos, fechas exactas, magnitudes
  * Búsqueda 4: consecuencias y estado actual
- Usa read_webpage en 2-3 URLs para extraer el detalle completo
- Para tokens cripto: usa también get_token_news(symbol) para coger el pulso actual

### FORMATO DE RESPUESTA EXIGIDO:
- Cifras exactas (no "subió mucho" sino "subió 11.000% en 9 días")
- Nombres propios (no "un investigador" sino "ZachXBT")
- Mecanismos paso a paso (no "hubo manipulación" sino el flujo completo de wallets y liquidaciones)
- Cronología real con fechas
- Datos on-chain o verificables cuando existan

### ESTÁNDAR MÍNIMO:
Una buena respuesta debe contestar:
  - QUÉ pasó exactamente
  - CÓMO pasó (mecanismo real)
  - QUIÉNES son los actores y qué hicieron
  - CUÁNTO (magnitudes, cifras, impacto)
  - QUÉ pasó después y cómo está ahora

Si no puedes contestar las cinco con datos concretos, busca más. No respondas hasta tenerlos todos.

## REGLA DE ANÁLISIS (no listar, razonar):
Cuando obtengas datos de una herramienta, NO los copies directamente. Interprétalos.
Aquí tienes el estándar de calidad que se exige. Compara los dos ejemplos:

❌ PROHIBIDO (descriptivo):
"El precio de $OFC es $0.05. El volumen 24h es $19M. El supply es 16% del total."

✅ OBLIGATORIO (analítico):
"$OFC cotiza a ~$0.05 con una market cap de $8M pero su FDV es $49M — solo circula el 16% del supply, lo que implica una dilución potencial de 6x si el resto sale al mercado. El volumen de $19M-$34M en 24h supone un 250-350% de la market cap: eso es actividad puramente especulativa, no adopción real. El ATH fue $0.089 el 9 de abril; desde entonces bajó más del 40%. Sin noticias en CryptoPanic: el movimiento no tiene ningún catalizador fundamental, lo que lo hace frágil."

Aplica siempre este patrón:
- FDV >> market cap → riesgo de dilución, calculado como ratio
- Vol/mcap > 100% → especulación, no adopción
- Sin noticias + movimiento de precio → whale manipulation probable
- ATH reciente + caída fuerte → pump and dump, indicar % de caída exacto
- Exchanges desconocidos o pocos → liquidez frágil, controlada por whales

Sé directo y lacónico. Un párrafo bien construido vale más que cinco puntos vacíos."""

        if req.is_deep_thinking:
            prompt_content += """

MODO DEEP THINKING ACTIVO: Lee 3-5 artículos completos. Usa encabezados (##), viñetas, cronología real. Mínimo 800 palabras con todos los detalles extraídos."""

        prompt_content += """

REGLA FINAL: Solo caracteres latinos. Cero chino, cirílico, árabe. Escribe en español coloquial nativo."""

        system_prompt = {
            "role": "system",
            "content": prompt_content
        }
        
        messages_dict = [system_prompt] + [{"role": m["role"], "content": m["content"]} for m in history_res.data]
        
        log.info(f"[Chat] Llamando al LLM con {len(messages_dict)} mensajes en contexto. DeepThinking={req.is_deep_thinking}")
        t_llm = time.time()
        
        try:
            llm = get_llm(is_deep_thinking=req.is_deep_thinking).bind_tools([web_search, read_webpage, get_token_news, get_token_data])
            res = llm.invoke(messages_dict)
            
            # Agent Loop
            max_loops = 6 if req.is_deep_thinking else 4
            loop_i = 0
            while hasattr(res, "tool_calls") and res.tool_calls and loop_i < max_loops:
                log.info(f"[Chat] Herramientas ciclo {loop_i+1}: {[t['name'] for t in res.tool_calls]}")
                messages_dict.append(res)
                
                for tool_call in res.tool_calls:
                    name = tool_call["name"]
                    if name == "web_search":
                        log.info(f"[Chat] web_search: {tool_call['args'].get('query')}")
                        messages_dict.append(web_search.invoke(tool_call))
                    elif name == "read_webpage":
                        log.info(f"[Chat] read_webpage: {tool_call['args'].get('url')}")
                        messages_dict.append(read_webpage.invoke(tool_call))
                    elif name == "get_token_news":
                        log.info(f"[Chat] get_token_news: {tool_call['args'].get('symbol')}")
                        messages_dict.append(get_token_news.invoke(tool_call))
                    elif name == "get_token_data":
                        log.info(f"[Chat] get_token_data: {tool_call['args'].get('symbol')}")
                        messages_dict.append(get_token_data.invoke(tool_call))
                
                res = llm.invoke(messages_dict)
                loop_i += 1
                
        except Exception as primary_e:
            log.warning(f"[Chat] Modelo primario falló ({primary_e}), usando fallback...")
            fallback_llm = get_fallback_llm()
            res = fallback_llm.invoke(messages_dict)
            
        ai_response = res.content
        log.info(f"[Chat] LLM respondió en {time.time()-t_llm:.1f}s | Total: {time.time()-t0:.1f}s")
        
        supabase.table("messages").insert({
            "session_id": session_id,
            "role": "assistant",
            "content": ai_response
        }).execute()
        supabase.table("sessions").update({"updated_at": "now()"}).eq("id", session_id).execute()
        
        return {
            "session_id": session_id,
            "response": ai_response
        }
    except Exception as e:
        log.error(f"[Chat] ERROR: {e}")
        raise HTTPException(status_code=500, detail=f"Error del agente: {str(e)}")

