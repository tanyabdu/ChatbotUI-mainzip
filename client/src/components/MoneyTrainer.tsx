import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Loader2, Copy, Check, Sparkles, MessageSquare, Clock, DollarSign } from "lucide-react";
import type { SalesTrainerSession } from "@shared/schema";

const PAIN_TYPES = [
  { value: "relationships", label: "Отношения" },
  { value: "career", label: "Карьера" },
  { value: "money", label: "Деньги" },
  { value: "health", label: "Здоровье" },
  { value: "property", label: "Недвижимость" },
  { value: "general", label: "Общий вопрос" },
];

const OFFER_TYPES = [
  { value: "consultation", label: "Консультация" },
  { value: "forecast", label: "Прогноз на год" },
  { value: "compatibility", label: "Совместимость" },
  { value: "natal_chart", label: "Натальная карта" },
  { value: "tarot_spread", label: "Расклад Таро" },
];

export default function MoneyTrainer() {
  const { toast } = useToast();
  const [clientQuestion, setClientQuestion] = useState("");
  const [expertDraft, setExpertDraft] = useState("");
  const [painType, setPainType] = useState("");
  const [offerType, setOfferType] = useState("");
  const [improvedAnswer, setImprovedAnswer] = useState("");
  const [copied, setCopied] = useState(false);

  const { data: sessions, isLoading: sessionsLoading } = useQuery<SalesTrainerSession[]>({
    queryKey: ["/api/trainer/sessions"],
  });

  const { data: limitInfo } = useQuery<{ allowed: boolean; reason?: string; remaining?: number }>({
    queryKey: ["/api/generation-limit"],
  });

  const generateMutation = useMutation({
    mutationFn: async (data: {
      clientQuestion: string;
      expertDraft: string;
      painType?: string;
      offerType?: string;
    }) => {
      const response = await apiRequest("POST", "/api/trainer/generate", data);
      return response.json();
    },
    onSuccess: (data) => {
      setImprovedAnswer(data.improvedAnswer);
      queryClient.invalidateQueries({ queryKey: ["/api/trainer/sessions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/generation-limit"] });
      toast({
        title: "Готово!",
        description: "Улучшенный ответ сгенерирован",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось сгенерировать ответ",
        variant: "destructive",
      });
    },
  });

  const handleGenerate = () => {
    if (!clientQuestion.trim()) {
      toast({
        title: "Введите вопрос клиента",
        variant: "destructive",
      });
      return;
    }
    if (!expertDraft.trim()) {
      toast({
        title: "Введите ваш черновик ответа",
        variant: "destructive",
      });
      return;
    }

    generateMutation.mutate({
      clientQuestion,
      expertDraft,
      painType: painType || undefined,
      offerType: offerType || undefined,
    });
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(improvedAnswer);
    setCopied(true);
    toast({ title: "Скопировано!" });
    setTimeout(() => setCopied(false), 2000);
  };

  const loadSession = (session: SalesTrainerSession) => {
    setClientQuestion(session.clientQuestion);
    setExpertDraft(session.expertDraft);
    setImprovedAnswer(session.improvedAnswer);
    setPainType(session.painType || "");
    setOfferType(session.offerType || "");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-3 rounded-full bg-gradient-to-r from-amber-400 to-orange-500">
          <DollarSign className="h-6 w-6 text-white" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-foreground">Денежный Тренажёр</h2>
          <p className="text-muted-foreground">
            Улучши свой ответ клиенту и закрой его на продажу
          </p>
        </div>
      </div>

      {limitInfo && (
        <div className="flex items-center gap-2">
          {limitInfo.remaining === -1 ? (
            <Badge variant="secondary" className="bg-gradient-to-r from-purple-500 to-pink-500 text-white border-0">
              PRO - Безлимит
            </Badge>
          ) : limitInfo.remaining === 0 ? (
            <Badge variant="destructive">
              Лимит исчерпан
            </Badge>
          ) : (
            <Badge variant="outline" className="border-purple-300">
              Осталось генераций: {limitInfo.remaining}
            </Badge>
          )}
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-2 border-purple-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-purple-500" />
                Входные данные
              </CardTitle>
              <CardDescription>
                Вставь вопрос клиента и свой черновик ответа
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="client-question">Вопрос клиента</Label>
                <Textarea
                  id="client-question"
                  data-testid="input-client-question"
                  placeholder="Например: Здравствуйте, я родилась 15.03.1990, скажите будут ли у меня отношения в этом году?"
                  value={clientQuestion}
                  onChange={(e) => setClientQuestion(e.target.value)}
                  className="min-h-[100px] border-purple-200 focus:border-purple-400"
                />
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="pain-type">Тип боли клиента</Label>
                  <Select value={painType} onValueChange={setPainType}>
                    <SelectTrigger data-testid="select-pain-type">
                      <SelectValue placeholder="Выберите тему" />
                    </SelectTrigger>
                    <SelectContent>
                      {PAIN_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="offer-type">Желаемое предложение</Label>
                  <Select value={offerType} onValueChange={setOfferType}>
                    <SelectTrigger data-testid="select-offer-type">
                      <SelectValue placeholder="Куда закрыть?" />
                    </SelectTrigger>
                    <SelectContent>
                      {OFFER_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="expert-draft">Твой черновик ответа</Label>
                <Textarea
                  id="expert-draft"
                  data-testid="input-expert-draft"
                  placeholder="Напиши как ты обычно отвечаешь на такой вопрос..."
                  value={expertDraft}
                  onChange={(e) => setExpertDraft(e.target.value)}
                  className="min-h-[120px] border-purple-200 focus:border-purple-400"
                />
              </div>

              <Button
                onClick={handleGenerate}
                disabled={generateMutation.isPending || (limitInfo && !limitInfo.allowed)}
                data-testid="button-generate"
                className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
              >
                {generateMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Генерирую...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Улучшить ответ
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {improvedAnswer && (
            <Card className="border-2 border-green-200 bg-green-50/50 dark:bg-green-950/20">
              <CardHeader>
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <CardTitle className="flex items-center gap-2 text-green-700 dark:text-green-400">
                    <Sparkles className="h-5 w-5" />
                    Улучшенный ответ
                  </CardTitle>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCopy}
                    data-testid="button-copy"
                    className="border-green-300"
                  >
                    {copied ? (
                      <>
                        <Check className="mr-2 h-4 w-4" />
                        Скопировано
                      </>
                    ) : (
                      <>
                        <Copy className="mr-2 h-4 w-4" />
                        Копировать
                      </>
                    )}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div
                  className="whitespace-pre-wrap text-foreground bg-white dark:bg-card p-4 rounded-md border"
                  data-testid="text-improved-answer"
                >
                  {improvedAnswer}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-4">
          <Card className="border-purple-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Clock className="h-5 w-5 text-purple-500" />
                История
              </CardTitle>
            </CardHeader>
            <CardContent>
              {sessionsLoading ? (
                <div className="flex justify-center py-4">
                  <Loader2 className="h-6 w-6 animate-spin text-purple-500" />
                </div>
              ) : sessions && sessions.length > 0 ? (
                <div className="space-y-3 max-h-[500px] overflow-y-auto">
                  {sessions.slice(0, 10).map((session) => (
                    <button
                      key={session.id}
                      onClick={() => loadSession(session)}
                      data-testid={`button-session-${session.id}`}
                      className="w-full text-left p-3 rounded-md border border-purple-100 hover-elevate transition-colors"
                    >
                      <p className="text-sm font-medium text-foreground line-clamp-2">
                        {session.clientQuestion}
                      </p>
                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        {session.painType && (
                          <Badge variant="outline" className="text-xs">
                            {PAIN_TYPES.find((t) => t.value === session.painType)?.label || session.painType}
                          </Badge>
                        )}
                        <span className="text-xs text-muted-foreground">
                          {session.createdAt && new Date(session.createdAt).toLocaleDateString("ru-RU")}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Ещё нет сохранённых ответов
                </p>
              )}
            </CardContent>
          </Card>

          <Card className="border-amber-200 bg-amber-50/50 dark:bg-amber-950/20">
            <CardHeader>
              <CardTitle className="text-lg text-amber-700 dark:text-amber-400">Советы</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-amber-800 dark:text-amber-300 space-y-2">
              <p>1. Начни с эмпатии — покажи что понимаешь боль клиента</p>
              <p>2. Дай частичный ответ — оставь интригу</p>
              <p>3. Предложи конкретный продукт с выгодами</p>
              <p>4. Добавь призыв к действию</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
