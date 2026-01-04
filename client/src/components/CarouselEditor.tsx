import { useState, useRef, useEffect, useLayoutEffect, ChangeEvent } from 'react';
import JSZip from 'jszip';
import { Download, ChevronLeft, ChevronRight, Plus, Trash2, Sparkles, RotateCcw, AlignLeft, AlignCenter, AlignRight, Upload, Move, Type, Palette, Image, ArrowUp, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
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
  const { toast } = useToast();
  const slideRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const [sourceText, setSourceText] = useState(initialText);
  const [slides, setSlides] = useState<Slide[]>(() => splitTextToSlides(initialText));
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);
  
  // Refs to hold latest values for use in async closures (FileReader, etc.)
  const slidesRef = useRef(slides);
  const currentSlideIndexRef = useRef(currentSlideIndex);
  
  // Update refs in useLayoutEffect to ensure they reflect committed state
  useLayoutEffect(() => {
    slidesRef.current = slides;
  }, [slides]);
  
  useLayoutEffect(() => {
    currentSlideIndexRef.current = currentSlideIndex;
  }, [currentSlideIndex]);

  const [aspectRatio, setAspectRatio] = useState<'1:1' | '4:5' | '9:16'>('4:5');
  const [defaultBackground, setDefaultBackground] = useState(backgroundPresets[0].value);
  const [titleFont, setTitleFont] = useState('Cormorant Garamond');
  const [bodyFont, setBodyFont] = useState('Inter');
  const [titleSize, setTitleSize] = useState(42);
  const [bodySize, setBodySize] = useState(24);
  const [textColor, setTextColor] = useState('#ffffff');
  const [padding, setPadding] = useState(40);
  const [letterSpacing, setLetterSpacing] = useState(0);
  const [lineHeight, setLineHeight] = useState(1.4);
  const [textAlign, setTextAlign] = useState<TextAlign>('center');
  const [showSwipeArrow, setShowSwipeArrow] = useState(true);
  const [showSlideNumber, setShowSlideNumber] = useState(true);
  const [profileName, setProfileName] = useState('');
  const [profileIcon, setProfileIcon] = useState<'none' | 'instagram' | 'telegram'>('instagram');
  const [overlayPattern, setOverlayPattern] = useState<'none' | 'stars' | 'dots' | 'lines' | 'sparkles' | 'grid' | 'waves' | 'diamonds' | 'circles' | 'crosses' | 'triangles' | 'hearts' | 'moons'>('none');
  const [textShadowEnabled, setTextShadowEnabled] = useState(false);
  const [textShadowColor, setTextShadowColor] = useState('rgba(0,0,0,0.5)');
  const [textShadowBlur, setTextShadowBlur] = useState(8);
  const [textShadowOffsetY, setTextShadowOffsetY] = useState(4);
  const fileInputRef = useRef<HTMLInputElement>(null);
  // Store slideId when user clicks upload button (before file dialog opens)
  const uploadTargetSlideIdRef = useRef<number | null>(null);

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
  const getSlideTitleSize = (slide: Slide) => slide.titleSize ?? titleSize;
  const getSlideBodySize = (slide: Slide) => slide.bodySize ?? bodySize;

  const baseColors = [
    '#ffffff', '#000000', '#f5f5f5', '#374151', '#6b7280', '#9ca3af',
    '#ef4444', '#f97316', '#eab308', '#22c55e', '#14b8a6', '#3b82f6',
    '#8b5cf6', '#ec4899', '#f43f5e', '#1e3a5f', '#2d1b4e', '#1a1a2e'
  ];

  const handleSlideBackgroundChange = (value: string) => {
    // Capture slide ID from ref at call time
    const slideId = slidesRef.current[currentSlideIndexRef.current]?.id;
    if (!slideId) return;
    setSlides(prev => {
      const slide = prev.find(s => s.id === slideId);
      if (!slide) return prev;
      return updateSlide(prev, slide.id, { background: value, customImage: null });
    });
  };

  const handleSlideCustomImageChange = (imageData: string | null) => {
    // Capture slide ID from ref at call time (important for async FileReader)
    const slideId = slidesRef.current[currentSlideIndexRef.current]?.id;
    if (!slideId) return;
    setSlides(prev => {
      const slide = prev.find(s => s.id === slideId);
      if (!slide) return prev;
      // When uploading new image, set imageFit to 'contain' by default
      if (imageData) {
        return updateSlide(prev, slide.id, { customImage: imageData, imageFit: 'contain' });
      } else {
        return updateSlide(prev, slide.id, { customImage: imageData });
      }
    });
  };

  const handleSlideOffsetChange = (axis: 'offsetX' | 'offsetY', value: number) => {
    // Capture slide ID from ref at call time
    const slideId = slidesRef.current[currentSlideIndexRef.current]?.id;
    if (!slideId) return;
    setSlides(prev => {
      const slide = prev.find(s => s.id === slideId);
      if (!slide) return prev;
      return updateSlide(prev, slide.id, { [axis]: value });
    });
  };

  const handleSlideSizeChange = (sizeType: 'titleSize' | 'bodySize', value: number | undefined) => {
    const slideId = slidesRef.current[currentSlideIndexRef.current]?.id;
    if (!slideId) return;
    setSlides(prev => {
      const slide = prev.find(s => s.id === slideId);
      if (!slide) return prev;
      return updateSlide(prev, slide.id, { [sizeType]: value });
    });
  };

  const handleImageUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Use slideId captured when button was clicked (before file dialog opened)
    // This prevents photo from being applied to wrong slide if user navigates while dialog is open
    const slideId = uploadTargetSlideIdRef.current;
    if (!slideId) return;
    
    const reader = new FileReader();
    reader.onloadend = () => {
      const imageData = reader.result as string;
      // Use captured slideId directly instead of reading from refs
      setSlides(prev => {
        const slide = prev.find(s => s.id === slideId);
        if (!slide) return prev;
        return updateSlide(prev, slide.id, { customImage: imageData, imageFit: 'contain' });
      });
      // Clear the ref after upload
      uploadTargetSlideIdRef.current = null;
    };
    reader.readAsDataURL(file);
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

  // Auto-correct currentSlideIndex when it goes out of bounds
  useEffect(() => {
    if (slides.length > 0 && currentSlideIndex >= slides.length) {
      setCurrentSlideIndex(slides.length - 1);
    }
  }, [slides.length, currentSlideIndex]);

  const handleResplit = () => {
    // Preserve customImage, imageFit, background, and offsets by matching slides on content
    const oldSlides = slides;
    const newSlides = splitTextToSlides(sourceText);
    const usedOldSlideIds = new Set<number>();
    
    // Helper to normalize text for comparison
    const normalize = (text: string | undefined) => (text || '').trim().substring(0, 50).toLowerCase();
    
    const mergedSlides = newSlides.map((newSlide, idx) => {
      // Try to find old slide with matching heading
      let matchedOldSlide = oldSlides.find(old => 
        !usedOldSlideIds.has(old.id) && 
        old.heading && 
        newSlide.heading && 
        normalize(old.heading) === normalize(newSlide.heading)
      );
      
      // If no heading match, try matching on body text
      if (!matchedOldSlide) {
        matchedOldSlide = oldSlides.find(old => 
          !usedOldSlideIds.has(old.id) && 
          old.body && 
          newSlide.body && 
          normalize(old.body) === normalize(newSlide.body)
        );
      }
      
      // If no content match, fall back to index-based match
      if (!matchedOldSlide && oldSlides[idx] && !usedOldSlideIds.has(oldSlides[idx].id)) {
        matchedOldSlide = oldSlides[idx];
      }
      
      if (matchedOldSlide) {
        usedOldSlideIds.add(matchedOldSlide.id);
        return {
          ...newSlide,
          customImage: matchedOldSlide.customImage ?? newSlide.customImage,
          imageFit: matchedOldSlide.imageFit ?? newSlide.imageFit,
          background: matchedOldSlide.background ?? newSlide.background,
          offsetX: matchedOldSlide.offsetX ?? newSlide.offsetX,
          offsetY: matchedOldSlide.offsetY ?? newSlide.offsetY,
        };
      }
      return newSlide;
    });
    setSlides(mergedSlides);
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

  const getExportSize = () => {
    switch (aspectRatio) {
      case '1:1': return { width: 1080, height: 1080 };
      case '4:5': return { width: 1080, height: 1350 };
      case '9:16': return { width: 1080, height: 1920 };
      default: return { width: 1080, height: 1350 };
    }
  };

  const { width, height } = getCanvasSize();
  const exportSize = getExportSize();

  const handleUpdateSlide = (field: 'heading' | 'body', value: string) => {
    // Capture slide ID from ref for consistency
    const slideId = slidesRef.current[currentSlideIndexRef.current]?.id;
    if (!slideId) return;
    setSlides(prev => {
      const slide = prev.find(s => s.id === slideId);
      if (!slide) return prev;
      return updateSlide(prev, slide.id, { [field]: value });
    });
  };

  const handleAddSlide = () => {
    // Capture current slide ID from refs
    const currentSlideId = slidesRef.current[currentSlideIndexRef.current]?.id;
    if (!currentSlideId) return;
    
    setSlides(prev => {
      const slide = prev.find(s => s.id === currentSlideId);
      if (!slide) return prev;
      return addSlideAfter(prev, slide.id);
    });
    setCurrentSlideIndex(prev => prev + 1);
  };

  const handleRemoveSlide = () => {
    // Capture slide ID from refs
    const slideIdToRemove = slidesRef.current[currentSlideIndexRef.current]?.id;
    const currentLength = slidesRef.current.length;
    if (!slideIdToRemove || currentLength <= 1) return;
    
    setSlides(prev => {
      if (prev.length <= 1) return prev;
      return removeSlide(prev, slideIdToRemove);
    });
    // Index will be auto-corrected by the useEffect if out of bounds
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

  const waitForNextFrame = () => new Promise<void>(resolve => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => resolve());
    });
  });

  const parseColor = (hex: string): { r: number; g: number; b: number } => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : { r: 255, g: 255, b: 255 };
  };

  const loadImage = (src: string): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
      const img = document.createElement('img') as HTMLImageElement;
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });
  };

  const measureTextWithSpacing = (ctx: CanvasRenderingContext2D, text: string, letterSpacingPx: number): number => {
    if (letterSpacingPx <= 0) {
      return ctx.measureText(text).width;
    }
    let totalWidth = 0;
    for (let i = 0; i < text.length; i++) {
      totalWidth += ctx.measureText(text[i]).width;
      if (i < text.length - 1) {
        totalWidth += letterSpacingPx;
      }
    }
    return totalWidth;
  };
  
  const wrapTextWithSpacing = (ctx: CanvasRenderingContext2D, text: string, maxWidth: number, letterSpacingPx: number): string[] => {
    const lines: string[] = [];
    const paragraphs = text.split('\n');
    
    for (const paragraph of paragraphs) {
      if (paragraph.trim() === '') {
        lines.push('');
        continue;
      }
      
      const words = paragraph.split(' ');
      let currentLine = '';
      
      for (const word of words) {
        const testLine = currentLine ? `${currentLine} ${word}` : word;
        const lineWidth = measureTextWithSpacing(ctx, testLine, letterSpacingPx);
        
        if (lineWidth > maxWidth && currentLine) {
          lines.push(currentLine);
          currentLine = word;
        } else {
          currentLine = testLine;
        }
      }
      
      if (currentLine) {
        lines.push(currentLine);
      }
    }
    
    return lines;
  };

  const parseGradient = (ctx: CanvasRenderingContext2D, gradientStr: string, w: number, h: number): CanvasGradient | string => {
    if (gradientStr.startsWith('#')) {
      return gradientStr;
    }
    
    if (gradientStr.startsWith('rgb')) {
      return gradientStr;
    }
    
    const linearMatch = gradientStr.match(/linear-gradient\((\d+)deg,\s*(.+)\)/);
    if (linearMatch) {
      const angle = parseInt(linearMatch[1]);
      const rad = (angle - 90) * Math.PI / 180;
      const x1 = w/2 - Math.cos(rad) * w/2;
      const y1 = h/2 - Math.sin(rad) * h/2;
      const x2 = w/2 + Math.cos(rad) * w/2;
      const y2 = h/2 + Math.sin(rad) * h/2;
      
      const gradient = ctx.createLinearGradient(x1, y1, x2, y2);
      const colorPart = linearMatch[2];
      const colorStops = colorPart.match(/(#[a-fA-F0-9]{3,6}|rgba?\([^)]+\))\s*(\d+%)?/g) || [];
      
      colorStops.forEach((stopStr, i) => {
        const colorMatch = stopStr.match(/(#[a-fA-F0-9]{3,6}|rgba?\([^)]+\))/);
        const percentMatch = stopStr.match(/(\d+)%/);
        if (colorMatch) {
          const position = percentMatch 
            ? parseInt(percentMatch[1]) / 100 
            : i / Math.max(colorStops.length - 1, 1);
          gradient.addColorStop(position, colorMatch[1]);
        }
      });
      
      return gradient;
    }
    
    const radialMatch = gradientStr.match(/radial-gradient\((.+)\)/);
    if (radialMatch) {
      const gradient = ctx.createRadialGradient(w/2, h/2, 0, w/2, h/2, Math.max(w, h)/2);
      const content = radialMatch[1];
      const colorStops = content.match(/(#[a-fA-F0-9]{3,6}|rgba?\([^)]+\))\s*(\d+%)?/g) || [];
      
      colorStops.forEach((stopStr, i) => {
        const colorMatch = stopStr.match(/(#[a-fA-F0-9]{3,6}|rgba?\([^)]+\))/);
        const percentMatch = stopStr.match(/(\d+)%/);
        if (colorMatch) {
          const position = percentMatch 
            ? parseInt(percentMatch[1]) / 100 
            : i / Math.max(colorStops.length - 1, 1);
          gradient.addColorStop(position, colorMatch[1]);
        }
      });
      
      return gradient;
    }
    
    return '#1a1a2e';
  };
  
  const drawTextWithLetterSpacing = (
    ctx: CanvasRenderingContext2D, 
    text: string, 
    x: number, 
    y: number, 
    letterSpacingPx: number, 
    align: 'left' | 'center' | 'right',
    maxWidth: number
  ) => {
    const savedAlign = ctx.textAlign;
    ctx.textAlign = 'left';
    
    if (letterSpacingPx <= 0) {
      let adjustedX = x;
      const textWidth = ctx.measureText(text).width;
      if (align === 'center') {
        adjustedX = x - textWidth / 2;
      } else if (align === 'right') {
        adjustedX = x - textWidth;
      }
      ctx.fillText(text, adjustedX, y);
      ctx.textAlign = savedAlign;
      return;
    }
    
    const totalWidth = measureTextWithSpacing(ctx, text, letterSpacingPx);
    
    let startX = x;
    if (align === 'center') {
      startX = x - totalWidth / 2;
    } else if (align === 'right') {
      startX = x - totalWidth;
    }
    
    let currentX = startX;
    for (let i = 0; i < text.length; i++) {
      ctx.fillText(text[i], currentX, y);
      currentX += ctx.measureText(text[i]).width + letterSpacingPx;
    }
    
    ctx.textAlign = savedAlign;
  };

  const drawOverlayPattern = (ctx: CanvasRenderingContext2D, pattern: string, w: number, h: number, color: string) => {
    const { r, g, b } = parseColor(color);
    ctx.globalAlpha = 0.15;
    
    if (pattern === 'dots') {
      const spacing = 54;
      const radius = 2.7;
      ctx.fillStyle = color;
      for (let x = spacing/2; x < w; x += spacing) {
        for (let y = spacing/2; y < h; y += spacing) {
          ctx.beginPath();
          ctx.arc(x, y, radius, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    } else if (pattern === 'stars') {
      const positions = [
        [54, 81], [108, 189], [243, 108], [351, 216], [432, 54],
        [540, 135], [162, 270], [270, 351], [486, 324], [594, 270],
        [675, 405], [81, 486], [756, 540], [405, 675], [189, 594]
      ];
      ctx.fillStyle = color;
      for (const [x, y] of positions) {
        if (x < w && y < h) {
          ctx.beginPath();
          ctx.arc(x, y, 4, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    } else if (pattern === 'hearts') {
      const spacing = 95;
      ctx.fillStyle = color;
      for (let x = spacing/2; x < w; x += spacing) {
        for (let y = spacing/2; y < h; y += spacing) {
          ctx.beginPath();
          ctx.arc(x - 4, y - 4, 5, 0, Math.PI * 2);
          ctx.fill();
          ctx.beginPath();
          ctx.arc(x + 4, y - 4, 5, 0, Math.PI * 2);
          ctx.fill();
          ctx.beginPath();
          ctx.moveTo(x - 9, y - 2);
          ctx.lineTo(x, y + 8);
          ctx.lineTo(x + 9, y - 2);
          ctx.fill();
        }
      }
    } else if (pattern === 'sparkles') {
      const positions = [
        [0.25, 0.25], [0.75, 0.20], [0.50, 0.80], [0.15, 0.70], [0.85, 0.60],
        [0.40, 0.45], [0.65, 0.65], [0.10, 0.35], [0.90, 0.85], [0.55, 0.15]
      ];
      ctx.fillStyle = '#fbbf24';
      for (const [px, py] of positions) {
        const x = px * w;
        const y = py * h;
        ctx.beginPath();
        ctx.arc(x, y, 6, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (pattern === 'grid') {
      const spacing = 81;
      ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, 0.1)`;
      ctx.lineWidth = 2.7;
      for (let x = 0; x < w; x += spacing) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }
      for (let y = 0; y < h; y += spacing) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }
    } else if (pattern === 'lines') {
      const spacing = 54;
      ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, 0.15)`;
      ctx.lineWidth = 2.7;
      for (let i = -h; i < w + h; i += spacing) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i + h, h);
        ctx.stroke();
      }
    } else if (pattern === 'circles') {
      const spacing = 135;
      ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, 0.08)`;
      ctx.lineWidth = 2.7;
      for (let x = spacing/2; x < w; x += spacing) {
        for (let y = spacing/2; y < h; y += spacing) {
          ctx.beginPath();
          ctx.arc(x, y, 54, 0, Math.PI * 2);
          ctx.stroke();
        }
      }
    } else if (pattern === 'diamonds') {
      const spacing = 108;
      ctx.fillStyle = `rgba(${r}, ${g}, ${b}, 0.1)`;
      for (let x = 0; x < w; x += spacing) {
        for (let y = 0; y < h; y += spacing) {
          ctx.beginPath();
          ctx.moveTo(x + spacing/2, y);
          ctx.lineTo(x + spacing, y + spacing/2);
          ctx.lineTo(x + spacing/2, y + spacing);
          ctx.lineTo(x, y + spacing/2);
          ctx.closePath();
          ctx.fill();
        }
      }
    } else if (pattern === 'moons') {
      const spacing = 122;
      ctx.fillStyle = `rgba(${r}, ${g}, ${b}, 0.1)`;
      for (let x = spacing/2; x < w; x += spacing) {
        for (let y = spacing/2; y < h; y += spacing) {
          ctx.beginPath();
          ctx.arc(x, y, 22, 0, Math.PI * 2);
          ctx.fill();
          ctx.save();
          ctx.globalCompositeOperation = 'destination-out';
          ctx.beginPath();
          ctx.arc(x + 8, y - 8, 18, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
      }
    } else if (pattern === 'crosses') {
      const spacing = 68;
      ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, 0.1)`;
      ctx.lineWidth = 5;
      for (let x = spacing/2; x < w; x += spacing) {
        for (let y = spacing/2; y < h; y += spacing) {
          ctx.beginPath();
          ctx.moveTo(x - 8, y);
          ctx.lineTo(x + 8, y);
          ctx.moveTo(x, y - 8);
          ctx.lineTo(x, y + 8);
          ctx.stroke();
        }
      }
    } else if (pattern === 'triangles') {
      const spacing = 108;
      ctx.fillStyle = `rgba(${r}, ${g}, ${b}, 0.08)`;
      for (let x = 0; x < w; x += spacing) {
        for (let y = 0; y < h; y += spacing) {
          ctx.beginPath();
          ctx.moveTo(x + spacing/2, y);
          ctx.lineTo(x + spacing, y + spacing);
          ctx.lineTo(x, y + spacing);
          ctx.closePath();
          ctx.fill();
        }
      }
    } else if (pattern === 'waves') {
      ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, 0.08)`;
      ctx.lineWidth = 2.7;
      const waveHeight = 20;
      const waveLength = 60;
      for (let y = waveHeight; y < h; y += 54) {
        ctx.beginPath();
        for (let x = 0; x < w; x += 1) {
          const yPos = y + Math.sin(x / waveLength * Math.PI * 2) * waveHeight;
          if (x === 0) ctx.moveTo(x, yPos);
          else ctx.lineTo(x, yPos);
        }
        ctx.stroke();
      }
    }
    
    ctx.globalAlpha = 1;
  };

  const renderSlideToCanvas = async (slide: Slide, slideIndex: number): Promise<HTMLCanvasElement> => {
    const { width: expWidth, height: expHeight } = exportSize;
    const scaleFactor = expWidth / width;
    
    const canvas = document.createElement('canvas');
    canvas.width = expWidth;
    canvas.height = expHeight;
    const ctx = canvas.getContext('2d')!;
    
    const isTitleSlide = slide.type === 'title';
    const slideCustomImage = getSlideCustomImage(slide);
    const slideBackground = getSlideBackground(slide);
    const slideImageFit = getSlideImageFit(slide);
    const offsetX = getSlideOffsetX(slide) * scaleFactor;
    const offsetY = getSlideOffsetY(slide) * scaleFactor;
    
    const expPadding = padding * scaleFactor;
    const slideTitleSz = getSlideTitleSize(slide);
    const slideBodySz = getSlideBodySize(slide);
    const expTitleSize = (isTitleSlide ? slideTitleSz : slideTitleSz * 0.7) * scaleFactor;
    const expBodySize = slideBodySz * scaleFactor;

    await document.fonts.ready;

    if (slideCustomImage) {
      try {
        const img = await loadImage(slideCustomImage);
        ctx.fillStyle = '#1a1a2e';
        ctx.fillRect(0, 0, expWidth, expHeight);
        
        if (slideImageFit === 'contain') {
          const scale = Math.min(expWidth / img.width, expHeight / img.height);
          const w = img.width * scale;
          const h = img.height * scale;
          const x = (expWidth - w) / 2;
          const y = (expHeight - h) / 2;
          ctx.drawImage(img, x, y, w, h);
        } else {
          const scale = Math.max(expWidth / img.width, expHeight / img.height);
          const w = img.width * scale;
          const h = img.height * scale;
          const x = (expWidth - w) / 2;
          const y = (expHeight - h) / 2;
          ctx.drawImage(img, x, y, w, h);
        }
      } catch (e) {
        ctx.fillStyle = '#1a1a2e';
        ctx.fillRect(0, 0, expWidth, expHeight);
      }
    } else {
      const bg = parseGradient(ctx, slideBackground, expWidth, expHeight);
      if (typeof bg === 'string') {
        ctx.fillStyle = bg;
      } else {
        ctx.fillStyle = bg;
      }
      ctx.fillRect(0, 0, expWidth, expHeight);
    }

    if (overlayPattern !== 'none') {
      drawOverlayPattern(ctx, overlayPattern, expWidth, expHeight, textColor);
    }

    const contentX = expPadding + offsetX;
    let contentY = expPadding + offsetY;
    const contentWidth = expWidth - expPadding * 2;
    const expLetterSpacing = letterSpacing * scaleFactor;
    
    // Calculate reserved footer height
    let footerReservedHeight = 12 * scaleFactor; // base bottom margin
    if (profileName) {
      footerReservedHeight += 20 * scaleFactor; // username height
    }
    if (showSwipeArrow && slideIndex < slides.length - 1) {
      footerReservedHeight += profileName ? 24 * scaleFactor : 16 * scaleFactor; // arrow height
    }
    footerReservedHeight += 16 * scaleFactor; // safety margin between text and footer
    
    const availableHeight = expHeight - expPadding - footerReservedHeight;
    
    // Variables for adaptive body sizing (used in title slides)
    let adaptiveBodySize = expBodySize;
    let adaptiveBodyLines: string[] = [];
    
    if (isTitleSlide) {
      ctx.font = `600 ${expTitleSize}px '${titleFont}', serif`;
      const headingLines = slide.heading ? wrapTextWithSpacing(ctx, slide.heading, contentWidth, expLetterSpacing) : [];
      
      // Real block height accounts for baseline offset (0.85) used in rendering
      const headingHeight = headingLines.length > 0 
        ? (headingLines.length - 1) * expTitleSize * lineHeight + expTitleSize 
        : 0;
      const gapHeight = slide.body && headingLines.length > 0 ? 20 * scaleFactor : 0;
      
      // Calculate available height for body text
      const availableForBody = availableHeight - headingHeight - gapHeight;
      
      // Adaptive body sizing: reduce font size if text doesn't fit
      const minBodySize = 14 * scaleFactor;
      adaptiveBodySize = expBodySize;
      
      if (slide.body && availableForBody > 0) {
        // Try progressively smaller font sizes until text fits
        while (adaptiveBodySize >= minBodySize) {
          ctx.font = `400 ${adaptiveBodySize}px '${bodyFont}', sans-serif`;
          adaptiveBodyLines = wrapTextWithSpacing(ctx, slide.body, contentWidth, expLetterSpacing);
          
          const bodyHeight = adaptiveBodyLines.length > 0 
            ? (adaptiveBodyLines.length - 1) * adaptiveBodySize * lineHeight + adaptiveBodySize 
            : 0;
          
          if (bodyHeight <= availableForBody) {
            break; // Text fits!
          }
          
          // Reduce font size by 2px and try again
          adaptiveBodySize -= 2 * scaleFactor;
        }
        
        // If still doesn't fit at minimum size, truncate lines
        if (adaptiveBodySize < minBodySize) {
          adaptiveBodySize = minBodySize;
          ctx.font = `400 ${adaptiveBodySize}px '${bodyFont}', sans-serif`;
          adaptiveBodyLines = wrapTextWithSpacing(ctx, slide.body, contentWidth, expLetterSpacing);
          
          // Calculate max lines that fit
          const singleLineHeight = adaptiveBodySize * lineHeight;
          const maxLines = Math.floor((availableForBody + adaptiveBodySize * (lineHeight - 1)) / singleLineHeight);
          
          if (maxLines <= 0) {
            // No space for body text at all - skip it
            adaptiveBodyLines = [];
          } else if (adaptiveBodyLines.length > maxLines) {
            adaptiveBodyLines = adaptiveBodyLines.slice(0, maxLines);
            // Add ellipsis to last line
            adaptiveBodyLines[maxLines - 1] = adaptiveBodyLines[maxLines - 1].replace(/\s*$/, '…');
          }
        }
      } else if (slide.body && availableForBody <= 0) {
        // No space for body at all when heading is too large
        adaptiveBodyLines = [];
      }
      
      const bodyHeight = adaptiveBodyLines.length > 0 
        ? (adaptiveBodyLines.length - 1) * adaptiveBodySize * lineHeight + adaptiveBodySize 
        : 0;
      // Only add gap if body will actually be rendered
      const effectiveGap = adaptiveBodyLines.length > 0 ? gapHeight : 0;
      const totalTextHeight = headingHeight + effectiveGap + bodyHeight;
      
      // Center within available area (respecting footer)
      contentY = expPadding + (availableHeight - totalTextHeight) / 2 + offsetY;
      
      // Ensure content doesn't go above padding
      if (contentY < expPadding + offsetY) {
        contentY = expPadding + offsetY;
      }
    }

    ctx.textAlign = textAlign;
    const textX = textAlign === 'center' ? expWidth / 2 + offsetX : 
                  textAlign === 'right' ? expWidth - expPadding + offsetX : 
                  contentX;
    
    if (textShadowEnabled) {
      ctx.shadowColor = textShadowColor;
      ctx.shadowBlur = textShadowBlur * scaleFactor;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = textShadowOffsetY * scaleFactor;
    }
    
    if (slide.heading) {
      ctx.font = `600 ${expTitleSize}px '${titleFont}', serif`;
      ctx.fillStyle = textColor;
      
      const lines = wrapTextWithSpacing(ctx, slide.heading, contentWidth, expLetterSpacing);
      lines.forEach((line, i) => {
        const y = contentY + i * expTitleSize * lineHeight + expTitleSize * 0.85;
        drawTextWithLetterSpacing(ctx, line, textX, y, expLetterSpacing, textAlign, contentWidth);
      });
      // Use consistent height formula: (n-1) * fontSize * lineHeight + fontSize
      const headingBlockHeight = lines.length > 0 
        ? (lines.length - 1) * expTitleSize * lineHeight + expTitleSize 
        : 0;
      // For title slides, only add gap if body will actually be rendered (adaptiveBodyLines not empty)
      const shouldAddGap = isTitleSlide 
        ? (slide.body && adaptiveBodyLines.length > 0)
        : slide.body;
      contentY += headingBlockHeight + (shouldAddGap ? 20 * scaleFactor : 0);
    }

    // Determine if body should be rendered
    const shouldRenderBody = isTitleSlide 
      ? (slide.body && adaptiveBodyLines.length > 0)  // Title slides: only if adaptive lines exist
      : !!slide.body;  // Content slides: always if body exists

    if (shouldRenderBody) {
      // For title slides, use adaptive sizing; for content slides, use standard sizing
      const actualBodySize = isTitleSlide ? adaptiveBodySize : expBodySize;
      const lines = isTitleSlide ? adaptiveBodyLines : wrapTextWithSpacing(ctx, slide.body!, contentWidth, expLetterSpacing);
      
      ctx.font = `400 ${actualBodySize}px '${bodyFont}', sans-serif`;
      ctx.fillStyle = textColor;
      ctx.globalAlpha = 0.95;
      
      lines.forEach((line, i) => {
        const y = contentY + i * actualBodySize * lineHeight + actualBodySize * 0.85;
        drawTextWithLetterSpacing(ctx, line, textX, y, expLetterSpacing, textAlign, contentWidth);
      });
      ctx.globalAlpha = 1;
    }
    
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;

    if (showSlideNumber && slides.length > 1) {
      ctx.font = `400 ${14 * scaleFactor}px '${bodyFont}', sans-serif`;
      ctx.fillStyle = textColor;
      ctx.globalAlpha = 0.7;
      ctx.textAlign = 'right';
      ctx.fillText(`${slideIndex + 1}/${slides.length}`, expWidth - 12 * scaleFactor, 12 * scaleFactor + 14 * scaleFactor);
      ctx.globalAlpha = 1;
    }

    const footerY = expHeight - 12 * scaleFactor;
    ctx.textAlign = 'center';
    
    if (showSwipeArrow && slideIndex < slides.length - 1) {
      const arrowY = profileName ? footerY - 24 * scaleFactor : footerY - 8 * scaleFactor;
      ctx.globalAlpha = 0.5;
      ctx.fillStyle = textColor;
      ctx.fillRect(expWidth/2 - 30 * scaleFactor, arrowY - 1 * scaleFactor, 60 * scaleFactor, 2 * scaleFactor);
      ctx.beginPath();
      ctx.moveTo(expWidth/2 + 30 * scaleFactor, arrowY);
      ctx.lineTo(expWidth/2 + 38 * scaleFactor, arrowY);
      ctx.lineTo(expWidth/2 + 30 * scaleFactor, arrowY - 5 * scaleFactor);
      ctx.lineTo(expWidth/2 + 30 * scaleFactor, arrowY + 5 * scaleFactor);
      ctx.lineTo(expWidth/2 + 38 * scaleFactor, arrowY);
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    if (profileName) {
      ctx.font = `400 ${14 * scaleFactor}px '${bodyFont}', sans-serif`;
      ctx.fillStyle = textColor;
      ctx.globalAlpha = 0.7;
      
      const iconSize = 14 * scaleFactor;
      const textMetrics = ctx.measureText(`@${profileName}`);
      const textWidth = textMetrics.width;
      const gap = 4 * scaleFactor;
      const totalWidth = (profileIcon !== 'none' ? iconSize + gap : 0) + textWidth;
      const startX = expWidth / 2 - totalWidth / 2;
      
      if (profileIcon === 'instagram') {
        ctx.save();
        ctx.translate(startX, footerY - iconSize + 2 * scaleFactor);
        ctx.scale(iconSize / 24, iconSize / 24);
        ctx.globalAlpha = 0.56;
        const instagramPath = new Path2D('M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z');
        ctx.fill(instagramPath);
        ctx.restore();
        ctx.globalAlpha = 0.7;
      } else if (profileIcon === 'telegram') {
        ctx.save();
        ctx.translate(startX, footerY - iconSize + 2 * scaleFactor);
        ctx.scale(iconSize / 24, iconSize / 24);
        ctx.globalAlpha = 0.56;
        const telegramPath = new Path2D('M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z');
        ctx.fill(telegramPath);
        ctx.restore();
        ctx.globalAlpha = 0.7;
      }
      
      const textX = profileIcon !== 'none' ? startX + iconSize + gap : startX;
      ctx.textAlign = 'left';
      ctx.fillText(`@${profileName}`, textX, footerY);
      ctx.globalAlpha = 1;
    }

    return canvas;
  };

  const isMobile = typeof navigator !== 'undefined' && /iphone|ipad|ipod|android/i.test(navigator.userAgent);
  const canShare = typeof navigator !== 'undefined' && 'share' in navigator && 'canShare' in navigator && isMobile;
  const isIOS = typeof navigator !== 'undefined' && /iphone|ipad|ipod/i.test(navigator.userAgent);
  const supportsFilePicker = typeof window !== 'undefined' && 'showSaveFilePicker' in window;

  const saveFileWithPicker = async (blob: Blob, suggestedName: string, fileType: string): Promise<'saved' | 'cancelled' | 'unsupported' | 'error'> => {
    if (!supportsFilePicker) return 'unsupported';
    
    try {
      const options = {
        suggestedName,
        types: [{
          description: fileType === 'image/png' ? 'PNG Image' : 'ZIP Archive',
          accept: { [fileType]: fileType === 'image/png' ? ['.png'] : ['.zip'] }
        }]
      };
      
      const handle = await (window as any).showSaveFilePicker(options);
      const writable = await handle.createWritable();
      await writable.write(blob);
      await writable.close();
      return 'saved';
    } catch (error: any) {
      if (error?.name === 'AbortError') {
        return 'cancelled';
      }
      console.error('File picker failed:', error);
      return 'error';
    }
  };

  const downloadViaLink = (blob: Blob, fileName: string) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const handleExportAll = async () => {
    setIsExporting(true);
    setExportProgress(0);

    try {
      // Step 1: Generate all PNG files
      const pngFiles: File[] = [];
      const blobs: Blob[] = [];
      
      for (let i = 0; i < slides.length; i++) {
        try {
          const canvas = await renderSlideToCanvas(slides[i], i);
          const fileName = `slide-${String(i + 1).padStart(2, '0')}.png`;
          
          let blob = await new Promise<Blob | null>((resolve) => 
            canvas.toBlob((b) => resolve(b), 'image/png')
          );
          
          if (!blob) {
            const dataUrl = canvas.toDataURL('image/png');
            const base64 = dataUrl.split(',')[1];
            const binaryString = atob(base64);
            const bytes = new Uint8Array(binaryString.length);
            for (let j = 0; j < binaryString.length; j++) {
              bytes[j] = binaryString.charCodeAt(j);
            }
            blob = new Blob([bytes], { type: 'image/png' });
          }
          
          if (blob) {
            blobs.push(blob);
            pngFiles.push(new File([blob], fileName, { type: 'image/png' }));
          }
        } catch (slideError) {
          console.error(`Error rendering slide ${i + 1}:`, slideError);
        }

        setExportProgress(Math.round(((i + 1) / slides.length) * 100));
      }

      // Step 2: iOS - use Web Share API (works great with multiple files)
      if (isIOS && canShare && pngFiles.length > 0) {
        const shareData = { files: pngFiles };
        if (navigator.canShare(shareData)) {
          try {
            await navigator.share(shareData);
            toast({
              title: "Готово!",
              description: `${pngFiles.length} слайдов сохранены в галерею`,
            });
            return;
          } catch (shareError: any) {
            if (shareError?.name !== 'AbortError') {
              console.log('Share failed, trying ZIP fallback...');
            } else {
              return; // User cancelled
            }
          }
        }
      }
      
      // Step 3: ZIP for Android and desktop
      const zip = new JSZip();
      const folder = zip.folder('slides');
      
      for (let i = 0; i < blobs.length; i++) {
        const fileName = `slide-${String(i + 1).padStart(2, '0')}.png`;
        if (folder) {
          folder.file(fileName, blobs[i]);
        }
      }
      
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const zipFileName = `carousel-${Date.now()}.zip`;
      
      // Desktop: File System Access API (Chrome/Edge) - opens "Save As" dialog
      if (!isMobile && supportsFilePicker) {
        const result = await saveFileWithPicker(zipBlob, zipFileName, 'application/zip');
        if (result === 'saved') {
          toast({
            title: "Готово!",
            description: `${slides.length} слайдов сохранены`,
          });
          return;
        }
        if (result === 'cancelled') {
          return;
        }
      }
      
      // Fallback: direct download via link (for Firefox/Safari or if picker failed)
      downloadViaLink(zipBlob, zipFileName);
      
      toast({
        title: "Готово!",
        description: `${slides.length} слайдов скачаны в папку Загрузки`,
      });
    } catch (error) {
      console.error('Export failed:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось сохранить слайды. Попробуйте ещё раз",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
      setExportProgress(0);
    }
  };

  const handleExportCurrent = async () => {
    setIsExporting(true);
    try {
      const canvas = await renderSlideToCanvas(currentSlide, currentSlideIndex);
      const blob = await new Promise<Blob | null>((resolve) => 
        canvas.toBlob((b) => resolve(b), 'image/png')
      );
      if (!blob) {
        console.error('Failed to create blob from canvas');
        toast({
          title: "Ошибка",
          description: "Не удалось создать изображение",
          variant: "destructive",
        });
        return;
      }
      const fileName = `slide-${currentSlideIndex + 1}.png`;
      
      // Mobile: Web Share API
      if (isMobile && canShare) {
        const file = new File([blob], fileName, { type: 'image/png' });
        const shareData = { files: [file] };
        if (navigator.canShare(shareData)) {
          try {
            await navigator.share(shareData);
            toast({
              title: "Готово!",
              description: "Слайд сохранён",
            });
            return;
          } catch (shareError: any) {
            if (shareError?.name === 'AbortError') {
              return;
            }
            console.log('Share failed, falling back to download');
          }
        }
      }
      
      // Desktop: File System Access API (Chrome/Edge) - opens "Save As" dialog
      if (!isMobile && supportsFilePicker) {
        const result = await saveFileWithPicker(blob, fileName, 'image/png');
        if (result === 'saved') {
          toast({
            title: "Готово!",
            description: "Слайд сохранён",
          });
          return;
        }
        if (result === 'cancelled') {
          return;
        }
      }
      
      // Fallback: direct download via link (for Firefox/Safari or if picker failed)
      downloadViaLink(blob, fileName);
      toast({
        title: "Готово!",
        description: "Слайд скачан в папку Загрузки",
      });
    } catch (error) {
      console.error('Export failed:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось сохранить слайд. Попробуйте ещё раз",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleShareCurrent = async () => {
    if (!canShare) return;
    
    setIsExporting(true);
    try {
      const canvas = await renderSlideToCanvas(currentSlide, currentSlideIndex);
      const blob = await new Promise<Blob | null>((resolve) => 
        canvas.toBlob((b) => resolve(b), 'image/png')
      );
      if (!blob) {
        console.error('Failed to create blob from canvas');
        return;
      }
      const file = new File([blob], `slide-${currentSlideIndex + 1}.png`, { type: 'image/png' });
      
      if (navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file] });
      }
    } catch (error) {
      console.log('Share cancelled or failed');
    } finally {
      setIsExporting(false);
    }
  };

  // Touch handlers for swipe navigation
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchEndX.current = null;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (touchStartX.current === null || touchEndX.current === null) return;
    
    const diff = touchStartX.current - touchEndX.current;
    const minSwipeDistance = 50;

    if (Math.abs(diff) > minSwipeDistance) {
      if (diff > 0 && currentSlideIndex < slides.length - 1) {
        // Swipe left - next slide
        setCurrentSlideIndex(currentSlideIndex + 1);
      } else if (diff < 0 && currentSlideIndex > 0) {
        // Swipe right - previous slide
        setCurrentSlideIndex(currentSlideIndex - 1);
      }
    }

    touchStartX.current = null;
    touchEndX.current = null;
  };

  const renderSlidePreview = (slide: Slide, isMain: boolean = false, slideIndex?: number, customScale?: number) => {
    const scale = isMain ? 1 : (customScale ?? 0.2);
    const isTitleSlide = slide.type === 'title';
    const alignItems = textAlign === 'left' ? 'flex-start' : textAlign === 'right' ? 'flex-end' : 'center';
    const displayIndex = slideIndex ?? currentSlideIndex;
    
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
          position: 'relative',
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
                fontSize: isTitleSlide ? `${getSlideTitleSize(slide)}px` : `${getSlideTitleSize(slide) * 0.7}px`,
                color: textColor,
                lineHeight: lineHeight,
                letterSpacing: `${letterSpacing}px`,
                marginBottom: slide.body ? '20px' : 0,
                fontWeight: 600,
                width: '100%',
                textAlign: textAlign,
                whiteSpace: 'pre-line',
                textShadow: textShadowEnabled ? `0 ${textShadowOffsetY}px ${textShadowBlur}px ${textShadowColor}` : 'none',
              }}
            >
              {slide.heading}
            </div>
          )}
          {slide.body && (
            <div
              style={{
                fontFamily: bodyFont,
                fontSize: `${getSlideBodySize(slide)}px`,
                color: textColor,
                lineHeight: lineHeight,
                letterSpacing: `${letterSpacing}px`,
                opacity: 0.95,
                width: '100%',
                textAlign: textAlign,
                whiteSpace: 'pre-line',
                textShadow: textShadowEnabled ? `0 ${textShadowOffsetY}px ${textShadowBlur}px ${textShadowColor}` : 'none',
              }}
            >
              {slide.body}
            </div>
          )}
        </div>

        {/* Overlay pattern */}
        {overlayPattern !== 'none' && (
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            pointerEvents: 'none',
            opacity: 0.15,
            background: overlayPattern === 'stars' 
              ? `radial-gradient(2px 2px at 20px 30px, ${textColor}, transparent), radial-gradient(2px 2px at 40px 70px, ${textColor}, transparent), radial-gradient(1px 1px at 90px 40px, ${textColor}, transparent), radial-gradient(2px 2px at 130px 80px, ${textColor}, transparent), radial-gradient(1px 1px at 160px 20px, ${textColor}, transparent), radial-gradient(2px 2px at 200px 50px, ${textColor}, transparent), radial-gradient(1px 1px at 60px 100px, ${textColor}, transparent), radial-gradient(2px 2px at 100px 130px, ${textColor}, transparent), radial-gradient(1px 1px at 180px 120px, ${textColor}, transparent), radial-gradient(2px 2px at 220px 100px, ${textColor}, transparent), radial-gradient(2px 2px at 250px 150px, ${textColor}, transparent), radial-gradient(1px 1px at 30px 180px, ${textColor}, transparent), radial-gradient(2px 2px at 280px 200px, ${textColor}, transparent), radial-gradient(1px 1px at 150px 250px, ${textColor}, transparent), radial-gradient(2px 2px at 70px 220px, ${textColor}, transparent)`
              : overlayPattern === 'dots'
              ? `radial-gradient(circle, ${textColor} 2px, transparent 2px)`
              : overlayPattern === 'lines'
              ? `repeating-linear-gradient(45deg, transparent, transparent 10px, ${textColor} 10px, ${textColor} 12px)`
              : overlayPattern === 'sparkles'
              ? 'radial-gradient(4px 4px at 25% 25%, #fbbf24, transparent), radial-gradient(3px 3px at 75% 20%, #fbbf24, transparent), radial-gradient(4px 4px at 50% 80%, #fbbf24, transparent), radial-gradient(3px 3px at 15% 70%, #fbbf24, transparent), radial-gradient(4px 4px at 85% 60%, #fbbf24, transparent), radial-gradient(3px 3px at 40% 45%, #fbbf24, transparent), radial-gradient(4px 4px at 65% 65%, #fbbf24, transparent), radial-gradient(3px 3px at 10% 35%, #fbbf24, transparent), radial-gradient(4px 4px at 90% 85%, #fbbf24, transparent), radial-gradient(3px 3px at 55% 15%, #fbbf24, transparent)'
              : overlayPattern === 'grid'
              ? `linear-gradient(${textColor} 1px, transparent 1px), linear-gradient(90deg, ${textColor} 1px, transparent 1px)`
              : overlayPattern === 'waves'
              ? `repeating-radial-gradient(circle at 0 50%, transparent, transparent 20px, ${textColor} 20px, ${textColor} 22px, transparent 22px, transparent 40px)`
              : overlayPattern === 'diamonds'
              ? `linear-gradient(45deg, ${textColor} 25%, transparent 25%), linear-gradient(-45deg, ${textColor} 25%, transparent 25%), linear-gradient(45deg, transparent 75%, ${textColor} 75%), linear-gradient(-45deg, transparent 75%, ${textColor} 75%)`
              : overlayPattern === 'circles'
              ? `radial-gradient(circle at 50% 50%, transparent 15px, ${textColor} 16px, ${textColor} 18px, transparent 19px)`
              : overlayPattern === 'crosses'
              ? `linear-gradient(${textColor} 2px, transparent 2px), linear-gradient(90deg, ${textColor} 2px, transparent 2px)`
              : overlayPattern === 'triangles'
              ? `linear-gradient(60deg, ${textColor} 25%, transparent 25.5%), linear-gradient(-60deg, ${textColor} 25%, transparent 25.5%), linear-gradient(60deg, transparent 75%, ${textColor} 75.5%), linear-gradient(-60deg, transparent 75%, ${textColor} 75.5%)`
              : overlayPattern === 'hearts'
              ? `radial-gradient(circle at 30% 30%, ${textColor} 5px, transparent 5px), radial-gradient(circle at 70% 30%, ${textColor} 5px, transparent 5px), linear-gradient(135deg, transparent 45%, ${textColor} 45%, ${textColor} 55%, transparent 55%), linear-gradient(225deg, transparent 45%, ${textColor} 45%, ${textColor} 55%, transparent 55%)`
              : overlayPattern === 'moons'
              ? `radial-gradient(circle at 35% 50%, ${textColor} 10px, transparent 10px), radial-gradient(circle at 55% 50%, transparent 8px, ${textColor} 8px, ${textColor} 11px, transparent 11px)`
              : 'none',
            backgroundSize: overlayPattern === 'dots' ? '25px 25px' 
              : overlayPattern === 'grid' ? '35px 35px'
              : overlayPattern === 'diamonds' ? '30px 30px'
              : overlayPattern === 'circles' ? '60px 60px'
              : overlayPattern === 'crosses' ? '30px 30px'
              : overlayPattern === 'triangles' ? '35px 35px'
              : overlayPattern === 'hearts' ? '40px 40px'
              : overlayPattern === 'moons' ? '50px 50px'
              : overlayPattern === 'lines' ? '30px 30px'
              : overlayPattern === 'waves' ? '80px 80px'
              : 'cover',
          }} />
        )}

        {/* Slide number in top right corner */}
        {showSlideNumber && slides.length > 1 && (
          <div style={{
            position: 'absolute',
            top: '12px',
            right: '12px',
            fontFamily: bodyFont,
            fontSize: '14px',
            color: textColor,
            opacity: 0.7,
            letterSpacing: '0.5px',
          }}>
            {displayIndex + 1}/{slides.length}
          </div>
        )}

        {/* Profile name at bottom with optional swipe arrow above */}
        {profileName && (
          <div style={{
            position: 'absolute',
            bottom: '12px',
            left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '4px',
          }}>
            {/* Long swipe arrow above profile name (not on last slide) */}
            {showSwipeArrow && displayIndex < slides.length - 1 && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                opacity: 0.5,
              }}>
                <div style={{
                  width: '60px',
                  height: '2px',
                  backgroundColor: textColor,
                }} />
                <div style={{
                  width: 0,
                  height: 0,
                  borderTop: '5px solid transparent',
                  borderBottom: '5px solid transparent',
                  borderLeft: `8px solid ${textColor}`,
                }} />
              </div>
            )}
            <div style={{
              fontFamily: bodyFont,
              fontSize: '14px',
              color: textColor,
              opacity: 0.7,
              letterSpacing: '0.5px',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}>
              {profileIcon === 'instagram' && (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" style={{ opacity: 0.8 }}>
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                </svg>
              )}
              {profileIcon === 'telegram' && (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" style={{ opacity: 0.8 }}>
                  <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
                </svg>
              )}
              @{profileName}
            </div>
          </div>
        )}

        {/* Swipe arrow without profile name (not on last slide) */}
        {showSwipeArrow && !profileName && displayIndex < slides.length - 1 && (
          <div style={{
            position: 'absolute',
            bottom: '12px',
            left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex',
            alignItems: 'center',
            opacity: 0.5,
          }}>
            <div style={{
              width: '60px',
              height: '2px',
              backgroundColor: textColor,
            }} />
            <div style={{
              width: 0,
              height: 0,
              borderTop: '5px solid transparent',
              borderBottom: '5px solid transparent',
              borderLeft: `8px solid ${textColor}`,
            }} />
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
                        <div>
                          <label className="text-xs text-gray-600 mb-1 block">Межбуквенное: {letterSpacing}px</label>
                          <Slider value={[letterSpacing]} onValueChange={([v]) => setLetterSpacing(v)} min={-2} max={10} step={0.5} />
                        </div>
                        <div>
                          <label className="text-xs text-gray-600 mb-1 block">Межстрочное: {lineHeight.toFixed(1)}</label>
                          <Slider value={[lineHeight]} onValueChange={([v]) => setLineHeight(v)} min={1} max={2.5} step={0.1} />
                        </div>
                      </div>

                      <div className="border-t border-purple-100 pt-3 mt-3">
                        <div className="flex items-center justify-between mb-2">
                          <label className="text-xs font-medium text-gray-700">Размер на этом слайде</label>
                          {currentSlide && (currentSlide.titleSize || currentSlide.bodySize) && (
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => { handleSlideSizeChange('titleSize', undefined); handleSlideSizeChange('bodySize', undefined); }}
                              className="h-6 text-xs text-gray-500"
                            >
                              Сбросить
                            </Button>
                          )}
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-xs text-gray-500 mb-1 block">
                              Заголовок: {currentSlide ? getSlideTitleSize(currentSlide) : titleSize}px
                              {currentSlide?.titleSize && <span className="text-purple-500 ml-1">*</span>}
                            </label>
                            <Slider 
                              value={[currentSlide ? getSlideTitleSize(currentSlide) : titleSize]} 
                              onValueChange={([v]) => handleSlideSizeChange('titleSize', v)} 
                              min={24} max={72} step={2} 
                            />
                          </div>
                          <div>
                            <label className="text-xs text-gray-500 mb-1 block">
                              Текст: {currentSlide ? getSlideBodySize(currentSlide) : bodySize}px
                              {currentSlide?.bodySize && <span className="text-purple-500 ml-1">*</span>}
                            </label>
                            <Slider 
                              value={[currentSlide ? getSlideBodySize(currentSlide) : bodySize]} 
                              onValueChange={([v]) => handleSlideSizeChange('bodySize', v)} 
                              min={14} max={36} step={2} 
                            />
                          </div>
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
                        <label className="text-xs font-medium text-gray-700 mb-2 block">Базовые цвета</label>
                        <div className="flex flex-wrap gap-2">
                          {baseColors.map((color) => (
                            <button
                              key={color}
                              onClick={() => setTextColor(color)}
                              className={`w-9 h-9 rounded-lg border-2 transition-all ${
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

                      <div className="border-t border-purple-100 pt-4">
                        <div className="flex items-center justify-between mb-3">
                          <label className="text-xs font-medium text-gray-700">Тень под текстом</label>
                          <button
                            onClick={() => setTextShadowEnabled(!textShadowEnabled)}
                            className={`w-12 h-6 rounded-full transition-colors ${textShadowEnabled ? 'bg-purple-500' : 'bg-gray-300'}`}
                          >
                            <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${textShadowEnabled ? 'translate-x-6' : 'translate-x-0.5'}`} />
                          </button>
                        </div>
                        {textShadowEnabled && (
                          <div className="space-y-3">
                            <div>
                              <label className="text-xs text-gray-500 mb-1 block">Размытие: {textShadowBlur}px</label>
                              <Slider
                                value={[textShadowBlur]}
                                onValueChange={([v]) => setTextShadowBlur(v)}
                                min={0} max={30} step={1}
                              />
                            </div>
                            <div>
                              <label className="text-xs text-gray-500 mb-1 block">Смещение вниз: {textShadowOffsetY}px</label>
                              <Slider
                                value={[textShadowOffsetY]}
                                onValueChange={([v]) => setTextShadowOffsetY(v)}
                                min={0} max={20} step={1}
                              />
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={() => setTextShadowColor('rgba(0,0,0,0.5)')}
                                className={`flex-1 min-h-[36px] rounded-lg text-xs ${textShadowColor === 'rgba(0,0,0,0.5)' ? 'bg-gray-800 text-white' : 'bg-gray-200 hover:bg-gray-300'}`}
                              >
                                Тёмная
                              </button>
                              <button
                                onClick={() => setTextShadowColor('rgba(255,255,255,0.7)')}
                                className={`flex-1 min-h-[36px] rounded-lg text-xs border ${textShadowColor === 'rgba(255,255,255,0.7)' ? 'bg-white border-purple-500 text-purple-700' : 'bg-white border-gray-300 hover:border-gray-400'}`}
                              >
                                Светлая
                              </button>
                            </div>
                          </div>
                        )}
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
                        <input 
                          ref={fileInputRef} 
                          type="file" 
                          accept="image/*" 
                          onChange={handleImageUpload} 
                          className="sr-only" 
                          id="bg-image-upload" 
                          onClick={() => {
                            // Capture slideId NOW before file dialog opens
                            uploadTargetSlideIdRef.current = slidesRef.current[currentSlideIndexRef.current]?.id ?? null;
                          }}
                        />
                        <label 
                          htmlFor="bg-image-upload" 
                          className="min-h-[44px] px-3 flex items-center gap-1 text-sm border border-input bg-background hover:bg-accent hover:text-accent-foreground rounded-md cursor-pointer"
                        >
                          <Upload className="h-4 w-4" /> Загрузить фото
                        </label>
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
                              onClick={() => {
                                const slideId = slidesRef.current[currentSlideIndexRef.current]?.id;
                                if (!slideId) return;
                                setSlides(prev => {
                                  const slide = prev.find(s => s.id === slideId);
                                  if (!slide) return prev;
                                  return updateSlide(prev, slide.id, { imageFit: 'contain' });
                                });
                              }}
                              className={`flex-1 min-h-[44px] rounded-lg text-sm ${
                                getSlideImageFit(currentSlide) === 'contain' ? 'bg-purple-500 text-white' : 'bg-gray-100 hover:bg-gray-200'
                              }`}
                            >
                              Вместить
                            </button>
                            <button
                              onClick={() => {
                                const slideId = slidesRef.current[currentSlideIndexRef.current]?.id;
                                if (!slideId) return;
                                setSlides(prev => {
                                  const slide = prev.find(s => s.id === slideId);
                                  if (!slide) return prev;
                                  return updateSlide(prev, slide.id, { imageFit: 'cover' });
                                });
                              }}
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
                        <div className="flex items-center justify-between mb-1">
                          <div className="text-xs text-gray-500">Все фоны:</div>
                          {currentSlide && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-xs h-6 text-purple-600 hover:text-purple-700 px-2"
                              onClick={() => {
                                const slideId = slidesRef.current[currentSlideIndexRef.current]?.id;
                                if (!slideId) return;
                                setSlides(prev => {
                                  const slide = prev.find(s => s.id === slideId);
                                  if (!slide) return prev;
                                  const bg = getSlideBackground(slide);
                                  const img = getSlideCustomImage(slide);
                                  const fit = getSlideImageFit(slide);
                                  return prev.map(s => ({
                                    ...s,
                                    background: bg,
                                    customImage: img,
                                    imageFit: fit
                                  }));
                                });
                              }}
                            >
                              Применить ко всем
                            </Button>
                          )}
                        </div>
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

                <AccordionItem value="decorations" className="border-purple-200">
                  <AccordionTrigger className="py-3 text-sm font-medium hover:no-underline">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-purple-500" />
                      Декор и подпись
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-4">
                      <div>
                        <label className="text-xs font-medium text-gray-700 mb-2 block">Имя профиля (внизу слайда)</label>
                        <div className="flex gap-2">
                          <Input
                            value={profileName}
                            onChange={(e) => setProfileName(e.target.value)}
                            placeholder="ваш_ник"
                            className="text-sm flex-1"
                          />
                          <div className="flex gap-1">
                            <button
                              onClick={() => setProfileIcon('none')}
                              className={`min-w-[44px] min-h-[44px] rounded-lg text-sm ${
                                profileIcon === 'none' ? 'bg-purple-500 text-white' : 'bg-gray-100 hover:bg-gray-200'
                              }`}
                              title="Без иконки"
                            >
                              @
                            </button>
                            <button
                              onClick={() => setProfileIcon('instagram')}
                              className={`min-w-[44px] min-h-[44px] rounded-lg flex items-center justify-center ${
                                profileIcon === 'instagram' ? 'bg-purple-500 text-white' : 'bg-gray-100 hover:bg-gray-200'
                              }`}
                              title="Instagram"
                            >
                              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                              </svg>
                            </button>
                            <button
                              onClick={() => setProfileIcon('telegram')}
                              className={`min-w-[44px] min-h-[44px] rounded-lg flex items-center justify-center ${
                                profileIcon === 'telegram' ? 'bg-purple-500 text-white' : 'bg-gray-100 hover:bg-gray-200'
                              }`}
                              title="Telegram"
                            >
                              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
                              </svg>
                            </button>
                          </div>
                        </div>
                      </div>

                      <div>
                        <label className="text-xs font-medium text-gray-700 mb-2 block">Декоративный узор</label>
                        <div className="grid grid-cols-7 gap-1">
                          {([
                            { value: 'none', label: 'Нет', title: 'Без узора' },
                            { value: 'stars', label: '*', title: 'Звезды' },
                            { value: 'dots', label: '...', title: 'Точки' },
                            { value: 'lines', label: '///', title: 'Линии' },
                            { value: 'sparkles', label: 'o', title: 'Искры' },
                            { value: 'grid', label: '#', title: 'Сетка' },
                            { value: 'waves', label: '~', title: 'Волны' },
                            { value: 'diamonds', label: '<>', title: 'Ромбы' },
                            { value: 'circles', label: 'O', title: 'Круги' },
                            { value: 'crosses', label: '+', title: 'Кресты' },
                            { value: 'triangles', label: '^', title: 'Треугольники' },
                            { value: 'hearts', label: '<3', title: 'Сердечки' },
                            { value: 'moons', label: 'C', title: 'Луны' },
                          ] as const).map((pattern) => (
                            <button
                              key={pattern.value}
                              onClick={() => setOverlayPattern(pattern.value)}
                              className={`min-h-[40px] rounded-lg text-xs font-mono ${
                                overlayPattern === pattern.value ? 'bg-purple-500 text-white' : 'bg-gray-100 hover:bg-gray-200'
                              }`}
                              title={pattern.title}
                            >
                              {pattern.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="flex gap-4">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={showSwipeArrow}
                            onChange={(e) => setShowSwipeArrow(e.target.checked)}
                            className="w-5 h-5 rounded border-purple-300 text-purple-500 focus:ring-purple-500"
                          />
                          <span className="text-sm">Стрелка</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={showSlideNumber}
                            onChange={(e) => setShowSlideNumber(e.target.checked)}
                            className="w-5 h-5 rounded border-purple-300 text-purple-500 focus:ring-purple-500"
                          />
                          <span className="text-sm">Номер слайда</span>
                        </label>
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>

              <div className="flex flex-col gap-2 pt-4 border-t border-gray-200">
                <div className="flex gap-2">
                  <Button
                    onClick={handleExportCurrent}
                    disabled={isExporting}
                    variant="outline"
                    className="flex-1 text-xs sm:text-sm min-h-[44px]"
                    size="sm"
                  >
                    <Download className="h-4 w-4 mr-1 sm:mr-2" />
                    <span className="hidden sm:inline">Скачать слайд</span>
                    <span className="sm:hidden">Скачать</span>
                  </Button>
                  {canShare && (
                    <Button
                      onClick={handleShareCurrent}
                      disabled={isExporting}
                      variant="outline"
                      className="flex-1 text-xs sm:text-sm min-h-[44px]"
                      size="sm"
                    >
                      <Share2 className="h-4 w-4 mr-1 sm:mr-2" />
                      <span className="hidden sm:inline">Поделиться</span>
                      <span className="sm:hidden">Поделиться</span>
                    </Button>
                  )}
                </div>
                <Button
                  onClick={handleExportAll}
                  disabled={isExporting}
                  className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-xs sm:text-sm min-h-[44px]"
                  size="sm"
                >
                  <Download className="h-4 w-4 mr-1 sm:mr-2" />
                  {isExporting ? `${exportProgress}%` : `Скачать все слайды (${slides.length})`}
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
              <div className="text-sm text-gray-500 mb-2">
                Предпросмотр слайда {currentSlideIndex + 1}
                <span className="lg:hidden text-xs text-purple-500 ml-2">(свайп для навигации)</span>
              </div>
              <div 
                className="w-full flex justify-center overflow-hidden touch-pan-y"
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
              >
                <div className="transform scale-75 sm:scale-90 lg:scale-100 origin-top" key={currentSlide?.id}>
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
                    style={{ width: width * 0.2, height: height * 0.2, overflow: 'hidden', borderRadius: '8px' }}
                  >
                    {renderSlidePreview(slide, false, idx, 0.2)}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Floating mobile toolbar */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg p-3 z-50">
        <div className="flex items-center justify-between gap-2 max-w-lg mx-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentSlideIndex(Math.max(0, currentSlideIndex - 1))}
            disabled={currentSlideIndex === 0}
            className="min-h-[44px] min-w-[44px]"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          
          <div className="flex-1 text-center text-sm font-medium text-gray-700">
            {currentSlideIndex + 1} / {slides.length}
          </div>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentSlideIndex(Math.min(slides.length - 1, currentSlideIndex + 1))}
            disabled={currentSlideIndex === slides.length - 1}
            className="min-h-[44px] min-w-[44px]"
          >
            <ChevronRight className="h-5 w-5" />
          </Button>
          
          <div className="border-l border-gray-300 h-8 mx-1" />
          
          <Button
            onClick={handleExportCurrent}
            disabled={isExporting}
            size="sm"
            className="min-h-[44px] min-w-[44px] bg-purple-500 hover:bg-purple-600"
          >
            <Download className="h-5 w-5" />
          </Button>
          
          {canShare && (
            <Button
              onClick={handleShareCurrent}
              disabled={isExporting}
              size="sm"
              className="min-h-[44px] min-w-[44px] bg-pink-500 hover:bg-pink-600"
            >
              <Share2 className="h-5 w-5" />
            </Button>
          )}
        </div>
      </div>
      
      {/* Bottom padding for mobile toolbar */}
      <div className="lg:hidden h-20" />
    </div>
  );
}
