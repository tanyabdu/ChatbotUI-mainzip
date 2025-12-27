import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Loader2, Check, RotateCcw, Sparkles, Palette } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { ArchetypeResult } from "@shared/schema";
import { 
  quizQuestions, 
  calculateArchetypeResult, 
  archetypesData,
  type ArchetypeProfile 
} from "@/lib/archetypes";

export type { ArchetypeProfile } from "@/lib/archetypes";

interface ArchetypeQuizProps {
  onComplete?: (profile: ArchetypeProfile) => void;
  onApply?: (profile: ArchetypeProfile) => void;
}

export default function ArchetypeQuiz({ onComplete, onApply }: ArchetypeQuizProps) {
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [profile, setProfile] = useState<ArchetypeProfile | null>(null);
  const [showUnanswered, setShowUnanswered] = useState(false);
  const [isRetaking, setIsRetaking] = useState(false);
  const [isApplied, setIsApplied] = useState(false);
  const { toast } = useToast();

  const answeredCount = Object.keys(answers).length;
  const totalQuestions = quizQuestions.length;

  const { data: latestResult } = useQuery<ArchetypeResult | null>({
    queryKey: ["/api/archetypes/latest"],
  });

  const { data: allResults = [] } = useQuery<ArchetypeResult[]>({
    queryKey: ["/api/archetypes"],
  });

  const saveMutation = useMutation({
    mutationFn: async (data: { 
      archetypeName: string; 
      archetypeDescription: string; 
      answers: number[]; 
      recommendations: string[]; 
      brandColors?: string[]; 
      brandFonts?: string[];
      contentStyle?: string;
      triggerWords?: string[];
    }) => {
      return apiRequest("POST", "/api/archetypes", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/archetypes"] });
      queryClient.invalidateQueries({ queryKey: ["/api/archetypes/latest"] });
    },
  });

  const handleSubmit = () => {
    const allAnswered = quizQuestions.every((_, idx) => answers[idx] !== undefined);
    if (!allAnswered) {
      setShowUnanswered(true);
      const unansweredCount = totalQuestions - answeredCount;
      toast({
        title: "Ответьте на все вопросы",
        description: `Осталось ответить на ${unansweredCount} ${unansweredCount === 1 ? 'вопрос' : unansweredCount < 5 ? 'вопроса' : 'вопросов'}`,
        variant: "destructive",
      });
      return;
    }

    setShowUnanswered(false);
    setIsAnalyzing(true);

    const answerIndices = quizQuestions.map((_, idx) => answers[idx]);

    setTimeout(() => {
      const calculatedProfile = calculateArchetypeResult(answerIndices);
      
      const primaryArchetypeName = calculatedProfile.topArchetypes[0];
      const primaryArchetype = Object.values(archetypesData).find(a => a.name === primaryArchetypeName);
      
      saveMutation.mutate({
        archetypeName: calculatedProfile.topArchetypes.join("-"),
        archetypeDescription: calculatedProfile.description,
        answers: answerIndices,
        recommendations: calculatedProfile.brandVoice.keywords,
        brandColors: calculatedProfile.visualGuide.colors,
        brandFonts: [calculatedProfile.visualGuide.fonts],
        contentStyle: primaryArchetype?.contentStyle.join("; "),
        triggerWords: primaryArchetype?.triggerWords,
      });
      
      setProfile(calculatedProfile);
      setIsAnalyzing(false);
      setIsRetaking(false);
      setIsApplied(false);
      onComplete?.(calculatedProfile);
    }, 2000);
  };

  const handleReset = () => {
    setAnswers({});
    setProfile(null);
    setIsRetaking(true);
    setShowUnanswered(false);
    setIsApplied(false);
  };

  const displayProfile = profile || (latestResult && !isRetaking ? {
    topArchetypes: latestResult.archetypeName.split("-"),
    description: latestResult.archetypeDescription,
    brandVoice: {
      tone: (() => {
        const primaryName = latestResult.archetypeName.split("-")[0];
        const archetype = Object.values(archetypesData).find(a => a.name === primaryName);
        return archetype?.brandVoice.tone || "Ваш уникальный стиль коммуникации";
      })(),
      keywords: latestResult.recommendations || [],
    },
    visualGuide: {
      colors: latestResult.brandColors || ["#7c3aed", "#1e1b4b", "#fbbf24"],
      fonts: latestResult.brandFonts?.[0] || "Cormorant Garamond для заголовков, Inter для текста",
      vibes: (() => {
        const primaryName = latestResult.archetypeName.split("-")[0];
        const archetype = Object.values(archetypesData).find(a => a.name === primaryName);
        return archetype?.visualGuide.vibes || "Мистический и глубокий";
      })(),
    },
  } : null);

  const handleApply = () => {
    if (displayProfile) {
      setIsApplied(true);
      onApply?.(displayProfile);
      toast({
        title: "Архетип активирован!",
        description: "Теперь нейросеть будет писать контент в вашем стиле",
      });
    }
  };

  if (displayProfile && !isRetaking) {
    const primaryArchetypeName = displayProfile.topArchetypes[0];
    const primaryArchetype = Object.values(archetypesData).find(a => a.name === primaryArchetypeName);

    return (
      <section className="fade-in">
        <Card className="relative overflow-visible bg-white border-2 border-purple-300 shadow-lg">
          <div 
            className="absolute inset-0 opacity-10 rounded-lg"
            style={{
              background: `linear-gradient(135deg, ${displayProfile.visualGuide.colors[0]}40 0%, ${displayProfile.visualGuide.colors[1] || displayProfile.visualGuide.colors[0]}40 100%)`
            }}
          />

          <CardContent className="relative z-10 p-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
              <div>
                <Badge variant="secondary" className="mb-4 bg-purple-100 text-purple-700 border-2 border-purple-400 tracking-widest uppercase">
                  {isApplied ? "Активирован" : "Ваш стиль"}
                </Badge>
                <h2 className="text-3xl md:text-4xl font-mystic bg-gradient-to-r from-purple-600 to-pink-500 bg-clip-text text-transparent mb-4 font-bold leading-tight">
                  {displayProfile.topArchetypes.join(" + ")}
                </h2>
                <p className="text-purple-600 text-base mb-6">{displayProfile.description}</p>
                
                <div className="flex flex-wrap gap-2 mb-6">
                  {displayProfile.brandVoice.keywords.map((keyword) => (
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
                      {displayProfile.brandVoice.tone}
                    </p>
                  </CardContent>
                </Card>

                {primaryArchetype && (
                  <Card className="bg-purple-50 border-2 border-purple-200 mt-4">
                    <CardContent className="p-4">
                      <h4 className="text-purple-700 text-xs uppercase font-bold mb-2">
                        Слова-триггеры для контента
                      </h4>
                      <div className="flex flex-wrap gap-1">
                        {primaryArchetype.triggerWords.slice(0, 8).map((word) => (
                          <span key={word} className="text-xs bg-purple-100 text-purple-600 px-2 py-1 rounded">
                            {word}
                          </span>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>

              <div className="space-y-4">
                <Card className="bg-pink-50 border-2 border-pink-300">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg font-mystic text-purple-700 flex items-center gap-2">
                      <Palette className="h-5 w-5 text-pink-500" />
                      Визуальный код
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <span className="text-xs text-purple-500 block mb-2">Цвета</span>
                      <div className="flex gap-3">
                        {displayProfile.visualGuide.colors.map((color, idx) => (
                          <div
                            key={idx}
                            className="w-10 h-10 rounded-lg shadow-lg ring-2 ring-purple-300"
                            style={{ backgroundColor: color }}
                            title={color}
                          />
                        ))}
                      </div>
                    </div>
                    <div>
                      <span className="text-xs text-purple-500 block mb-1">Шрифты</span>
                      <p className="text-purple-700 text-sm break-words">{displayProfile.visualGuide.fonts}</p>
                    </div>
                    <div>
                      <span className="text-xs text-purple-500 block">Атмосфера</span>
                      <span className="text-purple-700 text-sm">{displayProfile.visualGuide.vibes}</span>
                    </div>
                  </CardContent>
                </Card>

                {primaryArchetype && (
                  <Card className="bg-green-50 border-2 border-green-300">
                    <CardContent className="p-4">
                      <h4 className="text-green-700 text-xs uppercase font-bold mb-2">
                        Стиль контента
                      </h4>
                      <ul className="text-sm text-green-600 space-y-1">
                        {primaryArchetype.contentStyle.map((style, idx) => (
                          <li key={idx}>• {style}</li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>

            <div className="mt-8 flex flex-col items-center gap-4">
              <Button
                onClick={handleApply}
                disabled={isApplied}
                data-testid="button-apply-archetype"
                className={`${isApplied 
                  ? 'bg-green-500 hover:bg-green-600' 
                  : 'bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600'
                } text-white font-bold shadow-lg border-2 ${isApplied ? 'border-green-400' : 'border-purple-400'}`}
              >
                {isApplied ? (
                  <>
                    <Check className="h-5 w-5 mr-2" />
                    Стиль активирован
                  </>
                ) : (
                  <>
                    <Sparkles className="h-5 w-5 mr-2" />
                    Активировать этот стиль
                  </>
                )}
              </Button>
              <p className="text-xs text-purple-500 text-center">
                {isApplied 
                  ? "Нейросеть теперь пишет контент в вашем стиле" 
                  : "Стиль будет применён ко всем будущим генерациям контента"
                }
              </p>
              
              <div className="flex gap-3 mt-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="text-purple-600 border-purple-300"
                  onClick={handleReset}
                  data-testid="button-reset-quiz"
                >
                  <RotateCcw className="h-4 w-4 mr-1" />
                  Пройти заново
                </Button>
              </div>
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
            Пройдите диагностику, чтобы нейросеть «заговорила» вашим голосом.
          </p>
          <div className="mt-4">
            <Badge variant="outline" className="text-purple-600 border-purple-300">
              Отвечено: {answeredCount} из {totalQuestions}
            </Badge>
          </div>
        </CardHeader>
        
        <CardContent className="max-w-2xl mx-auto space-y-6">
          {quizQuestions.map((question, qIdx) => {
            const isUnanswered = showUnanswered && answers[qIdx] === undefined;
            return (
              <Card key={qIdx} className={`bg-purple-50 border-2 ${isUnanswered ? 'border-red-400 ring-2 ring-red-200' : 'border-purple-200'}`}>
                <CardContent className="p-6">
                  <h4 className="text-lg text-purple-700 mb-4 font-medium">
                    {qIdx + 1}. {question.question}
                  </h4>
                  <RadioGroup
                    value={answers[qIdx]?.toString() || ""}
                    onValueChange={(value) => setAnswers({ ...answers, [qIdx]: parseInt(value) })}
                  >
                    {question.answers.map((answer, aIdx) => (
                      <div
                        key={aIdx}
                        className="flex items-center space-x-3 p-3 rounded-lg hover:bg-purple-100 cursor-pointer bg-white border border-purple-100 transition-colors"
                      >
                        <RadioGroupItem
                          value={aIdx.toString()}
                          id={`q${qIdx}-a${aIdx}`}
                          data-testid={`radio-q${qIdx}-a${aIdx}`}
                        />
                        <Label
                          htmlFor={`q${qIdx}-a${aIdx}`}
                          className="text-purple-600 text-sm cursor-pointer flex-1"
                        >
                          {answer.text}
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                </CardContent>
              </Card>
            );
          })}

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
