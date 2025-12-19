import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Loader2, Check, RotateCcw, Sparkles, Palette, History } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { ArchetypeResult } from "@shared/schema";

interface Question {
  q: string;
  a: string[];
}

interface ArchetypeProfile {
  topArchetypes: string[];
  description: string;
  brandVoice: {
    tone: string;
    keywords: string[];
  };
  visualGuide: {
    colors: string[];
    fonts: string;
    vibes: string;
  };
}

const archetypeQuestions: Question[] = [
  {
    q: "Что для вас важнее всего в работе с клиентом?",
    a: ["Дать им структуру и четкий план (Правитель)", "Позаботиться, выслушать и утешить (Заботливый)", "Вдохновить на большие перемены и магию (Маг)", "Показать правду, даже если она жесткая (Бунтарь)"]
  },
  {
    q: "Как вы относитесь к правилам и традициям в эзотерике?",
    a: ["Чту традиции, но адаптирую их (Мудрец)", "Создаю свои собственные правила (Творец)", "Соблюдаю строго, это база (Правитель)", "Люблю нарушать правила и шокировать (Шут)"]
  },
  {
    q: "Какая фраза лучше всего описывает ваш подход?",
    a: ["Всё будет так, как ты захочешь (Маг)", "Я знаю, как правильно, и научу тебя (Учитель/Мудрец)", "Давай просто будем собой (Славный малый)", "Мы вместе пройдем этот путь (Герой)"]
  },
  {
    q: "Чего вы больше всего боитесь в профессиональном плане?",
    a: ["Быть скучным и обычным (Бунтарь)", "Навредить клиенту или дать неверный совет (Заботливый)", "Потерять контроль над ситуацией (Правитель)", "Оказаться некомпетентным (Мудрец)"]
  },
  {
    q: "Какой стиль одежды или визуальный образ вам ближе?",
    a: ["Строгий, дорогой, статусный (Правитель)", "Мистический, загадочный, мантии (Маг)", "Яркий, необычный, эпатажный (Шут/Бунтарь)", "Уютный, мягкий, натуральный (Заботливый/Славный малый)"]
  },
];

interface ArchetypeQuizProps {
  onComplete?: (profile: ArchetypeProfile) => void;
  onApply?: (profile: ArchetypeProfile) => void;
}

export default function ArchetypeQuiz({ onComplete, onApply }: ArchetypeQuizProps) {
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [profile, setProfile] = useState<ArchetypeProfile | null>(null);
  const [showHistory, setShowHistory] = useState(false);

  const { data: latestResult } = useQuery<ArchetypeResult | null>({
    queryKey: ["/api/archetypes/latest"],
  });

  const { data: allResults = [] } = useQuery<ArchetypeResult[]>({
    queryKey: ["/api/archetypes"],
  });

  const saveMutation = useMutation({
    mutationFn: async (data: { archetypeName: string; archetypeDescription: string; answers: number[]; recommendations: string[] }) => {
      return apiRequest("POST", "/api/archetypes", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/archetypes"] });
      queryClient.invalidateQueries({ queryKey: ["/api/archetypes/latest"] });
    },
  });

  const handleSubmit = () => {
    const allAnswered = archetypeQuestions.every((_, idx) => answers[idx]);
    if (!allAnswered) {
      console.log("Please answer all questions");
      return;
    }

    setIsAnalyzing(true);

    const answerIndices = archetypeQuestions.map((q, idx) => {
      const selectedAnswer = answers[idx];
      return q.a.indexOf(selectedAnswer);
    });

    setTimeout(() => {
      const mockProfile: ArchetypeProfile = {
        topArchetypes: ["Маг", "Мудрец", "Бунтарь"],
        description: "Глубокий, трансформационный стиль с нотками провокации. Вы умеете видеть суть и не боитесь говорить правду.",
        brandVoice: {
          tone: "Загадочный, но доступный. Мудрый, но не занудный. С легкой ноткой провокации.",
          keywords: ["трансформация", "глубина", "правда", "магия", "путь"]
        },
        visualGuide: {
          colors: ["#7c3aed", "#1e1b4b", "#fbbf24"],
          fonts: "Cormorant Garamond для заголовков, Inter для текста",
          vibes: "Мистический минимализм с золотыми акцентами"
        }
      };
      
      saveMutation.mutate({
        archetypeName: mockProfile.topArchetypes.join("-"),
        archetypeDescription: mockProfile.description,
        answers: answerIndices,
        recommendations: mockProfile.brandVoice.keywords,
      });
      
      setProfile(mockProfile);
      setIsAnalyzing(false);
      onComplete?.(mockProfile);
    }, 2000);
  };

  const handleReset = () => {
    setAnswers({});
    setProfile(null);
  };

  const handleApply = () => {
    if (profile) {
      onApply?.(profile);
      console.log("Archetype applied:", profile);
    }
  };

  if (profile) {
    return (
      <section className="fade-in">
        <Card className="relative overflow-visible bg-white border-2 border-purple-300 shadow-lg">
          <div 
            className="absolute inset-0 opacity-10 rounded-lg"
            style={{
              background: `linear-gradient(135deg, ${profile.visualGuide.colors[0]}40 0%, ${profile.visualGuide.colors[1]}40 100%)`
            }}
          />
          
          <div className="absolute top-4 right-4 flex gap-2">
            {allResults.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="text-purple-600"
                onClick={() => setShowHistory(!showHistory)}
                data-testid="button-show-history"
              >
                <History className="h-4 w-4 mr-1" />
                История ({allResults.length})
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="text-purple-600"
              onClick={handleReset}
              data-testid="button-reset-quiz"
            >
              <RotateCcw className="h-4 w-4 mr-1" />
              Пройти заново
            </Button>
          </div>

          <CardContent className="relative z-10 p-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
              <div>
                <Badge variant="secondary" className="mb-4 bg-purple-100 text-purple-700 border-2 border-purple-400 tracking-widest uppercase">
                  Ваш стиль
                </Badge>
                <h2 className="text-4xl md:text-5xl font-mystic bg-gradient-to-r from-purple-600 to-pink-500 bg-clip-text text-transparent mb-4 font-bold leading-tight">
                  {profile.topArchetypes.join("-")}
                </h2>
                <p className="text-purple-600 text-lg mb-6">{profile.description}</p>
                
                <div className="flex flex-wrap gap-2 mb-6">
                  {profile.brandVoice.keywords.map((keyword) => (
                    <Badge key={keyword} variant="outline" className="bg-pink-50 text-pink-700 border-2 border-pink-300">
                      {keyword}
                    </Badge>
                  ))}
                </div>

                <Card className="bg-purple-50 border-2 border-purple-200">
                  <CardContent className="p-4">
                    <h4 className="text-purple-700 text-xs uppercase font-bold mb-2">
                      Тональность (Tone of Voice)
                    </h4>
                    <p className="text-sm text-purple-600 italic">
                      {profile.brandVoice.tone}
                    </p>
                  </CardContent>
                </Card>
              </div>

              <Card className="bg-pink-50 border-2 border-pink-300">
                <CardHeader>
                  <CardTitle className="text-xl font-mystic text-purple-700 flex items-center gap-2">
                    <Palette className="h-5 w-5 text-pink-500" />
                    Визуальный код
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <span className="text-xs text-purple-500 block mb-2">Цвета</span>
                    <div className="flex gap-3">
                      {profile.visualGuide.colors.map((color) => (
                        <div
                          key={color}
                          className="w-12 h-12 rounded-lg shadow-lg ring-2 ring-purple-300"
                          style={{ backgroundColor: color }}
                          title={color}
                        />
                      ))}
                    </div>
                  </div>
                  <div>
                    <span className="text-xs text-purple-500 block">Шрифты</span>
                    <span className="text-purple-700 text-sm">{profile.visualGuide.fonts}</span>
                  </div>
                  <div>
                    <span className="text-xs text-purple-500 block">Атмосфера (Vibe)</span>
                    <span className="text-purple-700 text-sm">{profile.visualGuide.vibes}</span>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="mt-8 text-center">
              <Button
                onClick={handleApply}
                data-testid="button-apply-archetype"
                className="bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:from-purple-600 hover:to-pink-600 font-bold shadow-lg border-2 border-purple-400"
              >
                <Check className="h-5 w-5 mr-2" />
                Активировать этот стиль
              </Button>
              <p className="text-xs text-purple-500 mt-2">
                Стиль будет применен ко всем будущим генерациям контента
              </p>
            </div>
          </CardContent>
        </Card>
      </section>
    );
  }

  return (
    <section className="fade-in">
      <Card className="bg-white border-2 border-purple-300 shadow-lg">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-mystic text-purple-700 mb-2">
            ДНК Вашего Личного Бренда
          </CardTitle>
          <p className="text-purple-500">
            Пройдите диагностику, чтобы нейросеть "заговорила" вашим голосом.
          </p>
        </CardHeader>
        
        <CardContent className="max-w-2xl mx-auto space-y-6">
          {archetypeQuestions.map((question, idx) => (
            <Card key={idx} className="bg-purple-50 border-2 border-purple-200">
              <CardContent className="p-6">
                <h4 className="text-lg text-purple-700 mb-4 font-medium">
                  {idx + 1}. {question.q}
                </h4>
                <RadioGroup
                  value={answers[idx] || ""}
                  onValueChange={(value) => setAnswers({ ...answers, [idx]: value })}
                >
                  {question.a.map((answer, aIdx) => (
                    <div
                      key={aIdx}
                      className="flex items-center space-x-3 p-3 rounded-lg hover-elevate cursor-pointer bg-white border border-purple-100"
                    >
                      <RadioGroupItem
                        value={answer}
                        id={`q${idx}-a${aIdx}`}
                        data-testid={`radio-q${idx}-a${aIdx}`}
                      />
                      <Label
                        htmlFor={`q${idx}-a${aIdx}`}
                        className="text-purple-600 text-sm cursor-pointer flex-1"
                      >
                        {answer}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              </CardContent>
            </Card>
          ))}

          <div className="text-center pt-4">
            <Button
              onClick={handleSubmit}
              disabled={isAnalyzing}
              data-testid="button-submit-quiz"
              className="px-8 py-6 bg-gradient-to-r from-pink-500 to-purple-500 text-white font-bold rounded-xl shadow-lg border-2 border-pink-400"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  Анализирую ДНК бренда...
                </>
              ) : (
                <>
                  <Sparkles className="h-5 w-5 mr-2" />
                  Раскрыть мой Архетип
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
