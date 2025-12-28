import { useState, useRef, useEffect } from 'react';
import html2canvas from 'html2canvas';
import { Download, ChevronLeft, ChevronRight, Plus, Trash2, Sparkles, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { ArchetypeId } from '@/lib/archetypes';
import { archetypeFontConfigs, allFonts, backgroundPresets } from '@/lib/archetypeFonts';
import { Slide, splitTextToSlides, updateSlide, addSlideAfter, removeSlide } from '@/lib/slideUtils';

interface CarouselEditorProps {
  initialText?: string;
  userArchetype?: ArchetypeId | null;
}

export default function CarouselEditor({ initialText = '', userArchetype = null }: CarouselEditorProps) {
  const slideRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const [sourceText, setSourceText] = useState(initialText);
  const [slides, setSlides] = useState<Slide[]>(() => splitTextToSlides(initialText));
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);

  const [aspectRatio, setAspectRatio] = useState<'1:1' | '4:5' | '9:16'>('4:5');
  const [background, setBackground] = useState(backgroundPresets[0].value);
  const [titleFont, setTitleFont] = useState('Cormorant Garamond');
  const [bodyFont, setBodyFont] = useState('Inter');
  const [titleSize, setTitleSize] = useState(42);
  const [bodySize, setBodySize] = useState(24);
  const [textColor, setTextColor] = useState('#ffffff');
  const [padding, setPadding] = useState(40);

  const currentArchetype = userArchetype ? archetypeFontConfigs[userArchetype] : null;

  useEffect(() => {
    if (currentArchetype) {
      setTitleFont(currentArchetype.headerFont);
      setBodyFont(currentArchetype.bodyFont);
      const bgColor = currentArchetype.colors[0];
      const isLight = ['#fef3c7', '#f8fafc', '#fdf2f8', '#ffe4e6', '#e0e7ff', '#f5f5f5'].includes(bgColor);
      setTextColor(isLight ? currentArchetype.colors[1] || '#1a1a2e' : '#ffffff');
    }
  }, [currentArchetype]);

  useEffect(() => {
    if (initialText) {
      setSourceText(initialText);
      setSlides(splitTextToSlides(initialText));
      setCurrentSlideIndex(0);
    }
  }, [initialText]);

  const handleResplit = () => {
    setSlides(splitTextToSlides(sourceText));
    setCurrentSlideIndex(0);
  };

  const currentSlide = slides[currentSlideIndex];

  const getCanvasSize = () => {
    switch (aspectRatio) {
      case '1:1': return { width: 400, height: 400 };
      case '4:5': return { width: 400, height: 500 };
      case '9:16': return { width: 360, height: 640 };
      default: return { width: 400, height: 500 };
    }
  };

  const { width, height } = getCanvasSize();

  const handleUpdateSlide = (field: 'heading' | 'body', value: string) => {
    if (!currentSlide) return;
    setSlides(updateSlide(slides, currentSlide.id, { [field]: value }));
  };

  const handleAddSlide = () => {
    if (!currentSlide) return;
    const newSlides = addSlideAfter(slides, currentSlide.id);
    setSlides(newSlides);
    setCurrentSlideIndex(currentSlideIndex + 1);
  };

  const handleRemoveSlide = () => {
    if (slides.length <= 1) return;
    const newSlides = removeSlide(slides, currentSlide.id);
    setSlides(newSlides);
    if (currentSlideIndex >= newSlides.length) {
      setCurrentSlideIndex(newSlides.length - 1);
    }
  };

  const handleExportAll = async () => {
    setIsExporting(true);
    setExportProgress(0);

    try {
      for (let i = 0; i < slides.length; i++) {
        setCurrentSlideIndex(i);
        await new Promise(resolve => setTimeout(resolve, 100));
        
        const slideElement = slideRefs.current.get(slides[i].id);
        if (!slideElement) continue;

        const canvas = await html2canvas(slideElement, {
          scale: 2,
          useCORS: true,
          backgroundColor: null,
        });

        const link = document.createElement('a');
        link.download = `slide-${i + 1}-${Date.now()}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();

        setExportProgress(Math.round(((i + 1) / slides.length) * 100));
        await new Promise(resolve => setTimeout(resolve, 300));
      }
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setIsExporting(false);
      setExportProgress(0);
    }
  };

  const handleExportCurrent = async () => {
    const slideElement = slideRefs.current.get(currentSlide.id);
    if (!slideElement) return;

    setIsExporting(true);
    try {
      const canvas = await html2canvas(slideElement, {
        scale: 2,
        useCORS: true,
        backgroundColor: null,
      });
      const link = document.createElement('a');
      link.download = `slide-${currentSlideIndex + 1}-${Date.now()}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const renderSlidePreview = (slide: Slide, isMain: boolean = false) => {
    const scale = isMain ? 1 : 0.3;
    const isTitleSlide = slide.type === 'title';

    return (
      <div
        ref={(el) => {
          if (el && isMain) {
            slideRefs.current.set(slide.id, el);
          }
        }}
        style={{
          width: `${width}px`,
          height: `${height}px`,
          background: background,
          padding: `${padding}px`,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: isTitleSlide ? 'center' : 'flex-start',
          alignItems: 'center',
          textAlign: 'center',
          overflow: 'hidden',
          transform: isMain ? 'none' : `scale(${scale})`,
          transformOrigin: 'top left',
        }}
        className={`rounded-lg ${isMain ? 'shadow-xl' : 'shadow-md cursor-pointer hover:ring-2 hover:ring-purple-400'}`}
      >
        {slide.heading && (
          <div
            style={{
              fontFamily: titleFont,
              fontSize: isTitleSlide ? `${titleSize}px` : `${titleSize * 0.7}px`,
              color: textColor,
              lineHeight: 1.3,
              marginBottom: slide.body ? '20px' : 0,
              fontWeight: 600,
            }}
          >
            {slide.heading}
          </div>
        )}
        {slide.body && (
          <div
            style={{
              fontFamily: bodyFont,
              fontSize: `${bodySize}px`,
              color: textColor,
              lineHeight: 1.5,
              opacity: 0.95,
            }}
          >
            {slide.body}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <Card className="border-purple-200 bg-white/80 backdrop-blur">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-purple-800">
              <Sparkles className="h-5 w-5" />
              Редактор карусели
              {currentArchetype && (
                <span className="text-sm font-normal text-purple-600 ml-2">
                  Стиль: {currentArchetype.name}
                </span>
              )}
            </div>
            <div className="text-sm text-gray-500">
              {slides.length} {slides.length === 1 ? 'слайд' : slides.length < 5 ? 'слайда' : 'слайдов'}
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 mb-6">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                Исходный текст (разбивается автоматически по абзацам или ###)
              </label>
              <Textarea
                value={sourceText}
                onChange={(e) => setSourceText(e.target.value)}
                rows={4}
                className="resize-none"
                placeholder="Вставьте текст поста. Разделяйте слайды пустыми строками или знаком ###"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={handleResplit}
                className="mt-2"
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Разбить заново
              </Button>
            </div>
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setCurrentSlideIndex(Math.max(0, currentSlideIndex - 1))}
                    disabled={currentSlideIndex === 0}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm font-medium px-3">
                    Слайд {currentSlideIndex + 1} из {slides.length}
                  </span>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setCurrentSlideIndex(Math.min(slides.length - 1, currentSlideIndex + 1))}
                    disabled={currentSlideIndex === slides.length - 1}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={handleAddSlide}>
                    <Plus className="h-4 w-4 mr-1" /> Добавить
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRemoveSlide}
                    disabled={slides.length <= 1}
                    className="text-red-500 hover:text-red-600"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {currentSlide && (
                <div className="space-y-3 p-4 bg-purple-50 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-medium px-2 py-1 rounded bg-purple-200 text-purple-700">
                      {currentSlide.type === 'title' ? 'Титульный слайд' : 'Контент'}
                    </span>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-1 block">
                      {currentSlide.type === 'title' ? 'Заголовок' : 'Подзаголовок'}
                    </label>
                    <Input
                      value={currentSlide.heading}
                      onChange={(e) => handleUpdateSlide('heading', e.target.value)}
                      placeholder={currentSlide.type === 'title' ? 'Главный заголовок' : 'Подзаголовок слайда'}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-1 block">
                      Текст
                    </label>
                    <Textarea
                      value={currentSlide.body}
                      onChange={(e) => handleUpdateSlide('body', e.target.value)}
                      rows={3}
                      placeholder="Основной текст слайда"
                    />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">
                    Шрифт заголовка
                  </label>
                  <select
                    value={titleFont}
                    onChange={(e) => setTitleFont(e.target.value)}
                    className="w-full p-2 border rounded-lg text-sm"
                    style={{ fontFamily: titleFont }}
                  >
                    {allFonts.map((f) => (
                      <option key={f.name} value={f.name} style={{ fontFamily: f.name }}>
                        {f.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">
                    Шрифт текста
                  </label>
                  <select
                    value={bodyFont}
                    onChange={(e) => setBodyFont(e.target.value)}
                    className="w-full p-2 border rounded-lg text-sm"
                    style={{ fontFamily: bodyFont }}
                  >
                    {allFonts.map((f) => (
                      <option key={f.name} value={f.name} style={{ fontFamily: f.name }}>
                        {f.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">
                    Размер заголовка: {titleSize}px
                  </label>
                  <Slider
                    value={[titleSize]}
                    onValueChange={([v]) => setTitleSize(v)}
                    min={24}
                    max={72}
                    step={2}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">
                    Размер текста: {bodySize}px
                  </label>
                  <Slider
                    value={[bodySize]}
                    onValueChange={([v]) => setBodySize(v)}
                    min={14}
                    max={36}
                    step={2}
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  Фон
                </label>
                <div className="grid grid-cols-8 gap-2">
                  {backgroundPresets.map((bg) => (
                    <button
                      key={bg.id}
                      onClick={() => setBackground(bg.value)}
                      className={`h-8 rounded border-2 transition-all ${
                        background === bg.value
                          ? 'border-purple-500 scale-110'
                          : 'border-gray-300 hover:border-purple-400'
                      }`}
                      style={{ background: bg.value }}
                      title={bg.name}
                    />
                  ))}
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  Формат
                </label>
                <div className="flex gap-2">
                  {([
                    { value: '1:1', label: 'Квадрат' },
                    { value: '4:5', label: 'Instagram' },
                    { value: '9:16', label: 'Stories' },
                  ] as const).map((ratio) => (
                    <button
                      key={ratio.value}
                      onClick={() => setAspectRatio(ratio.value)}
                      className={`flex-1 py-2 rounded-lg text-sm ${
                        aspectRatio === ratio.value
                          ? 'bg-purple-500 text-white'
                          : 'bg-gray-100 hover:bg-gray-200'
                      }`}
                    >
                      {ratio.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={handleExportCurrent}
                  disabled={isExporting}
                  variant="outline"
                  className="flex-1"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Скачать этот слайд
                </Button>
                <Button
                  onClick={handleExportAll}
                  disabled={isExporting}
                  className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                >
                  <Download className="h-4 w-4 mr-2" />
                  {isExporting ? `${exportProgress}%` : `Скачать все (${slides.length})`}
                </Button>
              </div>
            </div>

            <div className="flex flex-col items-center">
              <div className="text-sm text-gray-500 mb-2">Предпросмотр слайда {currentSlideIndex + 1}</div>
              {currentSlide && renderSlidePreview(currentSlide, true)}
              
              <div className="mt-4 flex gap-2 overflow-x-auto pb-2 max-w-full">
                {slides.map((slide, idx) => (
                  <div
                    key={slide.id}
                    onClick={() => setCurrentSlideIndex(idx)}
                    className={`flex-shrink-0 cursor-pointer transition-all ${
                      idx === currentSlideIndex ? 'ring-2 ring-purple-500' : ''
                    }`}
                    style={{ width: width * 0.2, height: height * 0.2 }}
                  >
                    <div
                      style={{
                        width: `${width}px`,
                        height: `${height}px`,
                        background: background,
                        padding: `${padding * 0.3}px`,
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: slide.type === 'title' ? 'center' : 'flex-start',
                        alignItems: 'center',
                        textAlign: 'center',
                        transform: 'scale(0.2)',
                        transformOrigin: 'top left',
                        borderRadius: '8px',
                      }}
                    >
                      {slide.heading && (
                        <div style={{ fontFamily: titleFont, fontSize: `${titleSize}px`, color: textColor, fontWeight: 600 }}>
                          {slide.heading.substring(0, 30)}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
