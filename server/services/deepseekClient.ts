import OpenAI from "openai";
import { HttpsProxyAgent } from "https-proxy-agent";

let _client: OpenAI | null = null;

export function getDeepseekClient(): OpenAI {
  if (_client) return _client;

  const proxyUrl = process.env.PROXY_URL;
  const options: ConstructorParameters<typeof OpenAI>[0] = {
    baseURL: "https://api.deepseek.com",
    apiKey: process.env.DEEPSEEK_API_KEY,
  };

  if (proxyUrl) {
    (options as any).httpAgent = new HttpsProxyAgent(proxyUrl);
    console.log("[DeepSeek] Using proxy:", proxyUrl.replace(/:\/\/.*@/, "://***@"));
  }

  _client = new OpenAI(options);
  return _client;
}
