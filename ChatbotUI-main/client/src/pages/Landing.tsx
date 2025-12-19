import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Wand2, Mic, BookOpen, Moon, ArrowRight, Star } from "lucide-react";

export default function Landing() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 to-white">
      <header className="border-b-2 border-purple-200 bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Sparkles className="h-8 w-8 text-purple-600" />
            <h1 className="text-2xl font-mystic text-purple-700">Эзотерический Планировщик</h1>
          </div>
          <Button
            asChild
            className="bg-gradient-to-r from-purple-500 to-pink-500 text-white"
            data-testid="button-login"
          >
            <a href="/api/login">
              Войти
              <ArrowRight className="ml-2 h-4 w-4" />
            </a>
          </Button>
        </div>
      </header>

      <main>
        <section className="container mx-auto px-6 py-20 text-center">
          <Badge variant="secondary" className="mb-6 bg-purple-100 text-purple-700 border-2 border-purple-300">
            Магия контента для экспертов
          </Badge>
          <h2 className="text-5xl font-mystic text-purple-800 mb-6 leading-tight">
            Создавайте мистический контент<br/>с силой звёзд
          </h2>
          <p className="text-xl text-purple-600 mb-10 max-w-2xl mx-auto">
            Планировщик контента для тарологов, астрологов и духовных практиков.
            Генерируйте стратегии, создавайте посты и синхронизируйте их с лунными циклами.
          </p>
          <div className="flex justify-center gap-4 flex-wrap">
            <Button
              size="lg"
              asChild
              className="bg-gradient-to-r from-purple-600 to-pink-600 text-white text-lg px-8"
              data-testid="button-start"
            >
              <a href="/api/login">
                Начать бесплатно
                <Star className="ml-2 h-5 w-5" />
              </a>
            </Button>
          </div>
        </section>

        <section className="container mx-auto px-6 py-16">
          <h3 className="text-3xl font-mystic text-purple-700 text-center mb-12">
            Магические инструменты для вашего бренда
          </h3>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <FeatureCard
              icon={<Wand2 className="h-8 w-8 text-purple-500" />}
              title="Генератор Стратегий"
              description="Создавайте контент-планы на любой период с учётом вашей ниши и целей"
            />
            <FeatureCard
              icon={<Sparkles className="h-8 w-8 text-pink-500" />}
              title="Тест Архетипа"
              description="Определите свой уникальный архетип бренда и получите рекомендации по стилю"
            />
            <FeatureCard
              icon={<Mic className="h-8 w-8 text-purple-500" />}
              title="Голос Потока"
              description="Надиктуйте идею и превратите её в готовый пост с нужной тональностью"
            />
            <FeatureCard
              icon={<BookOpen className="h-8 w-8 text-pink-500" />}
              title="Банк Кейсов"
              description="Превращайте отзывы клиентов в красивые истории успеха"
            />
            <FeatureCard
              icon={<Moon className="h-8 w-8 text-purple-500" />}
              title="Лунный Календарь"
              description="Планируйте публикации в гармонии с фазами Луны"
            />
            <FeatureCard
              icon={<Star className="h-8 w-8 text-pink-500" />}
              title="Личный Гримуар"
              description="Храните все свои стратегии и контент в облаке"
            />
          </div>
        </section>

        <section className="bg-gradient-to-r from-purple-100 to-pink-100 py-16">
          <div className="container mx-auto px-6 text-center">
            <h3 className="text-3xl font-mystic text-purple-700 mb-6">
              Готовы раскрыть силу своего бренда?
            </h3>
            <p className="text-purple-600 mb-8 max-w-xl mx-auto">
              Присоединяйтесь к тысячам экспертов, которые уже используют силу звёзд для своего контента.
            </p>
            <Button
              size="lg"
              asChild
              className="bg-gradient-to-r from-purple-600 to-pink-600 text-white text-lg px-8"
              data-testid="button-join"
            >
              <a href="/api/login">
                Начать путешествие
                <Sparkles className="ml-2 h-5 w-5" />
              </a>
            </Button>
          </div>
        </section>
      </main>

      <footer className="border-t-2 border-purple-200 py-8 bg-white">
        <div className="container mx-auto px-6 text-center text-purple-500">
          <p>Эзотерический Планировщик Контента &copy; 2024</p>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <Card className="bg-white border-2 border-purple-200 shadow-md">
      <CardHeader className="flex flex-row items-center gap-4 pb-2">
        {icon}
        <CardTitle className="text-lg font-mystic text-purple-700">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-purple-600">{description}</p>
      </CardContent>
    </Card>
  );
}
