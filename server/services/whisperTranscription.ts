import OpenAI, { toFile } from "openai";

export async function transcribeAudio(audioBuffer: Buffer, mimeType: string): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY не настроен");
  }

  const client = new OpenAI({
    apiKey: apiKey,
  });

  const extension = mimeType.includes("webm") ? "webm" : 
                    mimeType.includes("mp4") ? "mp4" :
                    mimeType.includes("mpeg") ? "mp3" :
                    mimeType.includes("wav") ? "wav" :
                    mimeType.includes("ogg") ? "ogg" : "webm";

  try {
    const file = await toFile(audioBuffer, `audio.${extension}`, { type: mimeType });
    
    const response = await client.audio.transcriptions.create({
      model: "whisper-1",
      file: file,
      language: "ru",
    });

    return response.text || "";
  } catch (error: any) {
    console.error("Whisper API error:", error);
    throw new Error(`Ошибка транскрипции: ${error.message}`);
  }
}
