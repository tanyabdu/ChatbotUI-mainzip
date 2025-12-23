import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { 
  User, BookOpen, Palette, CreditCard, Sparkles, 
  FileText, Mic, Archive, Wand2, LogOut, Home,
  Edit2, Check, X, Trash2, Copy, Gift
} from "lucide-react";
import { Link, useLocation } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { ContentStrategy, VoicePost, CaseStudy, ArchetypeResult } from "@shared/schema";

export default function Grimoire() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [editingNickname, setEditingNickname] = useState(false);
  const [nickname, setNickname] = useState(user?.nickname || "");
  const [viewingCase, setViewingCase] = useState<CaseStudy | null>(null);
  const [promocode, setPromocode] = useState("");

  const { data: strategies = [] } = useQuery<ContentStrategy[]>({
    queryKey: ["/api/strategies"],
  });

  const { data: voicePosts = [] } = useQuery<VoicePost[]>({
    queryKey: ["/api/voice-posts"],
  });

  const { data: caseStudies = [] } = useQuery<CaseStudy[]>({
    queryKey: ["/api/cases"],
  });

  const { data: archetypeResult } = useQuery<ArchetypeResult | null>({
    queryKey: ["/api/archetypes/latest"],
  });

  const updateNicknameMutation = useMutation({
    mutationFn: async (newNickname: string) => {
      return apiRequest("PATCH", "/api/auth/user", { nickname: newNickname });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      setEditingNickname(false);
    },
  });

  const deleteStrategyMutation = useMutation({
    mutationFn: async (id: string) => apiRequest("DELETE", `/api/strategies/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/strategies"] }),
  });

  const deleteVoicePostMutation = useMutation({
    mutationFn: async (id: string) => apiRequest("DELETE", `/api/voice-posts/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/voice-posts"] }),
  });

  const deleteCaseMutation = useMutation({
    mutationFn: async (id: string) => apiRequest("DELETE", `/api/cases/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/cases"] }),
  });

  const activatePromocodeMutation = useMutation({
    mutationFn: async (code: string) => {
      const response = await fetch("/api/promocode/activate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ code }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Ошибка при активации промокода");
      }
      return data;
    },
    onSuccess: (data) => {
      toast({
        title: "Успешно!",
        description: data.message,
      });
      setPromocode("");
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/access"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Ошибка",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const displayName = user?.nickname || user?.firstName || user?.email?.split("@")[0] || "Эксперт";
  const archetypeTitle = archetypeResult?.archetypeName || "Неизвестный";

  const [, setLocation] = useLocation();
  
  const isActiveMonthly = !!(user?.subscriptionTier === "monthly" && 
    user?.subscriptionExpiresAt && new Date(user.subscriptionExpiresAt) > new Date());
  const isActiveYearly = !!(user?.subscriptionTier === "yearly" && 
    user?.subscriptionExpiresAt && new Date(user.subscriptionExpiresAt) > new Date());
  
  const handleSelectPlan = () => {
    setLocation("/pricing");
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 to-white">
      <header className="border-b-2 border-purple-200 bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <Sparkles className="h-8 w-8 text-purple-600" />
            <h1 className="text-2xl font-mystic text-purple-700">Мой Гримуар</h1>
          </div>
          <div className="flex items-center gap-4">
            <Button variant="ghost" asChild data-testid="link-home">
              <Link href="/">
                <Home className="h-4 w-4 mr-2" />
                На главную
              </Link>
            </Button>
            <Button variant="outline" asChild data-testid="button-logout">
              <a href="/api/logout">
                <LogOut className="h-4 w-4 mr-2" />
                Выйти
              </a>
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8">
        <Tabs defaultValue="profile" className="space-y-8">
          <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-flex bg-purple-100 border-2 border-purple-200">
            <TabsTrigger value="profile" className="data-[state=active]:bg-purple-500 data-[state=active]:text-white">
              <User className="h-4 w-4 mr-2" />
              Профиль
            </TabsTrigger>
            <TabsTrigger value="library" className="data-[state=active]:bg-purple-500 data-[state=active]:text-white">
              <BookOpen className="h-4 w-4 mr-2" />
              Хранилище
            </TabsTrigger>
            <TabsTrigger value="brand" className="data-[state=active]:bg-purple-500 data-[state=active]:text-white">
              <Palette className="h-4 w-4 mr-2" />
              ДНК Бренда
            </TabsTrigger>
            <TabsTrigger value="subscription" className="data-[state=active]:bg-purple-500 data-[state=active]:text-white">
              <CreditCard className="h-4 w-4 mr-2" />
              Подписка
            </TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="space-y-6">
            <Card className="bg-white border-2 border-purple-300 shadow-lg">
              <CardHeader>
                <CardTitle className="text-xl font-mystic text-purple-700 flex items-center gap-2">
                  <User className="h-5 w-5 text-pink-500" />
                  Идентификация
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center gap-6 flex-wrap">
                  <Avatar className="h-24 w-24 border-4 border-purple-300">
                    <AvatarImage src={user?.profileImageUrl || ""} />
                    <AvatarFallback className="bg-gradient-to-br from-purple-400 to-pink-400 text-white text-2xl font-mystic">
                      {displayName.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      {editingNickname ? (
                        <>
                          <Input
                            value={nickname}
                            onChange={(e) => setNickname(e.target.value)}
                            className="border-purple-300"
                            placeholder="Ваш никнейм"
                            data-testid="input-nickname"
                          />
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => updateNicknameMutation.mutate(nickname)}
                            data-testid="button-save-nickname"
                          >
                            <Check className="h-4 w-4 text-green-500" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => setEditingNickname(false)}
                          >
                            <X className="h-4 w-4 text-red-500" />
                          </Button>
                        </>
                      ) : (
                        <>
                          <h2 className="text-2xl font-mystic text-purple-700">{displayName}</h2>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => {
                              setNickname(user?.nickname || "");
                              setEditingNickname(true);
                            }}
                            data-testid="button-edit-nickname"
                          >
                            <Edit2 className="h-4 w-4 text-purple-500" />
                          </Button>
                        </>
                      )}
                    </div>
                    <p className="text-purple-600 flex items-center gap-2">
                      <Wand2 className="h-4 w-4 text-pink-500" />
                      {archetypeTitle}
                    </p>
                    {user?.email && (
                      <p className="text-sm text-purple-500">{user.email}</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="library" className="space-y-6">
            <Card className="bg-white border-2 border-purple-300 shadow-lg">
              <CardHeader>
                <CardTitle className="text-xl font-mystic text-purple-700 flex items-center gap-2">
                  <FileText className="h-5 w-5 text-pink-500" />
                  Сохранённые Планы ({strategies.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {strategies.length === 0 ? (
                  <p className="text-purple-500 text-center py-8">
                    У вас пока нет сохранённых контент-планов
                  </p>
                ) : (
                  strategies.map((strategy) => (
                    <Card key={strategy.id} className="bg-purple-50 border border-purple-200">
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start gap-2 mb-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant="secondary" className="bg-purple-100 text-purple-700">
                              {strategy.topic}
                            </Badge>
                            <Badge variant="outline" className="text-pink-600 border-pink-300">
                              {strategy.days} дней
                            </Badge>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => deleteStrategyMutation.mutate(strategy.id)}
                            data-testid={`button-delete-strategy-${strategy.id}`}
                            className="text-red-500"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                        <p className="text-sm text-purple-600">
                          {strategy.posts.length} публикаций запланировано
                        </p>
                      </CardContent>
                    </Card>
                  ))
                )}
              </CardContent>
            </Card>

            <Card className="bg-white border-2 border-purple-300 shadow-lg">
              <CardHeader>
                <CardTitle className="text-xl font-mystic text-purple-700 flex items-center gap-2">
                  <Mic className="h-5 w-5 text-pink-500" />
                  Архив "Голос Потока" ({voicePosts.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {voicePosts.length === 0 ? (
                  <p className="text-purple-500 text-center py-8">
                    У вас пока нет сохранённых голосовых постов
                  </p>
                ) : (
                  voicePosts.map((post) => (
                    <Card key={post.id} className="bg-purple-50 border border-purple-200">
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start gap-2 mb-2">
                          <Badge variant="secondary" className="bg-pink-100 text-pink-700">
                            {post.tone}
                          </Badge>
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => navigator.clipboard.writeText(post.refinedText)}
                            >
                              <Copy className="h-4 w-4 text-purple-500" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => deleteVoicePostMutation.mutate(post.id)}
                              data-testid={`button-delete-voice-${post.id}`}
                              className="text-red-500"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        <p className="text-sm text-purple-600 line-clamp-2">
                          {post.refinedText}
                        </p>
                      </CardContent>
                    </Card>
                  ))
                )}
              </CardContent>
            </Card>

            <Card className="bg-white border-2 border-purple-300 shadow-lg">
              <CardHeader>
                <CardTitle className="text-xl font-mystic text-purple-700 flex items-center gap-2">
                  <Archive className="h-5 w-5 text-pink-500" />
                  Банк Кейсов ({caseStudies.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {caseStudies.length === 0 ? (
                  <p className="text-purple-500 text-center py-8">
                    У вас пока нет сохранённых кейсов
                  </p>
                ) : (
                  caseStudies.map((caseStudy) => (
                    <Card 
                      key={caseStudy.id} 
                      className="bg-purple-50 border border-purple-200 cursor-pointer hover:border-purple-400 transition-colors"
                      onClick={() => setViewingCase(caseStudy)}
                    >
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start gap-2 mb-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            {caseStudy.tags.slice(0, 3).map((tag) => (
                              <Badge key={tag} variant="secondary" className="bg-purple-100 text-purple-700">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteCaseMutation.mutate(caseStudy.id);
                            }}
                            data-testid={`button-delete-case-${caseStudy.id}`}
                            className="text-red-500"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                        <p className="text-sm text-purple-600 line-clamp-2">
                          {caseStudy.generatedQuote || caseStudy.reviewText}
                        </p>
                      </CardContent>
                    </Card>
                  ))
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="brand" className="space-y-6">
            <Card className="bg-white border-2 border-purple-300 shadow-lg">
              <CardHeader>
                <CardTitle className="text-xl font-mystic text-purple-700 flex items-center gap-2">
                  <Palette className="h-5 w-5 text-pink-500" />
                  ДНК Бренда
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {archetypeResult ? (
                  <>
                    <div>
                      <h3 className="text-lg font-mystic text-purple-700 mb-2">Ваш Архетип</h3>
                      <div className="p-4 bg-gradient-to-r from-purple-100 to-pink-100 rounded-lg border border-purple-200">
                        <h4 className="text-xl font-mystic text-purple-700 mb-2">
                          {archetypeResult.archetypeName}
                        </h4>
                        <p className="text-purple-600">{archetypeResult.archetypeDescription}</p>
                      </div>
                    </div>

                    {archetypeResult.brandColors && archetypeResult.brandColors.length > 0 && (
                      <div>
                        <h3 className="text-lg font-mystic text-purple-700 mb-2">Цвета Бренда</h3>
                        <div className="flex gap-4 flex-wrap">
                          {archetypeResult.brandColors.map((color, idx) => (
                            <div key={idx} className="text-center">
                              <div
                                className="w-16 h-16 rounded-lg border-2 border-purple-200 shadow-md"
                                style={{ backgroundColor: color }}
                              />
                              <code className="text-xs text-purple-600 mt-1 block">{color}</code>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {archetypeResult.brandFonts && archetypeResult.brandFonts.length > 0 && (
                      <div>
                        <h3 className="text-lg font-mystic text-purple-700 mb-2">Рекомендованные Шрифты</h3>
                        <div className="flex gap-4 flex-wrap">
                          {archetypeResult.brandFonts.map((font, idx) => (
                            <Badge key={idx} variant="outline" className="text-purple-600 border-purple-300">
                              {font}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    <div>
                      <h3 className="text-lg font-mystic text-purple-700 mb-2">Рекомендации</h3>
                      <ul className="space-y-2">
                        {archetypeResult.recommendations.map((rec, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-purple-600">
                            <Sparkles className="h-4 w-4 text-pink-500 mt-1 flex-shrink-0" />
                            {rec}
                          </li>
                        ))}
                      </ul>
                    </div>

                    <Button
                      variant="outline"
                      className="w-full border-purple-300 text-purple-600"
                      asChild
                    >
                      <Link href="/?tab=archetype">
                        <Wand2 className="h-4 w-4 mr-2" />
                        Пройти тест заново
                      </Link>
                    </Button>
                  </>
                ) : (
                  <div className="text-center py-8">
                    <Wand2 className="h-16 w-16 text-purple-300 mx-auto mb-4" />
                    <p className="text-purple-500 mb-4">
                      Вы ещё не прошли тест на архетип бренда
                    </p>
                    <Button
                      className="bg-gradient-to-r from-purple-500 to-pink-500 text-white"
                      asChild
                    >
                      <Link href="/?tab=archetype">
                        Пройти тест
                      </Link>
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="subscription" className="space-y-6">
            <Card className="bg-white border-2 border-purple-300 shadow-lg">
              <CardHeader>
                <CardTitle className="text-xl font-mystic text-purple-700 flex items-center gap-2">
                  <CreditCard className="h-5 w-5 text-pink-500" />
                  Тарифы
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6 max-w-2xl mx-auto">
                  <SubscriptionTier
                    name="Месячный"
                    price="990 ₽/мес"
                    features={[
                      "Генератор контент-стратегий",
                      "Квиз архетипов бренда",
                      "Голосовые посты с ИИ",
                      "Гримуар кейсов",
                      "Лунный календарь",
                      "Тренажёр продаж",
                    ]}
                    current={isActiveMonthly}
                    onSelect={handleSelectPlan}
                  />
                  <SubscriptionTier
                    name="Годовой"
                    price="3990 ₽/год"
                    features={[
                      "Все функции месячного тарифа",
                      "Экономия 7 890₽ в год",
                      "Выгоднее на 66%",
                    ]}
                    current={isActiveYearly}
                    badge="Выгодно"
                    onSelect={handleSelectPlan}
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white border-2 border-purple-300 shadow-lg">
              <CardHeader>
                <CardTitle className="text-xl font-mystic text-purple-700 flex items-center gap-2">
                  <Gift className="h-5 w-5 text-pink-500" />
                  Активировать промокод
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex gap-3 max-w-md">
                  <Input
                    placeholder="Введите промокод"
                    value={promocode}
                    onChange={(e) => setPromocode(e.target.value.toUpperCase())}
                    className="border-purple-300 focus:border-purple-500 uppercase"
                  />
                  <Button
                    onClick={() => activatePromocodeMutation.mutate(promocode)}
                    disabled={!promocode.trim() || activatePromocodeMutation.isPending}
                    className="bg-gradient-to-r from-purple-500 to-pink-500 text-white"
                  >
                    {activatePromocodeMutation.isPending ? "..." : "Активировать"}
                  </Button>
                </div>
                <p className="text-sm text-purple-500 mt-3">
                  Введите промокод, чтобы получить бонусные дни подписки
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      <Dialog open={!!viewingCase} onOpenChange={(open) => !open && setViewingCase(null)}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-mystic text-purple-700">
              {(viewingCase?.generatedHeadlines as string[])?.[0] || "Кейс"}
            </DialogTitle>
          </DialogHeader>
          {viewingCase && (
            <div className="space-y-4">
              <div>
                <Label className="text-xs text-purple-500">Заголовки</Label>
                <div className="space-y-2 mt-1">
                  {(viewingCase.generatedHeadlines as string[])?.map((headline, idx) => (
                    <div key={idx} className="p-2 bg-purple-50 rounded text-sm text-purple-700 border border-purple-200">
                      {headline}
                    </div>
                  ))}
                </div>
              </div>
              
              {viewingCase.generatedQuote && (
                <div>
                  <Label className="text-xs text-purple-500">Цитата</Label>
                  <blockquote className="border-l-4 border-pink-400 pl-4 italic text-purple-600 my-2 bg-pink-50 p-3 rounded-r">
                    "{viewingCase.generatedQuote}"
                  </blockquote>
                </div>
              )}
              
              {viewingCase.generatedBody && (
                <div>
                  <Label className="text-xs text-purple-500">Текст кейса</Label>
                  <div className="bg-purple-50 p-4 rounded-lg text-sm text-purple-700 whitespace-pre-wrap border-2 border-purple-200">
                    {viewingCase.generatedBody}
                  </div>
                </div>
              )}
              
              <div className="flex flex-wrap gap-2">
                {(viewingCase.tags as string[])?.map((tag) => (
                  <Badge key={tag} variant="secondary" className="bg-purple-100 text-purple-700 border border-purple-300">
                    {tag}
                  </Badge>
                ))}
              </div>
              
              <div className="flex gap-3 pt-2">
                <Button 
                  variant="secondary" 
                  onClick={() => {
                    const text = `${(viewingCase.generatedHeadlines as string[])?.[0] || ""}\n\n"${viewingCase.generatedQuote || ""}"\n\n${viewingCase.generatedBody || ""}`;
                    navigator.clipboard.writeText(text);
                  }}
                  className="flex-1"
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Скопировать
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SubscriptionTier({
  name,
  price,
  features,
  current,
  badge,
  onSelect,
}: {
  name: string;
  price: string;
  features: string[];
  current?: boolean;
  badge?: string;
  onSelect?: () => void;
}) {
  return (
    <Card className={`
      ${badge ? "border-2 border-pink-400 shadow-lg" : "border-2 border-purple-200"}
      ${current ? "bg-purple-50" : "bg-white"}
    `}>
      <CardContent className="p-6 text-center">
        {badge && (
          <Badge className="mb-4 bg-gradient-to-r from-green-500 to-emerald-500 text-white">
            {badge}
          </Badge>
        )}
        <h3 className="text-xl font-mystic text-purple-700 mb-2">{name}</h3>
        <p className="text-2xl font-bold text-purple-800 mb-4">{price}</p>
        <ul className="text-left space-y-2 mb-6">
          {features.map((feature, idx) => (
            <li key={idx} className="flex items-center gap-2 text-sm text-purple-600">
              <Check className="h-4 w-4 text-pink-500" />
              {feature}
            </li>
          ))}
        </ul>
        <Button
          className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white"
          onClick={onSelect}
        >
          {current ? "Продлить" : "Выбрать"}
        </Button>
      </CardContent>
    </Card>
  );
}
