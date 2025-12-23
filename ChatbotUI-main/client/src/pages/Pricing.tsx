import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, Sparkles, Crown, ArrowLeft } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

export default function Pricing() {
  const { user, isAuthenticated } = useAuth();

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

        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          <Card className="relative border-2 border-purple-200 hover:border-purple-300 transition-colors shadow-lg">
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
                <span className="text-5xl font-bold text-purple-800">990</span>
                <span className="text-xl text-purple-600">₽</span>
                <p className="text-sm text-purple-500 mt-1">в месяц</p>
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
                className="w-full bg-purple-600 hover:bg-purple-700 text-white py-6 text-lg"
              >
                {hasActiveSubscription ? 'Продлить на месяц (+30 дней)' : 'Оформить подписку'}
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
                <span className="text-5xl font-bold text-purple-800">3990</span>
                <span className="text-xl text-purple-600">₽</span>
                <p className="text-sm text-purple-500 mt-1">в год</p>
                <div className="mt-2 text-sm">
                  <span className="line-through text-gray-400">11 880₽</span>
                  <span className="text-green-600 font-medium ml-2">Экономия 7 890₽</span>
                </div>
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
              >
                {hasActiveSubscription ? 'Продлить на год (+365 дней)' : 'Оформить подписку'}
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
