import fetch from 'node-fetch';
import dotenv from 'dotenv';
dotenv.config();

const NVIDIA_API_KEY = process.env.NVIDIA_API_KEY;
const API_URL = 'https://integrate.api.nvidia.com/v1/chat/completions';

const PRIMARY_MODEL = 'minimaxai/minimax-m2.7';
const FALLBACK_MODEL = 'meta/llama-3.3-70b-instruct'; // Fallback si MiniMax falla por timeout

const delay = (ms) => new Promise((res) => setTimeout(res, ms));

// Errors that are transient (server overloaded) — worth retrying same model
const TRANSIENT_CODES = new Set([429, 503, 504]);

export async function callLLM(messages, retries = 5, tools = null) {
  // Try PRIMARY_MODEL for the first (retries - 1) attempts, FALLBACK_MODEL on the last
  for (let attempt = 0; attempt < retries; attempt++) {
    const isLastAttempt = attempt === retries - 1;
    const model = isLastAttempt ? FALLBACK_MODEL : PRIMARY_MODEL;

    try {
      console.log(`LLM attempt ${attempt + 1}/${retries} using model: ${model}`);

      const bodyPayload = {
        model: model,
        messages: messages,
      };

      if (tools && tools.length > 0) {
        bodyPayload.tools = tools;
        bodyPayload.tool_choice = 'auto'; // allow the model to decide when to call tools
      }

      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${NVIDIA_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(bodyPayload)
      });

      // 404 = model not found — permanent error, no point retrying at all
      if (response.status === 404) {
        const errText = await response.text();
        throw new Error(`[FATAL] Nvidia API 404 - model not found: ${errText}`);
      }

      // Transient server errors (overloaded / rate limited) — retry same model
      if (TRANSIENT_CODES.has(response.status)) {
        const backoff = Math.min(Math.pow(2, attempt) * 2000, 30000); // max 30s wait
        console.warn(`Nvidia API ${response.status} (saturated). Retrying in ${backoff / 1000}s... [attempt ${attempt + 1}/${retries}]`);
        await delay(backoff);
        continue;
      }

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Nvidia API error: ${response.status} - ${errText}`);
      }

      const data = await response.json();
      return data.choices[0].message;

    } catch (error) {
      // Re-throw fatal errors immediately
      if (error.message.startsWith('[FATAL]')) throw error;

      console.error(`LLM attempt ${attempt + 1} failed:`, error.message);

      if (isLastAttempt) {
        throw new Error(`All LLM attempts failed after ${retries} tries. Last error: ${error.message}`);
      }

      const backoff = Math.min(Math.pow(2, attempt) * 1500, 20000);
      console.log(`Waiting ${backoff / 1000}s before next attempt...`);
      await delay(backoff);
    }
  }
}
