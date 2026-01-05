import { useState, useRef, useCallback, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Upload, Eye, Loader2, Rocket, Save, Copy, Palette, X, Search, CheckCircle, ChevronLeft, ChevronRight, Download, Image } from "lucide-react";
import { useLocation } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { CaseStudy, ArchetypeResult } from "@shared/schema";
import { createWorker } from "tesseract.js";
import { archetypeFontConfigs, backgroundPresets } from "@/lib/archetypeFonts";
import type { ArchetypeId } from "@/lib/archetypes";

interface CaseData {
  id?: string;
  screenshot?: string;
  reviewText: string;
  before: string;
  action: string;
  after: string;
  tags: string[];
  generatedHeadlines?: string[];
  generatedQuote?: string;
  generatedBody?: string;
}

const suggestedTags = ["Деньги", "Отношения", "Здоровье", "Предназначение"];

export default function CasesManager() {
  const [, setLocation] = useLocation();
  const [reviewText, setReviewText] = useState("");
  const [before, setBefore] = useState("");
  const [action, setAction] = useState("");
  const [after, setAfter] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedCase, setGeneratedCase] = useState<CaseData | null>(null);
  const [showVisualModal, setShowVisualModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterTag, setFilterTag] = useState("all");
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [isRecognizing, setIsRecognizing] = useState(false);
  const [ocrProgress, setOcrProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const visualRef = useRef<HTMLDivElement>(null);
  const [viewingCase, setViewingCase] = useState<CaseStudy | null>(null);
  const [currentTemplate, setCurrentTemplate] = useState(0);
  const [isSavingImage, setIsSavingImage] = useState(false);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  const previewRenderIdRef = useRef(0);

  const { data: archetypeResult } = useQuery<ArchetypeResult>({
    queryKey: ["/api/archetypes/latest"],
  });

  const archetypeNameToId: Record<string, ArchetypeId> = {
    "Маг": "mag", "Простодушный": "prostodushny", "Мудрец": "mudrets",
    "Искатель": "iskatel", "Славный малый": "slavny_maly", "Герой": "geroy",
    "Бунтарь": "buntar", "Влюблённый": "vlyublyonny", "Шут": "shut",
    "Заботливый": "zabotlivy", "Творец": "tvorets", "Правитель": "pravitel"
  };
  const primaryArchetype = archetypeResult?.archetypeName 
    ? archetypeNameToId[archetypeResult.archetypeName] || "mag" 
    : "mag";
  const archetypeConfig = archetypeFontConfigs[primaryArchetype];

  const templates = [
    { 
      name: archetypeConfig?.name || "Ваш стиль", 
      background: backgroundPresets.find(b => b.id === "gradient-purple")?.value || "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
      headerFont: archetypeConfig?.headerFont || "Cormorant Garamond",
      bodyFont: archetypeConfig?.bodyFont || "Inter",
      textColor: "#ffffff",
      accentColor: archetypeConfig?.colors?.[2] || "#fbbf24",
      boxBg: "rgba(255,255,255,0.1)",
      boxAccentBg: archetypeConfig?.colors?.[0] || "#7c3aed"
    },
    { 
      name: "Тёмная ночь", 
      background: backgroundPresets.find(b => b.id === "gradient-dark")?.value || "linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)",
      headerFont: archetypeConfig?.headerFont || "Cormorant Garamond",
      bodyFont: archetypeConfig?.bodyFont || "Inter",
      textColor: "#ffffff",
      accentColor: "#a78bfa",
      boxBg: "rgba(255,255,255,0.1)",
      boxAccentBg: "#6366f1"
    },
    { 
      name: "Розовый рассвет", 
      background: backgroundPresets.find(b => b.id === "gradient-rose")?.value || "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
      headerFont: archetypeConfig?.headerFont || "Cormorant Garamond",
      bodyFont: archetypeConfig?.bodyFont || "Inter",
      textColor: "#ffffff",
      accentColor: "#fef3c7",
      boxBg: "rgba(255,255,255,0.15)",
      boxAccentBg: "#be185d"
    },
    { 
      name: "Золотой", 
      background: backgroundPresets.find(b => b.id === "gradient-gold")?.value || "linear-gradient(135deg, #f7971e 0%, #ffd200 100%)",
      headerFont: archetypeConfig?.headerFont || "Cormorant Garamond",
      bodyFont: archetypeConfig?.bodyFont || "Inter",
      textColor: "#78350f",
      accentColor: "#451a03",
      boxBg: "rgba(255,255,255,0.2)",
      boxAccentBg: "#d97706"
    },
  ];

  const renderCaseToCanvas = useCallback(async (
    caseData: CaseData,
    template: typeof templates[0]
  ): Promise<HTMLCanvasElement> => {
    const width = 1080;
    const height = 1350;
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d")!;

    await document.fonts.ready;

    if (template.background.startsWith("linear-gradient")) {
      const gradientMatch = template.background.match(/linear-gradient\(([\d.]+)deg,\s*(.+)\)/);
      if (gradientMatch) {
        const angle = parseFloat(gradientMatch[1]) || 135;
        const stopsString = gradientMatch[2];
        const stopRegex = /(#[a-fA-F0-9]{3,8}|rgba?\([^)]+\)|hsla?\([^)]+\)|[a-zA-Z]+)\s*([\d.]+%)?/g;
        const stops: { color: string; pos: number | null }[] = [];
        let match;
        while ((match = stopRegex.exec(stopsString)) !== null) {
          stops.push({
            color: match[1],
            pos: match[2] ? parseFloat(match[2]) / 100 : null
          });
        }
        if (stops.length >= 2) {
          const rad = (angle - 90) * (Math.PI / 180);
          const x0 = width / 2 - Math.cos(rad) * width;
          const y0 = height / 2 - Math.sin(rad) * height;
          const x1 = width / 2 + Math.cos(rad) * width;
          const y1 = height / 2 + Math.sin(rad) * height;
          const gradient = ctx.createLinearGradient(x0, y0, x1, y1);
          stops.forEach((stop, idx) => {
            const pos = stop.pos !== null ? stop.pos : (idx / (stops.length - 1));
            gradient.addColorStop(Math.max(0, Math.min(1, pos)), stop.color);
          });
          ctx.fillStyle = gradient;
        } else {
          ctx.fillStyle = stops[0]?.color || "#667eea";
        }
      }
    } else {
      ctx.fillStyle = template.background;
    }
    ctx.fillRect(0, 0, width, height);

    const padding = 60;
    const contentWidth = width - padding * 2;

    ctx.fillStyle = template.textColor;
    ctx.font = `bold 52px "${template.headerFont}", serif`;
    ctx.textAlign = "left";
    ctx.textBaseline = "top";

    const headline = caseData.generatedHeadlines?.[0] || "";
    const headlineLines = wrapText(ctx, headline, contentWidth);
    let y = padding + 40;
    headlineLines.forEach(line => {
      ctx.fillText(line, padding, y);
      y += 62;
    });

    y += 30;
    ctx.fillStyle = template.accentColor;
    ctx.font = `italic 36px "${template.bodyFont}", sans-serif`;
    const quote = `"${caseData.generatedQuote || ""}"`;
    const quoteLines = wrapText(ctx, quote, contentWidth);
    quoteLines.forEach(line => {
      ctx.fillText(line, padding, y);
      y += 44;
    });

    const boxHeight = 180;
    const boxY = height - padding - boxHeight;
    const boxWidth = (contentWidth - 20) / 3;
    const boxRadius = 12;

    const boxes = [
      { label: "БЫЛО", value: caseData.before, bg: template.boxBg },
      { label: "СДЕЛАЛИ", value: caseData.action, bg: template.boxBg },
      { label: "СТАЛО", value: caseData.after, bg: template.boxAccentBg }
    ];

    boxes.forEach((box, idx) => {
      const boxX = padding + idx * (boxWidth + 10);
      ctx.fillStyle = box.bg;
      ctx.beginPath();
      ctx.roundRect(boxX, boxY, boxWidth, boxHeight, boxRadius);
      ctx.fill();

      ctx.fillStyle = template.textColor;
      ctx.font = `bold 24px "${template.bodyFont}", sans-serif`;
      ctx.textAlign = "center";
      ctx.fillText(box.label, boxX + boxWidth / 2, boxY + 25);

      ctx.font = `bold 28px "${template.bodyFont}", sans-serif`;
      const valueLines = wrapText(ctx, box.value || "", boxWidth - 20);
      let valueY = boxY + 70;
      valueLines.slice(0, 3).forEach(line => {
        ctx.fillText(line, boxX + boxWidth / 2, valueY);
        valueY += 34;
      });
    });

    return canvas;
  }, []);

  function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
    const words = text.split(' ');
    const lines: string[] = [];
    let currentLine = '';

    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      const metrics = ctx.measureText(testLine);
      if (metrics.width > maxWidth && currentLine) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }
    if (currentLine) {
      lines.push(currentLine);
    }
    return lines;
  }

  useEffect(() => {
    if (!generatedCase || !showVisualModal) return;

    const renderId = ++previewRenderIdRef.current;
    const template = templates[currentTemplate];

    renderCaseToCanvas(generatedCase, template).then(canvas => {
      if (renderId !== previewRenderIdRef.current) return;
      setPreviewImageUrl(canvas.toDataURL("image/png"));
    });
  }, [generatedCase, currentTemplate, showVisualModal, templates, renderCaseToCanvas]);

  const handleSaveImage = useCallback(async () => {
    if (!generatedCase) return;
    setIsSavingImage(true);
    try {
      const template = templates[currentTemplate];
      const canvas = await renderCaseToCanvas(generatedCase, template);
      const link = document.createElement("a");
      link.download = `case-${template.name}-${Date.now()}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    } catch (error) {
      console.error("Error saving image:", error);
    } finally {
      setIsSavingImage(false);
    }
  }, [currentTemplate, generatedCase, templates, renderCaseToCanvas]);

  const nextTemplate = () => setCurrentTemplate((prev) => (prev + 1) % templates.length);
  const prevTemplate = () => setCurrentTemplate((prev) => (prev - 1 + templates.length) % templates.length);

  const { data: savedCases = [], isLoading } = useQuery<CaseStudy[]>({
    queryKey: ["/api/cases"],
  });

  const saveCaseMutation = useMutation({
    mutationFn: async (caseData: CaseData) => {
      return apiRequest("POST", "/api/cases", {
        reviewText: caseData.reviewText,
        before: caseData.before,
        action: caseData.action,
        after: caseData.after,
        tags: caseData.tags,
        generatedHeadlines: caseData.generatedHeadlines,
        generatedQuote: caseData.generatedQuote,
        generatedBody: caseData.generatedBody,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cases"] });
      setGeneratedCase(null);
      setReviewText("");
      setBefore("");
      setAction("");
      setAfter("");
      setTags([]);
    },
  });

  const addTag = (tag: string) => {
    if (tag && !tags.includes(tag)) {
      setTags([...tags, tag]);
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(t => t !== tagToRemove));
  };

  const handleTagInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addTag(tagInput);
      setTagInput("");
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedImage(file);
    }
  };

  const handleRecognizeText = async () => {
    if (!selectedImage) return;

    setIsRecognizing(true);
    setOcrProgress(0);

    try {
      const worker = await createWorker("rus+eng", 1, {
        logger: (m) => {
          if (m.progress) {
            setOcrProgress(Math.round(m.progress * 100));
          }
        },
      });

      const { data: { text } } = await worker.recognize(selectedImage);
      
      await worker.terminate();

      if (text.trim()) {
        const response = await apiRequest("POST", "/api/cases/clean-ocr", { text: text.trim() });
        const data = await response.json();
        setReviewText(data.cleaned || text.trim());
      }
    } catch (error) {
      console.error("OCR error:", error);
    } finally {
      setIsRecognizing(false);
      setOcrProgress(0);
    }
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    
    try {
      const response = await apiRequest("POST", "/api/cases/generate", {
        reviewText,
        before,
        action,
        after,
        tags
      });
      
      const data = await response.json();
      
      if (response.ok) {
        const newCase: CaseData = {
          reviewText,
          before,
          action,
          after,
          tags,
          generatedHeadlines: data.headlines || [],
          generatedQuote: data.quote || "",
          generatedBody: data.body || ""
        };
        setGeneratedCase(newCase);
      } else {
        const fallbackCase: CaseData = {
          reviewText,
          before,
          action,
          after,
          tags,
          generatedHeadlines: [
            "История трансформации клиента",
            "Реальный результат работы",
            "Путь к изменениям"
          ],
          generatedQuote: reviewText.slice(0, 100) + (reviewText.length > 100 ? "..." : ""),
          generatedBody: `**БЫЛО:**\n${before || "Клиент обратился с запросом..."}\n\n**СДЕЛАЛИ:**\n${action || "Провели работу..."}\n\n**СТАЛО:**\n${after || "Получили результат..."}`
        };
        setGeneratedCase(fallbackCase);
      }
    } catch (error) {
      console.error("Generation error:", error);
      const fallbackCase: CaseData = {
        reviewText,
        before,
        action,
        after,
        tags,
        generatedHeadlines: [
          "История трансформации клиента",
          "Реальный результат работы",
          "Путь к изменениям"
        ],
        generatedQuote: reviewText.slice(0, 100) + (reviewText.length > 100 ? "..." : ""),
        generatedBody: `**БЫЛО:**\n${before || "Клиент обратился с запросом..."}\n\n**СДЕЛАЛИ:**\n${action || "Провели работу..."}\n\n**СТАЛО:**\n${after || "Получили результат..."}`
      };
      setGeneratedCase(fallbackCase);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveCase = () => {
    if (generatedCase) {
      saveCaseMutation.mutate(generatedCase);
    }
  };

  const handleCopyCase = () => {
    if (generatedCase) {
      const text = `${generatedCase.generatedHeadlines?.[0]}\n\n"${generatedCase.generatedQuote}"\n\n${generatedCase.generatedBody}`;
      navigator.clipboard.writeText(text);
    }
  };

  const filteredCases = savedCases.filter(c => {
    const matchesSearch = c.reviewText.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.before?.toLowerCase() || "").includes(searchQuery.toLowerCase()) ||
      (c.after?.toLowerCase() || "").includes(searchQuery.toLowerCase());
    const tags = c.tags as string[];
    const matchesTag = filterTag === "all" || tags.includes(filterTag);
    return matchesSearch && matchesTag;
  });

  const allTags = Array.from(new Set(savedCases.flatMap(c => c.tags as string[])));

  return (
    <section className="fade-in">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-5 space-y-6">
          <Card className="bg-white border-2 border-purple-300 shadow-lg">
            <CardHeader>
              <CardTitle className="text-2xl font-mystic text-purple-700">
                Создать Кейс
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="block text-sm text-purple-600 mb-2">1. Скриншот</Label>
                <div 
                  className={`relative border-2 border-dashed rounded-xl p-6 text-center cursor-pointer hover-elevate transition group ${
                    selectedImage ? "border-green-400 bg-green-50" : "border-purple-300 bg-purple-50"
                  }`}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    accept="image/*"
                    onChange={handleFileChange}
                    data-testid="input-screenshot"
                  />
                  {selectedImage ? (
                    <>
                      <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-500" />
                      <div className="text-green-600 text-sm font-medium">
                        {selectedImage.name}
                      </div>
                      <div className="text-green-500 text-xs mt-1">
                        Нажмите чтобы заменить
                      </div>
                    </>
                  ) : (
                    <>
                      <Upload className="h-8 w-8 mx-auto mb-2 text-purple-400 group-hover:text-purple-600" />
                      <div className="text-purple-500 text-sm group-hover:text-purple-700">
                        Загрузить (JPG, PNG)
                      </div>
                    </>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-2 w-full text-blue-600 hover:text-blue-700 bg-blue-50 border border-blue-200"
                  onClick={handleRecognizeText}
                  disabled={!selectedImage || isRecognizing}
                  data-testid="button-recognize"
                >
                  {isRecognizing ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Распознаю... {ocrProgress}%
                    </>
                  ) : (
                    <>
                      <Eye className="h-4 w-4 mr-2" />
                      Распознать текст
                    </>
                  )}
                </Button>
              </div>

              <div>
                <Label className="block text-sm text-purple-600 mb-2">2. Текст отзыва</Label>
                <Textarea
                  value={reviewText}
                  onChange={(e) => setReviewText(e.target.value)}
                  placeholder="Вставьте текст отзыва клиента..."
                  className="bg-white border-2 border-purple-200"
                  rows={3}
                  data-testid="textarea-review"
                />
              </div>

              <div className="space-y-3">
                <div>
                  <Label className="text-xs text-purple-500 mb-1 block">БЫЛО</Label>
                  <Input
                    value={before}
                    onChange={(e) => setBefore(e.target.value)}
                    placeholder="Исходная ситуация"
                    className="bg-white border-2 border-purple-200"
                    data-testid="input-before"
                  />
                </div>
                <div>
                  <Label className="text-xs text-purple-500 mb-1 block">СДЕЛАЛИ</Label>
                  <Input
                    value={action}
                    onChange={(e) => setAction(e.target.value)}
                    placeholder="Что было сделано"
                    className="bg-white border-2 border-purple-200"
                    data-testid="input-action"
                  />
                </div>
                <div>
                  <Label className="text-xs text-purple-500 mb-1 block">СТАЛО</Label>
                  <Input
                    value={after}
                    onChange={(e) => setAfter(e.target.value)}
                    placeholder="Результат"
                    className="bg-white border-2 border-purple-200"
                    data-testid="input-after"
                  />
                </div>
              </div>

              <div>
                <Label className="block text-sm text-purple-600 mb-2">Теги</Label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {suggestedTags.map((tag) => (
                    <Badge
                      key={tag}
                      variant="secondary"
                      className="cursor-pointer hover-elevate"
                      onClick={() => addTag(tag)}
                      data-testid={`tag-suggestion-${tag}`}
                    >
                      {tag}
                    </Badge>
                  ))}
                </div>
                <Input
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={handleTagInputKeyDown}
                  placeholder="Введите тег и нажмите Enter"
                  className="bg-white border-2 border-purple-200"
                  data-testid="input-tag"
                />
                {tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {tags.map((tag) => (
                      <Badge key={tag} variant="default" className="pr-1">
                        {tag}
                        <button
                          onClick={() => removeTag(tag)}
                          className="ml-1 hover:text-destructive"
                          data-testid={`remove-tag-${tag}`}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              <Button
                onClick={handleGenerate}
                disabled={isGenerating || !reviewText}
                className="w-full py-6 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold border-2 border-purple-400 shadow-lg"
                data-testid="button-generate-case"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                    Генерирую...
                  </>
                ) : (
                  <>
                    <Rocket className="h-5 w-5 mr-2" />
                    Сгенерировать
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-7 space-y-6">
          {generatedCase && (
            <Card className="border-2 border-pink-400 bg-white relative fade-in shadow-lg">
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-2 right-2 text-purple-600"
                onClick={() => setGeneratedCase(null)}
                data-testid="button-close-preview"
              >
                <X className="h-4 w-4" />
              </Button>
              <CardHeader>
                <CardTitle className="text-xl font-mystic text-purple-700">
                  Готовый Кейс
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-xs text-purple-500">Заголовки</Label>
                  <div className="space-y-2 mt-1">
                    {generatedCase.generatedHeadlines?.map((headline, idx) => (
                      <div key={idx} className="p-2 bg-purple-50 rounded text-sm text-purple-700 border border-purple-200">
                        {headline}
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <Label className="text-xs text-purple-500">Цитата</Label>
                  <blockquote className="border-l-4 border-pink-400 pl-4 italic text-purple-600 my-2 bg-pink-50 p-3 rounded-r">
                    "{generatedCase.generatedQuote}"
                  </blockquote>
                </div>
                <div>
                  <Label className="text-xs text-purple-500">Текст</Label>
                  <div className="bg-purple-50 p-4 rounded-lg text-sm text-purple-700 whitespace-pre-wrap max-h-64 overflow-y-auto border-2 border-purple-200">
                    {generatedCase.generatedBody}
                  </div>
                </div>
                <div className="flex gap-3 flex-wrap">
                  <Button 
                    onClick={handleSaveCase} 
                    disabled={saveCaseMutation.isPending}
                    className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 text-white" 
                    data-testid="button-save-case"
                  >
                    {saveCaseMutation.isPending ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4 mr-2" />
                    )}
                    В Библиотеку
                  </Button>
                  <Button variant="secondary" onClick={handleCopyCase} data-testid="button-copy-case">
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="secondary" 
                    className="bg-pink-100 hover:bg-pink-200 text-pink-700 border-2 border-pink-300"
                    onClick={() => setShowVisualModal(true)}
                    data-testid="button-create-visual"
                  >
                    <Palette className="h-4 w-4 mr-2" />
                    Макет
                  </Button>
                  <Button 
                    variant="secondary" 
                    className="bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white border-0"
                    onClick={() => {
                      const text = `${generatedCase.generatedHeadlines?.[0] || ''}\n\n"${generatedCase.generatedQuote}"\n\n${generatedCase.generatedBody}`;
                      setLocation(`/image-editor?text=${encodeURIComponent(text)}`);
                    }}
                  >
                    <Image className="h-4 w-4 mr-2" />
                    Карусель
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          <Card className="bg-white border-2 border-purple-300 shadow-md">
            <CardHeader>
              <div className="flex justify-between items-center gap-4 flex-wrap">
                <CardTitle className="text-2xl font-mystic text-purple-700">
                  Библиотека
                </CardTitle>
                <div className="flex gap-2 flex-wrap">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-purple-400" />
                    <Input
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Поиск..."
                      className="bg-white border-2 border-purple-200 pl-9 w-32 focus:w-40 transition-all"
                      data-testid="input-search-cases"
                    />
                  </div>
                  <select
                    value={filterTag}
                    onChange={(e) => setFilterTag(e.target.value)}
                    className="bg-white border-2 border-purple-200 text-purple-700 text-sm rounded-md px-3 py-2"
                    data-testid="select-filter-tag"
                  >
                    <option value="all">Все теги</option>
                    {allTags.map((tag) => (
                      <option key={tag} value={tag}>{tag}</option>
                    ))}
                  </select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
                </div>
              ) : filteredCases.length === 0 ? (
                <div className="text-center py-8 text-purple-400">
                  Пока нет сохраненных кейсов
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[500px] overflow-y-auto">
                  {filteredCases.map((caseItem) => (
                    <Card 
                      key={caseItem.id} 
                      className="bg-gradient-to-br from-purple-50 to-pink-50 border-2 border-purple-200 hover-elevate cursor-pointer"
                      onClick={() => setViewingCase(caseItem)}
                    >
                      <CardContent className="p-4">
                        <h4 className="font-medium text-purple-700 mb-2 line-clamp-2">
                          {(caseItem.generatedHeadlines as string[])?.[0] || (caseItem.before || "") + " → " + (caseItem.after || "")}
                        </h4>
                        <p className="text-xs text-purple-500 line-clamp-2 mb-3">
                          "{caseItem.generatedQuote || caseItem.reviewText}"
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {(caseItem.tags as string[]).map((tag) => (
                            <Badge key={tag} variant="secondary" className="text-xs bg-purple-100 text-purple-700 border border-purple-300">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={showVisualModal} onOpenChange={setShowVisualModal}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>Визуальный макет кейса</span>
              <span className="text-sm font-normal text-purple-500">
                {templates[currentTemplate].name} ({currentTemplate + 1}/{templates.length})
              </span>
            </DialogTitle>
          </DialogHeader>
          {generatedCase && (
            <>
              <div className="relative">
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute left-0 top-1/2 -translate-y-1/2 z-20 bg-white/80 hover:bg-white rounded-full shadow-md"
                  onClick={prevTemplate}
                >
                  <ChevronLeft className="h-5 w-5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-1/2 -translate-y-1/2 z-20 bg-white/80 hover:bg-white rounded-full shadow-md"
                  onClick={nextTemplate}
                >
                  <ChevronRight className="h-5 w-5" />
                </Button>
                <div className="mx-6 rounded-xl overflow-hidden shadow-lg aspect-[4/5]">
                  {previewImageUrl ? (
                    <img 
                      src={previewImageUrl} 
                      alt="Предпросмотр макета" 
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gray-100">
                      <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
                    </div>
                  )}
                </div>
              </div>
              <div className="flex justify-center gap-2 mt-2">
                {templates.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentTemplate(idx)}
                    className={`w-2 h-2 rounded-full transition-all ${
                      idx === currentTemplate ? "bg-purple-500 w-4" : "bg-purple-200"
                    }`}
                  />
                ))}
              </div>
              <Button
                onClick={handleSaveImage}
                disabled={isSavingImage}
                className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white"
              >
                {isSavingImage ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Сохраняю...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4 mr-2" />
                    Сохранить картинку
                  </>
                )}
              </Button>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!viewingCase} onOpenChange={(open) => !open && setViewingCase(null)}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-mystic text-purple-700">
              {(viewingCase?.generatedHeadlines as string[])?.[0] || "Кейс"}
            </DialogTitle>
          </DialogHeader>
          {viewingCase && (
            <div className="space-y-4">
              <div>
                <Label className="text-xs text-purple-500">Заголовки</Label>
                <div className="space-y-2 mt-1">
                  {(viewingCase.generatedHeadlines as string[])?.map((headline, idx) => (
                    <div key={idx} className="p-2 bg-purple-50 rounded text-sm text-purple-700 border border-purple-200">
                      {headline}
                    </div>
                  ))}
                </div>
              </div>
              
              {viewingCase.generatedQuote && (
                <div>
                  <Label className="text-xs text-purple-500">Цитата</Label>
                  <blockquote className="border-l-4 border-pink-400 pl-4 italic text-purple-600 my-2 bg-pink-50 p-3 rounded-r">
                    "{viewingCase.generatedQuote}"
                  </blockquote>
                </div>
              )}
              
              {viewingCase.generatedBody && (
                <div>
                  <Label className="text-xs text-purple-500">Текст кейса</Label>
                  <div className="bg-purple-50 p-4 rounded-lg text-sm text-purple-700 whitespace-pre-wrap border-2 border-purple-200">
                    {viewingCase.generatedBody}
                  </div>
                </div>
              )}
              
              <div className="flex flex-wrap gap-2">
                {(viewingCase.tags as string[])?.map((tag) => (
                  <Badge key={tag} variant="secondary" className="bg-purple-100 text-purple-700 border border-purple-300">
                    {tag}
                  </Badge>
                ))}
              </div>
              
              <div className="flex gap-3 pt-2">
                <Button 
                  variant="secondary" 
                  onClick={() => {
                    const text = `${(viewingCase.generatedHeadlines as string[])?.[0] || ""}\n\n"${viewingCase.generatedQuote || ""}"\n\n${viewingCase.generatedBody || ""}`;
                    navigator.clipboard.writeText(text);
                  }}
                  className="flex-1"
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Скопировать
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}
