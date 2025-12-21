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
- **Subscription Tiers**: trial, standard, pro (stored in `subscriptionTier` field)
- **Access Control**: `hasActiveAccess()` checks trial or paid subscription validity
- **Admin Panel**: `/admin` route for user management (extend trials, assign subscriptions)
- **Protected Routes**: All core features require active trial or subscription
- **Landing Page**: Unauthenticated users see marketing landing page at root

### Recent Changes (December 2025)

- Added subscription fields to users table: `trialEndsAt`, `subscriptionExpiresAt`, `subscriptionTier`
- Implemented 3-day auto-trial on Replit Auth registration
- Created admin panel with user management features
- Added access status badge in header (shows days remaining)
- Protected all core routes with authentication middleware

## External Dependencies

- **Database**: PostgreSQL (DATABASE_URL environment variable required)
- **AI Provider**: DeepSeek API for content generation (DEEPSEEK_API_KEY required)
- **Authentication**: Replit OpenID Connect (ISSUER_URL, REPL_ID, SESSION_SECRET required)
- **UI Libraries**: Radix UI primitives, Embla Carousel, React Day Picker, Recharts
- **Build Tools**: Vite, esbuild for production builds, tsx for development