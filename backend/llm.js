import fetch from 'node-fetch';
import dotenv from 'dotenv';
dotenv.config();

const NVIDIA_API_KEY = process.env.NVIDIA_API_KEY;
const API_URL = 'https://integrate.api.nvidia.com/v1/chat/completions';

const PRIMARY_MODEL = 'minimaxai/minimax-m2.7'; 
const PRIMARY_MODEL_ID = 'minimaxai/minimax-m2.7'; 
const FALLBACK_MODEL = 'nvidia/llama-3.1-nemotron-70b-instruct'; // Fallback available on Nvidia API

const delay = (ms) => new Promise((res) => setTimeout(res, ms));

export async function callLLM(messages, retries = 3) {
  let attempt = 0;
  
  while (attempt < retries) {
    try {
      let model = attempt === 0 ? PRIMARY_MODEL : FALLBACK_MODEL;
      
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${NVIDIA_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: model,
          messages: messages,
          // tools can be injected here
        })
      });

      if (response.status === 429) {
        attempt++;
        const backoff = Math.pow(2, attempt) * 1000;
        console.warn(`Rate limit hit on Nvidia API. Retrying in ${backoff}ms with model fallback...`);
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
      console.error(`LLM Call attempt ${attempt + 1} failed:`, error.message);
      attempt++;
      if (attempt >= retries) {
        throw new Error('All LLM attempts failed');
      }
      await delay(Math.pow(2, attempt) * 1000);
    }
  }
}
