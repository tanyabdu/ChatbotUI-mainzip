# Esoteric Content Planner

## Overview

The Esoteric Content Planner is a mystical-themed marketing and content planning web application designed for spiritual and esoteric practitioners (tarot readers, astrologers, numerologists). It provides AI-powered tools for content strategy generation, archetype-based brand identity quizzes, voice-to-post transcription, case study management, lunar calendar integration, and sales training. The application features a Russian-language interface with a dark mystical aesthetic using purple/pink gradients.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

- **Framework**: React 18 with TypeScript, using Vite as the build tool
- **Routing**: Wouter for lightweight client-side routing
- **UI Components**: Shadcn UI with Radix UI primitives, styled with Tailwind CSS
- **State Management**: TanStack Query (React Query) for server state and caching
- **Design Theme**: Dark mystical aesthetic with purple/pink gradients, custom fonts (Cormorant Garamond for headers, Inter for body)
- **Path Aliases**: `@/` for client source, `@shared/` for shared code, `@assets/` for attached assets

### Backend Architecture

- **Server**: Express.js with Node.js HTTP server
- **API Design**: RESTful endpoints with JSON request/response, Zod validation
- **Authentication**: Replit Auth with OpenID Connect, session-based with PostgreSQL session store
- **Database ORM**: Drizzle ORM with PostgreSQL
- **AI Services**: DeepSeek API for content generation (sales trainer module)

### Data Storage

- **Database**: PostgreSQL with Drizzle ORM
- **Schema Location**: `shared/schema.ts` with tables for users, sessions, content strategies, archetype results, voice posts, case studies, and sales trainer data
- **Session Storage**: PostgreSQL-backed sessions using connect-pg-simple

### Key Features

- **Content Generator**: AI-powered content strategy creation with archetype integration
- **Archetype Quiz**: Brand personality assessment with visual style recommendations
- **Voice Recorder**: Voice-to-text transcription with AI post generation
- **Cases Manager**: Client case study storage and search
- **Lunar Calendar**: 2026 lunar phase data for content timing
- **Money Trainer**: Sales response improvement using AI with few-shot examples

### Subscription & Access System

- **Trial System**: New users automatically receive a 3-day free trial upon registration
- **Subscription Tiers**: trial, monthly (990₽/month), yearly (3990₽/year)
- **Pricing Page**: `/pricing` route displays subscription plans with features and savings comparison
- **Access Control**: `hasActiveAccess()` checks trial or paid subscription validity
- **Generation Limits**: All users have unlimited access (trial, paid, admin)
- **Admin Panel**: `/admin` route for user management (extend trials, assign monthly/yearly subscriptions, create promocodes)
- **Protected Routes**: All core features require active trial or subscription
- **Landing Page**: Unauthenticated users see marketing landing page at root
- **Promocode System**: Users can activate promocodes in Grimoire (subscription tab) to get bonus days

### Promocode System

- **Tables**: `promocodes` (code, bonus_days, max_uses, used_count, is_active, expires_at), `promocode_usages` (tracks who used which code)
- **User Activation**: POST `/api/promocode/activate` - validates code, checks usage, extends subscription
- **Admin Endpoints**: GET/POST `/api/admin/promocodes` - view and create promocodes
- **UI Location**: Grimoire page → Subscription tab → "Активировать промокод" card

### Recent Changes (December 2025)

- Added promocode activation system for bonus subscription days
- Removed generation limits - all users have unlimited access
- Updated subscription tiers from standard/pro to monthly (990₽) and yearly (3990₽)
- Created pricing page with plan comparison and trial status display
- Added clickable subscription badge in header linking to pricing
- Real-time lunar calendar calculations using SunCalc library
- Admin panel updated for monthly/yearly subscription management
- Fixed deployment health checks: server starts listening immediately, DB uses lazy initialization
- Root endpoint (/) returns instant "OK" for health checks, redirects browsers to /app

## External Dependencies

- **Database**: External PostgreSQL on user's server (176.53.161.247)
  - Schema: `esoteric_planner` (separate schema for this project)
  - Environment variables: EXTERNAL_DB_HOST, EXTERNAL_DB_PORT, EXTERNAL_DB_NAME, EXTERNAL_DB_USER, EXTERNAL_DB_PASSWORD
- **AI Provider**: DeepSeek API for content generation (DEEPSEEK_API_KEY required)
- **Authentication**: Replit OpenID Connect (ISSUER_URL, REPL_ID, SESSION_SECRET required)
- **UI Libraries**: Radix UI primitives, Embla Carousel, React Day Picker, Recharts
- **Build Tools**: Vite, esbuild for production builds, tsx for development

### Database Initialization

To initialize the external database schema, run:
```bash
cd ChatbotUI-main && npx tsx server/initExternalDb.ts
```