import OpenAI from "openai";
import { HttpsProxyAgent } from "https-proxy-agent";
import { YandexGptClient } from "./yandexGptClient";

let _client: OpenAI | YandexGptClient | null = null;

const useYandex = process.env.USE_YANDEX === "true";
const useMistral = process.env.USE_MISTRAL === "true";
const useOpenAI = process.env.USE_OPENAI === "true";

export const AI_MODEL = useYandex
  ? "yandexgpt-latest"
  : useMistral
  ? "mistral-small-latest"
  : useOpenAI
  ? "gpt-4o-mini"
  : "deepseek-chat";

function getProvider() {
  if (useYandex) return "YandexGPT";
  if (useMistral) return "Mistral";
  if (useOpenAI) return "OpenAI";
  return "DeepSeek";
}

export function getDeepseekClient(): OpenAI | YandexGptClient {
  if (_client) return _client;

  const provider = getProvider();

  if (useYandex) {
    const apiKey = process.env.YANDEX_GPT_API_KEY;
    const folderId = process.env.YANDEX_FOLDER_ID;
    if (!apiKey) throw new Error("YANDEX_GPT_API_KEY не настроен");
    if (!folderId) throw new Error("YANDEX_FOLDER_ID не настроен");
    console.log(`[${provider}] Direct connection, model: ${AI_MODEL}`);
    _client = new YandexGptClient(apiKey, folderId);
    return _client;
  }

  const proxyUrl = process.env.PROXY_URL;
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
