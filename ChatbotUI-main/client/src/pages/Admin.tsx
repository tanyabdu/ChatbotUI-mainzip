import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  LayoutDashboard, Users, BarChart3, Settings, 
  Sparkles, Home, TrendingUp, FileText, Mic, Archive,
  Plus, Clock, Crown, Shield
} from "lucide-react";
import { Link, useLocation } from "wouter";
import type { User } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface AdminStats {
  totalUsers: number;
  activeUsers: number;
  totalStrategies: number;
  totalVoicePosts: number;
  totalCaseStudies: number;
  subscriptionBreakdown: {
    trial: number;
    free: number;
    monthly: number;
    yearly: number;
  };
  activeTrials: number;
  expiredTrials: number;
}

export default function Admin() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: stats } = useQuery<AdminStats>({
    queryKey: ["/api/admin/stats"],
    enabled: !!user?.isAdmin,
  });

  const { data: allUsers = [] } = useQuery<User[]>({
    queryKey: ["/api/admin/users"],
    enabled: !!user?.isAdmin,
  });

  const extendAccessMutation = useMutation({
    mutationFn: async ({ userId, days, tier }: { userId: string; days: number; tier?: string }) => {
      const res = await apiRequest("PATCH", `/api/admin/users/${userId}`, { action: "extend", days, tier });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({ title: "Доступ продлён", description: "Изменения сохранены" });
    },
    onError: () => {
      toast({ title: "Ошибка", description: "Не удалось продлить доступ", variant: "destructive" });
    },
  });

  const toggleAdminMutation = useMutation({
    mutationFn: async ({ userId, isAdmin }: { userId: string; isAdmin: boolean }) => {
      const res = await apiRequest("PATCH", `/api/admin/users/${userId}`, { action: "setAdmin", isAdmin });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({ title: "Права изменены" });
    },
  });

  const formatDate = (date: string | Date | null | undefined) => {
    if (!date) return "—";
    return new Date(date).toLocaleDateString("ru-RU", { day: "numeric", month: "short", year: "numeric" });
  };

  const getDaysLeft = (date: string | Date | null | undefined) => {
    if (!date) return null;
    const diff = new Date(date).getTime() - Date.now();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  if (!user?.isAdmin) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-purple-50 to-white flex items-center justify-center">
        <Card className="bg-white border-2 border-red-300 shadow-lg max-w-md">
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Settings className="h-8 w-8 text-red-500" />
            </div>
            <h2 className="text-xl font-mystic text-red-600 mb-2">Доступ запрещён</h2>
            <p className="text-gray-600 mb-4">У вас нет прав администратора</p>
            <Button asChild>
              <Link href="/">Вернуться на главную</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 to-white">
      <header className="border-b-2 border-purple-200 bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <Sparkles className="h-8 w-8 text-purple-600" />
            <h1 className="text-2xl font-mystic text-purple-700">Панель Управления</h1>
            <Badge variant="secondary" className="bg-purple-100 text-purple-700 border border-purple-300">
              Админ
            </Badge>
          </div>
          <Button variant="ghost" asChild data-testid="link-home">
            <Link href="/">
              <Home className="h-4 w-4 mr-2" />
              На главную
            </Link>
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8">
        <Tabs defaultValue="dashboard" className="space-y-8">
          <TabsList className="grid w-full grid-cols-3 lg:w-auto lg:inline-flex bg-purple-100 border-2 border-purple-200">
            <TabsTrigger value="dashboard" className="data-[state=active]:bg-purple-500 data-[state=active]:text-white">
              <LayoutDashboard className="h-4 w-4 mr-2" />
              Дашборд
            </TabsTrigger>
            <TabsTrigger value="users" className="data-[state=active]:bg-purple-500 data-[state=active]:text-white">
              <Users className="h-4 w-4 mr-2" />
              Пользователи
            </TabsTrigger>
            <TabsTrigger value="analytics" className="data-[state=active]:bg-purple-500 data-[state=active]:text-white">
              <BarChart3 className="h-4 w-4 mr-2" />
              Аналитика
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard
                title="Пользователей"
                value={stats?.totalUsers || 0}
                icon={<Users className="h-5 w-5 text-purple-500" />}
                description="Всего"
              />
              <StatCard
                title="Контент-планов"
                value={stats?.totalStrategies || 0}
                icon={<FileText className="h-5 w-5 text-pink-500" />}
                description="Создано"
              />
              <StatCard
                title="Голосовых постов"
                value={stats?.totalVoicePosts || 0}
                icon={<Mic className="h-5 w-5 text-purple-500" />}
                description="Записано"
              />
              <StatCard
                title="Кейсов"
                value={stats?.totalCaseStudies || 0}
                icon={<Archive className="h-5 w-5 text-pink-500" />}
                description="Сохранено"
              />
            </div>

            <Card className="bg-white border-2 border-purple-300 shadow-lg">
              <CardHeader>
                <CardTitle className="text-xl font-mystic text-purple-700 flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-pink-500" />
                  Распределение пользователей
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <p className="text-3xl font-bold text-blue-600">{stats?.activeTrials || 0}</p>
                    <p className="text-sm text-blue-500">Активный триал</p>
                  </div>
                  <div className="text-center p-4 bg-red-50 rounded-lg border border-red-200">
                    <p className="text-3xl font-bold text-red-600">{stats?.expiredTrials || 0}</p>
                    <p className="text-sm text-red-500">Триал истёк</p>
                  </div>
                  <div className="text-center p-4 bg-purple-50 rounded-lg border border-purple-200">
                    <p className="text-3xl font-bold text-purple-600">{stats?.subscriptionBreakdown?.monthly || 0}</p>
                    <p className="text-sm text-purple-500">Месячная</p>
                  </div>
                  <div className="text-center p-4 bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg border border-pink-200">
                    <p className="text-3xl font-bold text-pink-600">{stats?.subscriptionBreakdown?.yearly || 0}</p>
                    <p className="text-sm text-pink-500">Годовая</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="users" className="space-y-6">
            <Card className="bg-white border-2 border-purple-300 shadow-lg">
              <CardHeader>
                <CardTitle className="text-xl font-mystic text-purple-700 flex items-center gap-2">
                  <Users className="h-5 w-5 text-pink-500" />
                  Все пользователи ({allUsers.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {allUsers.length === 0 ? (
                  <p className="text-purple-500 text-center py-8">Нет зарегистрированных пользователей</p>
                ) : (
                  <div className="space-y-4">
                    {allUsers.map((u) => {
                      const trialDays = getDaysLeft(u.trialEndsAt);
                      const subDays = getDaysLeft(u.subscriptionExpiresAt);
                      const isExpired = (trialDays === null || trialDays <= 0) && (subDays === null || subDays <= 0);
                      
                      return (
                        <div key={u.id} className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                          <div className="flex items-center justify-between flex-wrap gap-4 mb-3">
                            <div className="flex items-center gap-4">
                              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center text-white font-bold">
                                {(u.nickname || u.firstName || u.email || "?").charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <p className="font-medium text-purple-700">
                                  {u.nickname || u.firstName || u.email?.split("@")[0] || "Пользователь"}
                                </p>
                                <p className="text-sm text-purple-500">{u.email}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <Badge variant="outline" className={`${
                                u.subscriptionTier === "yearly" ? "text-pink-600 border-pink-300" :
                                u.subscriptionTier === "monthly" ? "text-purple-600 border-purple-300" :
                                u.subscriptionTier === "trial" ? "text-blue-600 border-blue-300" :
                                "text-gray-600 border-gray-300"
                              }`}>
                                {u.subscriptionTier === "yearly" ? "Годовая" : 
                                 u.subscriptionTier === "monthly" ? "Месячная" : 
                                 u.subscriptionTier === "trial" ? "Триал" : "Бесплатный"}
                              </Badge>
                              {isExpired && !u.isAdmin && (
                                <Badge variant="destructive">Истёк</Badge>
                              )}
                              {u.isAdmin && (
                                <Badge className="bg-gradient-to-r from-purple-500 to-pink-500 text-white">
                                  Админ
                                </Badge>
                              )}
                            </div>
                          </div>
                          
                          <div className="flex items-center justify-between flex-wrap gap-3 text-sm">
                            <div className="flex items-center gap-4 text-purple-600">
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                Триал до: {formatDate(u.trialEndsAt)}
                                {trialDays !== null && trialDays > 0 && (
                                  <span className="text-green-600 ml-1">({trialDays} дн.)</span>
                                )}
                              </span>
                              {u.subscriptionExpiresAt && (
                                <span className="flex items-center gap-1">
                                  <Crown className="h-3 w-3" />
                                  Подписка до: {formatDate(u.subscriptionExpiresAt)}
                                </span>
                              )}
                            </div>
                            
                            <div className="flex items-center gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => extendAccessMutation.mutate({ userId: u.id, days: 30, tier: "monthly" })}
                                disabled={extendAccessMutation.isPending}
                              >
                                <Plus className="h-3 w-3 mr-1" />
                                +Месяц
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => extendAccessMutation.mutate({ userId: u.id, days: 365, tier: "yearly" })}
                                disabled={extendAccessMutation.isPending}
                              >
                                <Crown className="h-3 w-3 mr-1" />
                                +Год
                              </Button>
                              {!u.isAdmin && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => toggleAdminMutation.mutate({ userId: u.id, isAdmin: true })}
                                  disabled={toggleAdminMutation.isPending}
                                >
                                  <Shield className="h-3 w-3" />
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6">
            <Card className="bg-white border-2 border-purple-300 shadow-lg">
              <CardHeader>
                <CardTitle className="text-xl font-mystic text-purple-700 flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-pink-500" />
                  Аналитика использования
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="text-center py-8">
                  <BarChart3 className="h-16 w-16 text-purple-300 mx-auto mb-4" />
                  <p className="text-purple-500 mb-2">Подробная аналитика</p>
                  <p className="text-sm text-purple-400">
                    Здесь будет отображаться расширенная статистика использования платформы
                  </p>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                    <h4 className="font-medium text-purple-700 mb-2">Популярные инструменты</h4>
                    <ul className="space-y-2 text-sm text-purple-600">
                      <li className="flex justify-between">
                        <span>Контент-планер</span>
                        <span className="font-medium">{stats?.totalStrategies || 0}</span>
                      </li>
                      <li className="flex justify-between">
                        <span>Голос Потока</span>
                        <span className="font-medium">{stats?.totalVoicePosts || 0}</span>
                      </li>
                      <li className="flex justify-between">
                        <span>Банк Кейсов</span>
                        <span className="font-medium">{stats?.totalCaseStudies || 0}</span>
                      </li>
                    </ul>
                  </div>
                  <div className="p-4 bg-pink-50 rounded-lg border border-pink-200">
                    <h4 className="font-medium text-pink-700 mb-2">Общая статистика</h4>
                    <ul className="space-y-2 text-sm text-pink-600">
                      <li className="flex justify-between">
                        <span>Всего пользователей</span>
                        <span className="font-medium">{stats?.totalUsers || 0}</span>
                      </li>
                      <li className="flex justify-between">
                        <span>Активных сегодня</span>
                        <span className="font-medium">{stats?.activeUsers || 0}</span>
                      </li>
                      <li className="flex justify-between">
                        <span>Платных подписок</span>
                        <span className="font-medium">
                          {(stats?.subscriptionBreakdown?.monthly || 0) + (stats?.subscriptionBreakdown?.yearly || 0)}
                        </span>
                      </li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

function StatCard({
  title,
  value,
  icon,
  description,
}: {
  title: string;
  value: number;
  icon: React.ReactNode;
  description: string;
}) {
  return (
    <Card className="bg-white border-2 border-purple-200">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2 gap-2">
          <p className="text-sm text-purple-500">{title}</p>
          {icon}
        </div>
        <p className="text-2xl font-bold text-purple-700">{value}</p>
        <p className="text-xs text-purple-400">{description}</p>
      </CardContent>
    </Card>
  );
}
