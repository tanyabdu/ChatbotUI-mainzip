# Esoteric Content Planner

## Project Structure (Updated December 2025)

Project files are now in the **root directory** (not in ChatbotUI-main subdirectory).
- `client/` - React frontend with Vite
- `server/` - Express backend
- `shared/` - Shared types and schemas
- `dist/` - Production build output
- `script/` - Build scripts

## Deployment Commands
- **Build**: `npm install` (triggers postinstall → npm run build automatically)
- **Run**: `npm start`
- **Type**: Reserved VM

## Overview

The Esoteric Content Planner is a mystical-themed marketing and content planning web application designed for spiritual and esoteric practitioners. It provides tools for content strategy generation, archetype-based branding analysis, voice-to-text content creation, case study management, and lunar calendar insights. The application combines spiritual aesthetics with modern web development practices to create an immersive planning experience.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework & Build System**
- React 18 with TypeScript for type-safe component development
- Vite as the build tool and development server for fast HMR (Hot Module Replacement)
- Wouter for lightweight client-side routing instead of React Router
- Path aliases configured for clean imports (`@/`, `@shared/`, `@assets/`)

**UI Component System**
- Shadcn UI component library with Radix UI primitives for accessible, unstyled components
- Custom styling system using Tailwind CSS with design tokens defined in CSS variables
- Mystical design theme with purple/pink gradient accents and dark mode support
- Custom fonts: Cormorant Garamond (serif, mystical headers) and Inter (sans-serif, body text)

**State Management**
- TanStack Query (React Query) for server state management and caching
- Local component state with React hooks for UI interactions
- Custom query client configuration with disabled refetching to reduce unnecessary API calls

**Component Structure**
- Feature-based components (ArchetypeQuiz, ContentGenerator, VoiceRecorder, CasesManager, LunarCalendar)
- Reusable UI components from Shadcn library (Button, Card, Dialog, etc.)
- Example components for documentation/testing purposes

### Backend Architecture

**Server Framework**
- Express.js for HTTP server and REST API routing
- Node.js with native HTTP server wrapped by Express
- TypeScript throughout for type safety
- Custom logging middleware for request tracking

**API Design**
- RESTful API endpoints organized by resource type
- Routes defined in `server/routes.ts` with controller logic inline
- Standard HTTP methods (GET, POST, DELETE) for CRUD operations
- JSON request/response format with Zod validation

**Data Access Layer**
- Storage abstraction interface (`IStorage`) for testability and flexibility
- `DatabaseStorage` class implements storage interface using Drizzle ORM
- Direct database queries without additional repository pattern

### Data Storage Solutions

**Database**
- PostgreSQL as the primary relational database
- Drizzle ORM for type-safe database queries and schema management
- Connection pooling via `pg` (node-postgres) library
- Schema-first approach with TypeScript types generated from Drizzle schemas

**Schema Design**
- Users table for authentication (username/password)
- Content strategies table with JSONB for flexible post data
- Archetype results table storing quiz outcomes and branding profiles
- Voice posts table for transcribed and generated content
- Case studies table with searchable fields and tags
- All tables use UUID primary keys generated via `gen_random_uuid()`

**Migrations**
- Drizzle Kit for schema migrations managed via `drizzle.config.ts`
- Migration files stored in `/migrations` directory
- Push-based deployment with `db:push` script for schema changes

### Authentication & Authorization

**Current Implementation**
- Custom JWT-based authentication with 7-day token expiration
- Tokens stored in localStorage, sent via Authorization header (Bearer token)
- bcryptjs for password hashing
- Email-based registration with auto-generated passwords sent via Rusender API

**Key Endpoints**
- POST `/api/auth/register` - Register with email, get password via email
- POST `/api/auth/login` - Login with email/password, receive JWT token
- GET `/api/auth/user` - Get current user info (requires auth)
- POST `/api/auth/forgot-password` - Reset password via email

**Admin Authorization**
- `requireAdmin` middleware checks `req.user.id` and verifies `isAdmin` flag in database
- Admin endpoints: `/api/admin/stats`, `/api/admin/users`, `/api/admin/users/:id`

### Build & Deployment

**Build Process**
- Custom build script (`script/build.ts`) using esbuild and Vite
- Client built with Vite to `dist/public` directory
- Server bundled with esbuild to `dist/index.cjs` (CommonJS output)
- Selective dependency bundling (allowlist) to optimize cold start performance
- Static file serving from built client in production

**Development vs Production**
- Development: Vite dev server with HMR and middleware mode
- Production: Express serves pre-built static files from dist/public
- Environment-based behavior via `NODE_ENV` variable

## External Dependencies

### Third-Party UI Libraries
- **Radix UI**: Comprehensive set of unstyled, accessible component primitives (Accordion, Dialog, Dropdown, Select, Toast, Tooltip, etc.)
- **Shadcn UI**: Pre-configured Radix components with Tailwind styling
- **Lucide React**: Icon library for consistent iconography
- **Embla Carousel**: Carousel/slider functionality
- **CMDK**: Command palette component

### Styling & Design
- **Tailwind CSS**: Utility-first CSS framework with custom theme configuration
- **class-variance-authority (CVA)**: Component variant management
- **clsx & tailwind-merge**: Conditional class name utilities

### Data Fetching & Validation
- **TanStack Query**: Server state management, caching, and synchronization
- **Zod**: Runtime type validation and schema definition
- **drizzle-zod**: Integration between Drizzle ORM and Zod for automatic schema validation
- **@hookform/resolvers**: Form validation resolver for React Hook Form (dependency present)

### Date & Time
- **date-fns**: Date manipulation and formatting library
- **suncalc**: Astronomical calculations for moon phases, illumination, and positions

### Development Tools
- **Replit plugins**: Runtime error modal, cartographer (development mapping), dev banner
- **tsx**: TypeScript execution for development and build scripts
- **Vite plugins**: React support, error overlays, development utilities

### Database & ORM
- **PostgreSQL**: Relational database (via `DATABASE_URL` environment variable)
- **Drizzle ORM**: Type-safe SQL query builder
- **pg (node-postgres)**: PostgreSQL client for Node.js
- **connect-pg-simple**: PostgreSQL session store for Express

### Subscription System
- **Tiers**: trial (3 days free), monthly (990₽/month), yearly (3990₽/year)
- **Access Control**: `hasActiveAccess()` validates trial or paid subscription
- **Generation Limits**: All users have unlimited access
- **Pricing Page**: `/pricing` route displays subscription plans with features comparison
- **Admin Management**: `/admin` route for extending trials and assigning subscriptions

### Content Generator Two-Step Generation (December 2025)
- **Step 1**: Fast generation of ideas only (10-20 seconds)
  - API: POST `/api/strategies/generate-ideas`
  - Returns: array of `{ day, idea, type }` + context for step 2
- **Step 2**: On-demand format generation (20-40 seconds each)
  - API: POST `/api/strategies/generate-format`
  - Generates single format when user clicks button
  - Formats: Post, Carousel, Reels, Stories
- **UI Flow**:
  1. User submits form → ideas appear quickly
  2. User clicks format button → that format generates
  3. Green checkmark shows which formats are ready
  4. Content displayed only after generation
- **State management**:
  - `generatedIdeas`: array of ContentIdea
  - `generationContext`: saved params for format generation
  - `generatedFormats`: Record<"day-format", FormatContent>
  - `loadingFormats`: Record<"day-format", boolean>

### Payment Integration (December 2025)
- **Prodamus**: Russian payment gateway integrated in test mode
  - Payment URL: https://Kati-klimovaa.payform.ru
  - Environment variables: `PRODAMUS_URL`, `PRODAMUS_SECRET_KEY`
  - Signature: HMAC-SHA256 with recursive JSON sorting
  - API Endpoints:
    - POST `/api/payments/create-link` - Generate payment URL for user
    - POST `/api/payments/webhook` - Receive payment notifications from Prodamus
    - GET `/api/payments/history` - User's payment history
  - Webhook URL for Prodamus: `https://<domain>/api/payments/webhook`
  - Custom params passed: `_param_user_id`, `_param_plan_type` (monthly/yearly)
  - Payments table stores: userId, orderId, amount, planType, status, prodamusData
  - Deduplication: order_id checked before processing to prevent double-counting

### Potential Future Integrations
- **Prepared packages**: OpenAI, Google Generative AI, Stripe, Nodemailer, Multer (file uploads), WebSocket support (ws)
- **Rate limiting**: express-rate-limit included but not configured
- **Excel support**: xlsx package for potential data import/export