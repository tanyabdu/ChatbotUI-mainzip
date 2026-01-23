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
  Edit2, Check, X, Trash2, Copy, Gift, ChevronDown, ChevronUp, Lock, Loader2, Image
} from "lucide-react";
import { Link, useLocation } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { removeToken } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import type { ContentStrategy, VoicePost, CaseStudy, ArchetypeResult } from "@shared/schema";

export default function Grimoire() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [editingNickname, setEditingNickname] = useState(false);
  const [nickname, setNickname] = useState(user?.nickname || "");
  const [viewingCase, setViewingCase] = useState<CaseStudy | null>(null);
  const [promocode, setPromocode] = useState("");
  const [expandedStrategies, setExpandedStrategies] = useState<Set<string>>(new Set());
  const [activePostFormats, setActivePostFormats] = useState<Record<string, "post" | "carousel" | "reels" | "stories">>({});
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const toggleStrategy = (id: string) => {
    setExpandedStrategies(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
        setTimeout(() => {
          const element = document.getElementById(`strategy-content-${id}`);
          if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }, 100);
      }
      return newSet;
    });
  };

  const getFirstAvailableFormat = (post: { post?: { content: string }, carousel?: { content: string }, reels?: { content: string }, stories?: { content: string } }): "post" | "carousel" | "reels" | "stories" => {
    const formats: ("post" | "carousel" | "reels" | "stories")[] = ["post", "carousel", "reels", "stories"];
    for (const format of formats) {
      if (post[format] && post[format]!.content) {
        return format;
      }
    }
    return "post";
  };

  const getPostFormat = (strategyId: string, postDay: number, post?: { post?: { content: string }, carousel?: { content: string }, reels?: { content: string }, stories?: { content: string } }) => {
    const key = `${strategyId}-${postDay}`;
    if (activePostFormats[key]) {
      return activePostFormats[key];
    }
    if (post) {
      return getFirstAvailableFormat(post);
    }
    return "post";
  };

  const setPostFormat = (strategyId: string, postDay: number, format: "post" | "carousel" | "reels" | "stories") => {
    const key = `${strategyId}-${postDay}`;
    setActivePostFormats(prev => ({ ...prev, [key]: format }));
  };

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

  const [generatingFormat, setGeneratingFormat] = useState<string | null>(null);

  const generateFormatMutation = useMutation({
    mutationFn: async ({ strategyId, postDay, format }: { strategyId: string; postDay: number; format: string }) => {
      return apiRequest("POST", `/api/strategies/${strategyId}/generate-format`, { postDay, format });
    },
    onMutate: ({ strategyId, postDay, format }) => {
      setGeneratingFormat(`${strategyId}-${postDay}-${format}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/strategies"] });
      toast({ title: "Готово!", description: "Контент успешно сгенерирован" });
    },
    onError: (error: Error) => {
      toast({ title: "Ошибка", description: "Не удалось сгенерировать контент", variant: "destructive" });
    },
    onSettled: () => {
      setGeneratingFormat(null);
    },
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
      const response = await apiRequest("POST", "/api/promocode/activate", { code });
      return response.json();
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

  const changePasswordMutation = useMutation({
    mutationFn: async ({ currentPassword, newPassword }: { currentPassword: string; newPassword: string }) => {
      return apiRequest("POST", "/api/auth/change-password", { currentPassword, newPassword });
    },
    onSuccess: () => {
      toast({
        title: "Успешно!",
        description: "Пароль успешно изменён",
      });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    },
    onError: (error: Error) => {
      let message = "Ошибка при смене пароля";
      try {
        const parsed = JSON.parse(error.message.split(": ").slice(1).join(": "));
        message = parsed.message || message;
      } catch {
        if (error.message.includes("Неверный")) {
          message = "Неверный текущий пароль";
        }
      }
      toast({
        title: "Ошибка",
        description: message,
        variant: "destructive",
      });
    },
  });

  const handleChangePassword = () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast({
        title: "Ошибка",
        description: "Заполните все поля",
        variant: "destructive",
      });
      return;
    }
    if (newPassword.length < 6) {
      toast({
        title: "Ошибка",
        description: "Новый пароль должен быть не менее 6 символов",
        variant: "destructive",
      });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({
        title: "Ошибка",
        description: "Пароли не совпадают",
        variant: "destructive",
      });
      return;
    }
    changePasswordMutation.mutate({ currentPassword, newPassword });
  };

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

  const handleLogout = () => {
    removeToken();
    queryClient.clear();
    window.location.href = "/";
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
            <Button variant="outline" onClick={handleLogout} data-testid="button-logout">
              <LogOut className="h-4 w-4 mr-2" />
              Выйти
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8">
        <Tabs defaultValue="profile" className="space-y-8">
          <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 lg:w-auto lg:inline-flex bg-purple-100 border-2 border-purple-200 h-auto p-1 gap-1">
            <TabsTrigger value="profile" className="data-[state=active]:bg-purple-500 data-[state=active]:text-white text-xs sm:text-sm px-2 sm:px-3 py-2">
              <User className="h-4 w-4 mr-1 flex-shrink-0" />
              <span>Профиль</span>
            </TabsTrigger>
            <TabsTrigger value="library" className="data-[state=active]:bg-purple-500 data-[state=active]:text-white text-xs sm:text-sm px-2 sm:px-3 py-2">
              <BookOpen className="h-4 w-4 mr-1 flex-shrink-0" />
              <span>Хранилище</span>
            </TabsTrigger>
            <TabsTrigger value="brand" className="data-[state=active]:bg-purple-500 data-[state=active]:text-white text-xs sm:text-sm px-2 sm:px-3 py-2">
              <Palette className="h-4 w-4 mr-1 flex-shrink-0" />
              <span>ДНК</span>
            </TabsTrigger>
            <TabsTrigger value="subscription" className="data-[state=active]:bg-purple-500 data-[state=active]:text-white text-xs sm:text-sm px-2 sm:px-3 py-2">
              <CreditCard className="h-4 w-4 mr-1 flex-shrink-0" />
              <span>Подписка</span>
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

            <Card className="bg-white border-2 border-purple-300 shadow-lg">
              <CardHeader>
                <CardTitle className="text-xl font-mystic text-purple-700 flex items-center gap-2">
                  <Lock className="h-5 w-5 text-pink-500" />
                  Сменить пароль
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="max-w-md space-y-4">
                  <div>
                    <Label className="text-purple-600">Текущий пароль</Label>
                    <Input
                      type="password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="Введите текущий пароль"
                      className="border-purple-300 mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-purple-600">Новый пароль</Label>
                    <Input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Минимум 6 символов"
                      className="border-purple-300 mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-purple-600">Подтвердите новый пароль</Label>
                    <Input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Повторите новый пароль"
                      className="border-purple-300 mt-1"
                    />
                  </div>
                  <Button
                    onClick={handleChangePassword}
                    disabled={changePasswordMutation.isPending}
                    className="bg-gradient-to-r from-purple-500 to-pink-500 text-white"
                  >
                    {changePasswordMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Сохраняю...
                      </>
                    ) : (
                      "Сменить пароль"
                    )}
                  </Button>
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
                  strategies.map((strategy) => {
                    const isExpanded = expandedStrategies.has(strategy.id);
                    return (
                      <Card key={strategy.id} className="bg-purple-50 border border-purple-200 overflow-hidden">
                        <CardContent className="p-0">
                          <div 
                            className="p-4 cursor-pointer hover:bg-purple-100 transition-colors"
                            onClick={() => toggleStrategy(strategy.id)}
                          >
                            <div className="flex justify-between items-start gap-2 mb-2">
                              <div className="flex items-center gap-2 flex-wrap flex-1">
                                <Badge variant="secondary" className="bg-purple-100 text-purple-700">
                                  {strategy.topic}
                                </Badge>
                                <Badge variant="outline" className="text-pink-600 border-pink-300">
                                  {strategy.goal === "sale" ? "Продажа" : "Охваты"}
                                </Badge>
                                <Badge variant="outline" className="text-purple-600 border-purple-300">
                                  {strategy.days} дней
                                </Badge>
                              </div>
                              <div className="flex items-center gap-1">
                                {isExpanded ? (
                                  <ChevronUp className="h-5 w-5 text-purple-500" />
                                ) : (
                                  <ChevronDown className="h-5 w-5 text-purple-500" />
                                )}
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    deleteStrategyMutation.mutate(strategy.id);
                                  }}
                                  data-testid={`button-delete-strategy-${strategy.id}`}
                                  className="text-red-500"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                            <p className="text-sm text-purple-600">
                              {strategy.posts.length} публикаций • Нажмите чтобы {isExpanded ? "свернуть" : "раскрыть"}
                            </p>
                          </div>
                          
                          {isExpanded && (
                            <div id={`strategy-content-${strategy.id}`} className="border-t border-purple-200 p-4 space-y-4 bg-white">
                              {strategy.posts.map((post) => {
                                const activeFormat = getPostFormat(strategy.id, post.day, post);
                                const formatContent = post[activeFormat];
                                const hasContent = formatContent && formatContent.content;
                                
                                return (
                                  <div key={post.day} className="border border-purple-200 rounded-lg p-4 bg-purple-50">
                                    <div className="flex items-center gap-2 mb-3 flex-wrap">
                                      <Badge className="bg-purple-600 text-white">День {post.day}</Badge>
                                      <Badge variant="outline" className="text-pink-600 border-pink-300">{post.type}</Badge>
                                    </div>
                                    
                                    <p className="text-purple-700 font-medium mb-3">💡 {post.idea}</p>
                                    
                                    <div className="flex gap-2 mb-3 flex-wrap">
                                      {(["post", "carousel", "reels", "stories"] as const).map((format) => {
                                        const hasFormatContent = post[format] && post[format].content;
                                        return (
                                          <Button
                                            key={format}
                                            size="sm"
                                            variant={activeFormat === format ? "default" : "outline"}
                                            onClick={() => setPostFormat(strategy.id, post.day, format)}
                                            className={
                                              activeFormat === format
                                                ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white"
                                                : hasFormatContent
                                                  ? "border-green-400 text-green-700 bg-green-50"
                                                  : "border-orange-300 text-orange-600 bg-orange-50"
                                            }
                                          >
                                            {format === "post" ? "Пост" : 
                                             format === "carousel" ? "Карусель" :
                                             format === "reels" ? "Reels" : "Stories"}
                                            {hasFormatContent && activeFormat !== format && (
                                              <Check className="h-3 w-3 ml-1" />
                                            )}
                                            {!hasFormatContent && activeFormat !== format && (
                                              <Wand2 className="h-3 w-3 ml-1" />
                                            )}
                                          </Button>
                                        );
                                      })}
                                    </div>
                                    
                                    {hasContent ? (
                                      <div className="space-y-3">
                                        <div className="bg-white rounded-lg p-4 border border-purple-200">
                                          <p className="text-gray-700 whitespace-pre-line">{formatContent.content}</p>
                                        </div>
                                        {formatContent.hashtags && formatContent.hashtags.length > 0 && (
                                          <div className="flex flex-wrap gap-2">
                                            {formatContent.hashtags.map((tag, idx) => (
                                              <Badge key={idx} variant="secondary" className="text-xs bg-purple-100 text-purple-700">
                                                {tag}
                                              </Badge>
                                            ))}
                                          </div>
                                        )}
                                        <div className="flex gap-2 flex-wrap">
                                          <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={() => {
                                              const text = formatContent.content + "\n\n" + (formatContent.hashtags?.join(" ") || "");
                                              navigator.clipboard.writeText(text);
                                              toast({ title: "Скопировано!", description: "Текст скопирован в буфер обмена" });
                                            }}
                                            className="text-purple-600"
                                          >
                                            <Copy className="h-4 w-4 mr-1" />
                                            Копировать
                                          </Button>
                                          <Button
                                            size="sm"
                                            onClick={() => setLocation(`/image-editor?text=${encodeURIComponent(formatContent.content)}`)}
                                            className="bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white"
                                          >
                                            <Image className="h-4 w-4 mr-1" />
                                            Создать карусель
                                          </Button>
                                        </div>
                                      </div>
                                    ) : (
                                      <div className="space-y-3">
                                        <p className="text-gray-400 text-sm italic">Контент для этого формата не был сгенерирован</p>
                                        <Button
                                          size="sm"
                                          onClick={() => generateFormatMutation.mutate({ 
                                            strategyId: strategy.id, 
                                            postDay: post.day, 
                                            format: activeFormat 
                                          })}
                                          disabled={generatingFormat === `${strategy.id}-${post.day}-${activeFormat}`}
                                          className="bg-gradient-to-r from-purple-500 to-pink-500 text-white"
                                        >
                                          {generatingFormat === `${strategy.id}-${post.day}-${activeFormat}` ? (
                                            <>
                                              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                                              Генерирую...
                                            </>
                                          ) : (
                                            <>
                                              <Wand2 className="h-4 w-4 mr-1" />
                                              Сгенерировать {activeFormat === "post" ? "пост" : 
                                                activeFormat === "carousel" ? "карусель" :
                                                activeFormat === "reels" ? "Reels" : "Stories"}
                                            </>
                                          )}
                                        </Button>
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })
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
                              title="Копировать"
                            >
                              <Copy className="h-4 w-4 text-purple-500" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setLocation(`/image-editor?text=${encodeURIComponent(post.refinedText)}`)}
                              title="Создать карусель"
                              className="text-pink-500 hover:text-pink-600"
                            >
                              <Image className="h-4 w-4" />
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
                        <div className="space-y-2">
                          {archetypeResult.brandFonts.map((font, idx) => (
                            <div key={idx} className="text-purple-600 border border-purple-300 rounded-lg px-3 py-2 text-sm break-words">
                              {font}
                            </div>
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
            {/* Информация о текущей подписке */}
            {(() => {
              if (user?.isAdmin) {
                return (
                  <Card className="border-2 shadow-lg bg-gradient-to-r from-amber-50 to-yellow-50 border-amber-300">
                    <CardContent className="py-6">
                      <div className="flex items-center justify-between flex-wrap gap-4">
                        <div className="flex items-center gap-3">
                          <Sparkles className="h-8 w-8 text-amber-500" />
                          <div>
                            <p className="font-medium text-amber-700">Администратор</p>
                            <p className="text-sm text-amber-600">Полный доступ ко всем функциям</p>
                          </div>
                        </div>
                        <div className="text-right text-amber-700">
                          <span className="text-2xl font-bold">∞</span>
                          <p className="text-xs text-amber-500">безлимит</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              }

              const tier = user?.subscriptionTier;
              const expiresAt = user?.subscriptionExpiresAt ? new Date(user.subscriptionExpiresAt) : null;
              const trialEndsAt = user?.trialEndsAt ? new Date(user.trialEndsAt) : null;
              const now = new Date();
              
              let endDate: Date | null = null;
              let label = "";
              
              if (tier === "monthly" || tier === "yearly") {
                endDate = expiresAt;
                label = tier === "monthly" ? "Месячная подписка" : "Годовая подписка";
              } else if (tier === "trial" && trialEndsAt) {
                endDate = trialEndsAt;
                label = "Пробный период";
              }
              
              if (endDate) {
                const diffMs = endDate.getTime() - now.getTime();
                const daysLeft = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
                const isExpired = daysLeft <= 0;
                
                return (
                  <Card className={`border-2 shadow-lg ${isExpired ? "bg-red-50 border-red-300" : "bg-gradient-to-r from-purple-50 to-pink-50 border-purple-300"}`}>
                    <CardContent className="py-6">
                      <div className="flex items-center justify-between flex-wrap gap-4">
                        <div className="flex items-center gap-3">
                          <Sparkles className={`h-8 w-8 ${isExpired ? "text-red-400" : "text-pink-500"}`} />
                          <div>
                            <p className="font-medium text-purple-700">{label}</p>
                            <p className={`text-sm ${isExpired ? "text-red-500" : "text-purple-500"}`}>
                              {isExpired 
                                ? "Подписка истекла" 
                                : `до ${endDate.toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" })}`
                              }
                            </p>
                          </div>
                        </div>
                        <div className={`text-right ${isExpired ? "text-red-600" : "text-purple-700"}`}>
                          <span className="text-3xl font-bold">{isExpired ? 0 : daysLeft}</span>
                          <span className="text-sm ml-1">
                            {(() => {
                              const d = isExpired ? 0 : daysLeft;
                              const mod10 = d % 10;
                              const mod100 = d % 100;
                              if (mod100 >= 11 && mod100 <= 14) return "дней";
                              if (mod10 === 1) return "день";
                              if (mod10 >= 2 && mod10 <= 4) return "дня";
                              return "дней";
                            })()}
                          </span>
                          <p className="text-xs text-purple-400">осталось</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              }
              return null;
            })()}

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
                    price="1690 ₽/мес"
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
                    price="5475 ₽/год"
                    features={[
                      "Все функции месячного тарифа",
                      "Экономия 14 805₽ в год",
                      "Выгоднее на 73%",
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
