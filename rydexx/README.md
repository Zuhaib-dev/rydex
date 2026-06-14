<div align="center">

# `rydexx` — Rydex Frontend & API

### Next.js 16 · TypeScript · Tailwind CSS 4 · Mapbox · Socket.IO

[![Next.js](https://img.shields.io/badge/Next.js-16.2-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-v4-06B6D4?style=flat-square&logo=tailwindcss)](https://tailwindcss.com/)
[![PWA](https://img.shields.io/badge/PWA-Enabled-5A0FC8?style=flat-square&logo=pwa)](https://web.dev/progressive-web-apps/)

</div>

--- 

## What This Is

This is the main application — the **Next.js 16 App Router** project that serves:
- The **public landing page** (cinematic hero, feature bento, testimonials, CTA)
- The **user booking flow** (vehicle select → map → fare → checkout)
- The **partner dashboard** (live requests, earnings charts, KYC)
- The **admin control center** (live map, approvals, surge zones)
- **40+ REST API routes** (all under `/src/app/api/`)

---

## Project Structure

```
rydexx/
├── src/
│   ├── app/                            # Next.js App Router
│   │   ├── page.tsx                    # Root page (role-aware: user/partner/admin)
│   │   ├── layout.tsx                  # Root layout + SEO metadata + PWA tags
│   │   ├── globals.css                 # Tailwind + global scroll/font styles
│   │   ├── robots.ts                   # SEO robots config
│   │   ├── sitemap.ts                  # Auto-generated sitemap
│   │   │
│   │   ├── about/                      # About page
│   │   ├── bookings/                   # User booking history
│   │   ├── checkout/                   # Razorpay checkout page
│   │   ├── contact/                    # Contact page
│   │   ├── faq/                        # FAQ page
│   │   ├── fleet/                      # Browse vehicle fleet
│   │   ├── partner/                    # All partner routes
│   │   │   ├── active-ride/            # Current active ride view
│   │   │   ├── bookings/               # Partner booking history
│   │   │   ├── onboarding/             # 8-step onboarding wizard
│   │   │   ├── pending-requests/       # Incoming booking requests
│   │   │   └── vehicle/                # My vehicle management
│   │   ├── privacy/                    # Privacy policy
│   │   ├── ride/                       # Live ride tracking view
│   │   ├── share/                      # Public trip share (no auth)
│   │   ├── terms/                      # Terms of service
│   │   ├── user/
│   │   │   └── book/                   # Vehicle booking wizard
│   │   ├── video-kyc/                  # Video KYC session page
│   │   │
│   │   └── api/                        # ← All API routes (40+)
│   │       ├── auth/                   # Register, verify-email, NextAuth
│   │       ├── booking/                # Full booking CRUD & state machine
│   │       ├── admin/                  # Admin endpoints
│   │       ├── partner/                # Partner-specific endpoints
│   │       ├── payment/                # Razorpay create + verify
│   │       ├── chat/                   # In-ride messaging
│   │       ├── reviews/                # Post-ride reviews
│   │       ├── vehicles/               # Vehicle listings + nearby search
│   │       ├── metrics/                # Search log analytics
│   │       ├── me/                     # Current user profile
│   │       └── socket/                 # Socket auth connect
│   │
│   ├── components/                     # 25+ React components
│   │   ├── ── Landing Page ──
│   │   ├── HeroSection.tsx             # Cinematic hero (parallax, typewriter, CTA)
│   │   ├── LandingFeatures.tsx         # Dark bento-grid features
│   │   ├── LandingStats.tsx            # Animated count-up stats
│   │   ├── LandingHowItWorks.tsx       # 4-step dark how-it-works
│   │   ├── LandingTestimonials.tsx     # Review cards grid
│   │   ├── LandingCTA.tsx              # Final CTA with marquee
│   │   ├── VehicleSlider.tsx           # Scrollable vehicle category cards
│   │   ├── PublicHome.tsx              # Landing page composer
│   │   │
│   │   ├── ── Navigation ──
│   │   ├── Nav.tsx                     # Smart navbar (role-aware, profile dropdown)
│   │   ├── Footer.tsx                  # Footer with socials
│   │   │
│   │   ├── ── Auth ──
│   │   ├── AuthModel.tsx               # Sign in / Sign up modal
│   │   │
│   │   ├── ── Maps ──
│   │   ├── LiveTrackingMap.tsx         # Real-time driver tracking (Mapbox)
│   │   ├── RouteMap.tsx                # Static route display
│   │   ├── ShareTripMap.tsx            # Public trip share map
│   │   ├── AdminLiveMap.tsx            # Admin all-drivers map
│   │   │
│   │   ├── ── Partner ──
│   │   ├── PartnerDashboard.tsx        # Partner home (requests + stats)
│   │   ├── PartnerAnalyticsHub.tsx     # Full analytics (Recharts)
│   │   ├── PartnerEarningChart.tsx     # Earnings line chart
│   │   ├── StatusCard.tsx              # Booking status card (ride view)
│   │   ├── RideChat.tsx                # In-ride chat interface
│   │   │
│   │   ├── ── Admin ──
│   │   ├── AdminDashboard.tsx          # Admin KPI overview
│   │   ├── AdminEarning.tsx            # Commission charts
│   │   ├── KPI.tsx                     # KPI metric card
│   │   │
│   │   ├── ── Booking ──
│   │   ├── VehicleBookingCard.tsx      # Vehicle selection card
│   │   ├── CheckoutClient.tsx          # Razorpay checkout UI
│   │   ├── AnimateCard.tsx             # Animated card wrapper
│   │   ├── ContentList.tsx             # Feature list component
│   │   │
│   │   ├── ── Utility ──
│   │   ├── GeoUpdater.tsx              # Partner GPS broadcaster
│   │   ├── VideoKYCBanner.tsx          # KYC status banner
│   │   └── InstallPWA.tsx              # Add-to-homescreen prompt
│   │
│   ├── lib/                            # Core server-side utilities
│   │   ├── auth.ts                     # NextAuth config (Google + Credentials)
│   │   ├── db.ts                       # MongoDB connection singleton
│   │   ├── matchmaker.ts               # Cascade booking algorithm
│   │   ├── bookingEvents.ts            # Socket emit helpers
│   │   ├── socketServer.ts             # HTTP bridge to socket server
│   │   ├── socket.ts                   # Client-side Socket.IO singleton
│   │   ├── imagekit.ts                 # Server-side ImageKit auth
│   │   ├── imagekit-client.ts          # Client-side ImageKit upload
│   │   ├── razorpay.ts                 # Razorpay instance
│   │   ├── sendMail.ts                 # Nodemailer send helper
│   │   └── emailTemplate.ts            # HTML email templates
│   │
│   ├── models/                         # Mongoose schemas
│   │   ├── user.model.ts               # User (all roles)
│   │   ├── booking.model.ts            # Booking (full state machine)
│   │   ├── vehicle.model.ts            # Vehicle registration
│   │   ├── review.model.ts             # Post-ride reviews
│   │   ├── chatMessage.model.ts        # In-ride chat messages
│   │   ├── partnerBank.model.ts        # Partner bank details
│   │   ├── partnerDocs.model.ts        # KYC document storage
│   │   ├── searchLog.model.ts          # Search analytics
│   │   └── surgeZone.model.ts          # Dynamic pricing zones
│   │
│   ├── redux/                          # Global state management
│   │   ├── store.ts                    # Redux store
│   │   ├── userSlice.ts                # User data slice
│   │   └── ReduxProvider.tsx           # Client-side store provider
│   │
│   ├── hooks/                          # Custom React hooks
│   ├── middleware.ts                   # Route protection (auth guard)
│   ├── InitUser.tsx                    # Bootstrap user data on mount
│   ├── Provider.tsx                    # NextAuth SessionProvider
│   ├── global.d.ts                     # Global type declarations
│   └── types.d.ts                      # Shared type definitions
│
├── public/
│   ├── heroImage.jpg                   # Landing hero background
│   ├── logo.png                        # Rydex logo
│   ├── manifest.json                   # PWA manifest
│   ├── icon-72x72.png                  # PWA icons (multiple sizes)
│   ├── icon-96x96.png
│   ├── icon-144x144.png
│   ├── icon-192x192.png
│   ├── icon-512x512.png
│   ├── apple-touch-icon.png
│   └── ogimage.webp                    # Open Graph social image
│
├── next.config.ts                      # Next.js + Turbopack + PWA config
├── tailwind.config.ts                  # Tailwind v4 config
├── tsconfig.json                       # TypeScript config
└── package.json
```

---

## Page Routes

| Route | Auth | Role | Description |
|---|---|---|---|
| `/` | No | All | Landing page (role-aware home) |
| `/about` | No | All | About Rydex |
| `/contact` | No | All | Contact page |
| `/faq` | No | All | Frequently asked questions |
| `/fleet` | No | All | Browse vehicle types |
| `/privacy` | No | All | Privacy policy |
| `/terms` | No | All | Terms of service |
| `/bookings` | ✅ | user | Booking history |
| `/user/book` | ✅ | user | Book a vehicle |
| `/checkout` | ✅ | user | Razorpay checkout |
| `/ride` | ✅ | user | Live ride tracking |
| `/share/[id]` | No | All | Public trip share |
| `/partner/pending-requests` | ✅ | partner | Incoming booking requests |
| `/partner/active-ride` | ✅ | partner | Current ride management |
| `/partner/bookings` | ✅ | partner | Partner booking history |
| `/partner/vehicle` | ✅ | partner | My vehicle |
| `/partner/onboarding/...` | ✅ | partner | 8-step onboarding |
| `/video-kyc` | ✅ | partner/admin | Video KYC session |

---

## Component Architecture

```mermaid
graph TD
    subgraph "Layout (layout.tsx)"
        ROOT["RootLayout\n(ReduxProvider + SessionProvider + InitUser)"]
    end

    subgraph "Page (page.tsx)"
        HOME["Home (server component)"]
        HOME -->|role = user| PUB["PublicHome"]
        HOME -->|role = partner| PD["PartnerDashboard"]
        HOME -->|role = admin| AD["AdminDashboard"]
    end

    subgraph "PublicHome"
        PUB --> HERO["HeroSection\n(parallax, typewriter)"]
        PUB --> FEAT["LandingFeatures\n(bento grid)"]
        PUB --> STATS["LandingStats\n(count-up)"]
        PUB --> HOW["LandingHowItWorks\n(4 steps)"]
        PUB --> VS["VehicleSlider\n(horizontal scroll)"]
        PUB --> TEST["LandingTestimonials\n(review cards)"]
        PUB --> CTA["LandingCTA\n(marquee)"]
    end

    subgraph "Shared"
        NAV["Nav (role-aware)"]
        FOOT["Footer"]
        AUTH["AuthModel (modal)"]
    end
```

---

## Authentication Flow

```mermaid
sequenceDiagram
    participant C as Client
    participant NA as NextAuth
    participant DB as MongoDB
    participant G as Google OAuth

    alt Google Login
        C->>NA: signIn("google")
        NA->>G: OAuth redirect
        G->>NA: user profile callback
        NA->>DB: findOne({email}) or create new user
        NA->>C: JWT session (id, email, role, image)
    end

    alt Credentials Login
        C->>NA: signIn("credentials", {email, password})
        NA->>DB: findOne({email})
        DB->>NA: user document
        NA->>NA: bcrypt.compare(password, hash)
        NA->>C: JWT session (id, email, role)
    end

    Note over NA, DB: Every request refreshes role from DB
    C->>NA: getSession()
    NA->>DB: findOne({email}).select("role")
    NA->>C: Updated session with fresh role
```

---

## PWA Configuration

Rydex is fully installable as a Progressive Web App:

| Feature | Implementation |
|---|---|
| Service Worker | `@ducanh2912/next-pwa` (Workbox) |
| App Manifest | `/public/manifest.json` |
| Icons | 72 / 96 / 144 / 192 / 512px PNG + Apple touch |
| Theme Color | `#0a0a0a` (dark) |
| Status Bar | `black-translucent` (iOS) |
| Cache Strategy | Aggressive front-end nav caching |
| Offline | Service worker caches critical routes |

---

## Key Libraries Deep Dive

### Mapbox GL
Used for all map views. Three distinct map components:
- `LiveTrackingMap` — animates driver marker in real-time as Socket.IO pushes coords
- `RouteMap` — displays static pickup→drop route with polyline
- `AdminLiveMap` — clusters all active online partners on a single map

### Motion (Framer Motion v12)
Used throughout for:
- Parallax scroll on hero (`useScroll` + `useTransform`)
- `whileInView` entrance animations on every section
- Spring physics on modal sheets and dropdowns
- Infinite marquee in CTA section

### Redux Toolkit
Single slice: `userSlice` — stores the full user document after login. This avoids re-fetching from the DB on every page and keeps the nav/profile panel snappy.

### Recharts
Used in `PartnerEarningChart` and `PartnerAnalyticsHub` for:
- Area chart (weekly earnings)
- Bar chart (trip count by day)
- Pie chart (vehicle type distribution)

### Firebase Cloud Messaging (FCM)
Push notification system for offline users:
- Client-side: `useFCM()` hook requests browser notification permissions and manages FCM tokens
- Service Worker: `/public/firebase-messaging-sw.js` handles background notifications
- Multi-device support: Tokens stored per-device in `User.fcmTokens` array
- Automatic cleanup: Invalid tokens are removed server-side
- Events: Triggered on `new-booking`, `booking-updated`, and system notifications

---

## Environment Setup

```env
# .env.local
MONGODB_URL=mongodb+srv://...
AUTH_SECRET=...
AUTH_GOOGLE_ID=...
AUTH_GOOGLE_SECRET=...
SOCKET_SERVER_URL=http://localhost:8000
IMAGEKIT_PUBLIC_KEY=...
IMAGEKIT_PRIVATE_KEY=...
IMAGEKIT_URL_ENDPOINT=https://ik.imagekit.io/...
RAZORPAY_KEY_ID=...
RAZORPAY_KEY_SECRET=...
ZEGO_APP_ID=...
ZEGO_SERVER_SECRET=...
EMAIL_USER=...
EMAIL_PASS=...
NEXT_PUBLIC_BASE_URL=http://localhost:3000
NEXT_PUBLIC_MAPBOX_TOKEN=...
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...
NEXT_PUBLIC_FIREBASE_VAPID_KEY=...
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4317
```

---

## Push Notifications & FCM Setup

### useFCM Hook
Located at `/src/hooks/useFCM.ts`, this hook handles Firebase Cloud Messaging setup on the client:

```typescript
import { useFCM } from "@/hooks/useFCM";

export default function MyComponent() {
  const { fcmToken } = useFCM();
  
  // Hook automatically:
  // 1. Requests browser notification permission
  // 2. Initializes Firebase service worker
  // 3. Registers device and gets FCM token
  // 4. Sends token to backend via POST /api/user/fcm-token
  // 5. Listens for incoming push notifications
  // 6. Auto-redirects on notification click
}
```

### FCM Token Management
Users can have **multiple FCM tokens** (for multi-device support):

**Register Token:**
```bash
POST /api/user/fcm-token
{ "token": "firebase-fcm-token-string" }
```

**Remove Token (on logout):**
```bash
DELETE /api/user/fcm-token
{ "token": "firebase-fcm-token-string" }
```

### Service Worker for Background Notifications
The file `/public/firebase-messaging-sw.js` must exist for background notifications when the app is not in focus. This file is automatically loaded by the Firebase SDK.

### Notification Behavior
| Event | Trigger | Notification |
|---|---|---|
| `new-booking` | Driver receives a new ride request | "New Ride Request!" |
| `booking-updated` | Booking status changes (confirmed, arriving, etc.) | "Ride Status Updated" |
| `new-notification` | System or admin notification | Custom title & body |

Clicking a notification brings the user to the relevant page (e.g., `/ride/{bookingId}`).

---

## OpenTelemetry & Distributed Tracing

This frontend utilizes **OpenTelemetry** for full request tracing.

- **Initialization Hook**: Standard Next.js instrumentation bootstrap is defined at `src/instrumentation.ts` and loads the tracing engine from `src/lib/tracing.ts` at start time on the Node.js runtime.
- **Auto-Instrumentation**: Tracks all incoming HTTP routes/endpoints, outgoing requests (such as `/emit` backend calls), and Mongoose/MongoDB commands.
- **Manual Instrumentation**: Custom tracer spans are established inside `src/lib/matchmaker.ts` to log specific timings of matchmaker locks, partner queries, and cascades.
- **Production Safety**: If running in production with `NODE_ENV=production` and `OTEL_EXPORTER_OTLP_ENDPOINT` is blank/unset, tracing is skipped to avoid logging overhead.

---

```bash
# Install dependencies
npm install

# Start dev server (Turbopack)
npm run dev
# → http://localhost:3000

# Build for production
npm run build

# Start production server
npm start
```

> **Note:** `npm run dev` uses Turbopack by default (Next.js 16). The `turbopack: {}` config in `next.config.ts` suppresses the webpack compatibility warning.

---

## Testing

The frontend and API routes are tested using **Vitest** for unit and integration testing. We also have a configured **Playwright** template ready for End-to-End browser simulation tests (e.g., login, registration, and file uploads).

### Test Configuration
* **Test Runner:** Vitest ([vitest.config.ts](file:///Users/fs/Documents/rydex/rydexx/vitest.config.ts)) configured with `jsdom` and TypeScript path resolution.
* **Database Testing:** API integration tests connect to a local in-memory database server spun up by `mongodb-memory-server` in the test setup.
* **Mocks:**
  * **NextAuth:** Simulated using `vi.mock("@/lib/auth")` (casted to `any` to resolve NextAuth middleware signature conflicts).
  * **ImageKit:** Server-side file upload helper (`uploadOnImageKit`) is mocked to return static mock URLs.

### Executing Tests
```bash
# Run Vitest test suite once
npm run test

# Run Vitest in interactive watch mode
npm run test:watch

# Run TypeScript compilation check
npx tsc --noEmit
```

### Adding New API Tests
To add a test for an API route:
1. Create a `*.test.ts` file in the same folder as the route handler (e.g., `route.test.ts`).
2. Add `// @vitest-environment node` at the very top of the file to force Vitest to run in the Node environment (highly recommended for server-side API endpoints, avoiding JSDOM global class conflicts like `File`/`Blob` prototypes).
3. Set `process.env.MONGODB_URL` before dynamically importing your router handler to prevent ESM hoisting issues with environmental configuration.
   
Example template:
```typescript
// @vitest-environment node
import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";
import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";

let mongoServer: MongoMemoryServer;
let GET: any;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  process.env.MONGODB_URL = mongoServer.getUri();
  await mongoose.connect(process.env.MONGODB_URL);

  // Dynamically import handler to respect environmental variables
  const route = await import("./route");
  GET = route.GET;
});
```