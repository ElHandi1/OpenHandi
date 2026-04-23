"""Herramientas del agente Deep Researcher v3."""
import os
import asyncio
import logging
import httpx
import pandas as pd
import pandas_ta as ta
from typing import List
from langchain_core.tools import tool

log = logging.getLogger("openhandi")

TAVILY_KEY = lambda: os.environ.get("TAVILY_API_KEY", "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")


# ──────────────────────────────────────────────────
# TOOL 1 — web_search (Tavily Advanced)
# ──────────────────────────────────────────────────
@tool
def web_search(query: str) -> str:
    """Busca informacion actualizada en la web. Usala cuando necesites noticias, articulos, posts, convocatorias de hackathons, o informacion general. Devuelve contenido pre-procesado listo para analizar."""
    try:
        req = httpx.post(
            "https://api.tavily.com/search",
            headers={"Content-Type": "application/json"},
            json={"api_key": TAVILY_KEY(), "query": query, "search_depth": "advanced", "max_results": 10, "include_raw_content": True},
            timeout=15.0
        )
        req.raise_for_status()
        res = req.json()
        results = []
        for v in res.get("results", []):
            raw = v.get("raw_content", v.get("content", ""))
            results.append(f"[{v.get('title')}]\nURL: {v.get('url')}\nContent: {str(raw)[:1200]}")
        if not results:
            return "No se encontraron resultados en Tavily."
        return "\n\n".join(results)
    except Exception as e:
        return f"Error en busqueda Tavily: {str(e)}"


# ──────────────────────────────────────────────────
# TOOL 2 — fetch_url (Tavily Extract)
# ──────────────────────────────────────────────────
@tool
def fetch_url(url: str) -> str:
    """Lee el contenido completo de una URL especifica. Usala cuando un resultado de busqueda sea relevante y necesites leer el articulo/post/issue completo, no solo el snippet."""
    try:
        req = httpx.post(
            "https://api.tavily.com/extract",
            headers={"Content-Type": "application/json"},
            json={"api_key": TAVILY_KEY(), "urls": [url]},
            timeout=20.0
        )
        req.raise_for_status()
        res = req.json()
        results = []
        for v in res.get("results", []):
            content = v.get("raw_content", "")
            results.append(f"URL: {v.get('url')}\nContent:\n{str(content)[:6000]}")
        return "\n\n".join(results) if results else "No se pudo extraer contenido."
    except Exception as e:
        return f"Error extrayendo URL con Tavily: {str(e)}"


# ──────────────────────────────────────────────────
# TOOL 3 — coingecko_api (generico)
# ──────────────────────────────────────────────────
import time

def fetch_coingecko(url: str, params: dict = None):
    """Helper para hacer peticiones a CoinGecko con manejo de rate limit."""
    headers = {"x-cg-demo-api-key": os.environ.get("COINGECKO_API_KEY", "")}
    
    for attempt in range(3):
        response = httpx.get(url, params=params, headers=headers, timeout=15.0)
        if response.status_code == 429:
            wait = int(response.headers.get("Retry-After", 10))
            time.sleep(wait)
            continue
        if response.status_code != 200:
            return {"error": f"CoinGecko returned {response.status_code}", "data": None}
        try:
            data = response.json()
            if not data or isinstance(data, str):
                return {"error": "Empty or invalid response", "data": None}
            return {"error": None, "data": data}
        except Exception:
            return {"error": "Failed to parse JSON", "data": None}
            
    return {"error": "Rate limit exceeded after 3 retries", "data": None}
@tool
def coingecko_api(endpoint: str, params: str = "") -> str:
    """Consulta cualquier endpoint de la API de CoinGecko. endpoint es la ruta despues de /api/v3/ (ej: 'coins/bitcoin', 'search/trending', 'global'). params es un query string opcional (ej: 'vs_currency=usd&days=90')."""
    try:
        url = f"https://api.coingecko.com/api/v3/{endpoint}"
        param_dict = {}
        if params:
            for pair in params.split("&"):
                if "=" in pair:
                    k, v = pair.split("=", 1)
                    param_dict[k] = v
                    
        res = fetch_coingecko(url, param_dict)
        if res["error"]:
            import json
            return json.dumps(res)
            
        import json
        return json.dumps(res["data"], indent=1, default=str)[:8000]
    except Exception as e:
        return f'{{"error": "Error consultando CoinGecko ({endpoint}): {str(e)}", "data": null}}'


# ──────────────────────────────────────────────────
# TOOL 4 — get_technical_analysis (pandas-ta)
# ──────────────────────────────────────────────────
@tool
def get_technical_analysis(coin_id: str) -> str:
    """Obtiene datos OHLCV de 90 dias de CoinGecko y calcula todos los indicadores tecnicos: RSI, EMAs, MACD, Bollinger, Stochastic, ADX, OBV, Fibonacci, volatilidad. coin_id es el ID de CoinGecko (ej: 'bitcoin', 'solana', 'hedera-hashgraph')."""
    try:
        # Fetch OHLCV
        ohlcv_200_url = f"https://api.coingecko.com/api/v3/coins/{coin_id}/ohlc"
        ohlcv_200_res = fetch_coingecko(ohlcv_200_url, {"vs_currency": "usd", "days": "200"})
        ohlcv_90_url = f"https://api.coingecko.com/api/v3/coins/{coin_id}/ohlc"
        ohlcv_90_res = fetch_coingecko(ohlcv_90_url, {"vs_currency": "usd", "days": "90"})
        
        if ohlcv_200_res["error"] or ohlcv_90_res["error"]:
            return f"Error obteniendo OHLCV: {ohlcv_90_res['error'] or ohlcv_200_res['error']}"
            
        raw_200 = ohlcv_200_res["data"]
        raw_90 = ohlcv_90_res["data"]
        if not raw_90 or len(raw_90) < 30:
            return f"Datos OHLCV insuficientes para {coin_id} (menos de 30 días de histórico). El análisis técnico no es aplicable todavía. Salta la Fase 2 y procede directamente con la Fase 3 (Análisis Fundamental) y Fase 4 (Sentimiento)."

        df_200 = pd.DataFrame(raw_200, columns=["timestamp", "open", "high", "low", "close"])
        df_200["timestamp"] = pd.to_datetime(df_200["timestamp"], unit="ms")
        
        df = pd.DataFrame(raw_90, columns=["timestamp", "open", "high", "low", "close"])
        df["timestamp"] = pd.to_datetime(df["timestamp"], unit="ms")

        # Fetch volume separately from market_chart
        vol_url = f"https://api.coingecko.com/api/v3/coins/{coin_id}/market_chart"
        vol_res = fetch_coingecko(vol_url, {"vs_currency": "usd", "days": "90", "interval": "daily"})
        
        vol_data = []
        if not vol_res["error"] and vol_res["data"]:
            vol_data = vol_res["data"].get("total_volumes", [])
        if vol_data and len(vol_data) >= len(df):
            df["volume"] = [v[1] for v in vol_data[:len(df)]]
        else:
            df["volume"] = 0

        lines = [f"=== ANALISIS TECNICO: {coin_id.upper()} (90d) ==="]
        last = df.iloc[-1]
        lines.append(f"Precio actual: ${last['close']:.6f}")

        # RSI
        rsi_s = ta.rsi(df["close"], length=14)
        if rsi_s is not None and len(rsi_s) > 0:
            rsi_val = rsi_s.iloc[-1]
            interp = "SOBRECOMPRADO" if rsi_val > 70 else ("SOBREVENDIDO" if rsi_val < 30 else "NEUTRAL")
            lines.append(f"RSI(14): {rsi_val:.1f} — {interp}")

        # EMAs
        for p in [9, 21, 50]:
            ema_s = ta.ema(df["close"], length=p)
            if ema_s is not None and len(ema_s) > 0:
                val = ema_s.iloc[-1]
                pos = "ARRIBA" if last["close"] > val else "ABAJO"
                lines.append(f"EMA{p}: ${val:.6f} (precio {pos})")
                
        ema_200_s = ta.ema(df_200["close"], length=200)
        if ema_200_s is not None and len(ema_200_s) > 0:
            val_200 = ema_200_s.iloc[-1]
            pos_200 = "ARRIBA" if last["close"] > val_200 else "ABAJO"
            reliable = "Fiable" if len(df_200) >= 200 else "Poco fiable (pocos datos)"
            lines.append(f"EMA200: ${val_200:.6f} (precio {pos_200}) [{reliable}]")

        # MACD
        macd_df = ta.macd(df["close"])
        if macd_df is not None:
            m = macd_df.iloc[-1]
            macd_val = m.get("MACD_12_26_9", 0)
            signal_val = m.get("MACDs_12_26_9", 0)
            hist_val = m.get("MACDh_12_26_9", 0)
            señal = "ALCISTA" if macd_val > signal_val else "BAJISTA"
            lines.append(f"MACD: {macd_val:.6f} | Signal: {signal_val:.6f} | Hist: {hist_val:.6f} — {señal}")

        # Bollinger Bands
        bb = ta.bbands(df["close"], length=20, std=2)
        if bb is not None:
            bbu = bb.iloc[-1].get("BBU_20_2.0", 0)
            bbm = bb.iloc[-1].get("BBM_20_2.0", 0)
            bbl = bb.iloc[-1].get("BBL_20_2.0", 0)
            price = last["close"]
            if price > bbu:
                bb_pos = "SOBRE BANDA SUPERIOR (sobreextendido)"
            elif price < bbl:
                bb_pos = "BAJO BANDA INFERIOR (soporte potencial)"
            else:
                pct = (price - bbl) / (bbu - bbl) * 100 if (bbu - bbl) > 0 else 50
                bb_pos = f"EN BANDA MEDIA ({pct:.0f}% del rango)"
            bw = (bbu - bbl) / bbm * 100 if bbm > 0 else 0
            lines.append(f"Bollinger: U=${bbu:.6f} M=${bbm:.6f} L=${bbl:.6f} | BW={bw:.1f}% | {bb_pos}")

        # Fibonacci
        swing_high = df["high"].max()
        swing_low = df["low"].min()
        diff = swing_high - swing_low
        fib_levels = {
            "23.6%": swing_high - diff * 0.236,
            "38.2%": swing_high - diff * 0.382,
            "50.0%": swing_high - diff * 0.5,
            "61.8%": swing_high - diff * 0.618,
            "78.6%": swing_high - diff * 0.786,
        }
        nearest = min(fib_levels.items(), key=lambda x: abs(x[1] - last["close"]))
        lines.append(f"Fibonacci: High=${swing_high:.6f} Low=${swing_low:.6f} | Nivel mas cercano: {nearest[0]} (${nearest[1]:.6f})")

        # Stochastic
        stoch = ta.stoch(df["high"], df["low"], df["close"])
        if stoch is not None:
            k = stoch.iloc[-1].get("STOCHk_14_3_3", 0)
            d = stoch.iloc[-1].get("STOCHd_14_3_3", 0)
            st_interp = "SOBRECOMPRADO" if k > 80 else ("SOBREVENDIDO" if k < 20 else "NEUTRAL")
            lines.append(f"Stochastic: %K={k:.1f} %D={d:.1f} — {st_interp}")

        # ADX
        adx_df = ta.adx(df["high"], df["low"], df["close"])
        if adx_df is not None:
            adx_val = adx_df.iloc[-1].get("ADX_14", 0)
            strength = "FUERTE" if adx_val > 40 else ("MODERADA" if adx_val > 20 else "DEBIL/LATERAL")
            lines.append(f"ADX(14): {adx_val:.1f} — Tendencia {strength}")

        # OBV
        if df["volume"].sum() > 0:
            obv_s = ta.obv(df["close"], df["volume"])
            if obv_s is not None:
                obv_now = obv_s.iloc[-1]
                obv_prev = obv_s.iloc[-10] if len(obv_s) > 10 else obv_s.iloc[0]
                obv_trend = "ALCISTA" if obv_now > obv_prev else "BAJISTA"
                lines.append(f"OBV: {obv_now:,.0f} (tendencia {obv_trend} vs 10d atras)")

        # Volatilidad
        returns = df["close"].pct_change().dropna()
        if len(returns) > 5:
            vol_30d = returns.tail(30).std() * (365 ** 0.5) * 100
            lines.append(f"Volatilidad 30d anualizada: {vol_30d:.1f}%")

        return "\n".join(lines)
    except Exception as e:
        return f"Error calculando indicadores tecnicos para '{coin_id}': {str(e)}"


# ──────────────────────────────────────────────────
# TOOL 5 — github_search_repos
# ──────────────────────────────────────────────────
@tool
def github_search_repos(query: str) -> str:
    """Busca repositorios en GitHub relacionados con blockchain, hackathons o proyectos Web3. Devuelve los 5 repos mas recientes."""
    headers = {"Accept": "application/vnd.github+json"}
    token = os.environ.get("GITHUB_TOKEN")
    if token:
        headers["Authorization"] = f"Bearer {token}"
    try:
        req = httpx.get(
            f"https://api.github.com/search/repositories?q={query}&sort=updated&order=desc&per_page=5",
            headers=headers, timeout=15.0
        )
        req.raise_for_status()
        items = req.json().get("items", [])
        if not items:
            return "No se encontraron repositorios."
        results = []
        for v in items:
            stars = v.get("stargazers_count", 0)
            lang = v.get("language", "N/A")
            desc = (v.get("description") or "")[:120]
            results.append(f"[{v['full_name']}] ★{stars} | {lang}\n  {desc}\n  URL: {v['html_url']}")
        return "\n\n".join(results)
    except Exception as e:
        return f"Error buscando repos en GitHub: {str(e)}"


# ──────────────────────────────────────────────────
# TOOL 6 — github_search_issues
# ──────────────────────────────────────────────────
@tool
def github_search_issues(query: str) -> str:
    """Busca issues y bugs abiertos en GitHub. Usala para encontrar problemas tecnicos del ecosistema, bugs de SDKs o discusiones relevantes."""
    headers = {"Accept": "application/vnd.github+json"}
    token = os.environ.get("GITHUB_TOKEN")
    if token:
        headers["Authorization"] = f"Bearer {token}"
    try:
        req = httpx.get(
            f"https://api.github.com/search/issues?q={query}+is:issue+is:open&sort=updated&per_page=5",
            headers=headers, timeout=15.0
        )
        req.raise_for_status()
        items = req.json().get("items", [])
        if not items:
            return "No se encontraron issues abiertos."
        results = []
        for v in items:
            title = v.get("title", "")
            url = v.get("html_url", "")
            created = v.get("created_at", "")[:10]
            comments = v.get("comments", 0)
            results.append(f"[{created}] {title} ({comments} comments)\n  URL: {url}")
        return "\n\n".join(results)
    except Exception as e:
        return f"Error buscando issues en GitHub: {str(e)}"


# ──────────────────────────────────────────────────
# TOOL 7 — github_search_code
# ──────────────────────────────────────────────────
@tool
def github_search_code(query: str) -> str:
    """Busca fragmentos de codigo en GitHub. Usala para encontrar implementaciones especificas, uso de SDKs o patrones de codigo en proyectos blockchain."""
    headers = {"Accept": "application/vnd.github+json"}
    token = os.environ.get("GITHUB_TOKEN")
    if token:
        headers["Authorization"] = f"Bearer {token}"
    else:
        return "Error: github_search_code requiere GITHUB_TOKEN (la API de codigo no permite acceso anonimo)."
    try:
        req = httpx.get(
            f"https://api.github.com/search/code?q={query}&per_page=5",
            headers=headers, timeout=15.0
        )
        req.raise_for_status()
        items = req.json().get("items", [])
        if not items:
            return "No se encontro codigo relevante."
        results = []
        for v in items:
            name = v.get("name", "")
            repo = v.get("repository", {}).get("full_name", "")
            url = v.get("html_url", "")
            results.append(f"[{repo}] {name}\n  URL: {url}")
        return "\n\n".join(results)
    except Exception as e:
        return f"Error buscando codigo en GitHub: {str(e)}"


# ──────────────────────────────────────────────────
# TOOL 8 — hackathon_platforms
# ──────────────────────────────────────────────────
@tool
def hackathon_platforms(platform: str = "all") -> str:
    """Consulta plataformas de hackathons para encontrar convocatorias activas, proyectos ganadores y criterios de evaluacion. platform puede ser 'dorahacks', 'devpost', 'devfolio', 'gitcoin' o 'all'."""
    urls_map = {
        "dorahacks": ["https://dorahacks.io/hackathon"],
        "devpost": ["https://devpost.com/hackathons"],
        "devfolio": ["https://devfolio.co/hackathons"],
        "gitcoin": ["https://explorer.gitcoin.co/"],
    }
    if platform == "all":
        urls = [u for lst in urls_map.values() for u in lst]
    else:
        urls = urls_map.get(platform, [u for lst in urls_map.values() for u in lst])

    results = []
    for u in urls:
        results.append(fetch_url.func(u))
    return "\n\n---\n\n".join(results)


# ──────────────────────────────────────────────────
# TOOL 9 — twitter_search
# ──────────────────────────────────────────────────
@tool
def twitter_search(query: str) -> str:
    """Busca posts recientes en X/Twitter sobre hackathons, proyectos blockchain, anuncios de premios o discusiones de la comunidad. Usala para tendencias y convocatorias muy recientes que no aparecen en web."""
    user = os.environ.get("TWITTER_USER")
    password = os.environ.get("TWITTER_PASS")

    async def do_search():
        if not user or not password:
            return web_search.func(f"site:x.com {query}")
        try:
            from twikit import Client
            client = Client("es-ES")
            await client.login(auth_info_1=user, password=password)
            tweets = await client.search_tweet(query, "Latest")
            items = []
            for t in tweets[:5]:
                items.append(f"[@{t.user.screen_name}] {t.text}")
            return "\n\n".join(items) if items else "No se encontraron tweets."
        except Exception:
            return web_search.func(f"site:x.com {query}")

    try:
        loop = asyncio.get_event_loop()
        if loop.is_running():
            import concurrent.futures
            with concurrent.futures.ThreadPoolExecutor() as pool:
                return pool.submit(asyncio.run, do_search()).result(timeout=20)
        return asyncio.run(do_search())
    except Exception:
        return web_search.func(f"site:x.com {query}")


# ──────────────────────────────────────────────────
# Lista de todas las herramientas
# ──────────────────────────────────────────────────
ALL_TOOLS = [
    web_search,
    fetch_url,
    coingecko_api,
    get_technical_analysis,
    github_search_repos,
    github_search_issues,
    github_search_code,
    hackathon_platforms,
    twitter_search,
]

# Mapa nombre -> funcion para el agent loop
TOOLS_MAP = {t.name: t for t in ALL_TOOLS}
