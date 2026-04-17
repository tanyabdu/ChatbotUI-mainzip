import https from "https";

const YANDEX_GPT_URL = "https://llm.api.cloud.yandex.net/foundationModels/v1/completion";

interface YandexMessage {
  role: "system" | "user" | "assistant";
  text: string;
}

interface YandexRequest {
  modelUri: string;
  completionOptions: {
    stream: boolean;
    temperature: number;
    maxTokens: string;
  };
  messages: YandexMessage[];
}

interface YandexResponse {
  result: {
    alternatives: Array<{
      message: { role: string; text: string };
      status: string;
    }>;
    usage: { inputTextTokens: string; completionTokens: string; totalTokens: string };
    modelVersion: string;
  };
}

function callYandexGPT(request: YandexRequest, apiKey: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(request);

    const req = https.request(YANDEX_GPT_URL, {
      method: "POST",
      headers: {
        "Authorization": `Api-Key ${apiKey}`,
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(body),
      },
    }, (res) => {
      let data = "";
      res.on("data", (chunk) => { data += chunk; });
      res.on("end", () => {
        try {
          const parsed: YandexResponse = JSON.parse(data);
          if (res.statusCode !== 200) {
            reject(new Error(`YandexGPT error ${res.statusCode}: ${data}`));
            return;
          }
          const text = parsed.result?.alternatives?.[0]?.message?.text ?? "";
          resolve(text);
        } catch (e) {
          reject(new Error(`YandexGPT parse error: ${data}`));
        }
      });
    });

    req.on("error", (err) => reject(new Error(`YandexGPT request error: ${err.message}`)));
    req.write(body);
    req.end();
  });
}

export class YandexGptClient {
  private apiKey: string;
  private folderId: string;
  private modelUri: string;

  chat: {
    completions: {
      create: (params: {
        model: string;
        messages: Array<{ role: string; content: string }>;
        temperature?: number;
        max_tokens?: number;
        response_format?: { type: string };
      }) => Promise<{ choices: Array<{ message: { content: string } }> }>;
    };
  };

  constructor(apiKey: string, folderId: string) {
    this.apiKey = apiKey;
    this.folderId = folderId;
    this.modelUri = `gpt://${folderId}/yandexgpt/latest`;

    this.chat = {
      completions: {
        create: async (params) => {
          const messages: YandexMessage[] = params.messages.map((m) => ({
            role: m.role as "system" | "user" | "assistant",
            text: m.content,
          }));

          const request: YandexRequest = {
            modelUri: this.modelUri,
            completionOptions: {
              stream: false,
              temperature: params.temperature ?? 0.7,
              maxTokens: String(params.max_tokens ?? 8000),
            },
            messages,
          };

          const text = await callYandexGPT(request, this.apiKey);
          return {
            choices: [{ message: { content: text } }],
          };
        },
      },
    };
  }
}
