import { Link, useLocation } from "wouter";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Check, Sparkles, Crown, ArrowLeft, Loader2, Tag, X } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

export default function Pricing() {
  const { user, isAuthenticated } = useAuth();
  const [loading, setLoading] = useState<'monthly' | 'yearly' | null>(null);
  const { toast } = useToast();
  const [location] = useLocation();

  const [paymentSuccess, setPaymentSuccess] = useState(false);

  const [promoCode, setPromoCode] = useState("");
  const [promoLoading, setPromoLoading] = useState(false);
  const [appliedPromo, setAppliedPromo] = useState<{
    code: string;
    discountPercent: number;
    applicablePlans: string[];
  } | null>(null);
  
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('payment') === 'success') {
      setPaymentSuccess(true);
      toast({
        title: "Оплата прошла успешно!",
        description: "Ваша подписка активирована. Спасибо за покупку!",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
      window.history.replaceState({}, '', '/pricing');
    }
  }, [location]);

  useEffect(() => {
    const pending = localStorage.getItem('pendingPromoCode');
    if (pending && isAuthenticated && !appliedPromo) {
      localStorage.removeItem('pendingPromoCode');
      setPromoCode(pending);
      (async () => {
        setPromoLoading(true);
        try {
          const response = await apiRequest('POST', '/api/promocode/verify-discount', { code: pending });
          const data = await response.json();
          if (data.success) {
            setAppliedPromo({
              code: pending.toUpperCase(),
              discountPercent: data.discountPercent,
              applicablePlans: data.applicablePlans,
            });
            toast({
              title: "Промокод применён!",
              description: data.message,
            });
          }
        } catch (e) {}
        setPromoLoading(false);
      })();
    }
  }, [isAuthenticated]);

  const handleApplyPromo = async () => {
    if (!promoCode.trim()) return;
    if (!isAuthenticated) {
      toast({
        title: "Требуется авторизация",
        description: "Войдите в аккаунт, чтобы применить промокод",
        variant: "destructive",
      });
      return;
    }

    setPromoLoading(true);
    try {
      const response = await apiRequest('POST', '/api/promocode/verify-discount', { code: promoCode });
      const data = await response.json();

      if (data.success) {
        if (data.bonusActivated) {
          toast({
            title: "Промокод активирован!",
            description: data.message,
          });
          setPromoCode("");
        } else {
          setAppliedPromo({
            code: promoCode.toUpperCase(),
            discountPercent: data.discountPercent,
            applicablePlans: data.applicablePlans,
          });
          toast({
            title: "Промокод применён!",
            description: data.message,
          });
        }
      } else {
        toast({
          title: "Ошибка",
          description: data.message,
          variant: "destructive",
        });
      }
    } catch (error: any) {
      const errorData = error.message ? error.message : "Не удалось проверить промокод";
      toast({
        title: "Ошибка",
        description: errorData,
        variant: "destructive",
      });
    } finally {
      setPromoLoading(false);
    }
  };

  const handleRemovePromo = () => {
    setAppliedPromo(null);
    setPromoCode("");
  };

  const getPrice = (planType: 'monthly' | 'yearly') => {
    const basePrice = planType === 'monthly' ? 1690 : 5475;
    if (appliedPromo && appliedPromo.applicablePlans.includes(planType)) {
      return Math.round(basePrice * (1 - appliedPromo.discountPercent / 100));
    }
    return basePrice;
  };

  const hasDiscount = (planType: 'monthly' | 'yearly') => {
    return appliedPromo && appliedPromo.applicablePlans.includes(planType);
  };

  const handlePayment = async (planType: 'monthly' | 'yearly') => {
    if (!isAuthenticated) {
      toast({
        title: "Требуется авторизация",
        description: "Войдите в аккаунт, чтобы оформить подписку",
        variant: "destructive",
      });
      return;
    }

    setLoading(planType);
    try {
      const body: any = { planType };
      if (appliedPromo && appliedPromo.applicablePlans.includes(planType)) {
        body.promoCode = appliedPromo.code;
      }
      const response = await apiRequest('POST', '/api/payments/create-link', body);
      const data = await response.json();
      
      if (data.paymentUrl) {
        window.location.href = data.paymentUrl;
      } else {
        throw new Error('Не удалось создать ссылку оплаты');
      }
    } catch (error: any) {
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось создать ссылку оплаты",
        variant: "destructive",
      });
    } finally {
      setLoading(null);
    }
  };

  const features = [
    "Генератор контент-стратегий",
    "Квиз архетипов бренда",
    "Голосовые посты с ИИ",
    "Гримуар кейсов с OCR",
    "Лунный календарь",
    "Тренажёр продаж",
    "Безлимитные запросы",
  ];

  const getTrialDaysLeft = () => {
    if (!user?.trialEndsAt) return 0;
    const now = new Date();
    const trialEnd = new Date(user.trialEndsAt);
    const diff = Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return Math.max(0, diff);
  };

  const trialDaysLeft = getTrialDaysLeft();
  const hasActiveSubscription = user?.subscriptionTier && user.subscriptionTier !== 'trial' && user.subscriptionExpiresAt && new Date(user.subscriptionExpiresAt) > new Date();

  const monthlyPrice = getPrice('monthly');
  const yearlyPrice = getPrice('yearly');

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 via-pink-50 to-white">
      <div className="max-w-5xl mx-auto px-4 py-12">
        <div className="mb-8">
          <Link href="/">
            <Button variant="ghost" className="text-purple-600 hover:text-purple-700 hover:bg-purple-100">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Назад
            </Button>
          </Link>
        </div>

        {paymentSuccess && (
          <div className="mb-8 p-6 bg-green-50 border-2 border-green-200 rounded-xl text-center">
            <div className="flex items-center justify-center gap-2 text-green-700 mb-2">
              <Check className="h-6 w-6" />
              <span className="text-xl font-semibold">Оплата прошла успешно!</span>
            </div>
            <p className="text-green-600">
              Ваша подписка активирована. Спасибо за покупку!
            </p>
            <Link href="/">
              <Button className="mt-4 bg-green-600 hover:bg-green-700 text-white">
                Перейти к инструментам
              </Button>
            </Link>
          </div>
        )}

        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-mystic text-purple-800 mb-4">
            Тарифы
          </h1>
          <p className="text-lg text-purple-600 max-w-2xl mx-auto">
            Выберите план, который подходит именно вам. Все тарифы включают полный доступ ко всем инструментам.
          </p>
          
          {isAuthenticated && trialDaysLeft > 0 && !hasActiveSubscription && (
            <div className="mt-6 inline-flex items-center gap-2 bg-purple-100 text-purple-700 px-4 py-2 rounded-full">
              <Sparkles className="h-4 w-4" />
              <span>У вас осталось {trialDaysLeft} {trialDaysLeft === 1 ? 'день' : trialDaysLeft < 5 ? 'дня' : 'дней'} бесплатного доступа</span>
            </div>
          )}
          
          {hasActiveSubscription && (
            <div className="mt-6 inline-flex items-center gap-2 bg-green-100 text-green-700 px-4 py-2 rounded-full">
              <Crown className="h-4 w-4" />
              <span>Ваша подписка активна до {new Date(user.subscriptionExpiresAt!).toLocaleDateString('ru-RU')}</span>
            </div>
          )}
        </div>

        {isAuthenticated && (
          <div className="max-w-md mx-auto mb-10">
            {appliedPromo ? (
              <div className="flex items-center gap-3 p-4 bg-green-50 border-2 border-green-200 rounded-xl">
                <Tag className="h-5 w-5 text-green-600 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-green-700 font-medium">
                    Промокод <span className="font-bold">{appliedPromo.code}</span> применён
                  </p>
                  <p className="text-green-600 text-sm">Скидка {appliedPromo.discountPercent}%</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleRemovePromo}
                  className="text-green-600 hover:text-red-600 hover:bg-red-50 p-1 h-auto"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Tag className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-purple-400" />
                  <Input
                    placeholder="Введите промокод"
                    value={promoCode}
                    onChange={(e) => setPromoCode(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleApplyPromo()}
                    className="pl-10 border-purple-200 focus:border-purple-400"
                  />
                </div>
                <Button
                  onClick={handleApplyPromo}
                  disabled={promoLoading || !promoCode.trim()}
                  variant="outline"
                  className="border-purple-300 text-purple-600 hover:bg-purple-50"
                >
                  {promoLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Применить"}
                </Button>
              </div>
            )}
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          <Card className="relative border-2 border-purple-200 hover:border-purple-300 transition-colors shadow-lg">
            {hasDiscount('monthly') && (
              <div className="absolute -top-3 right-4">
                <Badge className="bg-green-500 text-white px-3 py-1">
                  -{appliedPromo!.discountPercent}%
                </Badge>
              </div>
            )}
            <CardHeader className="text-center pb-2">
              <CardTitle className="text-2xl font-mystic text-purple-700">
                Месячный
              </CardTitle>
              <CardDescription className="text-purple-500">
                Идеально для знакомства
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <div className="my-6">
                {hasDiscount('monthly') ? (
                  <>
                    <div className="mb-1">
                      <span className="text-2xl line-through text-gray-400">1690₽</span>
                    </div>
                    <span className="text-5xl font-bold text-green-600">{monthlyPrice}</span>
                    <span className="text-xl text-green-500">₽</span>
                    <p className="text-sm text-green-500 mt-1">в месяц со скидкой</p>
                  </>
                ) : (
                  <>
                    <span className="text-5xl font-bold text-purple-800">{monthlyPrice}</span>
                    <span className="text-xl text-purple-600">₽</span>
                    <p className="text-sm text-purple-500 mt-1">в месяц</p>
                  </>
                )}
              </div>
              
              <ul className="text-left space-y-3 mb-8">
                {features.map((feature, idx) => (
                  <li key={idx} className="flex items-center gap-2 text-purple-700">
                    <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
              
              <Button 
                className={`w-full py-6 text-lg ${hasDiscount('monthly') ? 'bg-green-600 hover:bg-green-700' : 'bg-purple-600 hover:bg-purple-700'} text-white`}
                onClick={() => handlePayment('monthly')}
                disabled={loading !== null}
              >
                {loading === 'monthly' ? (
                  <><Loader2 className="h-5 w-5 mr-2 animate-spin" /> Переход к оплате...</>
                ) : (
                  hasActiveSubscription ? 'Продлить на месяц (+30 дней)' : 'Оформить подписку'
                )}
              </Button>
              
              <p className="text-xs text-purple-400 mt-3">
                Оплата через Продамус
              </p>
            </CardContent>
          </Card>

          <Card className="relative border-2 border-pink-300 hover:border-pink-400 transition-colors shadow-xl bg-gradient-to-b from-white to-pink-50">
            <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
              <Badge className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-4 py-1">
                Выгодно
              </Badge>
            </div>
            <CardHeader className="text-center pb-2 pt-8">
              <CardTitle className="text-2xl font-mystic text-purple-700">
                Годовой
              </CardTitle>
              <CardDescription className="text-purple-500">
                Максимальная экономия
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <div className="my-6">
                {hasDiscount('yearly') ? (
                  <>
                    <div className="mb-1">
                      <span className="text-2xl line-through text-gray-400">5475₽</span>
                    </div>
                    <span className="text-5xl font-bold text-green-600">{yearlyPrice}</span>
                    <span className="text-xl text-green-500">₽</span>
                    <p className="text-sm text-green-500 mt-1">в год со скидкой</p>
                  </>
                ) : (
                  <>
                    <span className="text-5xl font-bold text-purple-800">{yearlyPrice}</span>
                    <span className="text-xl text-purple-600">₽</span>
                    <p className="text-sm text-purple-500 mt-1">в год</p>
                    <div className="mt-2 text-sm">
                      <span className="line-through text-gray-400">20 280₽</span>
                      <span className="text-green-600 font-medium ml-2">Экономия 14 805₽</span>
                    </div>
                  </>
                )}
              </div>
              
              <ul className="text-left space-y-3 mb-8">
                {features.map((feature, idx) => (
                  <li key={idx} className="flex items-center gap-2 text-purple-700">
                    <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
              
              <Button 
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white py-6 text-lg"
                onClick={() => handlePayment('yearly')}
                disabled={loading !== null}
              >
                {loading === 'yearly' ? (
                  <><Loader2 className="h-5 w-5 mr-2 animate-spin" /> Переход к оплате...</>
                ) : (
                  hasActiveSubscription ? 'Продлить на год (+365 дней)' : 'Оформить подписку'
                )}
              </Button>
              
              <p className="text-xs text-purple-400 mt-3">
                Оплата через Продамус
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="mt-16 text-center">
          <Card className="max-w-2xl mx-auto bg-purple-50 border-purple-200">
            <CardContent className="p-8">
              <h3 className="text-xl font-mystic text-purple-700 mb-4">
                Бесплатный пробный период
              </h3>
              <p className="text-purple-600 mb-4">
                При регистрации вы получаете <strong>3 дня бесплатного доступа</strong> ко всем функциям приложения. 
                Никаких ограничений — пользуйтесь всеми инструментами и оцените их возможности.
              </p>
              {!isAuthenticated && (
                <Link href="/register">
                  <Button className="bg-purple-600 hover:bg-purple-700">
                    Попробовать бесплатно
                  </Button>
                </Link>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="mt-12 text-center text-purple-500 text-sm">
          <p>Есть вопросы? Напишите нам: klimova@magic-content.ru</p>
        </div>
      </div>
    </div>
  );
}
