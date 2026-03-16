import { useState, useRef, useCallback } from "react";
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

export default function VoiceRecorder({ onTranscript, onGeneratePost }: VoiceRecorderProps) {
  const [, setLocation] = useLocation();
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [interimText, setInterimText] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedPost, setGeneratedPost] = useState("");
  const [copied, setCopied] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const recognitionRef = useRef<any>(null);
  const finalTranscriptRef = useRef<string>("");

  const isSupported =
    typeof window !== "undefined" &&
    !!(
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition
    );

  const { data: savedPosts = [] } = useQuery<VoicePost[]>({
    queryKey: ["/api/voice-posts"],
  });

  const saveMutation = useMutation({
    mutationFn: async (data: { originalText: string; refinedText: string; tone: string }) => {
      const token = localStorage.getItem("auth_token");
      const response = await fetch("/api/voice-posts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || "Не удалось сохранить пост");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/voice-posts"] });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    },
    onError: (error: Error) => {
      alert("Ошибка сохранения: " + error.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const token = localStorage.getItem("auth_token");
      const response = await fetch(`/api/voice-posts/${id}`, {
        method: "DELETE",
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to delete");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/voice-posts"] });
    },
  });

  const generatePostMutation = useMutation({
    mutationFn: async (text: string) => {
      const token = localStorage.getItem("auth_token");
      const response = await fetch("/api/voice-posts/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
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

  const startRecording = useCallback(() => {
    setError(null);
    setTranscript("");
    setInterimText("");
    setGeneratedPost("");
    setSaved(false);
    finalTranscriptRef.current = "";

    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setError("Ваш браузер не поддерживает голосовой ввод. Используйте Chrome или Safari.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "ru-RU";
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onresult = (event: any) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const text = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscriptRef.current += text + " ";
          setTranscript(finalTranscriptRef.current.trim());
        } else {
          interim += text;
        }
      }
      setInterimText(interim);
    };

    recognition.onerror = (event: any) => {
      if (event.error === "not-allowed") {
        setError("Микрофон не разрешён. Разрешите доступ к микрофону в настройках браузера.");
      } else if (event.error === "no-speech") {
        // тихо игнорируем — пользователь просто молчал
      } else if (event.error !== "aborted") {
        setError("Ошибка распознавания: " + event.error);
      }
      setIsRecording(false);
      setInterimText("");
    };

    recognition.onend = () => {
      setIsRecording(false);
      setInterimText("");
      const finalText = finalTranscriptRef.current.trim();
      if (finalText) {
        setTranscript(finalText);
        onTranscript?.(finalText);
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
    setIsRecording(true);
  }, [onTranscript]);

  const stopRecording = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
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
              Голосовой ввод работает в Chrome и Safari. Пожалуйста, используйте один из этих браузеров.
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
              data-testid="button-record"
              className={`
                w-24 h-24 rounded-full shadow-xl flex items-center justify-center transition-all transform
                focus:outline-none mx-auto ring-4 ring-card
                ${isRecording
                  ? "bg-red-500 recording-pulse"
                  : "bg-gradient-to-br from-red-500 to-pink-600 hover:scale-105"
                }
              `}
            >
              {isRecording ? (
                <Square className="h-10 w-10 text-white" />
              ) : (
                <Mic className="h-10 w-10 text-white" />
              )}
            </button>
            <p className="text-sm text-muted-foreground mt-4">
              {isRecording
                ? "Слушаю... Нажмите для остановки"
                : "Нажмите для записи"}
            </p>
          </div>

          {(transcript || interimText) && (
            <div className="text-left fade-in">
              <label className="text-xs text-purple-600 mb-1 block">Текст:</label>
              <div className="bg-purple-50 p-4 rounded-lg text-sm min-h-[80px] max-h-40 overflow-y-auto border-2 border-purple-200">
                <span className="text-purple-700">{transcript}</span>
                {interimText && (
                  <span className="text-purple-400 italic"> {interimText}</span>
                )}
              </div>
            </div>
          )}

          {transcript && !isRecording && !generatedPost && (
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
