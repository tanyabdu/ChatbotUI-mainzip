import { useState, useRef, useCallback, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Mic, Square, Loader2, Sparkles, Copy, Check, Save, History, Trash2, AlertCircle, Image } from "lucide-react";
import { useLocation } from "wouter";
import { queryClient } from "@/lib/queryClient";
import type { VoicePost } from "@shared/schema";

interface VoiceRecorderProps {
  onTranscript?: (text: string) => void;
  onGeneratePost?: (transcript: string) => void;
}

function checkMediaRecorderSupport(): { supported: boolean; mimeType: string | null } {
  if (typeof window === "undefined") {
    return { supported: false, mimeType: null };
  }
  
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    return { supported: false, mimeType: null };
  }
  
  if (typeof MediaRecorder === "undefined") {
    return { supported: false, mimeType: null };
  }
  
  const mimeTypes = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/mp4",
    "audio/ogg;codecs=opus",
    "audio/ogg",
  ];
  
  for (const mimeType of mimeTypes) {
    if (MediaRecorder.isTypeSupported(mimeType)) {
      return { supported: true, mimeType };
    }
  }
  
  return { supported: true, mimeType: null };
}

export default function VoiceRecorder({ onTranscript, onGeneratePost }: VoiceRecorderProps) {
  const [, setLocation] = useLocation();
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedPost, setGeneratedPost] = useState("");
  const [copied, setCopied] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSupported, setIsSupported] = useState(true);
  const [supportedMimeType, setSupportedMimeType] = useState<string | null>(null);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    const { supported, mimeType } = checkMediaRecorderSupport();
    setIsSupported(supported);
    setSupportedMimeType(mimeType);
  }, []);

  const { data: savedPosts = [], isLoading: isLoadingPosts } = useQuery<VoicePost[]>({
    queryKey: ["/api/voice-posts"],
  });

  const saveMutation = useMutation({
    mutationFn: async (data: { originalText: string; refinedText: string; tone: string }) => {
      const response = await fetch("/api/voice-posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to save");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/voice-posts"] });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/voice-posts/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to delete");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/voice-posts"] });
    },
  });

  const transcribeMutation = useMutation({
    mutationFn: async (audioBlob: Blob) => {
      const formData = new FormData();
      formData.append("audio", audioBlob, "recording.webm");
      
      const token = localStorage.getItem("auth_token");
      
      const response = await fetch("/api/voice-posts/transcribe", {
        method: "POST",
        credentials: "include",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Ошибка транскрипции");
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      setTranscript(data.transcript);
      setIsTranscribing(false);
      onTranscript?.(data.transcript);
    },
    onError: (error: Error) => {
      setError(error.message);
      setIsTranscribing(false);
    },
  });

  const generatePostMutation = useMutation({
    mutationFn: async (text: string) => {
      const token = localStorage.getItem("auth_token");
      const response = await fetch("/api/voice-posts/generate", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        credentials: "include",
        body: JSON.stringify({ transcript: text }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Ошибка генерации");
      }
      return response.json();
    },
    onSuccess: (data) => {
      setGeneratedPost(data.post);
      setIsGenerating(false);
    },
    onError: (error: Error) => {
      setError(`Ошибка генерации: ${error.message}`);
      setIsGenerating(false);
    },
  });

  const startRecording = useCallback(async () => {
    setError(null);
    setTranscript("");
    setGeneratedPost("");
    setSaved(false);
    chunksRef.current = [];

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      const options: MediaRecorderOptions = {};
      if (supportedMimeType) {
        options.mimeType = supportedMimeType;
      }
      
      let mediaRecorder: MediaRecorder;
      try {
        mediaRecorder = new MediaRecorder(stream, options);
      } catch (e) {
        mediaRecorder = new MediaRecorder(stream);
      }
      
      const actualMimeType = mediaRecorder.mimeType || "audio/webm";
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };
      
      mediaRecorder.onstop = () => {
        stream.getTracks().forEach(track => track.stop());
        
        if (chunksRef.current.length > 0) {
          const audioBlob = new Blob(chunksRef.current, { type: actualMimeType });
          setIsTranscribing(true);
          transcribeMutation.mutate(audioBlob);
        }
      };
      
      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start(1000);
      setIsRecording(true);
    } catch (err: any) {
      console.error("Error starting recording:", err);
      if (err.name === "NotAllowedError") {
        setError("Микрофон не разрешён. Разрешите доступ к микрофону в настройках браузера.");
      } else if (err.name === "NotFoundError") {
        setError("Микрофон не найден. Подключите микрофон и попробуйте снова.");
      } else if (err.name === "NotSupportedError") {
        setError("Формат записи не поддерживается вашим браузером.");
      } else {
        setError("Не удалось запустить запись. Проверьте доступ к микрофону.");
      }
    }
  }, [transcribeMutation, supportedMimeType]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
  }, []);

  const toggleRecording = useCallback(() => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  }, [isRecording, startRecording, stopRecording]);

  const handleGeneratePost = () => {
    setIsGenerating(true);
    setError(null);
    onGeneratePost?.(transcript);
    generatePostMutation.mutate(transcript);
  };

  const handleSavePost = () => {
    saveMutation.mutate({
      originalText: transcript,
      refinedText: generatedPost,
      tone: "вдохновляющий",
    });
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedPost);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isSupported) {
    return (
      <section className="fade-in max-w-2xl mx-auto">
        <Card className="relative overflow-visible bg-white border-2 border-purple-300 shadow-lg">
          <CardContent className="p-8 text-center">
            <AlertCircle className="h-12 w-12 text-orange-500 mx-auto mb-4" />
            <h3 className="text-xl font-mystic text-purple-700 mb-2">Браузер не поддерживается</h3>
            <p className="text-purple-600">
              Ваш браузер не поддерживает запись аудио. 
              Пожалуйста, используйте современный браузер (Chrome, Safari, Firefox, Edge).
            </p>
          </CardContent>
        </Card>
      </section>
    );
  }

  return (
    <section className="fade-in max-w-2xl mx-auto">
      <Card className="relative overflow-visible bg-white border-2 border-purple-300 shadow-lg">
        <div className="absolute inset-0 bg-gradient-to-b from-purple-50 to-transparent pointer-events-none rounded-lg" />
        
        <CardHeader className="text-center relative z-10">
          <CardTitle className="text-3xl font-mystic text-purple-700">
            <Mic className="inline-block h-8 w-8 mr-2 mb-1 text-pink-500" />
            Голос Потока
          </CardTitle>
          <p className="text-purple-500">
            Надиктуйте свои мысли. ИИ превратит их в идеальный пост.
          </p>
        </CardHeader>

        <CardContent className="relative z-10 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <div className="text-center">
            <button
              onClick={toggleRecording}
              disabled={isTranscribing}
              data-testid="button-record"
              className={`
                w-24 h-24 rounded-full shadow-xl flex items-center justify-center transition-all transform 
                focus:outline-none mx-auto ring-4 ring-card disabled:opacity-50
                ${isRecording 
                  ? "bg-red-500 recording-pulse" 
                  : "bg-gradient-to-br from-red-500 to-pink-600 hover:scale-105"
                }
              `}
            >
              {isTranscribing ? (
                <Loader2 className="h-10 w-10 text-white animate-spin" />
              ) : isRecording ? (
                <Square className="h-10 w-10 text-white" />
              ) : (
                <Mic className="h-10 w-10 text-white" />
              )}
            </button>
            <p className="text-sm text-muted-foreground mt-4">
              {isTranscribing 
                ? "Распознаю речь..." 
                : isRecording 
                  ? "Запись... Нажмите для остановки" 
                  : "Нажмите для записи"}
            </p>
          </div>

          {transcript && !isRecording && !isTranscribing && (
            <div className="text-left fade-in">
              <label className="text-xs text-purple-600 mb-1 block">Текст:</label>
              <div className="bg-purple-50 p-4 rounded-lg text-purple-700 text-sm min-h-[80px] max-h-32 overflow-y-auto border-2 border-purple-200">
                {transcript}
              </div>
            </div>
          )}

          {transcript && !isRecording && !isTranscribing && !generatedPost && (
            <Button
              onClick={handleGeneratePost}
              disabled={isGenerating}
              data-testid="button-generate-post"
              className="w-full py-6 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-xl font-bold shadow-lg border-2 border-purple-400"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  Создаю пост...
                </>
              ) : (
                <>
                  <Sparkles className="h-5 w-5 mr-2" />
                  Превратить в Пост
                </>
              )}
            </Button>
          )}
        </CardContent>
      </Card>

      {generatedPost && (
        <Card className="mt-8 fade-in bg-white border-2 border-pink-300 shadow-md">
          <CardHeader>
            <CardTitle className="text-xl font-mystic text-purple-700">
              Готовый Пост
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="prose max-w-none text-sm text-purple-700 whitespace-pre-wrap bg-pink-50 p-4 rounded-lg border-2 border-pink-200">
              {generatedPost}
            </div>
            <div className="flex gap-2 mt-4">
              <Button
                onClick={handleCopy}
                data-testid="button-copy-post"
                className="flex-1"
                variant="secondary"
              >
                {copied ? (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    Скопировано!
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4 mr-2" />
                    Скопировать
                  </>
                )}
              </Button>
              <Button
                onClick={handleSavePost}
                data-testid="button-save-voice-post"
                className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 text-white"
                disabled={saveMutation.isPending || saved}
              >
                {saved ? (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    Сохранено!
                  </>
                ) : saveMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Сохраняю...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Сохранить
                  </>
                )}
              </Button>
            </div>
            <Button
              onClick={() => setLocation(`/image-editor?text=${encodeURIComponent(generatedPost)}`)}
              className="w-full mt-3 bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white"
            >
              <Image className="h-4 w-4 mr-2" />
              Создать карусель
            </Button>
          </CardContent>
        </Card>
      )}

      {savedPosts.length > 0 && (
        <Card className="mt-8 fade-in bg-white border-2 border-purple-300 shadow-md">
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <CardTitle className="text-xl font-mystic text-purple-700 flex items-center gap-2">
              <History className="h-5 w-5 text-pink-500" />
              Сохранённые посты ({savedPosts.length})
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowHistory(!showHistory)}
              data-testid="button-toggle-voice-history"
            >
              {showHistory ? "Скрыть" : "Показать"}
            </Button>
          </CardHeader>
          {showHistory && (
            <CardContent className="space-y-4">
              {savedPosts.map((post) => (
                <Card key={post.id} className="bg-purple-50 border-2 border-purple-200">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start gap-2 mb-2">
                      <Badge variant="secondary" className="bg-pink-100 text-pink-700 border border-pink-300">
                        {post.tone}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteMutation.mutate(post.id)}
                        data-testid={`button-delete-voice-${post.id}`}
                        className="text-red-500"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <p className="text-xs text-purple-500 mb-2">Исходный текст:</p>
                    <p className="text-sm text-purple-600 mb-3">{post.originalText.substring(0, 100)}...</p>
                    <p className="text-xs text-purple-500 mb-2">Готовый пост:</p>
                    <p className="text-sm text-purple-700 whitespace-pre-wrap">{post.refinedText.substring(0, 200)}...</p>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="mt-2 text-purple-600"
                      onClick={() => {
                        navigator.clipboard.writeText(post.refinedText);
                      }}
                    >
                      <Copy className="h-3 w-3 mr-1" />
                      Копировать полный текст
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </CardContent>
          )}
        </Card>
      )}
    </section>
  );
}
