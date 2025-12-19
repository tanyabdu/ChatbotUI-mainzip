import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dna, Loader2, Printer, Coins, Flame, Sparkles, Save, Check, History, Trash2, Lock, Crown } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { ContentStrategy, ContentPost } from "@shared/schema";

interface GenerationLimit {
  allowed: boolean;
  reason?: string;
  remaining?: number;
}

type ContentGoal = "sale" | "engagement";
type DaysCount = "today" | "3" | "7" | "14" | "30";
type StrategyType = "general" | "launch";

interface ContentDay {
  day: number;
  title: string;
  type: string;
  content: string;
  hashtags: string[];
}

interface ContentGeneratorProps {
  archetypeActive?: boolean;
  onGenerate?: (data: {
    goal: ContentGoal;
    niche: string;
    days: DaysCount;
    product?: string;
    strategy?: StrategyType;
  }) => void;
}

export default function ContentGenerator({ archetypeActive = false, onGenerate }: ContentGeneratorProps) {
  const [goal, setGoal] = useState<ContentGoal>("sale");
  const [niche, setNiche] = useState("");
  const [days, setDays] = useState<DaysCount>("today");
  const [product, setProduct] = useState("");
  const [strategy, setStrategy] = useState<StrategyType>("general");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedContent, setGeneratedContent] = useState<ContentDay[]>([]);
  const [saved, setSaved] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const { toast } = useToast();

  const { data: generationLimit } = useQuery<GenerationLimit>({
    queryKey: ["/api/generation-limit"],
  });

  const { data: savedStrategies = [] } = useQuery<ContentStrategy[]>({
    queryKey: ["/api/strategies"],
  });

  const saveMutation = useMutation({
    mutationFn: async (data: { topic: string; goal: string; days: number; posts: ContentPost[] }) => {
      return apiRequest("POST", "/api/strategies", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/strategies"] });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/strategies/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/strategies"] });
    },
  });

  const getDaysNumber = (daysValue: DaysCount): number => {
    if (daysValue === "today") return 1;
    return parseInt(daysValue);
  };

  const handleSaveStrategy = () => {
    const posts: ContentPost[] = generatedContent.map(day => ({
      day: day.day,
      topic: day.title,
      hook: day.content,
      cta: day.type,
      hashtags: day.hashtags,
    }));

    saveMutation.mutate({
      topic: niche,
      goal: goal,
      days: getDaysNumber(days),
      posts: posts,
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (generationLimit && !generationLimit.allowed) {
      toast({
        title: "Лимит достигнут",
        description: generationLimit.reason,
        variant: "destructive",
      });
      return;
    }
    
    setIsGenerating(true);
    setSaved(false);
    
    onGenerate?.({
      goal,
      niche,
      days,
      product: goal === "sale" ? product : undefined,
      strategy: goal === "sale" ? strategy : undefined,
    });

    setTimeout(() => {
      setIsGenerating(false);
      setGeneratedContent([
        {
          day: 1,
          title: "Энергетический старт недели",
          type: "Экспертный пост",
          content: "Начните неделю с очищения энергетического поля. Сегодня Луна благоприятствует новым начинаниям...",
          hashtags: ["#таро", "#энергия", "#новоеначало"],
        },
        {
          day: 2,
          title: "Личная история трансформации",
          type: "Сторителлинг",
          content: "Расскажу вам историю одной клиентки, которая пришла ко мне в полном отчаянии...",
          hashtags: ["#трансформация", "#кейс", "#результат"],
        },
        {
          day: 3,
          title: "Прогрев к продаже",
          type: "Продающий контент",
          content: "Открываю набор на индивидуальную работу. Только 5 мест для глубокой трансформации...",
          hashtags: ["#консультация", "#таролог", "#запись"],
        },
      ]);
      queryClient.invalidateQueries({ queryKey: ["/api/generation-limit"] });
    }, 1500);
  };

  const limitReached = generationLimit && !generationLimit.allowed;
  const isPro = generationLimit?.remaining === -1;

  return (
    <section className="fade-in space-y-8">
      <Card className="relative overflow-visible bg-white border-2 border-purple-300 shadow-lg">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-40 h-40 bg-gradient-to-br from-purple-300 to-pink-300 rounded-full blur-3xl opacity-30 pointer-events-none" />
        
        <div className="absolute top-4 right-4 flex flex-col gap-2 items-end">
          {archetypeActive && (
            <Badge 
              variant="secondary" 
              className="bg-purple-100 text-purple-700 border-2 border-purple-400"
            >
              <Dna className="h-3 w-3 mr-1" />
              Архетип активен
            </Badge>
          )}
          {isPro ? (
            <Badge className="bg-gradient-to-r from-purple-500 to-pink-500 text-white border-0">
              <Crown className="h-3 w-3 mr-1" />
              PRO - Безлимит
            </Badge>
          ) : limitReached ? (
            <Badge variant="destructive" className="border-2 border-red-400">
              <Lock className="h-3 w-3 mr-1" />
              Лимит исчерпан
            </Badge>
          ) : (
            <Badge variant="outline" className="text-purple-600 border-2 border-purple-300">
              Осталось: {generationLimit?.remaining ?? 1} генерация
            </Badge>
          )}
        </div>
        
        <CardHeader>
          <CardTitle className="text-2xl font-mystic font-semibold text-purple-700">
            Настройки Стратегии
          </CardTitle>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
            <div>
              <Label className="block text-sm font-medium text-muted-foreground mb-3">
                Цель контента
              </Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <label className="cursor-pointer group">
                  <input
                    type="radio"
                    name="contentGoal"
                    value="sale"
                    checked={goal === "sale"}
                    onChange={() => setGoal("sale")}
                    className="peer sr-only"
                    data-testid="radio-goal-sale"
                  />
                  <div className="p-4 rounded-xl bg-white border-2 border-purple-200 peer-checked:border-purple-500 peer-checked:bg-purple-50 transition text-center hover-elevate h-full flex flex-col justify-center items-center shadow-md">
                    <Coins className="h-8 w-8 mb-2 text-amber-500" />
                    <div className="font-bold text-purple-700 text-lg">Продажа</div>
                    <div className="text-xs text-purple-500 mt-1">Запуски, услуги, консультации</div>
                  </div>
                </label>
                <label className="cursor-pointer group">
                  <input
                    type="radio"
                    name="contentGoal"
                    value="engagement"
                    checked={goal === "engagement"}
                    onChange={() => setGoal("engagement")}
                    className="peer sr-only"
                    data-testid="radio-goal-engagement"
                  />
                  <div className="p-4 rounded-xl bg-white border-2 border-pink-200 peer-checked:border-pink-500 peer-checked:bg-pink-50 transition text-center hover-elevate h-full flex flex-col justify-center items-center shadow-md">
                    <Flame className="h-8 w-8 mb-2 text-orange-500" />
                    <div className="font-bold text-pink-700 text-lg">Охваты и Вовлечение</div>
                    <div className="text-xs text-pink-500 mt-1">Лайки, комменты, доверие</div>
                  </div>
                </label>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label htmlFor="niche" className="block text-sm font-medium text-muted-foreground mb-2">
                  Ниша и Направление
                </Label>
                <Input
                  id="niche"
                  data-testid="input-niche"
                  placeholder="Напр: Таролог, Астролог, Нумеролог"
                  value={niche}
                  onChange={(e) => setNiche(e.target.value)}
                  required
                  className="bg-white border-2 border-purple-300 focus:border-purple-500"
                />
              </div>
              <div>
                <Label htmlFor="daysCount" className="block text-sm font-medium text-muted-foreground mb-2">
                  Количество дней / Режим
                </Label>
                <Select value={days} onValueChange={(v) => setDays(v as DaysCount)}>
                  <SelectTrigger data-testid="select-days" className="bg-white border-2 border-purple-300">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="today">★ Сегодня (Я в потоке)</SelectItem>
                    <SelectItem value="3">3 Дня (Тест)</SelectItem>
                    <SelectItem value="7">7 Дней (Неделя)</SelectItem>
                    <SelectItem value="14">14 Дней (Прогрев)</SelectItem>
                    <SelectItem value="30">30 Дней (Месяц)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {goal === "sale" && (
              <>
                <div className="transition-all duration-300">
                  <Label htmlFor="productDescription" className="block text-sm font-medium text-muted-foreground mb-2">
                    Что продаем? (Описание продукта)
                  </Label>
                  <Textarea
                    id="productDescription"
                    data-testid="textarea-product"
                    placeholder="Опишите ваш продукт, курс или консультацию..."
                    value={product}
                    onChange={(e) => setProduct(e.target.value)}
                    required
                    className="bg-white border-2 border-purple-300 focus:border-purple-500"
                    rows={2}
                  />
                </div>

                <div className="transition-all duration-300">
                  <Label htmlFor="strategyType" className="block text-sm font-medium text-muted-foreground mb-2">
                    Тип Стратегии Продаж
                  </Label>
                  <Select value={strategy} onValueChange={(v) => setStrategy(v as StrategyType)}>
                    <SelectTrigger data-testid="select-strategy" className="bg-white border-2 border-purple-300">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="general">Сбалансированный (Экспертность + Личность + Продажи)</SelectItem>
                      <SelectItem value="launch">Прогрев к запуску (Структура запуска)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            {limitReached ? (
              <div className="space-y-3">
                <div className="p-4 bg-red-50 border-2 border-red-300 rounded-xl text-center">
                  <Lock className="h-6 w-6 text-red-500 mx-auto mb-2" />
                  <p className="text-red-700 font-medium">Дневной лимит исчерпан</p>
                  <p className="text-red-500 text-sm">Бесплатный тариф: 1 генерация в сутки</p>
                </div>
                <Button
                  type="button"
                  data-testid="button-upgrade-pro"
                  className="w-full py-6 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold rounded-xl shadow-lg border-2 border-purple-400"
                  onClick={() => window.location.href = "/grimoire"}
                >
                  <Crown className="h-5 w-5 mr-2" />
                  Перейти на PRO - Безлимитный доступ
                </Button>
              </div>
            ) : (
              <Button
                type="submit"
                data-testid="button-generate"
                disabled={isGenerating || !niche}
                className="w-full py-6 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-bold rounded-xl shadow-lg border-2 border-purple-400"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                    Генерирую стратегию...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-5 w-5 mr-2" />
                    Создать Стратегию
                  </>
                )}
              </Button>
            )}
          </form>
        </CardContent>
      </Card>

      {generatedContent.length > 0 && (
        <div className="space-y-6 fade-in">
          <div className="flex justify-between items-center border-b-2 border-purple-300 pb-4 flex-wrap gap-2">
            <h2 className="text-3xl font-mystic text-purple-700">Ваш Контент-План</h2>
            <div className="flex gap-2 flex-wrap">
              <Button 
                variant="ghost" 
                size="sm"
                data-testid="button-print"
                onClick={() => window.print()}
              >
                <Printer className="h-4 w-4 mr-1" />
                Печать
              </Button>
              <Button
                size="sm"
                data-testid="button-save-strategy"
                onClick={handleSaveStrategy}
                disabled={saveMutation.isPending || saved}
                className="bg-gradient-to-r from-purple-500 to-pink-500 text-white"
              >
                {saved ? (
                  <>
                    <Check className="h-4 w-4 mr-1" />
                    Сохранено!
                  </>
                ) : saveMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                    Сохраняю...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-1" />
                    Сохранить
                  </>
                )}
              </Button>
            </div>
          </div>
          
          <div className="space-y-6">
            {generatedContent.map((day) => (
              <Card key={day.day} className="bg-white border-2 border-purple-300 shadow-md">
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-3 flex-wrap">
                    <Badge variant="secondary" className="bg-purple-100 text-purple-700 border-2 border-purple-400">
                      День {day.day}
                    </Badge>
                    <Badge variant="outline" className="text-purple-600 border-2 border-pink-300">
                      {day.type}
                    </Badge>
                  </div>
                  <CardTitle className="text-xl font-mystic text-purple-700 mt-2">
                    {day.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-4">{day.content}</p>
                  <div className="flex flex-wrap gap-2">
                    {day.hashtags.map((tag) => (
                      <Badge key={tag} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {savedStrategies.length > 0 && (
        <Card className="fade-in bg-white border-2 border-purple-300 shadow-md">
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <CardTitle className="text-xl font-mystic text-purple-700 flex items-center gap-2">
              <History className="h-5 w-5 text-pink-500" />
              Сохранённые стратегии ({savedStrategies.length})
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowHistory(!showHistory)}
              data-testid="button-toggle-strategy-history"
            >
              {showHistory ? "Скрыть" : "Показать"}
            </Button>
          </CardHeader>
          {showHistory && (
            <CardContent className="space-y-4">
              {savedStrategies.map((strat) => (
                <Card key={strat.id} className="bg-purple-50 border-2 border-purple-200">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start gap-2 mb-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="secondary" className="bg-purple-100 text-purple-700 border border-purple-300">
                          {strat.topic}
                        </Badge>
                        <Badge variant="outline" className="text-pink-600 border-pink-300">
                          {strat.goal === "sale" ? "Продажи" : "Вовлечение"}
                        </Badge>
                        <Badge variant="outline" className="text-purple-500 border-purple-300">
                          {strat.days} {strat.days === 1 ? "день" : strat.days < 5 ? "дня" : "дней"}
                        </Badge>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteMutation.mutate(strat.id)}
                        data-testid={`button-delete-strategy-${strat.id}`}
                        className="text-red-500"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="space-y-2">
                      {strat.posts.slice(0, 2).map((post, idx) => (
                        <div key={idx} className="text-sm text-purple-600 bg-white p-2 rounded border border-purple-100">
                          <span className="font-medium">День {post.day}:</span> {post.topic}
                        </div>
                      ))}
                      {strat.posts.length > 2 && (
                        <p className="text-xs text-purple-500">+ ещё {strat.posts.length - 2} дней...</p>
                      )}
                    </div>
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
