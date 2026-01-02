import { useState, useRef, useEffect, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Mic, Square, Loader2, Sparkles, Copy, Check, Save, History, Trash2, AlertCircle, Image } from "lucide-react";
import { useLocation } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { VoicePost } from "@shared/schema";

interface VoiceRecorderProps {
  onTranscript?: (text: string) => void;
  onGeneratePost?: (transcript: string) => void;
}

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message: string;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition;
    webkitSpeechRecognition: new () => SpeechRecognition;
  }
}

export default function VoiceRecorder({ onTranscript, onGeneratePost }: VoiceRecorderProps) {
  const [, setLocation] = useLocation();
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedPost, setGeneratedPost] = useState("");
  const [copied, setCopied] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSupported, setIsSupported] = useState(true);
  
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const isRecordingRef = useRef(false);
  const transcriptRef = useRef("");

  useEffect(() => {
    const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognitionAPI) {
      setIsSupported(false);
      return;
    }

    const recognition = new SpeechRecognitionAPI();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "ru-RU";

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let finalTranscript = "";
      let interim = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalTranscript += result[0].transcript + " ";
        } else {
          interim += result[0].transcript;
        }
      }

      if (finalTranscript) {
        transcriptRef.current += finalTranscript;
        setTranscript(transcriptRef.current);
      }
      setInterimTranscript(interim);
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error("Speech recognition error:", event.error);
      if (event.error === "not-allowed") {
        setError("Микрофон не разрешён. Разрешите доступ к микрофону в настройках браузера или телефона.");
      } else if (event.error === "network") {
        setError("Нет связи с сервером распознавания речи. Проверьте интернет-соединение и отключите VPN если используете.");
      } else if (event.error === "audio-capture") {
        setError("Не удалось получить доступ к микрофону. На iPhone: Настройки → Safari → Микрофон → Разрешить. Или закройте другие приложения, использующие микрофон.");
      } else if (event.error === "no-speech") {
        if (isRecordingRef.current) {
          try {
            recognition.start();
          } catch (e) {
            console.log("Restarting after no-speech");
          }
        }
        return;
      } else if (event.error === "aborted") {
        return;
      } else if (event.error === "service-not-allowed") {
        setError("Распознавание речи недоступно. Попробуйте другой браузер (Chrome, Safari).");
      } else {
        setError(`Ошибка распознавания: ${event.error}. Попробуйте обновить страницу.`);
      }
      setIsRecording(false);
      isRecordingRef.current = false;
    };

    recognition.onend = () => {
      if (isRecordingRef.current) {
        try {
          recognition.start();
        } catch (e) {
          console.log("Could not restart recognition");
        }
      }
    };

    recognitionRef.current = recognition;

    return () => {
      if (recognitionRef.current) {
        isRecordingRef.current = false;
        recognitionRef.current.abort();
      }
    };
  }, []);

  const { data: savedPosts = [], isLoading: isLoadingPosts } = useQuery<VoicePost[]>({
    queryKey: ["/api/voice-posts"],
  });

  const saveMutation = useMutation({
    mutationFn: async (data: { originalText: string; refinedText: string; tone: string }) => {
      return apiRequest("POST", "/api/voice-posts", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/voice-posts"] });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/voice-posts/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/voice-posts"] });
    },
  });

  const generatePostMutation = useMutation({
    mutationFn: async (text: string) => {
      const response = await apiRequest("POST", "/api/voice-posts/generate", { transcript: text });
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
    setInterimTranscript("");
    setGeneratedPost("");
    setSaved(false);
    transcriptRef.current = "";
    
    if (recognitionRef.current) {
      try {
        isRecordingRef.current = true;
        setIsRecording(true);
        recognitionRef.current.start();
      } catch (e) {
        setError("Не удалось запустить распознавание речи. Попробуйте обновить страницу.");
        setIsRecording(false);
        isRecordingRef.current = false;
      }
    }
  }, []);

  const stopRecording = useCallback(() => {
    isRecordingRef.current = false;
    setIsRecording(false);
    setInterimTranscript("");
    
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    
    const finalText = transcriptRef.current.trim();
    if (finalText) {
      onTranscript?.(finalText);
    }
  }, [onTranscript]);

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

  const displayTranscript = transcript + interimTranscript;

  if (!isSupported) {
    return (
      <section className="fade-in max-w-2xl mx-auto">
        <Card className="relative overflow-visible bg-white border-2 border-purple-300 shadow-lg">
          <CardContent className="p-8 text-center">
            <AlertCircle className="h-12 w-12 text-orange-500 mx-auto mb-4" />
            <h3 className="text-xl font-mystic text-purple-700 mb-2">Браузер не поддерживается</h3>
            <p className="text-purple-600">
              Ваш браузер не поддерживает распознавание речи. 
              Пожалуйста, используйте Google Chrome или Microsoft Edge для этой функции.
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
              {isRecording ? "Запись... Нажмите для остановки" : "Нажмите для записи"}
            </p>
          </div>

          {(displayTranscript || isRecording) && (
            <div className="text-left fade-in">
              <label className="text-xs text-purple-600 mb-1 block">
                {isRecording ? "Распознавание речи..." : "Текст:"}
              </label>
              <div className="bg-purple-50 p-4 rounded-lg text-purple-700 text-sm min-h-[80px] max-h-32 overflow-y-auto border-2 border-purple-200">
                {transcript}
                {interimTranscript && (
                  <span className="text-purple-400">{interimTranscript}</span>
                )}
                {isRecording && !displayTranscript && (
                  <span className="text-purple-400">Говорите...</span>
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
