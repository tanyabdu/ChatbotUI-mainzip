import https from "https";
import { spawn } from "child_process";
import { randomUUID } from "crypto";
import { writeFileSync, readFileSync, unlinkSync, existsSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";

async function convertToOgg(audioBuffer: Buffer, mimeType: string): Promise<Buffer> {
  const inputExt = mimeType.includes("webm") ? "webm" : 
                   mimeType.includes("mp4") ? "mp4" :
                   mimeType.includes("mpeg") ? "mp3" :
                   mimeType.includes("wav") ? "wav" :
                   mimeType.includes("ogg") ? "ogg" : "webm";
  
  if (inputExt === "ogg") {
    return audioBuffer;
  }

  const tempId = randomUUID();
  const inputPath = join(tmpdir(), `input_${tempId}.${inputExt}`);
  const outputPath = join(tmpdir(), `output_${tempId}.ogg`);

  try {
    writeFileSync(inputPath, audioBuffer);

    await new Promise<void>((resolve, reject) => {
      const ffmpeg = spawn("ffmpeg", [
        "-i", inputPath,
        "-vn",
        "-c:a", "libopus",
        "-b:a", "48k",
        "-ar", "48000",
        "-ac", "1",
        "-y",
        outputPath
      ]);

      let stderr = "";
      ffmpeg.stderr.on("data", (data) => {
        stderr += data.toString();
      });

      ffmpeg.on("close", (code) => {
        if (code === 0) {
          resolve();
        } else {
          console.error("FFmpeg error:", stderr);
          reject(new Error(`FFmpeg завершился с кодом ${code}`));
        }
      });

      ffmpeg.on("error", (err) => {
        reject(new Error(`Не удалось запустить FFmpeg: ${err.message}`));
      });
    });

    const outputBuffer = readFileSync(outputPath);
    return outputBuffer;
  } finally {
    if (existsSync(inputPath)) unlinkSync(inputPath);
    if (existsSync(outputPath)) unlinkSync(outputPath);
  }
}

export async function transcribeAudio(audioBuffer: Buffer, mimeType: string): Promise<string> {
  const apiKey = process.env.YANDEX_SPEECHKIT_API_KEY;
  const folderId = process.env.YANDEX_FOLDER_ID;
  
  if (!apiKey) {
    throw new Error("YANDEX_SPEECHKIT_API_KEY не настроен");
  }
  
  if (!folderId) {
    throw new Error("YANDEX_FOLDER_ID не настроен");
  }

  console.log(`Converting audio from ${mimeType} to OGG Opus...`);
  const oggBuffer = await convertToOgg(audioBuffer, mimeType);
  console.log(`Conversion complete. OGG size: ${oggBuffer.length} bytes`);

  const params = new URLSearchParams({
    folderId: folderId,
    lang: "ru-RU",
    format: "oggopus",
  });

  const url = `https://stt.api.cloud.yandex.net/speech/v1/stt:recognize?${params.toString()}`;

  return new Promise((resolve, reject) => {
    const req = https.request(url, {
      method: "POST",
      headers: {
        "Authorization": `Api-Key ${apiKey}`,
        "Content-Type": "application/octet-stream",
        "Content-Length": oggBuffer.length,
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
          
          console.log("Transcription successful:", response.result);
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

    req.write(oggBuffer);
    req.end();
  });
}
