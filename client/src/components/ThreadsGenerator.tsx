import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MessageCircle, Copy, Check, Loader2, Sparkles } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface ThreadsPost {
  format: string;
  time: string;
  text: string;
}

interface GenerateResult {
  posts: ThreadsPost[];
}

const FORMAT_COLORS: Record<string, { border: string; bg: string; badge: string; time: string }> = {
  "Интрига + обещание": {
    border: "border-violet-200",
    bg: "from-violet-50 to-white",
    badge: "bg-gradient-to-r from-violet-500 to-purple-500",
    time: "text-violet-600 bg-violet-50",
  },
  "Поиск аудитории": {
    border: "border-blue-200",
    bg: "from-blue-50 to-white",
    badge: "bg-gradient-to-r from-blue-500 to-indigo-500",
    time: "text-blue-600 bg-blue-50",
  },
  "Факт дня / Экспертный пост": {
    border: "border-emerald-200",
    bg: "from-emerald-50 to-white",
    badge: "bg-gradient-to-r from-emerald-500 to-teal-500",
    time: "text-emerald-600 bg-emerald-50",
  },
  "Провокационный вопрос": {
    border: "border-orange-200",
    bg: "from-orange-50 to-white",
    badge: "bg-gradient-to-r from-orange-500 to-amber-500",
    time: "text-orange-600 bg-orange-50",
  },
  "Лид-магнит / Оффер": {
    border: "border-pink-200",
    bg: "from-pink-50 to-white",
    badge: "bg-gradient-to-r from-pink-500 to-rose-500",
    time: "text-pink-600 bg-pink-50",
  },
};

const DEFAULT_COLOR = {
  border: "border-purple-200",
  bg: "from-purple-50 to-white",
  badge: "bg-gradient-to-r from-purple-500 to-pink-500",
  time: "text-purple-600 bg-purple-50",
};

function getFormatColor(format: string) {
  return FORMAT_COLORS[format] || DEFAULT_COLOR;
}

export default function ThreadsGenerator() {
  const [userInput, setUserInput] = useState("");
  const [postsCount, setPostsCount] = useState<3 | 5>(5);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const { toast } = useToast();

  const generateMutation = useMutation({
    mutationFn: async (params: {
      userInput: string;
      postsCount: 3 | 5;
    }): Promise<GenerateResult> => {
      const res = await apiRequest("POST", "/api/threads/generate", params);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Ошибка генерации");
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

  const handleGenerate = () => {
    if (userInput.trim().length < 10) {
      toast({
        title: "Слишком мало текста",
        description: "Введите идею или тему минимум из 10 символов",
        variant: "destructive",
      });
      return;
    }
    generateMutation.mutate({ userInput, postsCount });
  };

  const handleCopy = async (text: string, index: number) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedIndex(index);
      toast({ title: "Скопировано!" });
      setTimeout(() => setCopiedIndex(null), 2000);
    } catch {
      toast({ title: "Ошибка копирования", variant: "destructive" });
    }
  };

  const handleReset = () => {
    generateMutation.reset();
    setUserInput("");
  };

  const result = generateMutation.data;

  return (
    <div className="space-y-6 fade-in">
      <div className="text-center mb-6">
        <div className="flex items-center justify-center gap-2 mb-2">
          <MessageCircle className="h-6 w-6 text-purple-500" />
          <h2 className="text-2xl font-mystic text-purple-700">Треды</h2>
          <MessageCircle className="h-6 w-6 text-purple-500" />
        </div>
        <p className="text-sm text-purple-500">
          Введите идею или тему — AI создаст набор постов для Threads по профессиональной методологии
        </p>
      </div>

      {!result ? (
        <Card className="border-2 border-purple-200 bg-white/80">
          <CardContent className="p-4 sm:p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-purple-700 mb-2">
                Ваша идея, тема или черновой текст
              </label>
              <textarea
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                placeholder="Например: хочу написать про то, как астрология помогает принимать решения в бизнесе, или что натальная карта — это не приговор, а карта возможностей..."
                className="w-full min-h-[180px] p-4 rounded-xl border-2 border-purple-200 bg-white text-gray-800 placeholder:text-purple-300 focus:border-purple-400 focus:ring-2 focus:ring-purple-200 focus:outline-none resize-y text-sm leading-relaxed"
                disabled={generateMutation.isPending}
              />
              <div className="flex justify-between items-center mt-1">
                <p className="text-xs text-purple-400">Минимум 10 символов</p>
                <p className="text-xs text-purple-400">{userInput.length} / 5000</p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-purple-700 mb-2">
                Количество постов
              </label>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setPostsCount(3)}
                  disabled={generateMutation.isPending}
                  className={`flex-1 py-3 px-4 rounded-xl border-2 text-sm font-medium transition-all ${
                    postsCount === 3
                      ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white border-purple-400 shadow-md"
                      : "bg-white border-purple-200 text-purple-600 hover:border-purple-400 hover:bg-purple-50"
                  }`}
                >
                  3 поста
                  <span className="block text-xs font-normal mt-0.5 opacity-80">
                    Факт · Провокация · Оффер
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setPostsCount(5)}
                  disabled={generateMutation.isPending}
                  className={`flex-1 py-3 px-4 rounded-xl border-2 text-sm font-medium transition-all ${
                    postsCount === 5
                      ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white border-purple-400 shadow-md"
                      : "bg-white border-purple-200 text-purple-600 hover:border-purple-400 hover:bg-purple-50"
                  }`}
                >
                  5 постов
                  <span className="block text-xs font-normal mt-0.5 opacity-80">
                    Полный день
                  </span>
                </button>
              </div>
            </div>

            <Button
              onClick={handleGenerate}
              disabled={generateMutation.isPending || userInput.trim().length < 10}
              className="w-full py-6 bg-gradient-to-r from-purple-500 via-violet-500 to-pink-500 text-white font-semibold text-base rounded-xl shadow-lg hover:shadow-xl transition-all disabled:opacity-50"
            >
              {generateMutation.isPending ? (
                <>
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  Создаю посты...
                </>
              ) : (
                <>
                  <Sparkles className="h-5 w-5 mr-2" />
                  Создать посты для Threads
                </>
              )}
            </Button>

            {generateMutation.isPending && (
              <div className="text-center py-4">
                <div className="flex items-center justify-center gap-2 text-purple-500">
                  <Sparkles className="h-4 w-4 animate-pulse" />
                  <p className="text-sm">AI создаёт посты по методологии Threads...</p>
                  <Sparkles className="h-4 w-4 animate-pulse" />
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          <div className="rounded-xl bg-purple-50 border border-purple-200 px-4 py-3">
            <p className="text-xs text-purple-600 leading-relaxed">
              Это черновики постов — перечитайте их, добавьте личные детали и истории из вашей практики. Именно ваш голос делает контент живым.
            </p>
          </div>

          {result.posts.map((post, idx) => {
            const colors = getFormatColor(post.format);
            return (
              <Card
                key={idx}
                className={`border-2 ${colors.border} bg-gradient-to-b ${colors.bg}`}
              >
                <CardContent className="p-4 sm:p-5">
                  <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge className={`${colors.badge} text-white text-xs shrink-0`}>
                        {post.format}
                      </Badge>
                      {post.time && (
                        <span
                          className={`text-xs font-medium px-2 py-0.5 rounded-full ${colors.time}`}
                        >
                          {post.time}
                        </span>
                      )}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleCopy(post.text, idx)}
                      className="border-purple-300 text-purple-600 hover:bg-purple-50 shrink-0"
                    >
                      {copiedIndex === idx ? (
                        <Check className="h-4 w-4 mr-1 text-green-500" />
                      ) : (
                        <Copy className="h-4 w-4 mr-1" />
                      )}
                      {copiedIndex === idx ? "Скопировано" : "Копировать"}
                    </Button>
                  </div>
                  <div className="bg-white rounded-xl border border-purple-100 p-4">
                    <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">
                      {post.text}
                    </p>
                  </div>
                </CardContent>
              </Card>
            );
          })}

          <div className="flex gap-3">
            <Button
              onClick={handleReset}
              variant="outline"
              className="flex-1 border-purple-300 text-purple-600 hover:bg-purple-50"
            >
              Новая тема
            </Button>
            <Button
              onClick={() => {
                generateMutation.mutate({ userInput, postsCount });
              }}
              className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 text-white"
            >
              <Sparkles className="h-4 w-4 mr-2" />
              Сгенерировать снова
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
