import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Zap, Copy, Check, Loader2, Sparkles, AlertTriangle } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface TransformResult {
  transformedScript: string;
  usedTriggers: { name: string; explanation: string }[];
  hookAnalysis: string;
  ctaType: string;
  usedFormulas: string;
}

export default function TriggerReels() {
  const [script, setScript] = useState("");
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const transformMutation = useMutation({
    mutationFn: async (scriptText: string): Promise<TransformResult> => {
      const res = await apiRequest("POST", "/api/trigger-reels/transform", { script: scriptText });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Ошибка обработки");
      }
      return res.json();
    },
    onError: (error: Error) => {
      toast({
        title: "Ошибка",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleTransform = () => {
    if (script.trim().length < 10) {
      toast({
        title: "Слишком короткий текст",
        description: "Введите сценарий минимум из 10 символов",
        variant: "destructive",
      });
      return;
    }
    transformMutation.mutate(script);
  };

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast({ title: "Скопировано!" });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({ title: "Ошибка копирования", variant: "destructive" });
    }
  };

  const handleReset = () => {
    transformMutation.reset();
    setScript("");
  };

  const result = transformMutation.data;

  return (
    <div className="space-y-6 fade-in">
      <div className="text-center mb-6">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Zap className="h-6 w-6 text-yellow-500" />
          <h2 className="text-2xl font-mystic text-purple-700">Триггерные Reels</h2>
          <Zap className="h-6 w-6 text-yellow-500" />
        </div>
        <p className="text-sm text-purple-500">
          Вставьте свой сценарий или надиктуйте его — и AI сделает его триггерным
        </p>
      </div>

      {!result ? (
        <Card className="border-2 border-purple-200 bg-white/80">
          <CardContent className="p-4 sm:p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-purple-700 mb-2">
                Ваш сценарий Reels
              </label>
              <textarea
                value={script}
                onChange={(e) => setScript(e.target.value)}
                placeholder="Вставьте текст сценария или надиктуйте его через встроенную клавиатуру телефона..."
                className="w-full min-h-[200px] p-4 rounded-xl border-2 border-purple-200 bg-white text-gray-800 placeholder:text-purple-300 focus:border-purple-400 focus:ring-2 focus:ring-purple-200 focus:outline-none resize-y text-sm leading-relaxed"
                disabled={transformMutation.isPending}
              />
              <div className="flex justify-between items-center mt-1">
                <p className="text-xs text-purple-400">
                  Минимум 10 символов
                </p>
                <p className="text-xs text-purple-400">
                  {script.length} / 10000
                </p>
              </div>
            </div>

            <Button
              onClick={handleTransform}
              disabled={transformMutation.isPending || script.trim().length < 10}
              className="w-full py-6 bg-gradient-to-r from-yellow-500 via-orange-500 to-pink-500 text-white font-semibold text-base rounded-xl shadow-lg hover:shadow-xl transition-all disabled:opacity-50"
            >
              {transformMutation.isPending ? (
                <>
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  Делаю триггерным...
                </>
              ) : (
                <>
                  <Zap className="h-5 w-5 mr-2" />
                  Сделать рилс триггерным
                </>
              )}
            </Button>

            {transformMutation.isPending && (
              <div className="text-center py-4">
                <div className="flex items-center justify-center gap-2 text-purple-500">
                  <Sparkles className="h-4 w-4 animate-pulse" />
                  <p className="text-sm">AI анализирует и усиливает ваш сценарий...</p>
                  <Sparkles className="h-4 w-4 animate-pulse" />
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          <Card className="border-2 border-green-200 bg-gradient-to-b from-green-50 to-white">
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-yellow-500" />
                  <h3 className="font-semibold text-purple-700">Триггерный сценарий</h3>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleCopy(result.transformedScript)}
                  className="border-purple-300 text-purple-600 hover:bg-purple-50"
                >
                  {copied ? (
                    <Check className="h-4 w-4 mr-1 text-green-500" />
                  ) : (
                    <Copy className="h-4 w-4 mr-1" />
                  )}
                  {copied ? "Скопировано" : "Копировать"}
                </Button>
              </div>
              <div className="bg-white rounded-xl border border-purple-100 p-4">
                <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">
                  {result.transformedScript}
                </p>
              </div>
            </CardContent>
          </Card>

          <div className="rounded-xl bg-purple-50 border border-purple-200 px-4 py-3">
            <p className="text-xs text-purple-600 leading-relaxed">
              Это черновик, а не финальный сценарий. Обязательно перечитайте текст, адаптируйте под свой стиль и добавьте личные детали — именно ваш голос и опыт делают контент живым. AI задаёт направление, но лучший результат получается, когда вы вносите в него себя.
            </p>
          </div>

          {result.hookAnalysis && (
            <Card className="border-2 border-yellow-200 bg-gradient-to-b from-yellow-50 to-white">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="h-4 w-4 text-yellow-600" />
                  <h4 className="text-sm font-semibold text-yellow-700">Анализ хука</h4>
                </div>
                <p className="text-sm text-gray-700">{result.hookAnalysis}</p>
              </CardContent>
            </Card>
          )}

          {result.usedTriggers.length > 0 && (
            <Card className="border-2 border-purple-200 bg-white/80">
              <CardContent className="p-4">
                <h4 className="text-sm font-semibold text-purple-700 mb-3">
                  Использованные триггеры ({result.usedTriggers.length})
                </h4>
                <div className="space-y-2">
                  {result.usedTriggers.map((trigger, idx) => (
                    <div key={idx} className="flex items-start gap-2 p-2 rounded-lg bg-purple-50">
                      <Badge className="shrink-0 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs mt-0.5">
                        {trigger.name}
                      </Badge>
                      <p className="text-xs text-gray-600 leading-relaxed">{trigger.explanation}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {result.ctaType && (
            <Card className="border-2 border-pink-200 bg-gradient-to-b from-pink-50 to-white">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Sparkles className="h-4 w-4 text-pink-500" />
                  <h4 className="text-sm font-semibold text-pink-700">Призыв к действию</h4>
                </div>
                <p className="text-sm text-gray-700">{result.ctaType}</p>
              </CardContent>
            </Card>
          )}

          <div className="flex gap-3">
            <Button
              onClick={handleReset}
              variant="outline"
              className="flex-1 border-purple-300 text-purple-600 hover:bg-purple-50"
            >
              Новый сценарий
            </Button>
            <Button
              onClick={() => {
                transformMutation.reset();
              }}
              className="flex-1 bg-gradient-to-r from-yellow-500 to-orange-500 text-white"
            >
              <Zap className="h-4 w-4 mr-2" />
              Переделать ещё раз
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
