import { Sparkles, LogOut, LogIn } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface HeaderProps {
  title?: string;
  subtitle?: string;
}

export default function Header({ 
  subtitle = "Стратегия • Контент • Энергия • Продажи"
}: HeaderProps) {
  const { user, isAuthenticated } = useAuth();
  const displayName = user?.nickname || user?.firstName || user?.email?.split("@")[0] || "Эксперт";

  return (
    <header className="fade-in">
      <div className="flex items-center justify-between mb-8 pt-4 flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <Sparkles className="h-6 w-6 text-purple-500" />
          <span className="text-lg font-mystic text-purple-700">Эзотерический Планировщик</span>
        </div>
        <div className="flex items-center gap-3">
          {isAuthenticated ? (
            <>
              <Button variant="ghost" asChild data-testid="link-grimoire">
                <Link href="/grimoire" className="flex items-center gap-2">
                  <Avatar className="h-8 w-8 border-2 border-purple-300">
                    <AvatarImage src={user?.profileImageUrl || ""} />
                    <AvatarFallback className="bg-gradient-to-br from-purple-400 to-pink-400 text-white text-sm">
                      {displayName.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="hidden sm:inline text-purple-600">{displayName}</span>
                </Link>
              </Button>
              <Button variant="outline" size="icon" asChild data-testid="button-logout">
                <a href="/api/logout">
                  <LogOut className="h-4 w-4 text-purple-600" />
                </a>
              </Button>
            </>
          ) : (
            <Button asChild data-testid="button-login" className="bg-gradient-to-r from-purple-500 to-pink-500">
              <a href="/api/login" className="flex items-center gap-2">
                <LogIn className="h-4 w-4" />
                <span>Войти</span>
              </a>
            </Button>
          )}
        </div>
      </div>
      <div className="text-center mb-12">
        <h1 className="text-4xl sm:text-6xl font-mystic font-semibold bg-gradient-to-r from-purple-600 via-pink-500 to-purple-600 bg-clip-text text-transparent mb-3 tracking-wide">
          <span className="block">Ваш персональный</span>
          <span className="block">ЭЗО-маркетолог</span>
        </h1>
        <p className="text-purple-500 text-lg sm:text-xl font-light tracking-wider uppercase">
          {subtitle}
        </p>
      </div>
    </header>
  );
}
