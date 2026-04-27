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
    usage?: { inputTextTokens: string; completionTokens: string; totalTokens: string };
    modelVersion?: string;
  };
}

export type YandexCreateParams = {
  model: string;
  messages: Array<{ role: string; content: string }>;
  temperature?: number;
  max_tokens?: number;
  response_format?: { type: string };
  [key: string]: any;
};

export type YandexCreateOptions = {
  timeout?: number;
  [key: string]: any;
};

export type YandexCompatibleResponse = {
  choices: Array<{ message: { role: string; content: string }; finish_reason: string }>;
};

async function callYandexGPT(
  request: YandexRequest,
  apiKey: string,
  folderId: string,
  timeoutMs: number
): Promise<string> {
  const body = JSON.stringify(request);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let res: Response;
  try {
    res = await fetch(YANDEX_GPT_URL, {
      method: "POST",
      headers: {
        Authorization: `Api-Key ${apiKey}`,
        "Content-Type": "application/json",
        "x-folder-id": folderId,
      },
      body,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }

  if (!res.ok) {
    const errorText = await res.text().catch(() => "unknown");
    throw new Error(`YandexGPT error ${res.status}: ${errorText}`);
  }

  const data: YandexResponse = await res.json();
  const text = data?.result?.alternatives?.[0]?.message?.text;
  if (!text) {
    throw new Error("YandexGPT вернул пустой ответ");
  }
  return text;
}

export class YandexGptClient {
  private apiKey: string;
  private folderId: string;
  private modelUri: string;

  chat: {
    completions: {
      create: (
        params: YandexCreateParams,
        options?: YandexCreateOptions
      ) => Promise<YandexCompatibleResponse>;
    };
  };

  constructor(apiKey: string, folderId: string) {
    this.apiKey = apiKey;
    this.folderId = folderId;
    this.modelUri = `gpt://${folderId}/yandexgpt/latest`;

    this.chat = {
      completions: {
        create: async (params, options) => {
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

          const text = await callYandexGPT(
            request,
            this.apiKey,
            this.folderId,
            options?.timeout ?? 60000
          );

          return {
            choices: [{ message: { role: "assistant", content: text }, finish_reason: "stop" }],
          };
        },
      },
    };
  }
}
