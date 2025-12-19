# Esoteric Content Planner

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
- Basic user storage schema with username/password fields
- No active authentication middleware implemented yet
- User-related API endpoints defined in storage interface but not exposed in routes
- Sessions support prepared via `connect-pg-simple` and `express-session` packages

**Prepared Architecture**
- Dependencies included for future implementation: `passport`, `passport-local`, `jsonwebtoken`
- Session store ready to use PostgreSQL via `connect-pg-simple`
- Storage layer includes user CRUD operations ready for authentication flow

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

### Development Tools
- **Replit plugins**: Runtime error modal, cartographer (development mapping), dev banner
- **tsx**: TypeScript execution for development and build scripts
- **Vite plugins**: React support, error overlays, development utilities

### Database & ORM
- **PostgreSQL**: Relational database (via `DATABASE_URL` environment variable)
- **Drizzle ORM**: Type-safe SQL query builder
- **pg (node-postgres)**: PostgreSQL client for Node.js
- **connect-pg-simple**: PostgreSQL session store for Express

### Potential Future Integrations
- **Prepared packages**: OpenAI, Google Generative AI, Stripe, Nodemailer, Multer (file uploads), WebSocket support (ws)
- **Rate limiting**: express-rate-limit included but not configured
- **Excel support**: xlsx package for potential data import/export