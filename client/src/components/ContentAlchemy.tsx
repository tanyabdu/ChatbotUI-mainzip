import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Sparkles, Loader2, BookOpen, Mic, Check, ChevronRight, 
  Calendar, MessageSquare, Save, Wand2, AlertCircle
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { GrimoireTopic, ContentAlchemyPlan } from "@shared/schema";

const DAYS_OPTIONS = [7, 14, 21, 30];

interface TopicWithQuestions {
  topic: GrimoireTopic;
  isGeneratingQuestions: boolean;
  isGeneratingPost: boolean;
  answers: { question: string; answer: string }[];
}

export default function ContentAlchemy() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<"create" | "grimoire">("create");
  const [daysCount, setDaysCount] = useState(7);
  const [warmupTarget, setWarmupTarget] = useState("");
  const [planName, setPlanName] = useState("");
  const [generatedTopics, setGeneratedTopics] = useState<{ day: number; topic: string; description: string }[]>([]);
  const [selectedTopic, setSelectedTopic] = useState<TopicWithQuestions | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);

  const { data: grimoireTopics = [], refetch: refetchGrimoire } = useQuery<GrimoireTopic[]>({
    queryKey: ["/api/grimoire-topics"],
  });

  const { data: alchemyPlans = [] } = useQuery<ContentAlchemyPlan[]>({
    queryKey: ["/api/content-alchemy-plans"],
  });

  const generatePlanMutation = useMutation({
    mutationFn: async (data: { daysCount: number; warmupTarget: string }) => {
      const response = await apiRequest("POST", "/api/content-alchemy/generate-plan", data);
      return response.json();
    },
    onSuccess: (data) => {
      setGeneratedTopics(data.topics || []);
      toast({
        title: "План создан!",
        description: `Сгенерировано ${data.topics?.length || 0} тем на ${daysCount} дней`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Ошибка генерации",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const savePlanMutation = useMutation({
    mutationFn: async (data: { name: string; daysCount: number; warmupTarget: string; topics: any[] }) => {
      const response = await apiRequest("POST", "/api/content-alchemy-plans", data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "План сохранён в Гримуар!",
        description: "Теперь вы можете создавать контент по темам",
      });
      setGeneratedTopics([]);
      setPlanName("");
      setWarmupTarget("");
      queryClient.invalidateQueries({ queryKey: ["/api/grimoire-topics"] });
      queryClient.invalidateQueries({ queryKey: ["/api/content-alchemy-plans"] });
      setActiveTab("grimoire");
    },
    onError: (error: Error) => {
      toast({
        title: "Ошибка сохранения",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const generateQuestionsMutation = useMutation({
    mutationFn: async (topicId: string) => {
      const response = await apiRequest("POST", `/api/grimoire-topics/${topicId}/generate-questions`);
      return response.json();
    },
    onSuccess: (data, topicId) => {
      refetchGrimoire();
      if (selectedTopic && selectedTopic.topic.id === topicId) {
        setSelectedTopic({
          ...selectedTopic,
          topic: { ...selectedTopic.topic, questions: data.questions },
          isGeneratingQuestions: false,
          answers: data.questions.map((q: string) => ({ question: q, answer: "" })),
        });
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Ошибка генерации вопросов",
        description: error.message,
        variant: "destructive",
      });
      if (selectedTopic) {
        setSelectedTopic({ ...selectedTopic, isGeneratingQuestions: false });
      }
    },
  });

  const generatePostMutation = useMutation({
    mutationFn: async (data: { topicId: string; answers: { question: string; answer: string }[] }) => {
      const response = await apiRequest("POST", `/api/grimoire-topics/${data.topicId}/generate-post`, { answers: data.answers });
      return response.json();
    },
    onSuccess: (data) => {
      refetchGrimoire();
      if (selectedTopic) {
        setSelectedTopic({
          ...selectedTopic,
          topic: { ...selectedTopic.topic, generatedPost: data.post, status: "completed" },
          isGeneratingPost: false,
        });
      }
      toast({
        title: "Пост создан!",
        description: "Ваш персонализированный контент готов",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Ошибка генерации поста",
        description: error.message,
        variant: "destructive",
      });
      if (selectedTopic) {
        setSelectedTopic({ ...selectedTopic, isGeneratingPost: false });
      }
    },
  });

  const handleGeneratePlan = () => {
    if (!warmupTarget.trim()) {
      toast({
        title: "Укажите цель прогрева",
        description: "Напишите, к чему вы хотите прогреть аудиторию",
        variant: "destructive",
      });
      return;
    }
    generatePlanMutation.mutate({ daysCount, warmupTarget });
  };

  const handleSavePlan = () => {
    if (!planName.trim()) {
      toast({
        title: "Введите название плана",
        description: "Название поможет найти план в Гримуаре",
        variant: "destructive",
      });
      return;
    }
    savePlanMutation.mutate({
      name: planName,
      daysCount,
      warmupTarget,
      topics: generatedTopics,
    });
  };

  const handleSelectTopic = (topic: GrimoireTopic) => {
    const answers = topic.answers || (topic.questions || []).map(q => ({ question: q, answer: "" }));
    setSelectedTopic({
      topic,
      isGeneratingQuestions: false,
      isGeneratingPost: false,
      answers: answers as { question: string; answer: string }[],
    });
  };

  const handleGenerateQuestions = (topicId: string) => {
    if (selectedTopic) {
      setSelectedTopic({ ...selectedTopic, isGeneratingQuestions: true });
    }
    generateQuestionsMutation.mutate(topicId);
  };

  const handleAnswerChange = (index: number, answer: string) => {
    if (!selectedTopic) return;
    const newAnswers = [...selectedTopic.answers];
    newAnswers[index] = { ...newAnswers[index], answer };
    setSelectedTopic({ ...selectedTopic, answers: newAnswers });
  };

  const handleGeneratePost = () => {
    if (!selectedTopic) return;
    const unanswered = selectedTopic.answers.filter(a => !a.answer.trim());
    if (unanswered.length > 0) {
      toast({
        title: "Ответьте на все вопросы",
        description: `Осталось ответить на ${unanswered.length} вопрос(ов)`,
        variant: "destructive",
      });
      return;
    }
    setSelectedTopic({ ...selectedTopic, isGeneratingPost: true });
    generatePostMutation.mutate({
      topicId: selectedTopic.topic.id,
      answers: selectedTopic.answers,
    });
  };

  const startVoiceRecording = async (answerIndex: number) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];

      recorder.ondataavailable = (e) => chunks.push(e.data);
      recorder.onstop = async () => {
        const blob = new Blob(chunks, { type: "audio/webm" });
        stream.getTracks().forEach(track => track.stop());
        
        const formData = new FormData();
        formData.append("audio", blob, "recording.webm");

        try {
          const token = localStorage.getItem("auth_token");
          const response = await fetch("/api/transcribe", {
            method: "POST",
            headers: { Authorization: `Bearer ${token}` },
            body: formData,
          });
          
          if (response.ok) {
            const data = await response.json();
            if (data.text) {
              handleAnswerChange(answerIndex, (selectedTopic?.answers[answerIndex]?.answer || "") + " " + data.text);
            }
          }
        } catch (error) {
          console.error("Transcription error:", error);
        }
        
        setIsRecording(false);
        setMediaRecorder(null);
      };

      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
    } catch (error) {
      toast({
        title: "Ошибка микрофона",
        description: "Разрешите доступ к микрофону",
        variant: "destructive",
      });
    }
  };

  const stopVoiceRecording = () => {
    if (mediaRecorder && mediaRecorder.state === "recording") {
      mediaRecorder.stop();
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "new":
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Новая</Badge>;
      case "in_progress":
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">В работе</Badge>;
      case "completed":
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Готово</Badge>;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6 fade-in">
      <Card className="border-purple-200 bg-gradient-to-br from-white to-purple-50">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-500 bg-clip-text text-transparent flex items-center gap-2">
              <Sparkles className="h-6 w-6 text-purple-500" />
              Алхимия контента
            </CardTitle>
            <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-300 flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              Тестовый режим
            </Badge>
          </div>
          <p className="text-sm text-gray-600 mt-2">
            Создавайте персонализированный контент через наводящие вопросы
          </p>
        </CardHeader>

        <CardContent>
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "create" | "grimoire")}>
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="create" className="flex items-center gap-2">
                <Wand2 className="h-4 w-4" />
                Создать план
              </TabsTrigger>
              <TabsTrigger value="grimoire" className="flex items-center gap-2">
                <BookOpen className="h-4 w-4" />
                Гримуар ({grimoireTopics.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="create" className="space-y-6">
              <div className="space-y-4">
                <div>
                  <Label className="text-sm font-medium text-gray-700 mb-2 block">
                    На сколько дней нужен контент?
                  </Label>
                  <div className="flex gap-2 flex-wrap">
                    {DAYS_OPTIONS.map((days) => (
                      <Button
                        key={days}
                        variant={daysCount === days ? "default" : "outline"}
                        onClick={() => setDaysCount(days)}
                        className={daysCount === days ? "bg-purple-500 hover:bg-purple-600" : ""}
                      >
                        <Calendar className="h-4 w-4 mr-1" />
                        {days} дней
                      </Button>
                    ))}
                  </div>
                </div>

                <div>
                  <Label className="text-sm font-medium text-gray-700 mb-2 block">
                    К чему прогреваем аудиторию?
                  </Label>
                  <Textarea
                    value={warmupTarget}
                    onChange={(e) => setWarmupTarget(e.target.value)}
                    placeholder="Например: запуск курса по таро, консультация по нумерологии, марафон по медитации..."
                    rows={3}
                    className="resize-none"
                  />
                </div>

                <Button
                  onClick={handleGeneratePlan}
                  disabled={generatePlanMutation.isPending || !warmupTarget.trim()}
                  className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                >
                  {generatePlanMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Генерируем темы...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 mr-2" />
                      Создать контент-план
                    </>
                  )}
                </Button>
              </div>

              {generatedTopics.length > 0 && (
                <div className="space-y-4 pt-4 border-t border-purple-100">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-lg text-purple-800">
                      Ваш контент-план на {daysCount} дней
                    </h3>
                    <Badge variant="outline" className="bg-green-50 text-green-700">
                      {generatedTopics.length} тем
                    </Badge>
                  </div>

                  <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
                    {generatedTopics.map((topic, index) => (
                      <div
                        key={index}
                        className="p-3 rounded-lg border border-purple-200 bg-white hover:bg-purple-50 transition-colors"
                      >
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-sm font-bold text-purple-600 shrink-0">
                            {topic.day}
                          </div>
                          <div>
                            <p className="font-medium text-gray-800">{topic.topic}</p>
                            <p className="text-sm text-gray-500 mt-1">{topic.description}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="flex gap-3">
                    <Input
                      value={planName}
                      onChange={(e) => setPlanName(e.target.value)}
                      placeholder="Название плана (например: Запуск курса Таро)"
                      className="flex-1"
                    />
                    <Button
                      onClick={handleSavePlan}
                      disabled={savePlanMutation.isPending || !planName.trim()}
                      className="bg-green-500 hover:bg-green-600"
                    >
                      {savePlanMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <Save className="h-4 w-4 mr-2" />
                          Сохранить в Гримуар
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="grimoire" className="space-y-4">
              {grimoireTopics.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <BookOpen className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>Гримуар пуст</p>
                  <p className="text-sm mt-2">Создайте контент-план, чтобы темы появились здесь</p>
                </div>
              ) : selectedTopic ? (
                <div className="space-y-4">
                  <Button
                    variant="ghost"
                    onClick={() => setSelectedTopic(null)}
                    className="mb-2"
                  >
                    ← Назад к списку тем
                  </Button>

                  <Card className="border-purple-200">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">
                          День {selectedTopic.topic.day}: {selectedTopic.topic.topic}
                        </CardTitle>
                        {getStatusBadge(selectedTopic.topic.status)}
                      </div>
                      {selectedTopic.topic.description && (
                        <p className="text-sm text-gray-600">{selectedTopic.topic.description}</p>
                      )}
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {!selectedTopic.topic.questions || selectedTopic.topic.questions.length === 0 ? (
                        <Button
                          onClick={() => handleGenerateQuestions(selectedTopic.topic.id)}
                          disabled={selectedTopic.isGeneratingQuestions}
                          className="w-full"
                        >
                          {selectedTopic.isGeneratingQuestions ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Генерируем вопросы...
                            </>
                          ) : (
                            <>
                              <MessageSquare className="h-4 w-4 mr-2" />
                              Сгенерировать наводящие вопросы
                            </>
                          )}
                        </Button>
                      ) : selectedTopic.topic.generatedPost ? (
                        <div className="space-y-3">
                          <div className="flex items-center gap-2 text-green-600">
                            <Check className="h-5 w-5" />
                            <span className="font-medium">Пост готов!</span>
                          </div>
                          <div className="p-4 rounded-lg bg-gray-50 border whitespace-pre-wrap">
                            {selectedTopic.topic.generatedPost}
                          </div>
                          <Button
                            variant="outline"
                            onClick={() => {
                              navigator.clipboard.writeText(selectedTopic.topic.generatedPost || "");
                              toast({ title: "Скопировано!" });
                            }}
                            className="w-full"
                          >
                            Копировать пост
                          </Button>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <p className="text-sm text-gray-600 mb-4">
                            Ответьте на вопросы текстом или голосом — ИИ соберёт ваши ответы в готовый пост
                          </p>
                          {selectedTopic.answers.map((qa, index) => (
                            <div key={index} className="space-y-2">
                              <Label className="text-sm font-medium flex items-center gap-2">
                                <span className="w-6 h-6 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center text-xs font-bold">
                                  {index + 1}
                                </span>
                                {qa.question}
                              </Label>
                              <div className="flex gap-2">
                                <Textarea
                                  value={qa.answer}
                                  onChange={(e) => handleAnswerChange(index, e.target.value)}
                                  placeholder="Ваш ответ..."
                                  rows={2}
                                  className="flex-1 resize-none"
                                />
                                <Button
                                  variant="outline"
                                  size="icon"
                                  onClick={() => isRecording ? stopVoiceRecording() : startVoiceRecording(index)}
                                  className={isRecording ? "bg-red-50 border-red-300 text-red-500" : ""}
                                >
                                  <Mic className={`h-4 w-4 ${isRecording ? "animate-pulse" : ""}`} />
                                </Button>
                              </div>
                            </div>
                          ))}
                          <Button
                            onClick={handleGeneratePost}
                            disabled={selectedTopic.isGeneratingPost}
                            className="w-full bg-gradient-to-r from-purple-500 to-pink-500"
                          >
                            {selectedTopic.isGeneratingPost ? (
                              <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Создаём пост...
                              </>
                            ) : (
                              <>
                                <Wand2 className="h-4 w-4 mr-2" />
                                Собрать пост из ответов
                              </>
                            )}
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              ) : (
                <div className="space-y-3">
                  {grimoireTopics.map((topic) => (
                    <button
                      key={topic.id}
                      onClick={() => handleSelectTopic(topic)}
                      className="w-full p-4 rounded-lg border border-purple-200 bg-white hover:bg-purple-50 transition-colors text-left flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center font-bold text-purple-600">
                          {topic.day}
                        </div>
                        <div>
                          <p className="font-medium text-gray-800">{topic.topic}</p>
                          {topic.description && (
                            <p className="text-sm text-gray-500 line-clamp-1">{topic.description}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {getStatusBadge(topic.status)}
                        <ChevronRight className="h-5 w-5 text-gray-400" />
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
