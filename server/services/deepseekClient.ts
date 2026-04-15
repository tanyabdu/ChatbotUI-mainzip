import OpenAI from "openai";
import { HttpsProxyAgent } from "https-proxy-agent";

let _client: OpenAI | null = null;

const useOpenAI = process.env.USE_OPENAI === "true";

export const AI_MODEL = useOpenAI ? "gpt-4o-mini" : "deepseek-chat";

export function getDeepseekClient(): OpenAI {
  if (_client) return _client;

  const proxyUrl = process.env.PROXY_URL;
  const options: ConstructorParameters<typeof OpenAI>[0] = useOpenAI
    ? {
        apiKey: process.env.OPENAI_API_KEY,
      }
    : {
        baseURL: "https://api.deepseek.com",
        apiKey: process.env.DEEPSEEK_API_KEY,
      };

  if (proxyUrl) {
    (options as any).httpAgent = new HttpsProxyAgent(proxyUrl);
    const provider = useOpenAI ? "OpenAI" : "DeepSeek";
    console.log(`[${provider}] Using proxy:`, proxyUrl.replace(/:\/\/.*@/, "://***@"));
  } else {
    const provider = useOpenAI ? "OpenAI" : "DeepSeek";
    console.log(`[${provider}] Direct connection`);
  }

  _client = new OpenAI(options);
  return _client;
}
