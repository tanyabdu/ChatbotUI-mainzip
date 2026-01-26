import https from "https";

export async function transcribeAudio(audioBuffer: Buffer, mimeType: string): Promise<string> {
  const apiKey = process.env.YANDEX_SPEECHKIT_API_KEY;
  const folderId = process.env.YANDEX_FOLDER_ID;
  
  if (!apiKey) {
    throw new Error("YANDEX_SPEECHKIT_API_KEY не настроен");
  }
  
  if (!folderId) {
    throw new Error("YANDEX_FOLDER_ID не настроен");
  }

  const format = mimeType.includes("webm") ? "oggopus" : 
                 mimeType.includes("ogg") ? "oggopus" :
                 mimeType.includes("mp3") ? "mp3" :
                 mimeType.includes("wav") ? "lpcm" : "oggopus";

  const params = new URLSearchParams({
    folderId: folderId,
    lang: "ru-RU",
    format: format,
  });

  if (format === "lpcm") {
    params.append("sampleRateHertz", "48000");
  }

  const url = `https://stt.api.cloud.yandex.net/speech/v1/stt:recognize?${params.toString()}`;

  return new Promise((resolve, reject) => {
    const req = https.request(url, {
      method: "POST",
      headers: {
        "Authorization": `Api-Key ${apiKey}`,
        "Content-Type": "application/octet-stream",
        "Content-Length": audioBuffer.length,
      },
    }, (res) => {
      let data = "";
      
      res.on("data", (chunk) => {
        data += chunk;
      });
      
      res.on("end", () => {
        try {
          const response = JSON.parse(data);
          
          if (res.statusCode !== 200) {
            console.error("Yandex SpeechKit error:", response);
            reject(new Error(`Ошибка транскрипции: ${response.message || response.error_message || "Unknown error"}`));
            return;
          }
          
          resolve(response.result || "");
        } catch (e) {
          console.error("Failed to parse Yandex response:", data);
          reject(new Error("Ошибка обработки ответа от Yandex SpeechKit"));
        }
      });
    });

    req.on("error", (error) => {
      console.error("Yandex SpeechKit request error:", error);
      reject(new Error(`Ошибка подключения к Yandex SpeechKit: ${error.message}`));
    });

    req.write(audioBuffer);
    req.end();
  });
}
