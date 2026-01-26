# Esoteric Content Planner

## Overview

The Esoteric Content Planner is a mystical-themed web application designed for spiritual and esoteric practitioners. It offers tools for content strategy, archetype-based branding, voice-to-text content creation, case study management, and lunar calendar insights. The project aims to blend spiritual aesthetics with modern web development to provide an immersive planning experience.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend

- **Framework**: React 18 with TypeScript.
- **Build**: Vite for fast HMR.
- **Routing**: Wouter for lightweight client-side routing.
- **UI Components**: Shadcn UI with Radix UI primitives, styled using Tailwind CSS. Features a mystical design theme with purple/pink accents, dark mode, and custom fonts (Cormorant Garamond, Inter).
- **State Management**: TanStack Query for server state, React hooks for local component state.
- **Project Structure**: Feature-based components (ArchetypeQuiz, ContentGenerator, VoiceRecorder, CasesManager, LunarCalendar) and reusable UI components.

### Backend

- **Framework**: Express.js with Node.js and TypeScript.
- **API**: RESTful API with JSON format, Zod validation, and custom logging middleware.
- **Authentication**: Custom JWT-based authentication with `bcryptjs` for password hashing. Email-based registration with auto-generated passwords.
- **Admin Authorization**: `requireAdmin` middleware for role-based access.

### Data Storage

- **Database**: PostgreSQL with Drizzle ORM for type-safe queries and schema management.
- **Schema**: Tables for users, content strategies (JSONB), archetype results, voice posts, and case studies, all using UUID primary keys.
- **Migrations**: Drizzle Kit for schema migrations.

### Build & Deployment

- **Build Process**: Custom script using esbuild (server) and Vite (client).
- **Environment**: Differentiates between development (Vite dev server) and production (Express serving static files).

### Key Features

- **Subscription System**: Offers trial, monthly, and yearly tiers with access control and unlimited generation limits.
- **Content Generator**: Two-step generation process for ideas and specific formats (Post, Carousel, Reels, Stories). Incorporates a "Marketing Warmup Structure" and "Objection Closing" strategies.
- **Case Visual Export**: Canvas-based rendering for exporting case studies as images (1080x1350 aspect ratio), utilizing user's archetype fonts and preset backgrounds.
- **Carousel Editor**: Multi-slide generator with auto-splitting text, per-slide editing, multi-archetype styling, various backgrounds, Google Fonts, aspect ratio controls, and export options. Optimized for mobile UX.

## External Dependencies

- **UI Libraries**: Radix UI, Shadcn UI, Lucide React, Embla Carousel, CMDK.
- **Styling**: Tailwind CSS, `class-variance-authority`, `clsx`, `tailwind-merge`.
- **Data Handling**: TanStack Query, Zod, `drizzle-zod`, `@hookform/resolvers`.
- **Date & Time**: `date-fns`, `suncalc`.
- **Development Tools**: Replit plugins, `tsx`.
- **Database**: PostgreSQL, Drizzle ORM, `pg`, `connect-pg-simple`.
- **Payment Integration**: Prodamus (Russian payment gateway) for subscriptions, with HMAC-SHA256 signature verification and amount validation.
- **Voice Transcription**: OpenAI Whisper API for server-side audio transcription (replaces browser Web Speech API for better cross-browser support).