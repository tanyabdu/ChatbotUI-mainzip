import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Wand2, Mic, BookOpen, Moon, ArrowRight, Star } from "lucide-react";
import { Link } from "wouter";
import { LegalDocumentLink } from "@/components/LegalDocuments";

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
            <Link href="/login">
              Войти
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </header>

      <main>
        <section className="container mx-auto px-6 py-20 text-center">
          <Badge variant="secondary" className="mb-6 bg-purple-100 text-purple-700 border-2 border-purple-300">
            Планировщик контента для экспертов
          </Badge>
          <h2 className="text-5xl font-mystic text-purple-800 mb-6 leading-tight">
            Все инструменты для вашего контента<br/>в одном месте
          </h2>
          <p className="text-xl text-purple-600 mb-10 max-w-2xl mx-auto">
            Планировщик контента для тарологов, астрологов и духовных практиков.
            Генерируйте стратегии, создавайте посты и следите за лунным календарём.
          </p>
          <div className="flex justify-center gap-4 flex-wrap">
            <Button
              size="lg"
              asChild
              className="bg-gradient-to-r from-purple-600 to-pink-600 text-white text-lg px-8"
              data-testid="button-start"
            >
              <Link href="/register">
                Начать бесплатно
                <Star className="ml-2 h-5 w-5" />
              </Link>
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
              <a href="/register">
                Начать путешествие
                <Sparkles className="ml-2 h-5 w-5" />
              </a>
            </Button>
          </div>
        </section>
      </main>

      <footer className="border-t-2 border-purple-200 py-8 bg-white">
        <div className="container mx-auto px-6 text-center space-y-3">
          <p className="text-purple-500">Эзотерический Планировщик Контента &copy; 2026</p>
          <p className="text-purple-400 text-xs">ИП Климова Екатерина Викторовна, ИНН 561208353714</p>
          <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs">
            <LegalDocumentLink docType="terms" className="text-purple-400 hover:text-purple-600">Пользовательское соглашение</LegalDocumentLink>
            <LegalDocumentLink docType="privacy" className="text-purple-400 hover:text-purple-600">Политика конфиденциальности</LegalDocumentLink>
            <LegalDocumentLink docType="offer" className="text-purple-400 hover:text-purple-600">Публичная оферта</LegalDocumentLink>
          </div>
          <div className="pt-2">
            <a href="https://t.me/magic_content_help" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-sm text-purple-500 hover:text-purple-700 transition-colors">
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>
              Служба поддержки
            </a>
          </div>
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
