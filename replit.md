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
- **Content Alchemy (Beta)**: AI-powered expert content creation workflow using DeepSeek. Users select content type and warmup target, AI generates topic plan for X days, topics are saved to "Grimoire", and for each topic AI generates guiding questions which user answers (text/voice), then AI assembles final post. Tables: content_alchemy_plans, grimoire_topics.
- **Trigger Reels**: AI-powered Reels script enhancer using DeepSeek. User inputs/dictates a regular Reels script, AI transforms it into a "trigger" version by adding marketing triggers (32 standard triggers: FOMO, social proof, authority, scarcity, etc.), strengthening hooks, and adding calls-to-action from 13 CTA templates. Enhanced with 50 proven Reels script formulas as AI knowledge base — AI selects 1-2 best-fitting formulas and adapts the script structure accordingly. UI shows used formulas alongside triggers. Service: `server/services/triggerReels.ts`, endpoint: `POST /api/trigger-reels/transform`, UI: `client/src/components/TriggerReels.tsx`.
- **Threads Generator**: AI-powered Threads post generator using DeepSeek. User inputs an idea, topic, or draft text and selects 3 or 5 posts. AI generates a set of posts following a professional methodology with 5 formats: Интрига (08:00), Поиск аудитории (11:00), Факт дня (14:00), Провокационный вопрос (17:00), Лид-магнит (20:00). 3-post mode uses priority formats: Факт + Провокация + Лид-магнит. Strict stop-list enforced (no banned phrases, max 2 emojis, no markdown). Each post displayed in a color-coded card with format name, recommended time, text, and copy button. Subscription-gated. Service: `server/services/threadsGenerator.ts`, endpoint: `POST /api/threads/generate`, UI: `client/src/components/ThreadsGenerator.tsx`.
- **Legal Compliance (RF)**: Registration form with 3 consent checkboxes (data processing + offer required, marketing optional). All 5 legal documents (Privacy Policy, Terms, Offer, Data Consent, Marketing Consent) available as modal windows. Consent logging in `consent_logs` table with IP, user agent, and document version. Marketing consent toggle in profile settings with note about password recovery requirement. Legal document links in landing footer and profile page. Owner: ИП Климова Екатерина Викторовна, ИНН 561208353714.
- **Newsletter Recipient Tracking**: Per-recipient delivery tracking for newsletter campaigns. The `newsletter_log_recipients` table links each `newsletter_logs` entry to the individual users who were targeted, recording email, firstName, and delivery status ("sent" | "failed"). The send loop in `POST /api/admin/newsletter/send` populates this table during iteration. Admins can click any history row in the newsletter tab to open a detail dialog showing the full recipient list with statuses and a sent/failed summary. New endpoint: `GET /api/admin/newsletter/:id/recipients`. Key files: `shared/schema.ts`, `server/storage.ts`, `server/routes.ts`, `client/src/pages/Admin.tsx` (NewsletterTab).
- **Discount Promocodes**: Extended promocode system supporting both bonus days and percentage discounts. Promocodes table has `promocode_type` (bonus/discount), `discount_percent`, `discount_plan_type`, and `bonus_until` fields. `bonus_until` enables dynamic bonus calculation — instead of fixed days, access is granted until a specific date (e.g., MARCHCLUB gives access until March 31). Discount verification API at `/api/promocode/verify-discount`. Pricing page shows promo code input for authenticated users with visual price update. Promo usage recorded only after successful payment (webhook). Payment amount validation uses recorded amount (supports discounted prices).

## External Dependencies

- **UI Libraries**: Radix UI, Shadcn UI, Lucide React, Embla Carousel, CMDK.
- **Styling**: Tailwind CSS, `class-variance-authority`, `clsx`, `tailwind-merge`.
- **Data Handling**: TanStack Query, Zod, `drizzle-zod`, `@hookform/resolvers`.
- **Date & Time**: `date-fns`, `suncalc`.
- **Development Tools**: Replit plugins, `tsx`.
- **Database**: PostgreSQL, Drizzle ORM, `pg`, `connect-pg-simple`.
- **Payment Integration**: Prodamus (Russian payment gateway) for subscriptions, with HMAC-SHA256 signature verification and amount validation.
- **Voice Transcription**: Browser-native Web Speech API (`SpeechRecognition` / `webkitSpeechRecognition`) with `lang: ru-RU`, continuous mode, and interim results display. Works in Chrome and Safari. No server-side transcription.
- **AI Error Resilience**: Shared retry utility (`server/services/deepseekRetry.ts`) with 2 retry attempts (2s delay), `extractContent` for safe response parsing, `ParseError` class for non-retriable errors. All DeepSeek services use this utility. User-friendly error messages: "Сервис временно недоступен" for API failures, "AI вернул некорректный ответ" for parse errors.
- **Admin Error Notifications**: Automatic email notifications to admin (tanya.fskate@gmail.com) via Rusender when AI services fail after all retries. Throttled to max 1 email per 10 minutes per service. Fire-and-forget pattern (doesn't block user response). Function: `sendErrorNotification` in `server/services/email.ts`.
- **Unsubscribe Secret Rotation**: `verifyUnsubscribeToken` in `server/services/email.ts` supports a grace-period approach for rotating `UNSUBSCRIBE_SECRET`. Set `UNSUBSCRIBE_SECRET_PREV` to the old secret value when rotating. Tokens signed with the previous secret are accepted until `UNSUBSCRIBE_SECRET_PREV_EXPIRES` (ISO-8601 date, e.g. `2026-05-27T00:00:00Z`). If expiry is not set, the old secret is accepted until removed. When a token is accepted via the previous secret, a warning is logged. Once the grace period ends, remove both `UNSUBSCRIBE_SECRET_PREV` and `UNSUBSCRIBE_SECRET_PREV_EXPIRES` from the environment.