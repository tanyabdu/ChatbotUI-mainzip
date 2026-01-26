import https from "https";
import { spawn, execSync } from "child_process";
import { randomUUID } from "crypto";
import { writeFileSync, readFileSync, unlinkSync, existsSync, statSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";

const CHUNK_DURATION = 25;
const MAX_FILE_SIZE_FOR_SINGLE_CHUNK = 400000;

async function convertToOgg(audioBuffer: Buffer, mimeType: string, outputPath: string): Promise<void> {
  const inputExt = mimeType.includes("webm") ? "webm" : 
                   mimeType.includes("mp4") ? "mp4" :
                   mimeType.includes("mpeg") ? "mp3" :
                   mimeType.includes("wav") ? "wav" :
                   mimeType.includes("ogg") ? "ogg" : "webm";

  const tempId = randomUUID();
  const inputPath = join(tmpdir(), `input_${tempId}.${inputExt}`);

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

      const timeout = setTimeout(() => {
        ffmpeg.kill("SIGKILL");
        reject(new Error("Конвертация аудио превысила лимит времени (60 сек)"));
      }, 60000);

      let stderr = "";
      ffmpeg.stderr.on("data", (data) => {
        stderr += data.toString();
      });

      ffmpeg.on("close", (code) => {
        clearTimeout(timeout);
        if (code === 0) {
          resolve();
        } else {
          console.error("FFmpeg error:", stderr);
          reject(new Error(`FFmpeg завершился с кодом ${code}`));
        }
      });

      ffmpeg.on("error", (err) => {
        clearTimeout(timeout);
        reject(new Error(`Не удалось запустить FFmpeg: ${err.message}`));
      });
    });
  } finally {
    if (existsSync(inputPath)) unlinkSync(inputPath);
  }
}

function getAudioDuration(filePath: string): number {
  try {
    const result = execSync(
      `ffprobe -v quiet -show_entries format=duration -of csv=p=0 "${filePath}"`,
      { encoding: "utf-8" }
    );
    return parseFloat(result.trim()) || 0;
  } catch {
    return 0;
  }
}

async function splitByEstimatedDuration(inputPath: string, tempId: string, estimatedDuration: number): Promise<string[]> {
  const chunks: string[] = [];
  const numChunks = Math.ceil(estimatedDuration / CHUNK_DURATION);
  
  for (let i = 0; i < numChunks; i++) {
    const startTime = i * CHUNK_DURATION;
    const chunkPath = join(tmpdir(), `chunk_${tempId}_${i}.ogg`);
    
    await new Promise<void>((resolve, reject) => {
      const ffmpeg = spawn("ffmpeg", [
        "-i", inputPath,
        "-ss", startTime.toString(),
        "-t", CHUNK_DURATION.toString(),
        "-c:a", "libopus",
        "-b:a", "48k",
        "-ar", "48000",
        "-ac", "1",
        "-y",
        chunkPath
      ]);

      const timeout = setTimeout(() => {
        ffmpeg.kill("SIGKILL");
        reject(new Error("Разбивка аудио превысила лимит времени"));
      }, 30000);

      ffmpeg.on("close", (code) => {
        clearTimeout(timeout);
        if (code === 0 && existsSync(chunkPath) && statSync(chunkPath).size > 0) {
          chunks.push(chunkPath);
          resolve();
        } else if (code === 0) {
          resolve();
        } else {
          reject(new Error(`FFmpeg split failed with code ${code}`));
        }
      });

      ffmpeg.on("error", (err) => {
        clearTimeout(timeout);
        reject(err);
      });
    });
  }

  return chunks.length > 0 ? chunks : [inputPath];
}

async function splitAudio(inputPath: string, tempId: string): Promise<string[]> {
  const duration = getAudioDuration(inputPath);
  const fileSize = existsSync(inputPath) ? statSync(inputPath).size : 0;
  console.log(`Audio duration: ${duration.toFixed(1)} seconds, file size: ${fileSize} bytes`);
  
  if (duration === 0 && fileSize > MAX_FILE_SIZE_FOR_SINGLE_CHUNK) {
    console.log("Duration detection failed but file is large, estimating chunks by size...");
    const estimatedDuration = (fileSize / MAX_FILE_SIZE_FOR_SINGLE_CHUNK) * CHUNK_DURATION;
    return await splitByEstimatedDuration(inputPath, tempId, estimatedDuration);
  }
  
  if (duration <= CHUNK_DURATION) {
    return [inputPath];
  }

  const chunks: string[] = [];
  const numChunks = Math.ceil(duration / CHUNK_DURATION);
  
  for (let i = 0; i < numChunks; i++) {
    const startTime = i * CHUNK_DURATION;
    const chunkPath = join(tmpdir(), `chunk_${tempId}_${i}.ogg`);
    
    await new Promise<void>((resolve, reject) => {
      const ffmpeg = spawn("ffmpeg", [
        "-i", inputPath,
        "-ss", startTime.toString(),
        "-t", CHUNK_DURATION.toString(),
        "-c:a", "libopus",
        "-b:a", "48k",
        "-ar", "48000",
        "-ac", "1",
        "-y",
        chunkPath
      ]);

      const timeout = setTimeout(() => {
        ffmpeg.kill("SIGKILL");
        reject(new Error("Разбивка аудио превысила лимит времени"));
      }, 30000);

      ffmpeg.on("close", (code) => {
        clearTimeout(timeout);
        if (code === 0) {
          chunks.push(chunkPath);
          resolve();
        } else {
          reject(new Error(`FFmpeg split failed with code ${code}`));
        }
      });

      ffmpeg.on("error", (err) => {
        clearTimeout(timeout);
        reject(err);
      });
    });
  }

  return chunks;
}

async function transcribeChunk(oggBuffer: Buffer, apiKey: string, folderId: string): Promise<string> {
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

export async function transcribeAudio(audioBuffer: Buffer, mimeType: string): Promise<string> {
  const apiKey = process.env.YANDEX_SPEECHKIT_API_KEY;
  const folderId = process.env.YANDEX_FOLDER_ID;
  
  if (!apiKey) {
    throw new Error("YANDEX_SPEECHKIT_API_KEY не настроен");
  }
  
  if (!folderId) {
    throw new Error("YANDEX_FOLDER_ID не настроен");
  }

  const tempId = randomUUID();
  const mainOggPath = join(tmpdir(), `main_${tempId}.ogg`);
  const chunkPaths: string[] = [];

  try {
    console.log(`Converting audio from ${mimeType} to OGG Opus...`);
    await convertToOgg(audioBuffer, mimeType, mainOggPath);
    console.log(`Conversion complete.`);

    const chunks = await splitAudio(mainOggPath, tempId);
    console.log(`Split into ${chunks.length} chunk(s)`);

    const results: string[] = [];
    
    for (let i = 0; i < chunks.length; i++) {
      const chunkPath = chunks[i];
      if (chunkPath !== mainOggPath) {
        chunkPaths.push(chunkPath);
      }
      
      const chunkBuffer = readFileSync(chunkPath);
      console.log(`Transcribing chunk ${i + 1}/${chunks.length} (${chunkBuffer.length} bytes)...`);
      
      const result = await transcribeChunk(chunkBuffer, apiKey, folderId);
      if (result) {
        results.push(result);
      }
    }

    const fullTranscript = results.join(" ");
    console.log("Transcription successful:", fullTranscript.substring(0, 100) + (fullTranscript.length > 100 ? "..." : ""));
    
    return fullTranscript;
  } finally {
    if (existsSync(mainOggPath)) unlinkSync(mainOggPath);
    for (const chunkPath of chunkPaths) {
      if (existsSync(chunkPath)) unlinkSync(chunkPath);
    }
  }
}
