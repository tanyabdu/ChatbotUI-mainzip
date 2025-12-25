# Design Guidelines: Esoteric Content Planner

## Design Approach
**Reference-Based Approach**: Mystical/spiritual aesthetic with modern dark UI patterns, drawing inspiration from premium spiritual/wellness platforms with a focus on creating an immersive, calming experience.

## Core Design Principles
- **Mystical Elegance**: Combine spiritual symbolism with modern sophistication
- **Dark Mysticism**: Deep backgrounds with luminous purple accents create depth and focus
- **Purposeful Animation**: Minimal, meaningful motion (fade-ins, subtle pulses) - never distracting

## Typography
**Font Families**:
- Headers/Titles: `Cormorant Garamond` (serif, weights: 400, 600) - mystical, elegant
- Body/UI: `Inter` (sans-serif, weights: 300, 500, 700) - clean, readable

**Hierarchy**:
- H1: 4xl (mobile) to 6xl (desktop), Cormorant Garamond, purple-300, tracking-wide
- H2: 2xl, Cormorant Garamond, purple-200
- Body: Base size, Inter, gray-100/gray-300
- Labels: sm, medium weight, gray-300

## Color Palette
**Primary**: Purple spectrum (#7c3aed, #6d28d9, purple-300 to purple-900)
**Backgrounds**: Gray-900 base, gray-800 for cards, gray-700 for inputs
**Accents**: Indigo-800, pink-500 (secondary interactions)
**Text**: Gray-100 (primary), gray-300 (secondary), gray-400 (tertiary)
**Borders**: Purple with 20-50% opacity overlays

## Layout System
**Spacing Units**: Tailwind spacing - primary units are 3, 4, 6, 8, 10, 12 for consistent rhythm
**Container**: max-w-6xl centered, padding p-4 (mobile) to p-8 (desktop)
**Sections**: mb-10 to mb-12 vertical spacing between major sections

## Component Library

**Navigation Buttons**:
- px-5 py-3, rounded-2xl
- bg-gray-800 with border border-purple-500/20
- Icon + text layout (flex items-center gap-2)
- Hover: bg-gray-700, border-purple-500/50

**Cards**:
- bg-gray-800, rounded-2xl, border border-purple-700/50
- Padding: p-6
- Glassmorphism variant: backdrop-filter blur, rgba backgrounds
- Gradient overlays: Absolute positioned blur-3xl circles for depth

**Form Elements**:
- Inputs/Textareas: p-3, rounded-lg, bg-gray-700
- Border: purple-500/50, focus:border-purple-400 + ring-1 ring-purple-400
- Radio/Checkbox cards: p-4, rounded-xl, peer-checked pattern with border-2
- Interactive cards scale on hover: hover:scale-[1.02]

**Buttons (Primary)**:
- py-4, gradient from-purple-700 to-indigo-800
- rounded-xl, shadow-lg
- Hover scale: hover:scale-[1.01], active:scale-[0.99]

**Icons**: Emoji-based (📝, 🧬, 🎙️, 💎, 🌙) paired with text for warmth and accessibility

## Visual Effects
**Shadows**: Standard shadow-lg for elevation, custom glow: `shadow-[0_0_50px_rgba(124,58,237,0.2)]`
**Borders**: Layered approach - solid border + semi-transparent purple overlay
**Backgrounds**: Gradient overlays, absolute positioned blur circles for ambient depth
**Scrollbar**: Custom styled - 8px width, purple thumb on gray-track

## Animations
**Fade-in**: 0.5s ease-in with translateY(10px) - applied to major sections
**Pulse**: Recording indicator uses pulse-red animation (1.5s infinite)
**Transitions**: duration-300 for most interactive elements

## Images
No hero images required. The design relies on:
- Icon-based visual hierarchy (emoji and SVG icons)
- Gradient backgrounds and blur effects for atmosphere
- Card-based content presentation with visual dividers

The mystical aesthetic is achieved through color, typography, and subtle lighting effects rather than imagery.

## Responsive Strategy
- Mobile-first: Single column, reduced padding (p-4), smaller text (text-4xl)
- Tablet: grid-cols-2 for option cards
- Desktop: Full width navigation (flex-wrap), grid-cols-2 for forms, text-6xl headers