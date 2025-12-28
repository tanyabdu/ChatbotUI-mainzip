import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dna, Loader2, Printer, Coins, Flame, Sparkles, Save, Check, History, Trash2, Lock, Crown, AlertCircle, Image } from "lucide-react";
import { useLocation } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { ContentStrategy, ContentPost, ArchetypeResult } from "@shared/schema";
import type { ArchetypeProfile } from "@/components/ArchetypeQuiz";
import { archetypesData } from "@/lib/archetypes";

interface GenerationLimit {
  allowed: boolean;
  reason?: string;
  remaining?: number;
}

type ContentGoal = "sale" | "engagement";
type DaysCount = "today" | "3" | "7" | "14" | "30";
type StrategyType = "general" | "launch";

interface FormatContent {
  content: string;
  hashtags: string[];
}

interface ContentDay {
  day: number;
  idea: string;
  type: string;
  post: FormatContent;
  carousel: FormatContent;
  reels: FormatContent;
  stories: FormatContent;
}

// New: Simple idea structure for step 1
interface ContentIdea {
  day: number;
  idea: string;
  type: string;
}

// Context saved from step 1 for use in step 2
interface GenerationContext {
  goal: ContentGoal;
  niche: string;
  product?: string;
  archetype?: { 
    name: string; 
    description: string; 
    recommendations: string[];
    triggerWords?: string[];
    contentStyle?: string[];
    tone?: string;
  };
}

type FormatType = "post" | "carousel" | "reels" | "stories";

interface ContentGeneratorProps {
  archetypeActive?: boolean;
  archetypeData?: ArchetypeResult;
  localArchetypeProfile?: ArchetypeProfile;
  onGenerate?: (data: {
    goal: ContentGoal;
    niche: string;
    days: DaysCount;
    product?: string;
    strategy?: StrategyType;
  }) => void;
}

export default function ContentGenerator({ archetypeActive = false, archetypeData, localArchetypeProfile, onGenerate }: ContentGeneratorProps) {
  const [, setLocation] = useLocation();
  const [goal, setGoal] = useState<ContentGoal>("sale");
  const [niche, setNiche] = useState("");
  const [days, setDays] = useState<DaysCount>("today");
  const [product, setProduct] = useState("");
  const [strategy, setStrategy] = useState<StrategyType>("general");
  const [isGenerating, setIsGenerating] = useState(false);
  
  // Two-step generation state
  const [generatedIdeas, setGeneratedIdeas] = useState<ContentIdea[]>([]);
  const [generationContext, setGenerationContext] = useState<GenerationContext | null>(null);
  const [generatedFormats, setGeneratedFormats] = useState<Record<string, FormatContent>>({}); // key: "day-format"
  const [loadingFormats, setLoadingFormats] = useState<Record<string, boolean>>({}); // key: "day-format"
  
  // Legacy state for saved strategies display
  const [generatedContent, setGeneratedContent] = useState<ContentDay[]>([]);
  const [activeFormats, setActiveFormats] = useState<Record<number, FormatType>>({});
  const [saved, setSaved] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [error, setError] = useState<string | null>(null);
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

  // Step 1: Generate ideas only (fast)
  const generateIdeasMutation = useMutation({
    mutationFn: async (data: {
      goal: ContentGoal;
      niche: string;
      days: DaysCount;
      product?: string;
      strategy?: StrategyType;
      archetype?: { name: string; description: string; recommendations: string[]; triggerWords?: string[]; contentStyle?: string[]; tone?: string };
    }) => {
      const response = await apiRequest("POST", "/api/strategies/generate-ideas", data);
      return response.json();
    },
    onSuccess: (data) => {
      setGeneratedIdeas(data.ideas);
      setGenerationContext(data.context);
      setGeneratedFormats({});
      setLoadingFormats({});
      setIsGenerating(false);
      setError(null);
      setTimeout(() => {
        const element = document.getElementById('generated-content-plan');
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100);
      queryClient.invalidateQueries({ queryKey: ["/api/generation-limit"] });
    },
    onError: (err: Error) => {
      setError(`Ошибка генерации: ${err.message}`);
      setIsGenerating(false);
    },
  });

  // Step 2: Generate single format (on demand)
  const generateFormatMutation = useMutation({
    mutationFn: async (data: {
      goal: ContentGoal;
      niche: string;
      product?: string;
      idea: string;
      type: string;
      format: FormatType;
      archetype?: { name: string; description: string; recommendations: string[]; triggerWords?: string[]; contentStyle?: string[]; tone?: string };
      dayNum: number; // for state tracking
    }) => {
      const response = await apiRequest("POST", "/api/strategies/generate-format", {
        goal: data.goal,
        niche: data.niche,
        product: data.product,
        idea: data.idea,
        type: data.type,
        format: data.format,
        archetype: data.archetype,
      });
      const result = await response.json();
      return { ...result, dayNum: data.dayNum, format: data.format };
    },
    onSuccess: (data) => {
      const key = `${data.dayNum}-${data.format}`;
      setGeneratedFormats(prev => ({ ...prev, [key]: data.content }));
      setLoadingFormats(prev => ({ ...prev, [key]: false }));
    },
    onError: (err: Error, variables) => {
      const key = `${variables.dayNum}-${variables.format}`;
      setLoadingFormats(prev => ({ ...prev, [key]: false }));
      toast({
        title: "Ошибка",
        description: `Не удалось сгенерировать контент: ${err.message}`,
        variant: "destructive",
      });
    },
  });

  // Legacy mutation (keep for compatibility)
  const generateMutation = useMutation({
    mutationFn: async (data: {
      goal: ContentGoal;
      niche: string;
      days: DaysCount;
      product?: string;
      strategy?: StrategyType;
      archetype?: { name: string; description: string; recommendations: string[]; triggerWords?: string[]; contentStyle?: string[]; tone?: string };
    }) => {
      const response = await apiRequest("POST", "/api/strategies/generate", data);
      return response.json();
    },
    onSuccess: (data) => {
      setGeneratedContent(data.content);
      setActiveFormats({});
      setIsGenerating(false);
      setError(null);
      queryClient.invalidateQueries({ queryKey: ["/api/generation-limit"] });
    },
    onError: (err: Error) => {
      setError(`Ошибка генерации: ${err.message}`);
      setIsGenerating(false);
    },
  });

  const getDaysNumber = (daysValue: DaysCount): number => {
    if (daysValue === "today") return 1;
    return parseInt(daysValue);
  };

  const getActiveFormat = (dayNum: number): FormatType => {
    return activeFormats[dayNum] || "post";
  };

  const getFormatContent = (day: ContentDay, format: FormatType): FormatContent => {
    const content = day[format];
    if (content && content.content) {
      return content;
    }
    // Fallback to post if format is missing
    if (day.post && day.post.content) {
      return day.post;
    }
    // Ultimate fallback
    return { content: "Контент недоступен", hashtags: [] };
  };

  const setDayFormat = (dayNum: number, format: FormatType) => {
    setActiveFormats(prev => ({ ...prev, [dayNum]: format }));
  };

  const formatLabels: Record<FormatType, string> = {
    post: "Пост",
    carousel: "Карусель",
    reels: "Рилс",
    stories: "Сторис",
  };

  // Handler for generating a specific format
  const handleGenerateFormat = (idea: ContentIdea, format: FormatType) => {
    if (!generationContext) return;
    
    const key = `${idea.day}-${format}`;
    
    // Skip if already loaded or loading
    if (generatedFormats[key] || loadingFormats[key]) return;
    
    setLoadingFormats(prev => ({ ...prev, [key]: true }));
    
    generateFormatMutation.mutate({
      goal: generationContext.goal,
      niche: generationContext.niche,
      product: generationContext.product,
      idea: idea.idea,
      type: idea.type,
      format: format,
      archetype: generationContext.archetype,
      dayNum: idea.day,
    });
  };

  // Check if format content is available
  const getFormatForIdea = (dayNum: number, format: FormatType): FormatContent | null => {
    const key = `${dayNum}-${format}`;
    return generatedFormats[key] || null;
  };

  // Check if format is loading
  const isFormatLoading = (dayNum: number, format: FormatType): boolean => {
    const key = `${dayNum}-${format}`;
    return loadingFormats[key] || false;
  };

  const handleSaveStrategy = () => {
    const posts: ContentPost[] = generatedContent.map(day => ({
      day: day.day,
      idea: day.idea,
      type: day.type,
      post: day.post,
      carousel: day.carousel,
      reels: day.reels,
      stories: day.stories,
    }));

    saveMutation.mutate({
      topic: niche,
      goal: goal,
      days: getDaysNumber(days),
      posts: posts,
    });
  };

  const createEmptyFormat = (): FormatContent => ({ content: "", hashtags: [] });

  const handleSaveToGrimoire = () => {
    const posts: ContentPost[] = generatedIdeas.map(idea => ({
      day: idea.day,
      idea: idea.idea,
      type: idea.type,
      post: generatedFormats[`${idea.day}-post`] || createEmptyFormat(),
      carousel: generatedFormats[`${idea.day}-carousel`] || createEmptyFormat(),
      reels: generatedFormats[`${idea.day}-reels`] || createEmptyFormat(),
      stories: generatedFormats[`${idea.day}-stories`] || createEmptyFormat(),
    }));

    saveMutation.mutate({
      topic: generationContext?.niche || niche,
      goal: generationContext?.goal || goal,
      days: getDaysNumber(days),
      posts: posts,
    });
  };

  const hasAnyGeneratedFormat = () => {
    return Object.keys(generatedFormats).length > 0;
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
    setError(null);
    setGeneratedIdeas([]);
    setGeneratedFormats({});
    setLoadingFormats({});
    
    const getArchetypeDataForGeneration = () => {
      if (!archetypeActive) return undefined;
      
      const primaryArchetypeName = archetypeData?.archetypeName?.split('-')[0] || 
        localArchetypeProfile?.topArchetypes[0];
      
      const fullArchetype = primaryArchetypeName 
        ? Object.values(archetypesData).find(a => a.name === primaryArchetypeName)
        : undefined;
      
      if (archetypeData) {
        return {
          name: archetypeData.archetypeName,
          description: archetypeData.archetypeDescription,
          recommendations: archetypeData.recommendations || [],
          triggerWords: fullArchetype?.triggerWords || [],
          contentStyle: fullArchetype?.contentStyle || [],
          tone: fullArchetype?.brandVoice.tone || '',
        };
      }
      
      if (localArchetypeProfile) {
        return {
          name: localArchetypeProfile.topArchetypes.join('-'),
          description: localArchetypeProfile.description,
          recommendations: localArchetypeProfile.brandVoice.keywords || [],
          triggerWords: fullArchetype?.triggerWords || [],
          contentStyle: fullArchetype?.contentStyle || [],
          tone: localArchetypeProfile.brandVoice.tone || fullArchetype?.brandVoice.tone || '',
        };
      }
      
      return undefined;
    };

    const requestData = {
      goal,
      niche,
      days,
      product: goal === "sale" ? product : undefined,
      strategy: goal === "sale" ? strategy : undefined,
      archetype: getArchetypeDataForGeneration(),
    };
    
    onGenerate?.({ goal, niche, days, product: requestData.product, strategy: requestData.strategy });
    // Use new two-step generation
    generateIdeasMutation.mutate(requestData);
  };

  const limitReached = generationLimit && !generationLimit.allowed;
  const isPro = generationLimit?.remaining === -1;

  return (
    <section className="fade-in space-y-8">
      <Card className="relative overflow-visible bg-white border-2 border-purple-300 shadow-lg">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-40 h-40 bg-gradient-to-br from-purple-300 to-pink-300 rounded-full blur-3xl opacity-30 pointer-events-none" />
        
        <CardHeader className="pb-2">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <CardTitle className="text-2xl font-mystic font-semibold text-purple-700">
              Настройки Стратегии
            </CardTitle>
            <div className="flex flex-wrap gap-2">
              {archetypeActive && (
                <Badge 
                  variant="secondary" 
                  className="bg-purple-100 text-purple-700 border-2 border-purple-400 text-xs"
                >
                  <Dna className="h-3 w-3 mr-1" />
                  Архетип
                </Badge>
              )}
              {isPro ? (
                <Badge className="bg-gradient-to-r from-purple-500 to-pink-500 text-white border-0 text-xs">
                  <Crown className="h-3 w-3 mr-1" />
                  PRO
                </Badge>
              ) : limitReached ? (
                <Badge variant="destructive" className="border-2 border-red-400 text-xs">
                  <Lock className="h-3 w-3 mr-1" />
                  Лимит
                </Badge>
              ) : (
                <Badge variant="outline" className="text-purple-600 border-2 border-purple-300 text-xs">
                  Осталось: {generationLimit?.remaining ?? 1}
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
                <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}
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
              <div className="space-y-3">
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
                {isGenerating && (
                  <p className="text-center text-sm text-purple-600 animate-pulse">
                    Генерирую идеи для контента... (10-20 секунд)
                  </p>
                )}
              </div>
            )}
          </form>
        </CardContent>
      </Card>

      {/* Two-step generation: Show ideas with format buttons */}
      {generatedIdeas.length > 0 && (
        <div id="generated-content-plan" className="space-y-6 fade-in">
          <div className="flex justify-between items-center border-b-2 border-purple-300 pb-4 flex-wrap gap-2">
            <h2 className="text-3xl font-mystic text-purple-700">Ваш Контент-План</h2>
            <div className="flex gap-2 items-center">
              <p className="text-sm text-purple-600 hidden sm:block">Нажмите на формат, чтобы сгенерировать контент</p>
              <Button
                size="sm"
                onClick={handleSaveToGrimoire}
                disabled={saveMutation.isPending || saved || !hasAnyGeneratedFormat()}
                className="bg-gradient-to-r from-purple-500 to-pink-500 text-white disabled:opacity-50"
                title={!hasAnyGeneratedFormat() ? "Сначала сгенерируйте хотя бы один формат" : ""}
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
                    Сохранить в Гримуар
                  </>
                )}
              </Button>
            </div>
          </div>
          
          <div className="space-y-6">
            {generatedIdeas.map((idea) => {
              const activeFormat = getActiveFormat(idea.day);
              const formatContent = getFormatForIdea(idea.day, activeFormat);
              const isLoading = isFormatLoading(idea.day, activeFormat);
              
              return (
                <Card key={idea.day} className="bg-white border-2 border-purple-300 shadow-md">
                  <CardHeader className="pb-2">
                    <div className="flex items-center gap-3 flex-wrap">
                      <Badge variant="secondary" className="bg-purple-100 text-purple-700 border-2 border-purple-400">
                        День {idea.day}
                      </Badge>
                      <Badge variant="outline" className="text-purple-600 border-2 border-pink-300">
                        {idea.type}
                      </Badge>
                    </div>
                    <CardTitle className="text-xl font-mystic text-purple-700 mt-2">
                      💡 {idea.idea}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Format Buttons - click to generate */}
                    <div className="flex gap-2 flex-wrap">
                      {(["post", "carousel", "reels", "stories"] as FormatType[]).map((format) => {
                        const hasContent = !!getFormatForIdea(idea.day, format);
                        const formatLoading = isFormatLoading(idea.day, format);
                        const isActive = activeFormat === format;
                        
                        return (
                          <Button
                            key={format}
                            size="sm"
                            variant={isActive ? "default" : "outline"}
                            disabled={formatLoading}
                            onClick={() => {
                              setDayFormat(idea.day, format);
                              if (!hasContent && !formatLoading) {
                                handleGenerateFormat(idea, format);
                              }
                            }}
                            className={
                              isActive ? 
                                format === "reels" ? "bg-gradient-to-r from-pink-500 to-red-500 text-white" :
                                format === "stories" ? "bg-gradient-to-r from-purple-500 to-indigo-500 text-white" :
                                format === "carousel" ? "bg-gradient-to-r from-orange-500 to-amber-500 text-white" :
                                "bg-gradient-to-r from-blue-500 to-cyan-500 text-white"
                              : hasContent 
                                ? "border-green-400 text-green-700 bg-green-50"
                                : "border-purple-300 text-purple-600"
                            }
                          >
                            {formatLoading ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : hasContent ? (
                              <>
                                <Check className="h-3 w-3 mr-1" />
                                {formatLabels[format]}
                              </>
                            ) : (
                              formatLabels[format]
                            )}
                          </Button>
                        );
                      })}
                    </div>
                    
                    {/* Content Display */}
                    {isLoading ? (
                      <div className="bg-purple-50 rounded-lg p-8 border border-purple-200 flex flex-col items-center justify-center">
                        <Loader2 className="h-8 w-8 animate-spin text-purple-500 mb-2" />
                        <p className="text-purple-600 text-sm">Генерирую {formatLabels[activeFormat].toLowerCase()}... (20-40 сек)</p>
                      </div>
                    ) : formatContent ? (
                      <>
                        <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
                          <p className="text-gray-700 whitespace-pre-line">{formatContent.content}</p>
                        </div>
                        
                        {/* Hashtags */}
                        {formatContent.hashtags && formatContent.hashtags.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {formatContent.hashtags.map((tag, idx) => (
                              <Badge key={`${tag}-${idx}`} variant="secondary" className="text-xs bg-purple-100 text-purple-700">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="bg-gray-50 rounded-lg p-6 border border-gray-200 text-center">
                        <Sparkles className="h-8 w-8 text-purple-400 mx-auto mb-2" />
                        <p className="text-gray-500">Нажмите на кнопку формата выше, чтобы сгенерировать контент</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Legacy: Show old format content for saved strategies */}
      {generatedContent.length > 0 && generatedIdeas.length === 0 && (
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
            {generatedContent.map((day) => {
              const activeFormat = getActiveFormat(day.day);
              const currentContent = getFormatContent(day, activeFormat);
              
              return (
                <Card key={day.day} className="bg-white border-2 border-purple-300 shadow-md">
                  <CardHeader className="pb-2">
                    <div className="flex items-center gap-3 flex-wrap">
                      <Badge variant="secondary" className="bg-purple-100 text-purple-700 border-2 border-purple-400">
                        День {day.day}
                      </Badge>
                      <Badge variant="outline" className="text-purple-600 border-2 border-pink-300">
                        {day.type || "Контент"}
                      </Badge>
                    </div>
                    <CardTitle className="text-xl font-mystic text-purple-700 mt-2">
                      💡 {day.idea || `Идея дня ${day.day}`}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Format Buttons */}
                    <div className="flex gap-2 flex-wrap">
                      {(["post", "carousel", "reels", "stories"] as FormatType[]).map((format) => (
                        <Button
                          key={format}
                          size="sm"
                          variant={activeFormat === format ? "default" : "outline"}
                          onClick={() => setDayFormat(day.day, format)}
                          className={activeFormat === format ? 
                            format === "reels" ? "bg-gradient-to-r from-pink-500 to-red-500 text-white" :
                            format === "stories" ? "bg-gradient-to-r from-purple-500 to-indigo-500 text-white" :
                            format === "carousel" ? "bg-gradient-to-r from-orange-500 to-amber-500 text-white" :
                            "bg-gradient-to-r from-blue-500 to-cyan-500 text-white"
                            : "border-purple-300 text-purple-600"
                          }
                        >
                          {formatLabels[format]}
                        </Button>
                      ))}
                    </div>
                    
                    {/* Content Display */}
                    <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
                      <p className="text-gray-700 whitespace-pre-line">{currentContent.content}</p>
                    </div>
                    
                    {/* Hashtags */}
                    {currentContent.hashtags && currentContent.hashtags.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {currentContent.hashtags.map((tag, idx) => (
                          <Badge key={`${tag}-${idx}`} variant="secondary" className="text-xs bg-purple-100 text-purple-700">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}
                    
                    {/* Carousel Button */}
                    {currentContent.content && currentContent.content.trim() && (
                      <Button
                        size="sm"
                        onClick={() => setLocation(`/image-editor?text=${encodeURIComponent(currentContent.content)}`)}
                        className="bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white"
                      >
                        <Image className="h-4 w-4 mr-2" />
                        Создать карусель
                      </Button>
                    )}
                  </CardContent>
                </Card>
              );
            })}
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
                          <span className="font-medium">День {post.day}:</span> {post.idea}
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
