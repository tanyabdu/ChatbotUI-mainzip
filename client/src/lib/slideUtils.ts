export interface Slide {
  id: number;
  type: 'title' | 'content';
  heading: string;
  body: string;
  background?: string;
  customImage?: string | null;
  offsetX?: number;
  offsetY?: number;
}

const MAX_CHARS_PER_SLIDE = 350;
const MIN_CHARS_FOR_SPLIT = 50;

export function splitTextToSlides(text: string): Slide[] {
  if (!text || !text.trim()) {
    return [{
      id: 1,
      type: 'title',
      heading: 'Заголовок',
      body: ''
    }];
  }

  const normalizedText = text.trim().replace(/\r\n/g, '\n');
  
  let paragraphs: string[];
  
  // Check for explicit slide delimiters (--- on its own line or surrounded by any text)
  const hasTripleDash = /(?:^|\n)\s*---\s*(?:\n|$)/.test(normalizedText) || normalizedText.includes('---');
  const hasHashMarkers = /(?:^|\n)###/.test(normalizedText);
  
  if (hasTripleDash) {
    // Split by --- with optional whitespace around it
    paragraphs = normalizedText.split(/\s*---\s*/).map(p => p.trim()).filter(p => p);
  } else if (hasHashMarkers) {
    paragraphs = normalizedText.split(/\n*###\s*/).map(p => p.trim()).filter(p => p);
  } else {
    paragraphs = normalizedText.split(/\n\n+/).map(p => p.trim()).filter(p => p);
  }
  

  if (paragraphs.length === 0) {
    paragraphs = [normalizedText];
  }

  const slides: Slide[] = [];
  let slideId = 1;

  const firstParagraph = paragraphs[0];
  const firstLines = firstParagraph.split('\n');
  let titleHeading: string;
  let titleBodyFull: string;
  
  if (firstLines.length > 1) {
    const firstLine = firstLines[0];
    if (firstLine.length <= 100) {
      titleHeading = firstLine;
      titleBodyFull = firstLines.slice(1).join('\n');
    } else {
      titleHeading = firstLine.substring(0, 100);
      const firstLineRemainder = firstLine.substring(100);
      titleBodyFull = firstLineRemainder + '\n' + firstLines.slice(1).join('\n');
    }
  } else {
    if (firstParagraph.length <= 100) {
      titleHeading = firstParagraph;
      titleBodyFull = '';
    } else {
      titleHeading = firstParagraph.substring(0, 100);
      titleBodyFull = firstParagraph.substring(100);
    }
  }
  
  if (titleBodyFull.length <= MAX_CHARS_PER_SLIDE) {
    slides.push({
      id: slideId++,
      type: 'title',
      heading: titleHeading,
      body: titleBodyFull
    });
  } else {
    const bodyChunks = splitLongText(titleBodyFull, MAX_CHARS_PER_SLIDE);
    slides.push({
      id: slideId++,
      type: 'title',
      heading: titleHeading,
      body: bodyChunks[0]
    });
    for (let i = 1; i < bodyChunks.length; i++) {
      slides.push({
        id: slideId++,
        type: 'content',
        heading: '',
        body: bodyChunks[i]
      });
    }
  }

  for (let i = 1; i < paragraphs.length; i++) {
    const paragraph = paragraphs[i];
    
    if (paragraph.length <= MAX_CHARS_PER_SLIDE) {
      const lines = paragraph.split('\n');
      const heading = lines[0].length <= 80 ? lines[0] : '';
      const body = heading ? lines.slice(1).join('\n') : paragraph;
      
      slides.push({
        id: slideId++,
        type: 'content',
        heading: heading,
        body: body.substring(0, MAX_CHARS_PER_SLIDE)
      });
    } else {
      const chunks = splitLongText(paragraph, MAX_CHARS_PER_SLIDE);
      chunks.forEach((chunk, idx) => {
        slides.push({
          id: slideId++,
          type: 'content',
          heading: idx === 0 ? extractHeading(chunk) : '',
          body: idx === 0 ? removeHeading(chunk) : chunk
        });
      });
    }
  }

  return slides;
}

function splitLongText(text: string, maxLength: number): string[] {
  const chunks: string[] = [];
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
  
  let currentChunk = '';
  
  for (const sentence of sentences) {
    if ((currentChunk + sentence).length <= maxLength) {
      currentChunk += sentence;
    } else {
      if (currentChunk.trim()) {
        chunks.push(currentChunk.trim());
      }
      currentChunk = sentence;
    }
  }
  
  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }
  
  return chunks.length > 0 ? chunks : [text.substring(0, maxLength)];
}

function extractHeading(text: string): string {
  const lines = text.split('\n');
  if (lines[0].length <= 80) {
    return lines[0];
  }
  return '';
}

function removeHeading(text: string): string {
  const lines = text.split('\n');
  if (lines[0].length <= 80 && lines.length > 1) {
    return lines.slice(1).join('\n');
  }
  return text;
}

export function updateSlide(slides: Slide[], id: number, updates: Partial<Slide>): Slide[] {
  return slides.map(slide => 
    slide.id === id ? { ...slide, ...updates } : slide
  );
}

export function addSlideAfter(slides: Slide[], afterId: number): Slide[] {
  const index = slides.findIndex(s => s.id === afterId);
  const newSlide: Slide = {
    id: Math.max(...slides.map(s => s.id)) + 1,
    type: 'content',
    heading: '',
    body: ''
  };
  
  const newSlides = [...slides];
  newSlides.splice(index + 1, 0, newSlide);
  return newSlides;
}

export function removeSlide(slides: Slide[], id: number): Slide[] {
  if (slides.length <= 1) return slides;
  return slides.filter(s => s.id !== id);
}
