import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Mic, Square, Loader2, Sparkles, Copy, Check, Save, History, Trash2 } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { VoicePost } from "@shared/schema";

interface VoiceRecorderProps {
  onTranscript?: (text: string) => void;
  onGeneratePost?: (transcript: string) => void;
}

export default function VoiceRecorder({ onTranscript, onGeneratePost }: VoiceRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedPost, setGeneratedPost] = useState("");
  const [copied, setCopied] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [saved, setSaved] = useState(false);

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

  const toggleRecording = () => {
    if (isRecording) {
      setIsRecording(false);
      const mockTranscript = "Сегодня я хочу поговорить о том, как важно следовать своей интуиции. Многие мои клиенты приходят ко мне с вопросом - как понять, что это именно интуиция, а не страх...";
      setTranscript(mockTranscript);
      onTranscript?.(mockTranscript);
    } else {
      setIsRecording(true);
      setTranscript("");
      setGeneratedPost("");
      setSaved(false);
    }
  };

  const handleGeneratePost = () => {
    setIsGenerating(true);
    onGeneratePost?.(transcript);
    
    setTimeout(() => {
      setGeneratedPost(`Интуиция vs Страх: как отличить голос души от голоса эго

Знакомо ли вам это чувство - вы стоите на пороге важного решения, и внутри словно две силы тянут в разные стороны?

Одна шепчет: "Иди, это твой путь"
Другая кричит: "Стой! Это опасно!"

Как понять, кому верить?

Делюсь простым, но мощным инструментом, который работает безотказно:

Интуиция приходит спокойно, как легкий ветерок. Она не торопит, не пугает. Просто знание.

Страх всегда громкий. Он создает напряжение в теле, учащает дыхание, сжимает горло.

Попробуйте прямо сейчас: закройте глаза и задайте себе вопрос. Прислушайтесь не к словам - к ощущениям в теле.

Тело никогда не врет.

А вы умеете различать эти голоса?

#интуиция #эзотерика #саморазвитие #духовность`);
      setIsGenerating(false);
    }, 2000);
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

          {transcript && (
            <div className="text-left fade-in">
              <label className="text-xs text-purple-600 mb-1 block">Текст:</label>
              <div className="bg-purple-50 p-4 rounded-lg text-purple-700 text-sm max-h-32 overflow-y-auto border-2 border-purple-200">
                {transcript}
              </div>
            </div>
          )}

          {transcript && !generatedPost && (
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
