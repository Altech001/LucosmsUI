# Lucosms - SMS Dashboard Platform

## Overview

Lucosms is a modern SMS management dashboard built with Next.js that enables users to send, schedule, and track SMS messages. The platform provides comprehensive contact management, template creation, wallet/billing functionality, and developer API access. It's designed as a full-featured SMS campaign management system with real-time analytics and notification capabilities.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework**: Next.js 15+ with App Router (React Server Components)
- **UI Library**: Shadcn/ui components built on Radix UI primitives
- **Styling**: TailwindCSS v4 with custom design tokens using OKLCH color space
- **Type Safety**: TypeScript with strict mode enabled
- **Font System**: Geist Sans and Geist Mono for typography

**Key Design Decisions**:
- Uses App Router architecture with RSC (React Server Components) enabled for optimal performance
- Component-based architecture with reusable UI primitives in `/components/ui`
- Custom theme system supporting dark/light modes with persistent storage
- Client-side state management through React Context API for wallet and toast notifications
- File-based routing with dedicated layouts for SEO optimization per route

### Authentication & Authorization

**Provider**: Clerk (clerk/nextjs v6.33.3)
- **Architecture**: Middleware-based route protection with public/private route configuration
- **Token Management**: JWT-based session tokens obtained via `getToken()` for API authentication
- **Session Handling**: Automatic session refresh and validation through Clerk SDK
- **Keyless Mode**: Running in development with auto-generated instance (credentials in `.clerk/.tmp/`)

**Security Implementation**:
- Protected routes enforced via middleware (`middleware.ts`)
- Public routes: `/`, `/sign-in`, `/sign-up`, `/api/webhooks`
- Bearer token authentication for backend API calls
- User context propagation through Clerk's `useAuth` hook

### State Management

**Global State Contexts**:

1. **WalletContext** (`contexts/wallet-context.tsx`)
   - Manages wallet balance, transaction history, and notifications
   - Auto-refresh mechanism with configurable interval (default 30s)
   - Centralized API communication for wallet operations

2. **ToastContext** (`contexts/toast-context.tsx`)
   - Custom toast notification system
   - Auto-dismiss functionality (4 second timeout)
   - Support for success, error, info, and warning variants

3. **ThemeContext** (`components/theme-provider.tsx`)
   - System/light/dark theme management
   - LocalStorage persistence
   - System preference detection

### API Integration Layer

**Backend Service**: FastAPI backend hosted at `luco-backend.onrender.com`
- **Base URL**: `https://luco-backend.onrender.com/api/v1`
- **Authentication**: Bearer token passed in Authorization header
- **Error Handling**: Consistent error response handling with toast notifications

**API Endpoints Structure**:
- `/account/wallet` - Wallet balance and user data
- `/account/reports/*` - Analytics and message reports
- `/templates/` - Message template CRUD operations
- `/groups/` - Contact group management
- `/account/send-sms` - Single SMS dispatch
- `/account/send-bulk-sms` - Bulk SMS to groups
- `/account/schedule-sms` - Schedule messages for future delivery
- `/developers/api-keys` - API key management

**Data Fetching Pattern**:
- Client-side fetch with Clerk token injection
- Async/await pattern with try-catch error boundaries
- Loading states managed via local component state
- Toast notifications for success/error feedback

### Page Structure & Routing

**Core Routes**:
- `/` - Dashboard home (overview, stats, quick actions)
- `/compose` - Message composition and sending
- `/contact-collection` - Contact and group management
- `/template` - SMS template management
- `/schedule-messages` - Scheduled message management
- `/history` - Message history and analytics
- `/topup` - Wallet top-up and transaction history
- `/developer` - API key management
- `/settings` - User settings and preferences
- `/marketplace` - Service marketplace (sender IDs, integrations)
- `/profile` - User profile management

**Layout Strategy**:
- Shared `PageLayout` component with sidebar + navbar
- Per-route metadata for SEO (title, description, Open Graph)
- Breadcrumb navigation for user orientation
- Loading states via `loading.tsx` files

### UI Component System

**Component Library**: Custom implementation of Shadcn/ui patterns
- **Primitives**: Alert, Avatar, Badge, Button, Card, Checkbox, Dialog, Dropdown, Input, Label, Radio, Select, Separator, Skeleton, Switch, Table, Tabs, Textarea
- **Variants**: CVA (class-variance-authority) for style variants
- **Accessibility**: Built on Radix UI for WCAG compliance
- **Customization**: Tailwind-based with design token system

**Design System**:
- OKLCH color space for perceptual uniformity
- Custom CSS variables for theming (`--primary`, `--background`, etc.)
- New York style preset from Shadcn
- Responsive design with mobile-first approach

### Currency & Internationalization

**Currency System** (`contexts/wallet-context.tsx`):
- **Format**: Nigerian Naira (₦) with comma separators
- **Precision**: 2 decimal places for monetary values
- **Message Cost Calculation**: Based on backend-provided rates
- **Helper Functions**: `formatCurrency()`, `calculateMessages()`

## External Dependencies

### Authentication Service
- **Clerk**: User authentication and session management
- **Integration**: `@clerk/nextjs` package with middleware
- **Features**: Sign-in/sign-up flows, user management, session tokens
- **Environment**: Keyless development mode with auto-provisioned instance

### Backend API
- **Service**: FastAPI REST API
- **Host**: `luco-backend.onrender.com`
- **Database**: PostgreSQL (inferred from error logs showing psycopg2)
- **Features**: SMS sending, contact management, wallet operations, template storage, API key generation

### Third-Party Libraries
- **UI Components**: Radix UI primitives (@radix-ui/react-*)
- **Styling**: TailwindCSS v4 with autoprefixer
- **Icons**: Lucide React
- **Charts**: Recharts (for analytics visualization)
- **Date Handling**: date-fns
- **Form Validation**: @hookform/resolvers (React Hook Form integration)
- **Carousel**: Embla Carousel React
- **Analytics**: Vercel Analytics

### Development Tools
- **TypeScript**: Strict type checking
- **ESLint**: Code quality (build errors ignored for development)
- **Next.js**: Build and deployment framework
- **Hot Reload**: Fast refresh enabled

### SMS Provider
- **Backend Integration**: LucoSMS service (referenced in backend code)
- **Features**: Single and bulk SMS sending, delivery reports, sender ID management
- **Cost Model**: Per-message billing deducted from wallet balance