import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Check, X, Moon, Calendar, AlertTriangle, Sun } from "lucide-react";
import { 
  getLunarDayData, 
  getUpcomingPhases, 
  getUpcomingEclipses,
  SEASONS_2026,
  type MoonDayData 
} from "@/lib/lunarData2026";

export default function LunarCalendar() {
  const [isLoading, setIsLoading] = useState(true);
  const [moonData, setMoonData] = useState<MoonDayData | null>(null);
  const [upcomingPhases, setUpcomingPhases] = useState<Array<{ date: string; type: string; label: string }>>([]);
  const [upcomingEclipses, setUpcomingEclipses] = useState<Array<{ date: string; type: string; description: string }>>([]);

  const currentDate = new Date().toLocaleDateString("ru-RU", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  useEffect(() => {
    const timer = setTimeout(() => {
      const data = getLunarDayData(new Date());
      setMoonData(data);
      setUpcomingPhases(getUpcomingPhases(4));
      setUpcomingEclipses(getUpcomingEclipses().slice(0, 2));
      setIsLoading(false);
    }, 800);

    return () => clearTimeout(timer);
  }, []);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("ru-RU", { day: "numeric", month: "long" });
  };

  const getPhaseIcon = (type: string) => {
    switch (type) {
      case "new": return "🌑";
      case "first_quarter": return "🌓";
      case "full": return "🌕";
      case "last_quarter": return "🌗";
      default: return "🌙";
    }
  };

  const getMoonVisual = (lunarDay: number) => {
    if (lunarDay <= 3) return "bg-gray-800";
    if (lunarDay <= 7) return "bg-gradient-to-r from-gray-700 to-purple-300";
    if (lunarDay <= 11) return "bg-gradient-to-r from-purple-400 to-purple-200";
    if (lunarDay <= 15) return "bg-gradient-to-tr from-purple-200 to-pink-200";
    if (lunarDay <= 19) return "bg-gradient-to-l from-purple-400 to-purple-200";
    if (lunarDay <= 23) return "bg-gradient-to-l from-gray-700 to-purple-300";
    return "bg-gray-800";
  };

  return (
    <section className="fade-in space-y-6">
      <Card className="relative overflow-visible bg-white border-2 border-purple-300 shadow-lg">
        <div className="absolute -top-20 -left-20 w-60 h-60 bg-gradient-to-br from-purple-200 to-pink-200 rounded-full blur-[100px] opacity-50 pointer-events-none" />
        
        <CardHeader className="text-center relative z-10">
          <CardTitle className="text-3xl font-mystic text-purple-700 mb-2">
            Энергии Сегодняшнего Дня
          </CardTitle>
          <p className="text-purple-500 text-lg border-b-2 border-purple-200 pb-2 inline-block capitalize">
            {currentDate}
          </p>
          <p className="text-xs text-purple-400 mt-2">
            Данные Астрономического календаря 2026
          </p>
        </CardHeader>

        <CardContent className="relative z-10">
          {isLoading ? (
            <div className="py-16 text-center">
              <Loader2 className="h-12 w-12 animate-spin text-purple-500 mx-auto mb-4" />
              <p className="text-purple-500 animate-pulse">Считываю положение Луны...</p>
            </div>
          ) : moonData && (
            <div className="fade-in space-y-8">
              <div className="flex flex-col items-center justify-center">
                <div className={`w-32 h-32 rounded-full ${getMoonVisual(moonData.day)} shadow-lg flex items-center justify-center relative overflow-hidden mb-4 border-4 border-purple-300`}>
                  <div className="absolute inset-0 bg-white/20 rounded-full transform -translate-x-4 translate-y-2 blur-md" />
                  <span className="text-5xl font-mystic font-bold text-white relative z-10 drop-shadow-md">
                    {moonData.day}
                  </span>
                </div>
                <div className="text-center">
                  <h3 className="text-2xl text-purple-700 font-bold flex items-center justify-center gap-2">
                    <Moon className="h-6 w-6 text-pink-500" />
                    {moonData.phase}
                  </h3>
                  <p className="text-purple-500 font-medium mt-1 text-lg tracking-wide uppercase">
                    {moonData.zodiac}
                  </p>
                  <p className="text-sm text-purple-400 mt-1">
                    {moonData.day}-й лунный день
                  </p>
                </div>
              </div>

              <Card className="bg-purple-50 border-2 border-purple-300 mx-auto max-w-3xl">
                <CardContent className="p-6">
                  <p className="text-purple-700 text-lg leading-relaxed font-mystic italic">
                    {moonData.description}
                  </p>
                </CardContent>
              </Card>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
                <Card className="bg-green-50 border-2 border-green-300">
                  <CardContent className="p-5">
                    <h4 className="text-green-600 font-bold mb-3 uppercase tracking-wider text-sm flex items-center gap-2">
                      <Check className="h-4 w-4" />
                      Благоприятно
                    </h4>
                    <ul className="text-green-700 text-sm space-y-2">
                      {moonData.good.map((item, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <Check className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>

                <Card className="bg-red-50 border-2 border-red-300">
                  <CardContent className="p-5">
                    <h4 className="text-red-600 font-bold mb-3 uppercase tracking-wider text-sm flex items-center gap-2">
                      <X className="h-4 w-4" />
                      Неблагоприятно
                    </h4>
                    <ul className="text-red-700 text-sm space-y-2">
                      {moonData.bad.map((item, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <X className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </div>

              <div className="text-center pt-4">
                <Badge variant="secondary" className="text-sm px-4 py-2 bg-purple-100 text-purple-700 border-2 border-purple-400">
                  {moonData.contentRecommendation}
                </Badge>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {!isLoading && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="bg-white border-2 border-purple-300">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg font-mystic text-purple-700 flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-pink-500" />
                  Ближайшие фазы Луны
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {upcomingPhases.map((phase, idx) => (
                  <div 
                    key={idx} 
                    className="flex items-center justify-between p-3 bg-purple-50 rounded-lg border border-purple-200"
                    data-testid={`lunar-phase-${idx}`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{getPhaseIcon(phase.type)}</span>
                      <div>
                        <p className="font-medium text-purple-700">{phase.label}</p>
                        <p className="text-sm text-purple-500">{formatDate(phase.date)}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="bg-white border-2 border-purple-300">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg font-mystic text-purple-700 flex items-center gap-2">
                  <Sun className="h-5 w-5 text-yellow-500" />
                  Важные астрономические события
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {upcomingEclipses.length > 0 && upcomingEclipses.map((eclipse, idx) => (
                  <div 
                    key={idx}
                    className="flex items-start gap-3 p-3 bg-orange-50 rounded-lg border border-orange-200"
                    data-testid={`eclipse-${idx}`}
                  >
                    <AlertTriangle className="h-5 w-5 text-orange-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-medium text-orange-700">{eclipse.description}</p>
                      <p className="text-sm text-orange-500">{formatDate(eclipse.date)}</p>
                    </div>
                  </div>
                ))}
                
                <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="font-medium text-blue-700 mb-2">Сезоны 2026</p>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="text-blue-600">
                      <span className="font-medium">Весна:</span> {formatDate(SEASONS_2026.spring.date)}
                    </div>
                    <div className="text-blue-600">
                      <span className="font-medium">Лето:</span> {formatDate(SEASONS_2026.summer.date)}
                    </div>
                    <div className="text-blue-600">
                      <span className="font-medium">Осень:</span> {formatDate(SEASONS_2026.autumn.date)}
                    </div>
                    <div className="text-blue-600">
                      <span className="font-medium">Зима:</span> {formatDate(SEASONS_2026.winter.date)}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="bg-gradient-to-r from-purple-50 to-pink-50 border-2 border-purple-300">
            <CardContent className="p-6">
              <h4 className="text-purple-700 font-mystic text-lg mb-3 flex items-center gap-2">
                <Moon className="h-5 w-5" />
                Как использовать лунный календарь для контента
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-purple-600">
                <div className="space-y-2">
                  <p><strong>Растущая Луна (1-14 дни):</strong> Идеально для запусков, продаж, привлечения клиентов, активного продвижения.</p>
                  <p><strong>Полнолуние (15 день):</strong> Эмоциональный контент, итоги, яркие визуалы, благодарности.</p>
                </div>
                <div className="space-y-2">
                  <p><strong>Убывающая Луна (16-28 дни):</strong> Завершение проектов, работа с постоянными клиентами, аналитика.</p>
                  <p><strong>Новолуние (29-1 дни):</strong> Планирование, постановка целей, тихая подготовка к новому циклу.</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </section>
  );
}
