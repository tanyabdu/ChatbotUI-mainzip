import { useState, useRef, useEffect, ChangeEvent } from 'react';
import html2canvas from 'html2canvas';
import { Download, ChevronLeft, ChevronRight, Plus, Trash2, Sparkles, RotateCcw, AlignLeft, AlignCenter, AlignRight, Upload, Move, Type, Palette, Image, ArrowUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { ArchetypeId } from '@/lib/archetypes';
import { archetypeFontConfigs, allFonts, backgroundPresets, getArchetypeBackgrounds } from '@/lib/archetypeFonts';
import { Slide, splitTextToSlides, updateSlide, addSlideAfter, removeSlide } from '@/lib/slideUtils';

const loadedFonts = new Set<string>();

function loadGoogleFont(fontName: string) {
  if (typeof document === 'undefined') return;
  if (loadedFonts.has(fontName) || fontName === 'Georgia' || fontName === 'Impact') return;
  
  const formattedName = fontName.replace(/ /g, '+');
  const linkId = `google-font-${formattedName}`;
  
  if (document.getElementById(linkId)) {
    loadedFonts.add(fontName);
    return;
  }
  
  const link = document.createElement('link');
  link.id = linkId;
  link.rel = 'stylesheet';
  link.href = `https://fonts.googleapis.com/css2?family=${formattedName}:wght@400;600;700&display=swap`;
  document.head.appendChild(link);
  loadedFonts.add(fontName);
}

type TextAlign = 'left' | 'center' | 'right';

interface CarouselEditorProps {
  initialText?: string;
  userArchetypes?: ArchetypeId[];
}

export default function CarouselEditor({ initialText = '', userArchetypes = [] }: CarouselEditorProps) {
  const slideRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const [sourceText, setSourceText] = useState(initialText);
  const [slides, setSlides] = useState<Slide[]>(() => splitTextToSlides(initialText));
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);

  const [aspectRatio, setAspectRatio] = useState<'1:1' | '4:5' | '9:16'>('4:5');
  const [defaultBackground, setDefaultBackground] = useState(backgroundPresets[0].value);
  const [titleFont, setTitleFont] = useState('Cormorant Garamond');
  const [bodyFont, setBodyFont] = useState('Inter');
  const [titleSize, setTitleSize] = useState(42);
  const [bodySize, setBodySize] = useState(24);
  const [textColor, setTextColor] = useState('#ffffff');
  const [padding, setPadding] = useState(40);
  const [textAlign, setTextAlign] = useState<TextAlign>('center');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const archetypeConfigs = userArchetypes
    .map(id => archetypeFontConfigs[id])
    .filter(Boolean);
  const primaryArchetype = archetypeConfigs[0] || null;

  const recommendedFonts = archetypeConfigs.flatMap(config => [config.headerFont, config.bodyFont]);
  const uniqueRecommendedFonts = Array.from(new Set(recommendedFonts));
  
  const recommendedColors = archetypeConfigs.flatMap(config => config.colors);
  const uniqueRecommendedColors = Array.from(new Set(recommendedColors));

  // Get archetype-specific backgrounds
  const archetypeBackgrounds = userArchetypes.flatMap(id => getArchetypeBackgrounds(id));
  const allBackgrounds = [...archetypeBackgrounds, ...backgroundPresets];

  useEffect(() => {
    if (primaryArchetype) {
      setTitleFont(primaryArchetype.headerFont);
      setBodyFont(primaryArchetype.bodyFont);
      const archetypeBg = getArchetypeBackgrounds(primaryArchetype.id);
      if (archetypeBg.length > 0) {
        setDefaultBackground(archetypeBg[0].value);
      }
      const bgColor = primaryArchetype.colors[0];
      const isLight = ['#fef3c7', '#f8fafc', '#fdf2f8', '#ffe4e6', '#e0e7ff', '#f5f5f5'].includes(bgColor);
      setTextColor(isLight ? primaryArchetype.colors[1] || '#1a1a2e' : '#ffffff');
    }
  }, [primaryArchetype]);

  useEffect(() => {
    loadGoogleFont(titleFont);
  }, [titleFont]);

  useEffect(() => {
    loadGoogleFont(bodyFont);
  }, [bodyFont]);

  useEffect(() => {
    allFonts.forEach(f => loadGoogleFont(f.name));
    uniqueRecommendedFonts.forEach(f => loadGoogleFont(f));
  }, [uniqueRecommendedFonts]);

  const getSlideBackground = (slide: Slide) => slide.background ?? defaultBackground;
  const getSlideCustomImage = (slide: Slide) => slide.customImage ?? null;
  const getSlideImageFit = (slide: Slide) => slide.imageFit ?? 'contain';
  const getSlideOffsetX = (slide: Slide) => slide.offsetX ?? 0;
  const getSlideOffsetY = (slide: Slide) => slide.offsetY ?? 0;

  const handleSlideBackgroundChange = (value: string) => {
    if (!currentSlide) return;
    setSlides(updateSlide(slides, currentSlide.id, { background: value, customImage: null }));
  };

  const handleSlideCustomImageChange = (imageData: string | null) => {
    if (!currentSlide) return;
    setSlides(updateSlide(slides, currentSlide.id, { customImage: imageData }));
  };

  const handleSlideOffsetChange = (axis: 'offsetX' | 'offsetY', value: number) => {
    if (!currentSlide) return;
    setSlides(updateSlide(slides, currentSlide.id, { [axis]: value }));
  };

  const handleImageUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        handleSlideCustomImageChange(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const clearCustomImage = () => {
    handleSlideCustomImageChange(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

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

  const getSolidBackgroundColor = (slide: Slide): string | null => {
    const customImg = getSlideCustomImage(slide);
    const bg = getSlideBackground(slide);
    if (customImg) return null;
    if (!bg.includes('gradient') && !bg.includes('url') && bg.startsWith('#')) {
      return bg;
    }
    return null;
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

        const solidBg = getSolidBackgroundColor(slides[i]);
        const canvas = await html2canvas(slideElement, {
          scale: 2,
          useCORS: true,
          backgroundColor: solidBg,
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
    const solidBg = getSolidBackgroundColor(currentSlide);
    try {
      const canvas = await html2canvas(slideElement, {
        scale: 2,
        useCORS: true,
        backgroundColor: solidBg,
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
    const alignItems = textAlign === 'left' ? 'flex-start' : textAlign === 'right' ? 'flex-end' : 'center';
    
    const slideCustomImage = getSlideCustomImage(slide);
    const slideBackground = getSlideBackground(slide);
    const slideImageFit = getSlideImageFit(slide);
    const offsetX = getSlideOffsetX(slide);
    const offsetY = getSlideOffsetY(slide);

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
          background: slideCustomImage ? `url(${slideCustomImage})` : slideBackground,
          backgroundSize: slideCustomImage ? slideImageFit : 'cover',
          backgroundPosition: 'center',
          backgroundColor: slideCustomImage && slideImageFit === 'contain' ? '#1a1a2e' : undefined,
          backgroundRepeat: 'no-repeat',
          padding: `${padding}px`,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: isTitleSlide ? 'center' : 'flex-start',
          alignItems: alignItems,
          textAlign: textAlign,
          overflow: 'hidden',
          transform: isMain ? 'none' : `scale(${scale})`,
          transformOrigin: 'top left',
        }}
        className={`rounded-lg ${isMain ? 'shadow-xl' : 'shadow-md cursor-pointer hover:ring-2 hover:ring-purple-400'}`}
      >
        <div style={{ 
          transform: `translate(${offsetX}px, ${offsetY}px)`,
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: alignItems,
        }}>
          {slide.heading && (
            <div
              style={{
                fontFamily: titleFont,
                fontSize: isTitleSlide ? `${titleSize}px` : `${titleSize * 0.7}px`,
                color: textColor,
                lineHeight: 1.3,
                marginBottom: slide.body ? '20px' : 0,
                fontWeight: 600,
                width: '100%',
                textAlign: textAlign,
                whiteSpace: 'pre-line',
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
                width: '100%',
                textAlign: textAlign,
                whiteSpace: 'pre-line',
              }}
            >
              {slide.body}
            </div>
          )}
        </div>
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
              {archetypeConfigs.length > 0 && (
                <span className="text-sm font-normal text-purple-600 ml-2">
                  Стиль: {archetypeConfigs.map(c => c.name).join(' + ')}
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
                Исходный текст (разбивается автоматически по --- или пустым строкам)
              </label>
              <Textarea
                value={sourceText}
                onChange={(e) => setSourceText(e.target.value)}
                rows={4}
                className="resize-none"
                placeholder="Вставьте текст поста. Разделяйте слайды символом --- или пустыми строками"
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

          <div className="flex flex-col lg:grid lg:grid-cols-2 gap-6">
            <div className="space-y-4 order-last lg:order-none">
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

              <Accordion type="multiple" defaultValue={["text"]} className="w-full">
                <AccordionItem value="text" className="border-purple-200">
                  <AccordionTrigger className="py-3 text-sm font-medium hover:no-underline">
                    <div className="flex items-center gap-2">
                      <Type className="h-4 w-4 text-purple-500" />
                      Текст слайда
                      {currentSlide && (
                        <span className="text-xs px-2 py-0.5 rounded bg-purple-100 text-purple-600">
                          {currentSlide.type === 'title' ? 'Титульный' : 'Контент'}
                        </span>
                      )}
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    {currentSlide && (
                      <div className="space-y-3">
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
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="fonts" className="border-purple-200">
                  <AccordionTrigger className="py-3 text-sm font-medium hover:no-underline">
                    <div className="flex items-center gap-2">
                      <Type className="h-4 w-4 text-purple-500" />
                      Шрифты и размеры
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-4">
                      {uniqueRecommendedFonts.length > 0 && (
                        <div className="p-2 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg border border-purple-200">
                          <div className="flex items-center gap-2 mb-2">
                            <Sparkles className="h-4 w-4 text-purple-500" />
                            <span className="text-xs font-medium text-purple-700">Шрифты архетипов</span>
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {uniqueRecommendedFonts.map((font, idx) => (
                              <button
                                key={font}
                                onClick={() => idx % 2 === 0 ? setTitleFont(font) : setBodyFont(font)}
                                className={`min-h-[44px] px-3 py-2 rounded-lg text-xs transition-all ${
                                  titleFont === font || bodyFont === font
                                    ? 'bg-purple-500 text-white shadow-md'
                                    : 'bg-white border border-purple-200 hover:border-purple-400'
                                }`}
                                style={{ fontFamily: font }}
                              >
                                {font}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs font-medium text-gray-700 mb-1 block">Шрифт заголовка</label>
                          <select
                            value={titleFont}
                            onChange={(e) => setTitleFont(e.target.value)}
                            className="w-full p-2 border rounded-lg text-sm min-h-[44px]"
                            style={{ fontFamily: titleFont }}
                          >
                            {uniqueRecommendedFonts.length > 0 && (
                              <optgroup label="Архетипы">
                                {uniqueRecommendedFonts.map((font) => (
                                  <option key={font} value={font}>{font}</option>
                                ))}
                              </optgroup>
                            )}
                            <optgroup label="Все">
                              {allFonts.filter(f => !uniqueRecommendedFonts.includes(f.name)).map((f) => (
                                <option key={f.name} value={f.name}>{f.name}</option>
                              ))}
                            </optgroup>
                          </select>
                        </div>
                        <div>
                          <label className="text-xs font-medium text-gray-700 mb-1 block">Шрифт текста</label>
                          <select
                            value={bodyFont}
                            onChange={(e) => setBodyFont(e.target.value)}
                            className="w-full p-2 border rounded-lg text-sm min-h-[44px]"
                            style={{ fontFamily: bodyFont }}
                          >
                            {uniqueRecommendedFonts.length > 0 && (
                              <optgroup label="Архетипы">
                                {uniqueRecommendedFonts.map((font) => (
                                  <option key={font} value={font}>{font}</option>
                                ))}
                              </optgroup>
                            )}
                            <optgroup label="Все">
                              {allFonts.filter(f => !uniqueRecommendedFonts.includes(f.name)).map((f) => (
                                <option key={f.name} value={f.name}>{f.name}</option>
                              ))}
                            </optgroup>
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs text-gray-600 mb-1 block">Заголовок: {titleSize}px</label>
                          <Slider value={[titleSize]} onValueChange={([v]) => setTitleSize(v)} min={24} max={72} step={2} />
                        </div>
                        <div>
                          <label className="text-xs text-gray-600 mb-1 block">Текст: {bodySize}px</label>
                          <Slider value={[bodySize]} onValueChange={([v]) => setBodySize(v)} min={14} max={36} step={2} />
                        </div>
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="style" className="border-purple-200">
                  <AccordionTrigger className="py-3 text-sm font-medium hover:no-underline">
                    <div className="flex items-center gap-2">
                      <Palette className="h-4 w-4 text-purple-500" />
                      Цвета и позиция
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-4">
                      {uniqueRecommendedColors.length > 0 && (
                        <div className="p-2 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg border border-purple-200">
                          <div className="flex items-center gap-2 mb-2">
                            <Sparkles className="h-4 w-4 text-purple-500" />
                            <span className="text-xs font-medium text-purple-700">Цвета архетипов</span>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {uniqueRecommendedColors.map((color) => (
                              <button
                                key={color}
                                onClick={() => setTextColor(color)}
                                className={`w-11 h-11 rounded-lg border-2 transition-all ${
                                  textColor === color
                                    ? 'border-purple-500 scale-110 shadow-lg'
                                    : 'border-gray-300 hover:border-purple-400'
                                }`}
                                style={{ backgroundColor: color }}
                                title={color}
                              />
                            ))}
                          </div>
                        </div>
                      )}

                      <div>
                        <label className="text-xs font-medium text-gray-700 mb-2 block">Выравнивание</label>
                        <div className="flex gap-2">
                          <button
                            onClick={() => setTextAlign('left')}
                            className={`flex-1 min-h-[44px] rounded-lg flex items-center justify-center ${
                              textAlign === 'left' ? 'bg-purple-500 text-white' : 'bg-gray-100 hover:bg-gray-200'
                            }`}
                          >
                            <AlignLeft className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => setTextAlign('center')}
                            className={`flex-1 min-h-[44px] rounded-lg flex items-center justify-center ${
                              textAlign === 'center' ? 'bg-purple-500 text-white' : 'bg-gray-100 hover:bg-gray-200'
                            }`}
                          >
                            <AlignCenter className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => setTextAlign('right')}
                            className={`flex-1 min-h-[44px] rounded-lg flex items-center justify-center ${
                              textAlign === 'right' ? 'bg-purple-500 text-white' : 'bg-gray-100 hover:bg-gray-200'
                            }`}
                          >
                            <AlignRight className="h-5 w-5" />
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="text-xs font-medium text-gray-700 mb-2 flex items-center gap-1">
                          <Move className="h-3 w-3" /> Позиция текста
                        </label>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-xs text-gray-500 mb-1 block">X: {currentSlide ? getSlideOffsetX(currentSlide) : 0}px</label>
                            <Slider
                              value={[currentSlide ? getSlideOffsetX(currentSlide) : 0]}
                              onValueChange={([v]) => handleSlideOffsetChange('offsetX', v)}
                              min={-100} max={100} step={5}
                            />
                          </div>
                          <div>
                            <label className="text-xs text-gray-500 mb-1 block">Y: {currentSlide ? getSlideOffsetY(currentSlide) : 0}px</label>
                            <Slider
                              value={[currentSlide ? getSlideOffsetY(currentSlide) : 0]}
                              onValueChange={([v]) => handleSlideOffsetChange('offsetY', v)}
                              min={-100} max={100} step={5}
                            />
                          </div>
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => { handleSlideOffsetChange('offsetX', 0); handleSlideOffsetChange('offsetY', 0); }} className="mt-1 text-xs text-gray-500 h-8">
                          Сбросить
                        </Button>
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="background" className="border-purple-200">
                  <AccordionTrigger className="py-3 text-sm font-medium hover:no-underline">
                    <div className="flex items-center gap-2">
                      <Image className="h-4 w-4 text-purple-500" />
                      Фон и формат
                      {currentSlide && getSlideCustomImage(currentSlide) && (
                        <span className="text-xs px-2 py-0.5 rounded bg-purple-100 text-purple-600">Фото</span>
                      )}
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-4">
                      <div className="flex flex-wrap gap-2">
                        <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" id="bg-image-upload" />
                        <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} className="min-h-[44px] flex items-center gap-1">
                          <Upload className="h-4 w-4" /> Загрузить фото
                        </Button>
                        {currentSlide && getSlideCustomImage(currentSlide) && (
                          <Button variant="outline" size="sm" onClick={clearCustomImage} className="min-h-[44px] text-red-500 hover:text-red-600">
                            Убрать
                          </Button>
                        )}
                      </div>

                      {currentSlide && getSlideCustomImage(currentSlide) && (
                        <div>
                          <div className="text-xs text-gray-500 mb-1">Размер фото:</div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => setSlides(updateSlide(slides, currentSlide.id, { imageFit: 'contain' }))}
                              className={`flex-1 min-h-[44px] rounded-lg text-sm ${
                                getSlideImageFit(currentSlide) === 'contain' ? 'bg-purple-500 text-white' : 'bg-gray-100 hover:bg-gray-200'
                              }`}
                            >
                              Вместить
                            </button>
                            <button
                              onClick={() => setSlides(updateSlide(slides, currentSlide.id, { imageFit: 'cover' }))}
                              className={`flex-1 min-h-[44px] rounded-lg text-sm ${
                                getSlideImageFit(currentSlide) === 'cover' ? 'bg-purple-500 text-white' : 'bg-gray-100 hover:bg-gray-200'
                              }`}
                            >
                              Заполнить
                            </button>
                          </div>
                        </div>
                      )}

                      {archetypeBackgrounds.length > 0 && (
                        <div>
                          <div className="text-xs text-purple-600 mb-1">Фоны архетипов:</div>
                          <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                            {archetypeBackgrounds.map((bg) => (
                              <button
                                key={bg.id}
                                onClick={() => handleSlideBackgroundChange(bg.value)}
                                className={`h-11 rounded border-2 transition-all ${
                                  currentSlide && !getSlideCustomImage(currentSlide) && getSlideBackground(currentSlide) === bg.value
                                    ? 'border-purple-500 scale-105' : 'border-gray-300 hover:border-purple-400'
                                }`}
                                style={{ background: bg.value }}
                                title={bg.name}
                              />
                            ))}
                          </div>
                        </div>
                      )}

                      <div>
                        <div className="text-xs text-gray-500 mb-1">Все фоны:</div>
                        <div className="grid grid-cols-5 sm:grid-cols-7 lg:grid-cols-10 gap-2">
                          {backgroundPresets.map((bg) => (
                            <button
                              key={bg.id}
                              onClick={() => handleSlideBackgroundChange(bg.value)}
                              className={`h-11 rounded border-2 transition-all ${
                                currentSlide && !getSlideCustomImage(currentSlide) && getSlideBackground(currentSlide) === bg.value
                                  ? 'border-purple-500 scale-105' : 'border-gray-300 hover:border-purple-400'
                              }`}
                              style={{ background: bg.value }}
                              title={bg.name}
                            />
                          ))}
                        </div>
                      </div>

                      <div>
                        <label className="text-xs font-medium text-gray-700 mb-2 block">Формат</label>
                        <div className="flex gap-2">
                          {([
                            { value: '1:1', label: 'Квадрат' },
                            { value: '4:5', label: 'Instagram' },
                            { value: '9:16', label: 'Stories' },
                          ] as const).map((ratio) => (
                            <button
                              key={ratio.value}
                              onClick={() => setAspectRatio(ratio.value)}
                              className={`flex-1 min-h-[44px] rounded-lg text-sm ${
                                aspectRatio === ratio.value ? 'bg-purple-500 text-white' : 'bg-gray-100 hover:bg-gray-200'
                              }`}
                            >
                              {ratio.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>

              <div className="flex flex-col sm:flex-row gap-2 pt-4 border-t border-gray-200">
                <Button
                  onClick={handleExportCurrent}
                  disabled={isExporting}
                  variant="outline"
                  className="flex-1 text-xs sm:text-sm min-h-[44px]"
                  size="sm"
                >
                  <Download className="h-4 w-4 mr-1 sm:mr-2" />
                  <span className="hidden sm:inline">Скачать этот слайд</span>
                  <span className="sm:hidden">Этот слайд</span>
                </Button>
                <Button
                  onClick={handleExportAll}
                  disabled={isExporting}
                  className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-xs sm:text-sm min-h-[44px]"
                  size="sm"
                >
                  <Download className="h-4 w-4 mr-1 sm:mr-2" />
                  {isExporting ? `${exportProgress}%` : `Все (${slides.length})`}
                </Button>
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                className="lg:hidden mt-2 text-purple-600 hover:text-purple-700 min-h-[44px]"
              >
                <ArrowUp className="h-4 w-4 mr-2" />
                К предпросмотру
              </Button>
            </div>

            <div className="flex flex-col items-center order-first lg:order-none">
              <div className="text-sm text-gray-500 mb-2">Предпросмотр слайда {currentSlideIndex + 1}</div>
              <div className="w-full flex justify-center overflow-hidden">
                <div className="transform scale-75 sm:scale-90 lg:scale-100 origin-top">
                  {currentSlide && renderSlidePreview(currentSlide, true)}
                </div>
              </div>
              
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
                        background: getSlideCustomImage(slide) ? `url(${getSlideCustomImage(slide)})` : getSlideBackground(slide),
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
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
