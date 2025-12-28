import { useState, useRef, useEffect } from 'react';
import html2canvas from 'html2canvas';
import { Download, Type, Palette, Image, Sparkles, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArchetypeId } from '@/lib/archetypes';
import { archetypeFontConfigs, allFonts, backgroundPresets, textColors, ArchetypeFontConfig } from '@/lib/archetypeFonts';

interface PostImageEditorProps {
  initialText?: string;
  userArchetype?: ArchetypeId | null;
}

export default function PostImageEditor({ initialText = '', userArchetype = null }: PostImageEditorProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [text, setText] = useState(initialText || 'Введите ваш текст здесь...');
  
  useEffect(() => {
    setText(initialText || 'Введите ваш текст здесь...');
  }, [initialText]);
  const [fontSize, setFontSize] = useState(32);
  const [selectedFont, setSelectedFont] = useState('Cormorant Garamond');
  const [textColor, setTextColor] = useState('#ffffff');
  const [background, setBackground] = useState(backgroundPresets[0].value);
  const [textAlign, setTextAlign] = useState<'left' | 'center' | 'right'>('center');
  const [padding, setPadding] = useState(40);
  const [isExporting, setIsExporting] = useState(false);
  const [aspectRatio, setAspectRatio] = useState<'1:1' | '4:5' | '9:16'>('1:1');
  const [demoArchetype, setDemoArchetype] = useState<ArchetypeId | null>(userArchetype);
  const [showAllFonts, setShowAllFonts] = useState(false);
  const [showAllColors, setShowAllColors] = useState(false);

  const [isInitialized, setIsInitialized] = useState(false);

  const currentArchetype = demoArchetype ? archetypeFontConfigs[demoArchetype] : null;

  useEffect(() => {
    if (!isInitialized && userArchetype) {
      setDemoArchetype(userArchetype);
      setIsInitialized(true);
    }
  }, [userArchetype, isInitialized]);

  useEffect(() => {
    if (currentArchetype) {
      setSelectedFont(currentArchetype.headerFont);
      setTextColor(currentArchetype.colors[0] === '#ffffff' || currentArchetype.colors[0] === '#f8fafc' ? '#1a1a2e' : '#ffffff');
    }
  }, [currentArchetype]);

  const handleArchetypeChange = (value: string) => {
    setDemoArchetype(value === 'none' ? null : value as ArchetypeId);
  };

  const getCanvasSize = () => {
    switch (aspectRatio) {
      case '1:1': return { width: 400, height: 400 };
      case '4:5': return { width: 400, height: 500 };
      case '9:16': return { width: 360, height: 640 };
      default: return { width: 400, height: 400 };
    }
  };

  const handleExport = async () => {
    if (!canvasRef.current) return;
    setIsExporting(true);
    try {
      const canvas = await html2canvas(canvasRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: null,
      });
      const link = document.createElement('a');
      link.download = `post-${Date.now()}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const applyArchetypeStyle = (config: ArchetypeFontConfig) => {
    setSelectedFont(config.headerFont);
    const bgColor = config.colors[0];
    const isLight = bgColor === '#fef3c7' || bgColor === '#f8fafc' || bgColor === '#fdf2f8' || bgColor === '#ffe4e6' || bgColor === '#e0e7ff' || bgColor === '#f5f5f5';
    setTextColor(isLight ? config.colors[1] || '#1a1a2e' : '#ffffff');
    const matchingBg = backgroundPresets.find(bg => bg.value.includes(config.colors[0]));
    if (matchingBg) {
      setBackground(matchingBg.value);
    }
  };

  const { width, height } = getCanvasSize();

  const recommendedFonts = currentArchetype 
    ? [currentArchetype.headerFont, currentArchetype.bodyFont]
    : [];

  const otherFonts = allFonts.filter(f => !recommendedFonts.includes(f.name));

  return (
    <div className="space-y-6">
      <Card className="border-purple-200 bg-white/80 backdrop-blur">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-purple-800">
            <Sparkles className="h-5 w-5" />
            Генератор изображений для постов
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid lg:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="p-3 bg-purple-50 rounded-lg border border-purple-100">
                <label className="text-sm font-medium text-purple-700 mb-2 block">
                  Демо-режим: выберите архетип
                </label>
                <Select value={demoArchetype || 'none'} onValueChange={handleArchetypeChange}>
                  <SelectTrigger className="bg-white">
                    <SelectValue placeholder="Без архетипа" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Без архетипа</SelectItem>
                    {Object.values(archetypeFontConfigs).map((config) => (
                      <SelectItem key={config.id} value={config.id}>
                        {config.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {currentArchetype && (
                  <div className="mt-2 text-xs text-purple-600">
                    {currentArchetype.vibes}
                  </div>
                )}
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  Текст поста
                </label>
                <Textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  rows={4}
                  className="resize-none"
                  placeholder="Введите текст для изображения..."
                />
              </div>

              <Tabs defaultValue="fonts" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="fonts" className="flex items-center gap-1">
                    <Type className="h-4 w-4" /> Шрифт
                  </TabsTrigger>
                  <TabsTrigger value="colors" className="flex items-center gap-1">
                    <Palette className="h-4 w-4" /> Цвета
                  </TabsTrigger>
                  <TabsTrigger value="background" className="flex items-center gap-1">
                    <Image className="h-4 w-4" /> Фон
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="fonts" className="space-y-4 mt-4">
                  {currentArchetype && (
                    <div className="p-3 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg border border-purple-200">
                      <div className="flex items-center gap-2 mb-2">
                        <Sparkles className="h-4 w-4 text-purple-500" />
                        <span className="text-sm font-medium text-purple-700">
                          Рекомендовано для {currentArchetype.name}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {recommendedFonts.map((font) => (
                          <button
                            key={font}
                            onClick={() => setSelectedFont(font)}
                            className={`px-3 py-2 rounded-lg text-sm transition-all ${
                              selectedFont === font
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

                  <div>
                    <button
                      onClick={() => setShowAllFonts(!showAllFonts)}
                      className="flex items-center gap-2 text-sm text-gray-600 hover:text-purple-600 mb-2"
                    >
                      {showAllFonts ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      {currentArchetype ? 'Другие шрифты' : 'Все шрифты'}
                    </button>
                    {(showAllFonts || !currentArchetype) && (
                      <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto p-2 bg-gray-50 rounded-lg">
                        {(currentArchetype ? otherFonts : allFonts).map((font) => (
                          <button
                            key={font.name}
                            onClick={() => setSelectedFont(font.name)}
                            className={`px-3 py-2 rounded-lg text-sm transition-all ${
                              selectedFont === font.name
                                ? 'bg-purple-500 text-white shadow-md'
                                : 'bg-white border border-gray-200 hover:border-purple-400'
                            }`}
                            style={{ fontFamily: font.name }}
                          >
                            {font.name}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-2 block">
                      Размер шрифта: {fontSize}px
                    </label>
                    <Slider
                      value={[fontSize]}
                      onValueChange={([v]) => setFontSize(v)}
                      min={16}
                      max={72}
                      step={2}
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-2 block">
                      Выравнивание
                    </label>
                    <div className="flex gap-2">
                      {(['left', 'center', 'right'] as const).map((align) => (
                        <button
                          key={align}
                          onClick={() => setTextAlign(align)}
                          className={`flex-1 py-2 rounded-lg text-sm ${
                            textAlign === align
                              ? 'bg-purple-500 text-white'
                              : 'bg-gray-100 hover:bg-gray-200'
                          }`}
                        >
                          {align === 'left' ? 'Слева' : align === 'center' ? 'Центр' : 'Справа'}
                        </button>
                      ))}
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="colors" className="space-y-4 mt-4">
                  {currentArchetype && (
                    <div className="p-3 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg border border-purple-200">
                      <div className="flex items-center gap-2 mb-2">
                        <Sparkles className="h-4 w-4 text-purple-500" />
                        <span className="text-sm font-medium text-purple-700">
                          Цвета {currentArchetype.name}
                        </span>
                      </div>
                      <div className="flex gap-2">
                        {currentArchetype.colors.map((color) => (
                          <button
                            key={color}
                            onClick={() => setTextColor(color)}
                            className={`w-10 h-10 rounded-lg border-2 transition-all ${
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
                    <button
                      onClick={() => setShowAllColors(!showAllColors)}
                      className="flex items-center gap-2 text-sm text-gray-600 hover:text-purple-600 mb-2"
                    >
                      {showAllColors ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      {currentArchetype ? 'Другие цвета' : 'Все цвета'}
                    </button>
                    {(showAllColors || !currentArchetype) && (
                      <div className="flex flex-wrap gap-2 p-2 bg-gray-50 rounded-lg">
                        {textColors.map((color) => (
                          <button
                            key={color}
                            onClick={() => setTextColor(color)}
                            className={`w-10 h-10 rounded-lg border-2 transition-all ${
                              textColor === color
                                ? 'border-purple-500 scale-110 shadow-lg'
                                : 'border-gray-300 hover:border-purple-400'
                            }`}
                            style={{ backgroundColor: color }}
                            title={color}
                          />
                        ))}
                        <input
                          type="color"
                          value={textColor}
                          onChange={(e) => setTextColor(e.target.value)}
                          className="w-10 h-10 rounded-lg cursor-pointer"
                          title="Выбрать свой цвет"
                        />
                      </div>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="background" className="space-y-4 mt-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-2 block">
                      Готовые фоны
                    </label>
                    <div className="grid grid-cols-5 gap-2">
                      {backgroundPresets.map((bg) => (
                        <button
                          key={bg.id}
                          onClick={() => setBackground(bg.value)}
                          className={`h-12 rounded-lg border-2 transition-all ${
                            background === bg.value
                              ? 'border-purple-500 scale-105 shadow-lg'
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
                      Отступы: {padding}px
                    </label>
                    <Slider
                      value={[padding]}
                      onValueChange={([v]) => setPadding(v)}
                      min={10}
                      max={80}
                      step={5}
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-2 block">
                      Формат
                    </label>
                    <div className="flex gap-2">
                      {([
                        { value: '1:1', label: '1:1', desc: 'Квадрат' },
                        { value: '4:5', label: '4:5', desc: 'Instagram' },
                        { value: '9:16', label: '9:16', desc: 'Stories' },
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
                          <div className="font-medium">{ratio.label}</div>
                          <div className="text-xs opacity-75">{ratio.desc}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                </TabsContent>
              </Tabs>

              <Button
                onClick={handleExport}
                disabled={isExporting}
                className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
              >
                <Download className="h-4 w-4 mr-2" />
                {isExporting ? 'Создание...' : 'Скачать изображение'}
              </Button>
            </div>

            <div className="flex flex-col items-center">
              <div className="text-sm text-gray-500 mb-2">Предпросмотр</div>
              <div
                ref={canvasRef}
                style={{
                  width: `${width}px`,
                  height: `${height}px`,
                  background: background,
                  padding: `${padding}px`,
                  fontFamily: selectedFont,
                  fontSize: `${fontSize}px`,
                  color: textColor,
                  textAlign: textAlign,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  lineHeight: 1.4,
                  wordBreak: 'break-word',
                  overflow: 'hidden',
                }}
                className="rounded-lg shadow-xl"
              >
                <div style={{ whiteSpace: 'pre-wrap' }}>{text}</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
