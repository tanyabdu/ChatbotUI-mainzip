import OpenAI from "openai";
import { HttpsProxyAgent } from "https-proxy-agent";

let _client: OpenAI | null = null;

const useMistral = process.env.USE_MISTRAL === "true";
const useOpenAI = process.env.USE_OPENAI === "true";

export const AI_MODEL = useMistral
  ? "mistral-small-latest"
  : useOpenAI
  ? "gpt-4o-mini"
  : "deepseek-chat";

function getProvider() {
  if (useMistral) return "Mistral";
  if (useOpenAI) return "OpenAI";
  return "DeepSeek";
}

export function getDeepseekClient(): OpenAI {
  if (_client) return _client;

  const proxyUrl = process.env.PROXY_URL;
  const provider = getProvider();

  let options: ConstructorParameters<typeof OpenAI>[0];

  if (useMistral) {
    options = {
      baseURL: "https://api.mistral.ai/v1",
      apiKey: process.env.MISTRAL_API_KEY,
    };
  } else if (useOpenAI) {
    options = {
      apiKey: process.env.OPENAI_API_KEY,
    };
  } else {
    options = {
      baseURL: "https://api.deepseek.com",
      apiKey: process.env.DEEPSEEK_API_KEY,
    };
  }

  if (proxyUrl) {
    (options as any).httpAgent = new HttpsProxyAgent(proxyUrl);
    console.log(`[${provider}] Using proxy:`, proxyUrl.replace(/:\/\/.*@/, "://***@"));
  } else {
    console.log(`[${provider}] Direct connection, model: ${AI_MODEL}`);
  }

  _client = new OpenAI(options);
  return _client;
}
