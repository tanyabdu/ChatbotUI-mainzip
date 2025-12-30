import { useState, useRef, useEffect, useLayoutEffect, ChangeEvent } from 'react';
import html2canvas from 'html2canvas';
import { Download, ChevronLeft, ChevronRight, Plus, Trash2, Sparkles, RotateCcw, AlignLeft, AlignCenter, AlignRight, Upload, Move, Type, Palette, Image, ArrowUp, Share2 } from 'lucide-react';
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

  const handleImageUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // CRITICAL: Capture slideId BEFORE async FileReader operation
    // This prevents photo from being applied to wrong slide if user navigates during upload
    const slideId = slidesRef.current[currentSlideIndexRef.current]?.id;
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

  const renderSlideForExport = async (slide: Slide, slideIndex: number): Promise<HTMLCanvasElement> => {
    const { width: expWidth, height: expHeight } = exportSize;
    const isTitleSlide = slide.type === 'title';
    const alignItems = textAlign === 'left' ? 'flex-start' : textAlign === 'right' ? 'flex-end' : 'center';
    const slideCustomImage = getSlideCustomImage(slide);
    const slideBackground = getSlideBackground(slide);
    const slideImageFit = getSlideImageFit(slide);
    const offsetX = getSlideOffsetX(slide);
    const offsetY = getSlideOffsetY(slide);
    const displayIndex = slideIndex;

    // Scale factor for export (export size / preview size)
    const scaleFactor = expWidth / width;
    const scaledTitleSize = titleSize * scaleFactor;
    const scaledBodySize = bodySize * scaleFactor;
    const scaledPadding = padding * scaleFactor;
    const scaledOffsetX = offsetX * scaleFactor;
    const scaledOffsetY = offsetY * scaleFactor;
    const scaledLetterSpacing = letterSpacing * scaleFactor;

    // Create hidden container
    const container = document.createElement('div');
    container.style.cssText = `
      position: fixed;
      left: -9999px;
      top: 0;
      width: ${expWidth}px;
      height: ${expHeight}px;
      background: ${slideCustomImage ? `url(${slideCustomImage})` : slideBackground};
      background-size: ${slideCustomImage ? slideImageFit : 'cover'};
      background-position: center;
      background-color: ${slideCustomImage && slideImageFit === 'contain' ? '#1a1a2e' : 'transparent'};
      background-repeat: no-repeat;
      padding: ${scaledPadding}px;
      display: flex;
      flex-direction: column;
      justify-content: ${isTitleSlide ? 'center' : 'flex-start'};
      align-items: ${alignItems};
      text-align: ${textAlign};
      overflow: hidden;
      box-sizing: border-box;
    `;

    // Add overlay pattern FIRST so it's behind content (html2canvas renders in DOM order)
    if (overlayPattern !== 'none') {
      const overlay = document.createElement('div');
      const s = scaleFactor;
      const patternBackground = overlayPattern === 'stars' 
        ? `radial-gradient(${2*s}px ${2*s}px at ${20*s}px ${30*s}px, ${textColor}, transparent), radial-gradient(${2*s}px ${2*s}px at ${40*s}px ${70*s}px, ${textColor}, transparent), radial-gradient(${1*s}px ${1*s}px at ${90*s}px ${40*s}px, ${textColor}, transparent), radial-gradient(${2*s}px ${2*s}px at ${130*s}px ${80*s}px, ${textColor}, transparent), radial-gradient(${1*s}px ${1*s}px at ${160*s}px ${20*s}px, ${textColor}, transparent), radial-gradient(${2*s}px ${2*s}px at ${200*s}px ${50*s}px, ${textColor}, transparent), radial-gradient(${1*s}px ${1*s}px at ${60*s}px ${100*s}px, ${textColor}, transparent), radial-gradient(${2*s}px ${2*s}px at ${100*s}px ${130*s}px, ${textColor}, transparent), radial-gradient(${1*s}px ${1*s}px at ${180*s}px ${120*s}px, ${textColor}, transparent), radial-gradient(${2*s}px ${2*s}px at ${220*s}px ${100*s}px, ${textColor}, transparent), radial-gradient(${2*s}px ${2*s}px at ${250*s}px ${150*s}px, ${textColor}, transparent), radial-gradient(${1*s}px ${1*s}px at ${30*s}px ${180*s}px, ${textColor}, transparent), radial-gradient(${2*s}px ${2*s}px at ${280*s}px ${200*s}px, ${textColor}, transparent), radial-gradient(${1*s}px ${1*s}px at ${150*s}px ${250*s}px, ${textColor}, transparent), radial-gradient(${2*s}px ${2*s}px at ${70*s}px ${220*s}px, ${textColor}, transparent)`
        : overlayPattern === 'dots'
        ? `radial-gradient(circle, ${textColor} ${1*s}px, transparent ${1*s}px)`
        : overlayPattern === 'lines'
        ? `repeating-linear-gradient(45deg, transparent, transparent ${10*s}px, ${textColor}15 ${10*s}px, ${textColor}15 ${20*s}px)`
        : overlayPattern === 'sparkles'
        ? `radial-gradient(${3*s}px ${3*s}px at 25% 25%, #fbbf24, transparent), radial-gradient(${2*s}px ${2*s}px at 75% 20%, #fbbf24, transparent), radial-gradient(${3*s}px ${3*s}px at 50% 80%, #fbbf24, transparent), radial-gradient(${2*s}px ${2*s}px at 15% 70%, #fbbf24, transparent), radial-gradient(${3*s}px ${3*s}px at 85% 60%, #fbbf24, transparent), radial-gradient(${2*s}px ${2*s}px at 40% 45%, #fbbf24, transparent), radial-gradient(${3*s}px ${3*s}px at 65% 65%, #fbbf24, transparent), radial-gradient(${2*s}px ${2*s}px at 10% 35%, #fbbf24, transparent), radial-gradient(${3*s}px ${3*s}px at 90% 85%, #fbbf24, transparent), radial-gradient(${2*s}px ${2*s}px at 55% 15%, #fbbf24, transparent)`
        : overlayPattern === 'grid'
        ? `linear-gradient(${textColor}10 ${1*s}px, transparent ${1*s}px), linear-gradient(90deg, ${textColor}10 ${1*s}px, transparent ${1*s}px)`
        : overlayPattern === 'waves'
        ? `repeating-linear-gradient(0deg, transparent, transparent ${20*s}px, ${textColor}08 ${20*s}px, ${textColor}08 ${40*s}px), repeating-linear-gradient(90deg, transparent, transparent ${20*s}px, ${textColor}05 ${20*s}px, ${textColor}05 ${40*s}px)`
        : overlayPattern === 'diamonds'
        ? `linear-gradient(45deg, ${textColor}10 25%, transparent 25%), linear-gradient(-45deg, ${textColor}10 25%, transparent 25%), linear-gradient(45deg, transparent 75%, ${textColor}10 75%), linear-gradient(-45deg, transparent 75%, ${textColor}10 75%)`
        : overlayPattern === 'circles'
        ? `radial-gradient(circle at 50% 50%, transparent ${20*s}px, ${textColor}08 ${21*s}px, ${textColor}08 ${22*s}px, transparent ${23*s}px)`
        : overlayPattern === 'crosses'
        ? `linear-gradient(${textColor}10 ${2*s}px, transparent ${2*s}px), linear-gradient(90deg, ${textColor}10 ${2*s}px, transparent ${2*s}px), linear-gradient(${textColor}05 ${1*s}px, transparent ${1*s}px), linear-gradient(90deg, ${textColor}05 ${1*s}px, transparent ${1*s}px)`
        : overlayPattern === 'triangles'
        ? `linear-gradient(60deg, ${textColor}08 25%, transparent 25.5%), linear-gradient(-60deg, ${textColor}08 25%, transparent 25.5%), linear-gradient(60deg, transparent 75%, ${textColor}08 75.5%), linear-gradient(-60deg, transparent 75%, ${textColor}08 75.5%)`
        : overlayPattern === 'hearts'
        ? `radial-gradient(circle at 50% 40%, ${textColor} ${2*s}px, transparent ${2*s}px), radial-gradient(circle at 45% 35%, ${textColor} ${2*s}px, transparent ${2*s}px), radial-gradient(circle at 55% 35%, ${textColor} ${2*s}px, transparent ${2*s}px)`
        : overlayPattern === 'moons'
        ? `radial-gradient(circle at 45% 45%, transparent ${8*s}px, ${textColor}15 ${9*s}px, ${textColor}15 ${11*s}px, transparent ${12*s}px), radial-gradient(circle at 50% 50%, ${textColor}10 ${8*s}px, transparent ${9*s}px)`
        : 'none';
      
      const baseBgSize = overlayPattern === 'dots' ? 20 
        : overlayPattern === 'grid' ? 30
        : overlayPattern === 'diamonds' ? 40
        : overlayPattern === 'circles' ? 50
        : overlayPattern === 'crosses' ? 25
        : overlayPattern === 'triangles' ? 40
        : overlayPattern === 'hearts' ? 35
        : overlayPattern === 'moons' ? 45
        : 0;
      const scaledBgSize = baseBgSize > 0 ? `${baseBgSize * scaleFactor}px ${baseBgSize * scaleFactor}px` : 'cover';

      overlay.style.cssText = `
        position: absolute;
        top: 0; left: 0; right: 0; bottom: 0;
        pointer-events: none;
        opacity: 0.15;
        background: ${patternBackground};
        background-size: ${scaledBgSize};
      `;
      container.appendChild(overlay);
    }

    // Scaled footer values
    const scaledBottom = 24 * scaleFactor;
    const scaledGap = 8 * scaleFactor;
    const scaledFontSize = 28 * scaleFactor;
    const scaledIconSize = 28 * scaleFactor;
    const scaledArrowWidth = 120 * scaleFactor;
    const scaledArrowHeight = 4 * scaleFactor;
    const scaledTriangleBorder = 10 * scaleFactor;
    const scaledTriangleLeft = 16 * scaleFactor;

    // Content wrapper with offset - z-index 10 to be above overlay
    const contentWrapper = document.createElement('div');
    contentWrapper.style.cssText = `
      transform: translate(${scaledOffsetX}px, ${scaledOffsetY}px);
      width: 100%;
      display: flex;
      flex-direction: column;
      align-items: ${alignItems};
      position: relative;
      z-index: 10;
    `;

    // Heading
    if (slide.heading) {
      const headingEl = document.createElement('div');
      headingEl.style.cssText = `
        font-family: '${titleFont}', serif;
        font-size: ${isTitleSlide ? scaledTitleSize : scaledTitleSize * 0.7}px;
        color: ${textColor};
        line-height: ${lineHeight};
        letter-spacing: ${scaledLetterSpacing}px;
        margin-bottom: ${slide.body ? '40px' : '0'};
        font-weight: 600;
        width: 100%;
        text-align: ${textAlign};
        white-space: pre-line;
      `;
      headingEl.textContent = slide.heading;
      contentWrapper.appendChild(headingEl);
    }

    // Body
    if (slide.body) {
      const bodyEl = document.createElement('div');
      bodyEl.style.cssText = `
        font-family: '${bodyFont}', sans-serif;
        font-size: ${scaledBodySize}px;
        color: ${textColor};
        line-height: ${lineHeight};
        letter-spacing: ${scaledLetterSpacing}px;
        opacity: 0.95;
        width: 100%;
        text-align: ${textAlign};
        white-space: pre-line;
      `;
      bodyEl.textContent = slide.body;
      contentWrapper.appendChild(bodyEl);
    }

    container.appendChild(contentWrapper);

    // Slide number
    if (showSlideNumber && slides.length > 1) {
      const slideNumEl = document.createElement('div');
      slideNumEl.style.cssText = `
        position: absolute;
        top: ${scaledBottom}px; right: ${scaledBottom}px;
        font-family: '${bodyFont}', sans-serif;
        font-size: ${scaledFontSize}px;
        color: ${textColor};
        opacity: 0.7;
        letter-spacing: ${scaledLetterSpacing}px;
        z-index: 10;
      `;
      slideNumEl.textContent = `${displayIndex + 1}/${slides.length}`;
      container.appendChild(slideNumEl);
    }

    // Profile name and swipe arrow
    if (profileName) {
      const profileWrapper = document.createElement('div');
      profileWrapper.style.cssText = `
        position: absolute;
        bottom: ${scaledBottom}px; left: 50%;
        transform: translateX(-50%);
        display: flex; flex-direction: column;
        align-items: center; gap: ${scaledGap}px;
        z-index: 10;
      `;

      // Swipe arrow (not on last slide)
      if (showSwipeArrow && displayIndex < slides.length - 1) {
        const arrowWrapper = document.createElement('div');
        arrowWrapper.style.cssText = `display: flex; align-items: center; opacity: 0.5;`;
        const line = document.createElement('div');
        line.style.cssText = `width: ${scaledArrowWidth}px; height: ${scaledArrowHeight}px; background-color: ${textColor};`;
        const triangle = document.createElement('div');
        triangle.style.cssText = `
          width: 0; height: 0;
          border-top: ${scaledTriangleBorder}px solid transparent;
          border-bottom: ${scaledTriangleBorder}px solid transparent;
          border-left: ${scaledTriangleLeft}px solid ${textColor};
        `;
        arrowWrapper.appendChild(line);
        arrowWrapper.appendChild(triangle);
        profileWrapper.appendChild(arrowWrapper);
      }

      const profileText = document.createElement('div');
      profileText.style.cssText = `
        font-family: '${bodyFont}', sans-serif;
        font-size: ${scaledFontSize}px;
        color: ${textColor};
        opacity: 0.8;
        letter-spacing: ${scaledLetterSpacing}px;
        display: flex; align-items: center; gap: ${scaledGap}px;
        flex-wrap: nowrap; white-space: nowrap;
      `;
      
      // Add social icon if selected - using img with data URI for html2canvas compatibility
      if (profileIcon === 'instagram') {
        const iconImg = document.createElement('img');
        const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="${textColor}"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>`;
        iconImg.src = `data:image/svg+xml,${encodeURIComponent(svgContent)}`;
        iconImg.width = scaledIconSize;
        iconImg.height = scaledIconSize;
        iconImg.style.opacity = '0.8';
        profileText.appendChild(iconImg);
      } else if (profileIcon === 'telegram') {
        // Use img with data URI for html2canvas compatibility
        const iconImg = document.createElement('img');
        const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="${textColor}"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>`;
        iconImg.src = `data:image/svg+xml,${encodeURIComponent(svgContent)}`;
        iconImg.width = scaledIconSize;
        iconImg.height = scaledIconSize;
        iconImg.style.opacity = '0.8';
        profileText.appendChild(iconImg);
      }
      
      const nameSpan = document.createElement('span');
      nameSpan.textContent = `@${profileName}`;
      profileText.appendChild(nameSpan);
      profileWrapper.appendChild(profileText);
      container.appendChild(profileWrapper);
    } else if (showSwipeArrow && displayIndex < slides.length - 1) {
      // Arrow without profile
      const arrowWrapper = document.createElement('div');
      arrowWrapper.style.cssText = `
        position: absolute;
        bottom: ${scaledBottom}px; left: 50%;
        transform: translateX(-50%);
        display: flex; align-items: center; opacity: 0.5;
        z-index: 10;
      `;
      const line = document.createElement('div');
      line.style.cssText = `width: ${scaledArrowWidth}px; height: ${scaledArrowHeight}px; background-color: ${textColor};`;
      const triangle = document.createElement('div');
      triangle.style.cssText = `
        width: 0; height: 0;
        border-top: ${scaledTriangleBorder}px solid transparent;
        border-bottom: ${scaledTriangleBorder}px solid transparent;
        border-left: ${scaledTriangleLeft}px solid ${textColor};
      `;
      arrowWrapper.appendChild(line);
      arrowWrapper.appendChild(triangle);
      container.appendChild(arrowWrapper);
    }

    document.body.appendChild(container);
    
    try {
      await waitForNextFrame();

      const solidBg = getSolidBackgroundColor(slide);
      const canvas = await html2canvas(container, {
        scale: 1,
        useCORS: true,
        backgroundColor: solidBg,
        width: expWidth,
        height: expHeight,
      });

      return canvas;
    } finally {
      if (document.body.contains(container)) {
        document.body.removeChild(container);
      }
    }
  };

  const handleExportAll = async () => {
    setIsExporting(true);
    setExportProgress(0);

    try {
      for (let i = 0; i < slides.length; i++) {
        const canvas = await renderSlideForExport(slides[i], i);

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

  const canShare = typeof navigator !== 'undefined' && 'share' in navigator && 'canShare' in navigator;

  const handleExportCurrent = async () => {
    setIsExporting(true);
    try {
      const canvas = await renderSlideForExport(currentSlide, currentSlideIndex);
      const blob = await new Promise<Blob | null>((resolve) => 
        canvas.toBlob((b) => resolve(b), 'image/png')
      );
      if (!blob) {
        console.error('Failed to create blob from canvas');
        return;
      }
      const fileName = `slide-${currentSlideIndex + 1}.png`;
      
      // Try Web Share API for mobile
      if (canShare) {
        const file = new File([blob], fileName, { type: 'image/png' });
        const shareData = { files: [file] };
        if (navigator.canShare(shareData)) {
          try {
            await navigator.share(shareData);
            return;
          } catch (shareError) {
            // User cancelled or share failed, fallback to download
            console.log('Share cancelled, falling back to download');
          }
        }
      }
      
      // Fallback to direct download
      const link = document.createElement('a');
      link.download = fileName;
      link.href = URL.createObjectURL(blob);
      link.click();
      URL.revokeObjectURL(link.href);
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const handleShareCurrent = async () => {
    if (!canShare) return;
    
    setIsExporting(true);
    try {
      const canvas = await renderSlideForExport(currentSlide, currentSlideIndex);
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

  const renderSlidePreview = (slide: Slide, isMain: boolean = false, slideIndex?: number) => {
    const scale = isMain ? 1 : 0.3;
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
                fontSize: isTitleSlide ? `${titleSize}px` : `${titleSize * 0.7}px`,
                color: textColor,
                lineHeight: lineHeight,
                letterSpacing: `${letterSpacing}px`,
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
                lineHeight: lineHeight,
                letterSpacing: `${letterSpacing}px`,
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
              ? `radial-gradient(circle, ${textColor} 1px, transparent 1px)`
              : overlayPattern === 'lines'
              ? `repeating-linear-gradient(45deg, transparent, transparent 10px, ${textColor}15 10px, ${textColor}15 20px)`
              : overlayPattern === 'sparkles'
              ? 'radial-gradient(3px 3px at 25% 25%, #fbbf24, transparent), radial-gradient(2px 2px at 75% 20%, #fbbf24, transparent), radial-gradient(3px 3px at 50% 80%, #fbbf24, transparent), radial-gradient(2px 2px at 15% 70%, #fbbf24, transparent), radial-gradient(3px 3px at 85% 60%, #fbbf24, transparent), radial-gradient(2px 2px at 40% 45%, #fbbf24, transparent), radial-gradient(3px 3px at 65% 65%, #fbbf24, transparent), radial-gradient(2px 2px at 10% 35%, #fbbf24, transparent), radial-gradient(3px 3px at 90% 85%, #fbbf24, transparent), radial-gradient(2px 2px at 55% 15%, #fbbf24, transparent)'
              : overlayPattern === 'grid'
              ? `linear-gradient(${textColor}10 1px, transparent 1px), linear-gradient(90deg, ${textColor}10 1px, transparent 1px)`
              : overlayPattern === 'waves'
              ? `repeating-linear-gradient(0deg, transparent, transparent 20px, ${textColor}08 20px, ${textColor}08 40px), repeating-linear-gradient(90deg, transparent, transparent 20px, ${textColor}05 20px, ${textColor}05 40px)`
              : overlayPattern === 'diamonds'
              ? `linear-gradient(45deg, ${textColor}10 25%, transparent 25%), linear-gradient(-45deg, ${textColor}10 25%, transparent 25%), linear-gradient(45deg, transparent 75%, ${textColor}10 75%), linear-gradient(-45deg, transparent 75%, ${textColor}10 75%)`
              : overlayPattern === 'circles'
              ? `radial-gradient(circle at 50% 50%, transparent 20px, ${textColor}08 21px, ${textColor}08 22px, transparent 23px)`
              : overlayPattern === 'crosses'
              ? `linear-gradient(${textColor}10 2px, transparent 2px), linear-gradient(90deg, ${textColor}10 2px, transparent 2px), linear-gradient(${textColor}05 1px, transparent 1px), linear-gradient(90deg, ${textColor}05 1px, transparent 1px)`
              : overlayPattern === 'triangles'
              ? `linear-gradient(60deg, ${textColor}08 25%, transparent 25.5%), linear-gradient(-60deg, ${textColor}08 25%, transparent 25.5%), linear-gradient(60deg, transparent 75%, ${textColor}08 75.5%), linear-gradient(-60deg, transparent 75%, ${textColor}08 75.5%)`
              : overlayPattern === 'hearts'
              ? `radial-gradient(circle at 50% 40%, ${textColor} 2px, transparent 2px), radial-gradient(circle at 45% 35%, ${textColor} 2px, transparent 2px), radial-gradient(circle at 55% 35%, ${textColor} 2px, transparent 2px)`
              : overlayPattern === 'moons'
              ? `radial-gradient(circle at 45% 45%, transparent 8px, ${textColor}15 9px, ${textColor}15 11px, transparent 12px), radial-gradient(circle at 50% 50%, ${textColor}10 8px, transparent 9px)`
              : 'none',
            backgroundSize: overlayPattern === 'dots' ? '20px 20px' 
              : overlayPattern === 'grid' ? '30px 30px'
              : overlayPattern === 'diamonds' ? '40px 40px'
              : overlayPattern === 'circles' ? '50px 50px'
              : overlayPattern === 'crosses' ? '25px 25px'
              : overlayPattern === 'triangles' ? '40px 40px'
              : overlayPattern === 'hearts' ? '35px 35px'
              : overlayPattern === 'moons' ? '45px 45px'
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
