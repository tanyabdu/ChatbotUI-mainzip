import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { 
  LayoutDashboard, Users, BarChart3, Settings, 
  Sparkles, Home, TrendingUp, FileText, Mic, Archive,
  Plus, Clock, Crown, Shield, ShieldOff, Trash2, CreditCard, Tag,
  UserCheck, CalendarDays, Activity, Banknote, Gift, Search, Mail, Send, RefreshCw, Download
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
  paidWithMoney: number;
  paidWithPromocode: number;
  paidBoth: number;
  periodNewUsers: number;
  periodPayments: number;
  periodPromoUsages: number;
  promocodeStats: PromocodeStat[];
}

type AccessSources = Record<string, { hasPayment: boolean; hasPromocode: boolean; promoCodes: string[] }>;

interface AdminPayment {
  id: string;
  userId: string;
  orderId: string;
  amount: string;
  planType: string;
  status: string;
  createdAt: string;
  userEmail?: string;
  userName?: string;
}

const toInputDate = (d: Date) => d.toISOString().slice(0, 10);

export default function Admin() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [userSearch, setUserSearch] = useState("");
  const [usagePeriod, setUsagePeriod] = useState<"day" | "week" | "month">("week");

  const defaultTo = new Date();
  const defaultFrom = new Date(defaultTo.getTime() - 30 * 24 * 60 * 60 * 1000);
  const [periodFrom, setPeriodFrom] = useState(toInputDate(defaultFrom));
  const [periodTo, setPeriodTo] = useState(toInputDate(defaultTo));

  const { data: stats } = useQuery<AdminStats>({
    queryKey: ["/api/admin/stats", periodFrom, periodTo],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/admin/stats?from=${periodFrom}&to=${periodTo}`);
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

  const { data: accessSources = {} } = useQuery<AccessSources>({
    queryKey: ["/api/admin/access-sources"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/admin/access-sources");
      return res.json();
    },
    enabled: !!user?.isAdmin,
  });

  const { data: allPayments = [] } = useQuery<AdminPayment[]>({
    queryKey: ["/api/admin/payments"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/admin/payments");
      return res.json();
    },
    enabled: !!user?.isAdmin,
  });

  const { data: usageData } = useQuery<{ stats: { section: string; label: string; count: number }[] }>({
    queryKey: ["/api/admin/usage-stats", usagePeriod],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/admin/usage-stats?period=${usagePeriod}`);
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
          <TabsList className="grid w-full grid-cols-5 lg:w-auto lg:inline-flex bg-purple-100 border-2 border-purple-200">
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
            <TabsTrigger value="newsletter" className="data-[state=active]:bg-purple-500 data-[state=active]:text-white">
              <Mail className="h-4 w-4 mr-1 md:mr-2" />
              <span className="hidden sm:inline">Рассылки</span>
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

            {/* Новые регистрации + оплаты + источники */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
              <Card className="bg-white border-2 border-green-200">
                <CardContent className="p-5">
                  <div className="flex items-center gap-3 mb-3">
                    <Banknote className="h-5 w-5 text-green-600" />
                    <p className="font-medium text-green-700">Источники доступа</p>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-1 text-green-600"><Banknote className="h-3 w-3" /> Только деньгами</span>
                      <span className="font-bold text-lg text-green-700">{stats?.paidWithMoney ?? 0}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-1 text-blue-600"><Gift className="h-3 w-3" /> Только промокод</span>
                      <span className="font-bold text-lg text-blue-700">{stats?.paidWithPromocode ?? 0}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-purple-500">И то и другое</span>
                      <span className="font-bold text-lg text-purple-700">{stats?.paidBoth ?? 0}</span>
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
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <CardTitle className="text-xl font-mystic text-purple-700 flex items-center gap-2">
                    <Users className="h-5 w-5 text-pink-500" />
                    Все пользователи ({allUsers.length})
                  </CardTitle>
                  <div className="relative w-full sm:w-72">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-purple-400" />
                    <Input
                      placeholder="Поиск по email или имени..."
                      value={userSearch}
                      onChange={e => setUserSearch(e.target.value)}
                      className="pl-9 border-purple-200 focus:border-purple-400"
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {allUsers.length === 0 ? (
                  <p className="text-purple-500 text-center py-8">Нет зарегистрированных пользователей</p>
                ) : (
                  <div className="space-y-4">
                    {allUsers.filter(u => {
                      if (!userSearch) return true;
                      const q = userSearch.toLowerCase();
                      return (u.email ?? "").toLowerCase().includes(q) ||
                        (u.nickname ?? "").toLowerCase().includes(q) ||
                        (u.firstName ?? "").toLowerCase().includes(q);
                    }).map((u) => {
                      const src = accessSources[u.id];
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
                                {/* Payment/Promo source badges */}
                                <div className="flex items-center gap-1 mt-1 flex-wrap">
                                  {src?.hasPayment && (
                                    <span className="inline-flex items-center gap-0.5 text-[10px] bg-green-100 text-green-700 border border-green-200 rounded px-1.5 py-0.5 font-medium">
                                      <Banknote className="h-2.5 w-2.5" /> Оплата
                                    </span>
                                  )}
                                  {src?.hasPromocode && src.promoCodes.map(code => (
                                    <span key={code} className="inline-flex items-center gap-0.5 text-[10px] bg-blue-100 text-blue-700 border border-blue-200 rounded px-1.5 py-0.5 font-medium">
                                      <Gift className="h-2.5 w-2.5" /> {code}
                                    </span>
                                  ))}
                                </div>
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

            {/* Журнал оплат */}
            <Card className="bg-white border-2 border-purple-300 shadow-lg">
              <CardHeader>
                <CardTitle className="text-xl font-mystic text-purple-700 flex items-center gap-2">
                  <Banknote className="h-5 w-5 text-green-500" />
                  Журнал оплат
                  <span className="text-sm font-normal text-purple-400 ml-2">последние 500</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {!allPayments.length ? (
                  <p className="text-purple-400 text-center py-6">Оплат пока нет</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-purple-200">
                          <th className="text-left py-2 px-2 text-purple-600 font-semibold">Дата</th>
                          <th className="text-left py-2 px-2 text-purple-600 font-semibold">Пользователь</th>
                          <th className="text-left py-2 px-2 text-purple-600 font-semibold">Тариф</th>
                          <th className="text-right py-2 px-2 text-purple-600 font-semibold">Сумма</th>
                          <th className="text-center py-2 px-2 text-purple-600 font-semibold">Статус</th>
                        </tr>
                      </thead>
                      <tbody>
                        {allPayments.map((p) => (
                          <tr key={p.id} className="border-b border-purple-100 hover:bg-purple-50 transition-colors">
                            <td className="py-2 px-2 text-gray-500 whitespace-nowrap">
                              {new Date(p.createdAt).toLocaleString("ru-RU", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" })}
                            </td>
                            <td className="py-2 px-2">
                              <div className="text-gray-800 font-medium truncate max-w-[180px]">{p.userEmail || p.userId}</div>
                              {p.userName && <div className="text-gray-400 text-xs">{p.userName}</div>}
                            </td>
                            <td className="py-2 px-2">
                              <Badge variant="outline" className={p.planType === "yearly" ? "text-purple-700 border-purple-400" : "text-blue-700 border-blue-400"}>
                                {p.planType === "yearly" ? "Год" : "Месяц"}
                              </Badge>
                            </td>
                            <td className="py-2 px-2 text-right font-bold text-green-700">
                              {p.status === "success" ? `${parseFloat(p.amount).toLocaleString("ru-RU")} ₽` : <span className="text-gray-400">{parseFloat(p.amount).toLocaleString("ru-RU")} ₽</span>}
                            </td>
                            <td className="py-2 px-2 text-center">
                              {p.status === "success" && <Badge className="bg-green-100 text-green-700 border border-green-300 text-xs">Оплачено</Badge>}
                              {p.status === "pending" && <Badge variant="outline" className="text-yellow-600 border-yellow-400 text-xs">Ожидание</Badge>}
                              {p.status === "failed" && <Badge variant="destructive" className="text-xs">Ошибка</Badge>}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
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
            {/* Выбор периода */}
            <Card className="bg-white border-2 border-purple-200">
              <CardContent className="p-4">
                <div className="flex items-center gap-3 flex-wrap">
                  <CalendarDays className="h-5 w-5 text-purple-500 flex-shrink-0" />
                  <span className="font-medium text-purple-700 flex-shrink-0">Период:</span>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Input
                      type="date"
                      value={periodFrom}
                      onChange={e => setPeriodFrom(e.target.value)}
                      className="w-40 border-purple-200 focus:border-purple-400 text-sm"
                    />
                    <span className="text-purple-400">—</span>
                    <Input
                      type="date"
                      value={periodTo}
                      onChange={e => setPeriodTo(e.target.value)}
                      className="w-40 border-purple-200 focus:border-purple-400 text-sm"
                    />
                  </div>
                  <div className="flex gap-2 ml-auto flex-wrap">
                    {[
                      { label: "7 дней", days: 7 },
                      { label: "30 дней", days: 30 },
                      { label: "90 дней", days: 90 },
                    ].map(({ label, days }) => (
                      <Button
                        key={days}
                        size="sm"
                        variant="outline"
                        className="border-purple-200 text-purple-600 hover:bg-purple-50 text-xs"
                        onClick={() => {
                          const to = new Date();
                          const from = new Date(to.getTime() - days * 24 * 60 * 60 * 1000);
                          setPeriodTo(toInputDate(to));
                          setPeriodFrom(toInputDate(from));
                        }}
                      >
                        {label}
                      </Button>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Статистика за период */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-5 bg-purple-50 rounded-lg border-2 border-purple-200 text-center">
                <p className="text-4xl font-bold text-purple-700">{stats?.periodNewUsers ?? 0}</p>
                <p className="text-sm text-purple-500 mt-1">Новых регистраций за период</p>
              </div>
              <div className="p-5 bg-green-50 rounded-lg border-2 border-green-200 text-center">
                <p className="text-4xl font-bold text-green-700">{stats?.periodPayments ?? 0}</p>
                <p className="text-sm text-green-600 mt-1">Успешных оплат за период</p>
              </div>
              <div className="p-5 bg-blue-50 rounded-lg border-2 border-blue-200 text-center">
                <p className="text-4xl font-bold text-blue-700">{stats?.periodPromoUsages ?? 0}</p>
                <p className="text-sm text-blue-600 mt-1">Активаций промокодов за период</p>
              </div>
            </div>

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

            {/* Использование разделов */}
            <Card className="bg-white border-2 border-purple-300 shadow-lg">
              <CardHeader>
                <CardTitle className="text-xl font-mystic text-purple-700 flex items-center gap-2">
                  <Activity className="h-5 w-5 text-pink-500" />
                  Использование разделов
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2 flex-wrap">
                  {([
                    { value: "day", label: "За день" },
                    { value: "week", label: "За неделю" },
                    { value: "month", label: "За месяц" },
                  ] as const).map(({ value, label }) => (
                    <Button
                      key={value}
                      size="sm"
                      variant={usagePeriod === value ? "default" : "outline"}
                      className={usagePeriod === value
                        ? "bg-purple-500 text-white hover:bg-purple-600"
                        : "border-purple-200 text-purple-600 hover:bg-purple-50"
                      }
                      onClick={() => setUsagePeriod(value)}
                    >
                      {label}
                    </Button>
                  ))}
                </div>
                {!usageData?.stats || usageData.stats.length === 0 ? (
                  <p className="text-sm text-purple-400 text-center py-4">
                    Нет данных за выбранный период
                  </p>
                ) : (
                  <div className="space-y-3">
                    {(() => {
                      const maxCount = Math.max(...usageData.stats.map(s => s.count), 1);
                      return usageData.stats.map((item, idx) => {
                        const pct = Math.round((item.count / maxCount) * 100);
                        return (
                          <div key={item.section} className="space-y-1">
                            <div className="flex justify-between items-center text-sm">
                              <div className="flex items-center gap-2">
                                <span className="text-purple-400 font-mono text-xs w-5 text-right">{idx + 1}</span>
                                <span className="text-purple-700 font-medium">{item.label}</span>
                              </div>
                              <span className="font-bold text-purple-700 tabular-nums">{item.count}</span>
                            </div>
                            <div className="w-full bg-purple-100 rounded-full h-2">
                              <div
                                className="bg-gradient-to-r from-purple-400 to-pink-400 h-2 rounded-full transition-all"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                        );
                      });
                    })()}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── РАССЫЛКИ ── */}
          <TabsContent value="newsletter" className="space-y-6">
            <NewsletterTab />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

const SEGMENTS = [
  { value: "all", label: "Все пользователи" },
  { value: "trial", label: "Пробный период" },
  { value: "monthly", label: "Месячная подписка" },
  { value: "yearly", label: "Годовая подписка" },
  { value: "free", label: "Без доступа (free)" },
  { value: "active", label: "Активные (вход за 30 дней)" },
  { value: "inactive", label: "Неактивные (нет входа 30+ дней)" },
  { value: "new7", label: "Новые за 7 дней" },
  { value: "new30", label: "Новые за 30 дней" },
];

function NewsletterTab() {
  const { toast } = useToast();
  const [segments, setSegments] = useState<string[]>(["all"]);
  const [marketingOnly, setMarketingOnly] = useState(true);
  const [subject, setSubject] = useState("");
  const [html, setHtml] = useState("");
  const [recipientCount, setRecipientCount] = useState<number | null>(null);
  const [loadingCount, setLoadingCount] = useState(false);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ sent: number; failed: number; total: number } | null>(null);
  const [selectedLogId, setSelectedLogId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  function toggleSegment(value: string) {
    setRecipientCount(null);
    if (value === "all") {
      setSegments(["all"]);
      return;
    }
    setSegments(prev => {
      const without = prev.filter(s => s !== "all" && s !== value);
      const adding = !prev.includes(value);
      const next = adding ? [...without, value] : without;
      return next.length === 0 ? ["all"] : next;
    });
  }

  const { data: history = [], isLoading: historyLoading, isError: historyError } = useQuery<{
    id: string; subject: string; segment: string; marketingOnly: boolean;
    sent: number; failed: number; total: number; opens: number; clicks: number; createdAt: string;
  }[]>({
    queryKey: ["/api/admin/newsletter/history"],
    queryFn: async () => {
      const res = await fetch("/api/admin/newsletter/history", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load history");
      return res.json();
    },
  });

  const selectedLog = selectedLogId ? history.find(l => l.id === selectedLogId) ?? null : null;

  const { data: logRecipients = [], isLoading: recipientsLoading } = useQuery<{
    id: string; logId: string; email: string; firstName: string | null; status: string; createdAt: string;
  }[]>({
    queryKey: ["/api/admin/newsletter", selectedLogId, "recipients"],
    queryFn: async () => {
      const res = await fetch(`/api/admin/newsletter/${selectedLogId}/recipients`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load recipients");
      return res.json();
    },
    enabled: !!selectedLogId,
  });

  async function checkCount() {
    setLoadingCount(true);
    setRecipientCount(null);
    try {
      const params = new URLSearchParams({ marketingOnly: String(marketingOnly) });
      segments.forEach(s => params.append("segments", s));
      const res = await fetch(`/api/admin/newsletter/count?${params}`, { credentials: "include" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setRecipientCount(data.count);
    } catch {
      toast({ title: "Ошибка", description: "Не удалось получить количество получателей", variant: "destructive" });
    } finally {
      setLoadingCount(false);
    }
  }

  async function sendNewsletter() {
    if (!subject.trim() || !html.trim()) {
      toast({ title: "Заполните поля", description: "Укажите тему и текст письма", variant: "destructive" });
      return;
    }
    setSending(true);
    setResult(null);
    try {
      const res = await apiRequest("POST", "/api/admin/newsletter/send", { segments, marketingOnly, subject, html });
      const data = await res.json();
      setResult(data);
      queryClient.invalidateQueries({ queryKey: ["/api/admin/newsletter/history"] });
      toast({ title: "Рассылка завершена", description: `Отправлено: ${data.sent}, ошибок: ${data.failed}` });
    } catch {
      toast({ title: "Ошибка отправки", description: "Попробуйте ещё раз", variant: "destructive" });
    } finally {
      setSending(false);
    }
  }

  const segmentLabel = (val: string) => SEGMENTS.find(s => s.value === val)?.label ?? val;
  const segmentChips = (raw: string) =>
    raw.split(",").map(v => v.trim()).filter(Boolean).map(v => segmentLabel(v));

  return (
    <div className="space-y-6 max-w-2xl">
      <Card className="bg-white border-2 border-purple-200">
        <CardHeader>
          <CardTitle className="text-purple-700 flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Новая рассылка
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Segment selector */}
          <div className="space-y-2">
            <Label className="text-purple-700 font-semibold">Сегменты получателей <span className="text-purple-400 font-normal">(можно выбрать несколько)</span></Label>
            <div className="grid grid-cols-1 gap-2">
              {SEGMENTS.map((s) => {
                const checked = segments.includes(s.value);
                return (
                  <label key={s.value} className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-colors ${checked ? "border-purple-400 bg-purple-50" : "border-purple-100 hover:border-purple-300"}`}>
                    <Checkbox
                      checked={checked}
                      onCheckedChange={() => toggleSegment(s.value)}
                      className="border-purple-400 data-[state=checked]:bg-purple-500"
                    />
                    <span className="text-sm text-purple-700">{s.label}</span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Marketing consent filter */}
          <div className="flex items-center gap-3 p-3 rounded-lg border-2 border-purple-100">
            <Checkbox
              id="marketingOnly"
              checked={marketingOnly}
              onCheckedChange={(v) => { setMarketingOnly(!!v); setRecipientCount(null); }}
              className="border-purple-400 data-[state=checked]:bg-purple-500"
            />
            <label htmlFor="marketingOnly" className="text-sm text-purple-700 cursor-pointer">
              Только с согласием на маркетинговые рассылки <span className="text-purple-400">(рекомендуется по закону)</span>
            </label>
          </div>

          {/* Count check */}
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={checkCount} disabled={loadingCount} className="border-purple-300 text-purple-600 hover:bg-purple-50">
              {loadingCount ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Users className="h-4 w-4 mr-2" />}
              Проверить охват
            </Button>
            {recipientCount !== null && (
              <span className="text-purple-700 font-semibold">
                {recipientCount === 0 ? "Нет получателей" : `${recipientCount} получател${recipientCount === 1 ? "ь" : recipientCount < 5 ? "я" : "ей"}`}
              </span>
            )}
          </div>

          {/* Subject */}
          <div className="space-y-2">
            <Label htmlFor="subject" className="text-purple-700 font-semibold">Тема письма</Label>
            <Input
              id="subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Например: Новые возможности планировщика ✨"
              className="border-purple-200 focus:border-purple-400"
            />
          </div>

          {/* Body */}
          <div className="space-y-2">
            <Label htmlFor="html" className="text-purple-700 font-semibold">Текст письма (HTML)</Label>
            <Textarea
              id="html"
              value={html}
              onChange={(e) => setHtml(e.target.value)}
              placeholder={"<p>Привет!</p>\n<p>Хотим поделиться с вами...</p>"}
              rows={10}
              className="border-purple-200 focus:border-purple-400 font-mono text-sm"
            />
            <p className="text-xs text-purple-400">Поддерживается HTML. Для простого текста просто пишите без тегов.</p>
          </div>

          {/* Send button */}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:opacity-90"
                disabled={sending || !subject.trim() || !html.trim()}
              >
                {sending ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
                {sending ? "Отправляется..." : "Отправить рассылку"}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Подтвердите отправку</AlertDialogTitle>
                <AlertDialogDescription>
                  {recipientCount !== null
                    ? `Будет отправлено письмо «${subject}» для ${recipientCount} получателей.`
                    : `Будет отправлено письмо «${subject}». Точное количество получателей неизвестно — нажмите «Проверить охват» перед отправкой.`}
                  {" "}Это действие нельзя отменить.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Отмена</AlertDialogCancel>
                <AlertDialogAction onClick={sendNewsletter} className="bg-purple-600 hover:bg-purple-700">
                  Отправить
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          {/* Result */}
          {result && (
            <div className={`p-4 rounded-lg border-2 ${result.failed === 0 ? "border-green-200 bg-green-50" : "border-yellow-200 bg-yellow-50"}`}>
              <p className="font-semibold text-sm mb-1">{result.failed === 0 ? "✅ Рассылка завершена успешно" : "⚠️ Рассылка завершена с ошибками"}</p>
              <p className="text-sm text-gray-600">Отправлено: <strong>{result.sent}</strong> из <strong>{result.total}</strong>{result.failed > 0 && `, ошибок: ${result.failed}`}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* History */}
      <Card className="bg-white border-2 border-purple-200">
        <CardHeader>
          <CardTitle className="text-purple-700 flex items-center gap-2">
            <Clock className="h-5 w-5" />
            История рассылок
          </CardTitle>
        </CardHeader>
        <CardContent>
          {historyLoading ? (
            <div className="flex items-center gap-2 text-purple-400 py-4">
              <RefreshCw className="h-4 w-4 animate-spin" />
              <span className="text-sm">Загрузка истории...</span>
            </div>
          ) : historyError ? (
            <p className="text-sm text-red-400 py-4 text-center">Не удалось загрузить историю рассылок</p>
          ) : history.length === 0 ? (
            <p className="text-sm text-purple-400 py-4 text-center">Рассылок ещё не было</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-purple-100">
                    <th className="text-left py-2 pr-4 text-purple-500 font-semibold">Дата</th>
                    <th className="text-left py-2 pr-4 text-purple-500 font-semibold">Тема</th>
                    <th className="text-left py-2 pr-4 text-purple-500 font-semibold">Сегмент</th>
                    <th className="text-right py-2 pr-2 text-purple-500 font-semibold">Отпр.</th>
                    <th className="text-right py-2 pr-2 text-purple-500 font-semibold">Ошибок</th>
                    <th className="text-right py-2 pr-2 text-purple-500 font-semibold">Откр.</th>
                    <th className="text-right py-2 text-purple-500 font-semibold">Клики</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((log) => {
                    const openRate = log.sent > 0 ? Math.round((log.opens / log.sent) * 100) : 0;
                    const clickRate = log.sent > 0 ? Math.round((log.clicks / log.sent) * 100) : 0;
                    return (
                    <tr
                      key={log.id}
                      className="border-b border-purple-50 hover:bg-purple-50/60 cursor-pointer transition-colors"
                      onClick={() => setSelectedLogId(log.id)}
                      title="Нажмите, чтобы увидеть список получателей"
                    >
                      <td className="py-2 pr-4 text-purple-600 whitespace-nowrap">
                        {new Date(log.createdAt).toLocaleString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                      </td>
                      <td className="py-2 pr-4 text-gray-700 max-w-[200px] truncate" title={log.subject}>{log.subject}</td>
                      <td className="py-2 pr-4">
                        {segmentChips(log.segment).map((chip, i) => (
                          <span key={i} className="inline-block px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 text-xs mr-1">{chip}</span>
                        ))}
                        {!log.marketingOnly && <span className="ml-1 inline-block px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 text-xs">все</span>}
                      </td>
                      <td className="py-2 pr-2 text-right font-semibold text-green-600">{log.sent}</td>
                      <td className="py-2 pr-2 text-right font-semibold text-red-500">{log.failed > 0 ? log.failed : <span className="text-gray-300">—</span>}</td>
                      <td className="py-2 pr-2 text-right">
                        {log.opens > 0 ? (
                          <span className="font-semibold text-blue-600">{log.opens} <span className="text-blue-400 font-normal text-xs">({openRate}%)</span></span>
                        ) : (
                          <span className="text-gray-300">—</span>
                        )}
                      </td>
                      <td className="py-2 text-right">
                        {log.clicks > 0 ? (
                          <span className="font-semibold text-indigo-600">{log.clicks} <span className="text-indigo-400 font-normal text-xs">({clickRate}%)</span></span>
                        ) : (
                          <span className="text-gray-300">—</span>
                        )}
                      </td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!selectedLogId} onOpenChange={(open) => { if (!open) setSelectedLogId(null); }}>
        <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-purple-700 flex items-center gap-2">
              <Users className="h-5 w-5" />
              Получатели рассылки
              {selectedLog && (
                <span className="text-sm font-normal text-purple-400 ml-1">— {selectedLog.subject}</span>
              )}
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto mt-2">
            {recipientsLoading ? (
              <div className="flex items-center gap-2 text-purple-400 py-6 justify-center">
                <RefreshCw className="h-4 w-4 animate-spin" />
                <span className="text-sm">Загрузка получателей...</span>
              </div>
            ) : logRecipients.length === 0 ? (
              <p className="text-sm text-purple-400 py-6 text-center">Данные о получателях не сохранены для этой рассылки</p>
            ) : (
              <div className="space-y-1">
                <div className="flex gap-3 text-xs text-purple-400 font-semibold px-3 pb-1 border-b border-purple-100">
                  <span className="flex-1">Email</span>
                  <span className="w-32">Имя</span>
                  <span className="w-16 text-right">Статус</span>
                </div>
                {logRecipients.map((r) => (
                  <div key={r.id} className="flex gap-3 items-center px-3 py-1.5 rounded-md hover:bg-purple-50 transition-colors text-sm">
                    <span className="flex-1 text-gray-700 font-mono truncate">{r.email}</span>
                    <span className="w-32 text-purple-600 truncate">{r.firstName ?? <span className="text-gray-300">—</span>}</span>
                    <span className={`w-16 text-right font-semibold ${r.status === "sent" ? "text-green-600" : "text-red-500"}`}>
                      {r.status === "sent" ? "✓ Отпр." : "✗ Ошибка"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
          {logRecipients.length > 0 && (
            <div className="mt-3 pt-3 border-t border-purple-100 flex items-center gap-4 text-sm flex-wrap">
              <span className="text-green-600 font-semibold">{logRecipients.filter(r => r.status === "sent").length} отправлено</span>
              {logRecipients.some(r => r.status === "failed") && (
                <span className="text-red-500 font-semibold">{logRecipients.filter(r => r.status === "failed").length} ошибок</span>
              )}
              <span className="text-purple-400">Всего: {logRecipients.length}</span>
              <Button
                variant="outline"
                size="sm"
                className="border-purple-300 text-purple-600 hover:bg-purple-50 ml-auto"
                asChild
              >
                <a
                  href={`/api/admin/newsletter/${selectedLogId}/recipients/export`}
                  download
                >
                  <Download className="h-4 w-4 mr-1.5" />
                  Скачать CSV
                </a>
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
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
