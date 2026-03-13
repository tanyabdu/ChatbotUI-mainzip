import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  LayoutDashboard, Users, BarChart3, Settings, 
  Sparkles, Home, TrendingUp, FileText, Mic, Archive,
  Plus, Clock, Crown, Shield, ShieldOff, Trash2, CreditCard, Tag,
  UserCheck, UserX, CalendarDays, Activity
} from "lucide-react";
import { Link, useLocation } from "wouter";
import type { User } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface PromocodeStat {
  code: string;
  usedCount: number;
  maxUses: number | null;
  type: string;
  discountPercent: number | null;
  bonusDays: number;
  isActive: boolean;
  expiresAt: string | null;
  bonusUntil: string | null;
}

interface AdminStats {
  totalUsers: number;
  usersWithAccess: number;
  activeToday: number;
  activePaidSubscriptions: number;
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
  activeMonthly: number;
  activeYearly: number;
  noAccess: number;
  newUsersLast7Days: number;
  newUsersLast30Days: number;
  totalSuccessfulPayments: number;
  paidMonthlyPayments: number;
  paidYearlyPayments: number;
  promocodeStats: PromocodeStat[];
}

export default function Admin() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: stats } = useQuery<AdminStats>({
    queryKey: ["/api/admin/stats"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/admin/stats");
      return res.json();
    },
    enabled: !!user?.isAdmin,
  });

  const { data: allUsers = [] } = useQuery<User[]>({
    queryKey: ["/api/admin/users"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/admin/users");
      return res.json();
    },
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
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Ошибка при изменении прав");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({ title: "Права обновлены" });
    },
    onError: (error: any) => {
      toast({ title: "Ошибка", description: error.message || "Не удалось изменить права", variant: "destructive" });
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      const res = await apiRequest("DELETE", `/api/admin/users/${userId}`);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Ошибка при удалении");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({ title: "Пользователь удалён" });
    },
    onError: (error: any) => {
      toast({ title: "Ошибка", description: error.message || "Не удалось удалить пользователя", variant: "destructive" });
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
          <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-flex bg-purple-100 border-2 border-purple-200">
            <TabsTrigger value="dashboard" className="data-[state=active]:bg-purple-500 data-[state=active]:text-white">
              <LayoutDashboard className="h-4 w-4 mr-1 md:mr-2" />
              <span className="hidden sm:inline">Дашборд</span>
            </TabsTrigger>
            <TabsTrigger value="users" className="data-[state=active]:bg-purple-500 data-[state=active]:text-white">
              <Users className="h-4 w-4 mr-1 md:mr-2" />
              <span className="hidden sm:inline">Пользователи</span>
            </TabsTrigger>
            <TabsTrigger value="payments" className="data-[state=active]:bg-purple-500 data-[state=active]:text-white">
              <CreditCard className="h-4 w-4 mr-1 md:mr-2" />
              <span className="hidden sm:inline">Платежи</span>
            </TabsTrigger>
            <TabsTrigger value="analytics" className="data-[state=active]:bg-purple-500 data-[state=active]:text-white">
              <BarChart3 className="h-4 w-4 mr-1 md:mr-2" />
              <span className="hidden sm:inline">Аналитика</span>
            </TabsTrigger>
          </TabsList>

          {/* ── ДАШБОРД ── */}
          <TabsContent value="dashboard" className="space-y-6">
            {/* Ключевые метрики */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard
                title="Всего пользователей"
                value={stats?.totalUsers ?? 0}
                icon={<Users className="h-5 w-5 text-purple-500" />}
                description="Зарегистрировано"
              />
              <StatCard
                title="Активных сейчас"
                value={stats?.usersWithAccess ?? 0}
                icon={<UserCheck className="h-5 w-5 text-green-500" />}
                description="С активным доступом"
              />
              <StatCard
                title="Платных подписок"
                value={stats?.activePaidSubscriptions ?? 0}
                icon={<Crown className="h-5 w-5 text-pink-500" />}
                description="Активные (мес. + год.)"
              />
              <StatCard
                title="Активны сегодня"
                value={stats?.activeToday ?? 0}
                icon={<Activity className="h-5 w-5 text-purple-500" />}
                description="Заходили сегодня"
              />
            </div>

            {/* Новые регистрации */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="bg-white border-2 border-purple-200">
                <CardContent className="p-5">
                  <div className="flex items-center gap-3 mb-3">
                    <CalendarDays className="h-5 w-5 text-purple-500" />
                    <p className="font-medium text-purple-700">Новые регистрации</p>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-purple-500">За последние 7 дней</span>
                      <span className="font-bold text-xl text-purple-700">{stats?.newUsersLast7Days ?? 0}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-purple-500">За последние 30 дней</span>
                      <span className="font-bold text-xl text-purple-700">{stats?.newUsersLast30Days ?? 0}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-white border-2 border-purple-200">
                <CardContent className="p-5">
                  <div className="flex items-center gap-3 mb-3">
                    <CreditCard className="h-5 w-5 text-pink-500" />
                    <p className="font-medium text-purple-700">Оплаты (всего)</p>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-purple-500">Успешных платежей</span>
                      <span className="font-bold text-xl text-purple-700">{stats?.totalSuccessfulPayments ?? 0}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-purple-500">Месячных / Годовых</span>
                      <span className="font-bold text-purple-700">
                        {stats?.paidMonthlyPayments ?? 0} / {stats?.paidYearlyPayments ?? 0}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Распределение подписок */}
            <Card className="bg-white border-2 border-purple-300 shadow-lg">
              <CardHeader>
                <CardTitle className="text-xl font-mystic text-purple-700 flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-pink-500" />
                  Активный доступ сейчас
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <p className="text-3xl font-bold text-blue-600">{stats?.activeTrials ?? 0}</p>
                    <p className="text-sm text-blue-500 mt-1">Активный триал</p>
                  </div>
                  <div className="text-center p-4 bg-purple-50 rounded-lg border border-purple-200">
                    <p className="text-3xl font-bold text-purple-600">{stats?.activeMonthly ?? 0}</p>
                    <p className="text-sm text-purple-500 mt-1">Месячная (активная)</p>
                  </div>
                  <div className="text-center p-4 bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg border border-pink-200">
                    <p className="text-3xl font-bold text-pink-600">{stats?.activeYearly ?? 0}</p>
                    <p className="text-sm text-pink-500 mt-1">Годовая (активная)</p>
                  </div>
                  <div className="text-center p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <p className="text-3xl font-bold text-gray-500">{stats?.noAccess ?? 0}</p>
                    <p className="text-sm text-gray-400 mt-1">Нет доступа</p>
                  </div>
                </div>
                <p className="text-xs text-purple-300 mt-3 text-right">
                  Итого: {(stats?.activeTrials ?? 0) + (stats?.activeMonthly ?? 0) + (stats?.activeYearly ?? 0) + (stats?.noAccess ?? 0)} из {stats?.totalUsers ?? 0} (без учёта админов)
                </p>
              </CardContent>
            </Card>

            {/* Использование инструментов */}
            <Card className="bg-white border-2 border-purple-300 shadow-lg">
              <CardHeader>
                <CardTitle className="text-xl font-mystic text-purple-700 flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-pink-500" />
                  Использование инструментов
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-3 gap-4">
                  <StatRow
                    icon={<FileText className="h-4 w-4 text-purple-500" />}
                    label="Контент-планов"
                    value={stats?.totalStrategies ?? 0}
                  />
                  <StatRow
                    icon={<Mic className="h-4 w-4 text-pink-500" />}
                    label="Голосовых постов"
                    value={stats?.totalVoicePosts ?? 0}
                  />
                  <StatRow
                    icon={<Archive className="h-4 w-4 text-purple-500" />}
                    label="Кейсов"
                    value={stats?.totalCaseStudies ?? 0}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── ПОЛЬЗОВАТЕЛИ ── */}
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
                              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center text-white font-bold flex-shrink-0">
                                {(u.nickname || u.firstName || u.email || "?").charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <p className="font-medium text-purple-700">
                                  {u.nickname || u.firstName || u.email?.split("@")[0] || "Пользователь"}
                                </p>
                                <p className="text-sm text-purple-500">{u.email}</p>
                                <p className="text-xs text-purple-400">Регистрация: {formatDate((u as any).createdAt)}</p>
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
                            <div className="flex items-center gap-4 text-purple-600 flex-wrap">
                              {u.isAdmin ? (
                                <span className="flex items-center gap-1 text-pink-600 font-medium">
                                  <Crown className="h-3 w-3" />
                                  Безлимит
                                </span>
                              ) : (
                                <>
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
                                      {subDays !== null && subDays > 0 && (
                                        <span className="text-green-600 ml-1">({subDays} дн.)</span>
                                      )}
                                    </span>
                                  )}
                                </>
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
                              {!u.isAdmin ? (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  title="Сделать админом"
                                  onClick={() => toggleAdminMutation.mutate({ userId: u.id, isAdmin: true })}
                                  disabled={toggleAdminMutation.isPending}
                                >
                                  <Shield className="h-3 w-3" />
                                </Button>
                              ) : u.id !== user?.id && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  title="Убрать из админов"
                                  className="text-orange-500 hover:text-orange-700 hover:bg-orange-50"
                                  onClick={() => {
                                    if (confirm(`Убрать права администратора у ${u.email}?`)) {
                                      toggleAdminMutation.mutate({ userId: u.id, isAdmin: false });
                                    }
                                  }}
                                  disabled={toggleAdminMutation.isPending}
                                >
                                  <ShieldOff className="h-3 w-3" />
                                </Button>
                              )}
                              {u.id !== user?.id && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                  onClick={() => {
                                    if (confirm(`Удалить пользователя ${u.email}? Все его данные будут удалены.`)) {
                                      deleteUserMutation.mutate(u.id);
                                    }
                                  }}
                                  disabled={deleteUserMutation.isPending}
                                >
                                  <Trash2 className="h-3 w-3" />
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

          {/* ── ПЛАТЕЖИ И ПРОМОКОДЫ ── */}
          <TabsContent value="payments" className="space-y-6">
            {/* Платежи */}
            <Card className="bg-white border-2 border-purple-300 shadow-lg">
              <CardHeader>
                <CardTitle className="text-xl font-mystic text-purple-700 flex items-center gap-2">
                  <CreditCard className="h-5 w-5 text-pink-500" />
                  Статистика платежей
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-5 bg-green-50 rounded-lg border border-green-200 text-center">
                    <p className="text-4xl font-bold text-green-600">{stats?.totalSuccessfulPayments ?? 0}</p>
                    <p className="text-sm text-green-600 mt-1">Успешных оплат (всего)</p>
                  </div>
                  <div className="p-5 bg-purple-50 rounded-lg border border-purple-200 text-center">
                    <p className="text-4xl font-bold text-purple-600">{stats?.paidMonthlyPayments ?? 0}</p>
                    <p className="text-sm text-purple-600 mt-1">Месячных подписок</p>
                  </div>
                  <div className="p-5 bg-pink-50 rounded-lg border border-pink-200 text-center">
                    <p className="text-4xl font-bold text-pink-600">{stats?.paidYearlyPayments ?? 0}</p>
                    <p className="text-sm text-pink-600 mt-1">Годовых подписок</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Промокоды */}
            <Card className="bg-white border-2 border-purple-300 shadow-lg">
              <CardHeader>
                <CardTitle className="text-xl font-mystic text-purple-700 flex items-center gap-2">
                  <Tag className="h-5 w-5 text-pink-500" />
                  Промокоды
                </CardTitle>
              </CardHeader>
              <CardContent>
                {!stats?.promocodeStats?.length ? (
                  <p className="text-purple-400 text-center py-6">Промокодов нет</p>
                ) : (
                  <div className="space-y-3">
                    {stats.promocodeStats.map((p) => {
                      const isExpired = p.expiresAt && new Date(p.expiresAt) < new Date();
                      const isBonusUntilExpired = p.bonusUntil && new Date(p.bonusUntil) < new Date();
                      const usagePercent = p.maxUses ? Math.round((p.usedCount / p.maxUses) * 100) : null;

                      return (
                        <div key={p.code} className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                          <div className="flex items-center justify-between flex-wrap gap-3">
                            <div className="flex items-center gap-3">
                              <code className="bg-white border border-purple-300 rounded px-2 py-1 font-mono font-bold text-purple-700 text-sm">
                                {p.code}
                              </code>
                              <Badge variant="outline" className={
                                p.type === "discount" ? "text-green-600 border-green-300" : "text-blue-600 border-blue-300"
                              }>
                                {p.type === "discount" ? `Скидка ${p.discountPercent}%` : `+${p.bonusDays} дней`}
                              </Badge>
                              {(!p.isActive || isExpired || isBonusUntilExpired) && (
                                <Badge variant="destructive" className="text-xs">Истёк</Badge>
                              )}
                              {p.isActive && !isExpired && !isBonusUntilExpired && (
                                <Badge className="bg-green-100 text-green-700 border border-green-300 text-xs">Активен</Badge>
                              )}
                            </div>
                            <div className="text-right">
                              <p className="font-bold text-purple-700 text-lg">
                                {p.usedCount}
                                {p.maxUses !== null && (
                                  <span className="text-purple-400 font-normal text-sm"> / {p.maxUses === 10000 ? "∞" : p.maxUses}</span>
                                )}
                              </p>
                              <p className="text-xs text-purple-400">использований</p>
                            </div>
                          </div>
                          <div className="mt-2 flex items-center gap-4 text-xs text-purple-500 flex-wrap">
                            {p.bonusUntil && (
                              <span>Доступ до: {formatDate(p.bonusUntil)}</span>
                            )}
                            {p.expiresAt && (
                              <span>Истекает: {formatDate(p.expiresAt)}</span>
                            )}
                            {usagePercent !== null && (
                              <div className="flex items-center gap-2 flex-1">
                                <div className="flex-1 bg-purple-200 rounded-full h-1.5 min-w-[60px]">
                                  <div
                                    className="bg-purple-500 h-1.5 rounded-full"
                                    style={{ width: `${Math.min(usagePercent, 100)}%` }}
                                  />
                                </div>
                                <span>{usagePercent}%</span>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── АНАЛИТИКА ── */}
          <TabsContent value="analytics" className="space-y-6">
            {/* Воронка */}
            <Card className="bg-white border-2 border-purple-300 shadow-lg">
              <CardHeader>
                <CardTitle className="text-xl font-mystic text-purple-700 flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-pink-500" />
                  Воронка конверсии
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <FunnelRow
                  label="Всего зарегистрировалось"
                  value={stats?.totalUsers ?? 0}
                  total={stats?.totalUsers ?? 1}
                  color="bg-purple-400"
                />
                <FunnelRow
                  label="На активном триале прямо сейчас"
                  value={stats?.activeTrials ?? 0}
                  total={stats?.totalUsers ?? 1}
                  color="bg-blue-400"
                />
                <FunnelRow
                  label="С активным доступом (триал + подписка)"
                  value={stats?.usersWithAccess ?? 0}
                  total={stats?.totalUsers ?? 1}
                  color="bg-green-400"
                />
                <FunnelRow
                  label="Активная оплаченная подписка"
                  value={(stats?.activeMonthly ?? 0) + (stats?.activeYearly ?? 0)}
                  total={stats?.totalUsers ?? 1}
                  color="bg-pink-400"
                />
              </CardContent>
            </Card>

            {/* Общая статистика */}
            <Card className="bg-white border-2 border-purple-300 shadow-lg">
              <CardHeader>
                <CardTitle className="text-xl font-mystic text-purple-700 flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-pink-500" />
                  Подробная статистика
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <h4 className="font-medium text-purple-700 mb-3">Пользователи</h4>
                    <AnalyticsRow label="Всего зарегистрировано" value={stats?.totalUsers ?? 0} />
                    <AnalyticsRow label="С активным доступом" value={stats?.usersWithAccess ?? 0} />
                    <AnalyticsRow label="Активны сегодня" value={stats?.activeToday ?? 0} />
                    <AnalyticsRow label="Новых за 7 дней" value={stats?.newUsersLast7Days ?? 0} />
                    <AnalyticsRow label="Новых за 30 дней" value={stats?.newUsersLast30Days ?? 0} />
                    <AnalyticsRow label="Триал активен (сейчас)" value={stats?.activeTrials ?? 0} />
                    <AnalyticsRow label="Нет доступа" value={stats?.noAccess ?? 0} />
                    <AnalyticsRow label="Месячная (активная)" value={stats?.activeMonthly ?? 0} />
                    <AnalyticsRow label="Годовая (активная)" value={stats?.activeYearly ?? 0} />
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-medium text-purple-700 mb-3">Контент и платежи</h4>
                    <AnalyticsRow label="Контент-планов создано" value={stats?.totalStrategies ?? 0} />
                    <AnalyticsRow label="Голосовых постов" value={stats?.totalVoicePosts ?? 0} />
                    <AnalyticsRow label="Кейсов сохранено" value={stats?.totalCaseStudies ?? 0} />
                    <AnalyticsRow label="Успешных платежей (всего)" value={stats?.totalSuccessfulPayments ?? 0} />
                    <AnalyticsRow label="Из них — месячных" value={stats?.paidMonthlyPayments ?? 0} />
                    <AnalyticsRow label="Из них — годовых" value={stats?.paidYearlyPayments ?? 0} />
                    <AnalyticsRow
                      label="Конверсия в активную оплату"
                      value={
                        stats?.totalUsers
                          ? `${Math.round((((stats?.activeMonthly ?? 0) + (stats?.activeYearly ?? 0)) / stats.totalUsers) * 100)}%`
                          : "0%"
                      }
                    />
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

function FunnelRow({ label, value, total, color }: { label: string; value: number; total: number; color: string }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span className="text-purple-600">{label}</span>
        <span className="font-bold text-purple-700">{value} <span className="text-purple-400 font-normal">({pct}%)</span></span>
      </div>
      <div className="w-full bg-purple-100 rounded-full h-2">
        <div className={`${color} h-2 rounded-full transition-all`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function AnalyticsRow({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="flex items-center justify-between text-sm py-1.5 border-b border-purple-100 last:border-0">
      <span className="text-purple-500">{label}</span>
      <span className="font-bold text-purple-700">{typeof value === "number" ? value.toLocaleString("ru-RU") : value}</span>
    </div>
  );
}

function StatRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg border border-purple-100">
      <div className="flex items-center gap-2 text-purple-600">
        {icon}
        <span className="text-sm">{label}</span>
      </div>
      <span className="font-bold text-purple-700 text-lg">{value.toLocaleString("ru-RU")}</span>
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
          <p className="text-sm text-purple-500 leading-tight">{title}</p>
          {icon}
        </div>
        <p className="text-2xl font-bold text-purple-700">{value.toLocaleString("ru-RU")}</p>
        <p className="text-xs text-purple-400">{description}</p>
      </CardContent>
    </Card>
  );
}
