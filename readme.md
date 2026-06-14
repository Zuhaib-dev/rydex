<div align="center">

<img src="https://rydexx.netlify.app/logo.png" width="80" alt="Rydex Logo" />

# Rydex

### A full-stack, real-time multi-vehicle booking & logistics platform

[![Next.js](https://img.shields.io/badge/Next.js-16.2-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-06B6D4?style=flat-square&logo=tailwindcss)](https://tailwindcss.com/)
[![Socket.io](https://img.shields.io/badge/Socket.io-4.x-010101?style=flat-square&logo=socket.io)](https://socket.io/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-47A248?style=flat-square&logo=mongodb)](https://www.mongodb.com/)
[![Razorpay](https://img.shields.io/badge/Razorpay-Payments-02042B?style=flat-square&logo=razorpay)](https://razorpay.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow?style=flat-square)](https://opensource.org/licenses/MIT)
[![Live](https://img.shields.io/badge/Live-rydexx.netlify.app-00C7B7?style=flat-square&logo=netlify)](https://rydexx.netlify.app)

**Book any vehicle. Track every move. Pay in seconds.**  
Bikes · Cars · SUVs · Vans · Trucks · Auto-rickshaws

[Live Demo](https://rydexx.netlify.app) · [Frontend Docs](./rydexx/README.md) · [Socket Server Docs](./socketServer/README.md)

</div>

---

## Table of Contents

- [Overview](#overview)
- [Monorepo Structure](#monorepo-structure)
- [System Architecture](#system-architecture)
- [Tech Stack](#tech-stack)
- [Feature Map](#feature-map)
- [Data Models](#data-models)
- [Booking Lifecycle](#booking-lifecycle)
- [Matchmaker Algorithm](#matchmaker-algorithm)
- [Real-time Event Pipeline](#real-time-event-pipeline)
- [Observability & Distributed Tracing](#observability--distributed-tracing)
- [API Reference](#api-reference)
- [Environment Variables](#environment-variables)
- [Testing](#testing)
- [Getting Started](#getting-started)
- [Deployment](#deployment)
- [Author](#author)

---

## Overview

**Rydex** is a production-grade, real-time vehicle booking ecosystem. Think Uber, but for every vehicle type imaginable — from a ₹30 bike ride to a 10-tonne truck for industrial logistics.

The platform is split into two deployable units:

| Unit | Tech | Purpose |
|---|---|---|
| `rydexx/` | Next.js 16 + TypeScript | Frontend PWA + all REST API routes |
| `socketServer/` | Node.js + Express + Socket.IO | Dedicated real-time WebSocket engine |

---

## Monorepo Structure

```
rydex/
├── rydexx/                     # Next.js 16 App (Frontend + API)
│   ├── src/
│   │   ├── app/                # App Router pages & API routes
│   │   │   ├── (pages)/        # All UI pages (ride, bookings, fleet, etc.)
│   │   │   └── api/            # 40+ REST API route handlers
│   │   ├── components/         # 25+ React components
│   │   ├── lib/                # Core utilities (auth, db, matchmaker, socket, email)
│   │   ├── models/             # Mongoose schemas (User, Booking, Vehicle, etc.)
│   │   ├── redux/              # Global state (Redux Toolkit)
│   │   ├── hooks/              # Custom React hooks
│   │   └── middleware.ts       # Route protection middleware
│   ├── public/                 # Static assets (logo, hero image, PWA icons)
│   ├── next.config.ts          # Next.js + Turbopack + PWA config
│   └── package.json
│
├── socketServer/               # Real-time Engine (Socket.IO)
│   ├── index.js                # WebSocket server, CORS, matchmaker timer
│   ├── models/
│   │   └── user.models.js      # Lightweight user model (socketId, location)
│   └── package.json
│
└── readme.md                   # ← You are here
```

---

## System Architecture

```mermaid
graph TB
    subgraph "Client Layer"
        U["👤 User Browser (PWA)"]
        P["🚗 Partner Browser (PWA)"]
        A["🛡️ Admin Browser"]
    end

    subgraph "Next.js App Server (rydexx)"
        NX["Next.js 16 App Router"]
        MW["Middleware (Auth Guard)"]
        API["40+ REST API Routes"]
        MM["Matchmaker Engine"]
        AUTH["NextAuth.js (JWT + Google OAuth)"]
    end

    subgraph "Socket Engine (socketServer)"
        IO["Socket.IO Server :8000"]
        EMIT["/emit Bridge Endpoint"]
        TIMERS["20s Cascade Timers (Map)"]
    end

    subgraph "External Services"
        MDB[("🍃 MongoDB Atlas")]
        IK["🖼️ ImageKit CDN"]
        RZP["💳 Razorpay"]
        ZG["🎥 ZegoCloud Video KYC"]
        NM["📧 Nodemailer (SMTP)"]
    end

    U -->|HTTPS| NX
    P -->|HTTPS| NX
    A -->|HTTPS| NX

    U <-->|WebSocket| IO
    P <-->|WebSocket| IO

    NX --> MW
    MW --> API
    API --> MM
    API --> AUTH

    MM -->|POST /emit| EMIT
    EMIT --> TIMERS
    TIMERS -->|POST /cascade| API

    API <--> MDB
    IO <--> MDB
    API --> IK
    API --> RZP
    API --> ZG
    API --> NM
```

---

## Tech Stack

### Frontend (`rydexx`)

| Layer | Technology | Version | Role |
|---|---|---|---|
| Framework | **Next.js** | 16.2.1 | App Router, RSC, SSR, API Routes |
| Language | **TypeScript** | 5.x | Full type safety |
| Styling | **Tailwind CSS** | 4.x | Utility-first CSS |
| Animation | **Motion (Framer Motion)** | 12.x | Page & micro-animations |
| Maps | **Mapbox GL JS** + **React Map GL** | 3.x / 8.x | Live tracking, route display |
| Draw | **@mapbox/mapbox-gl-draw** | 1.5 | Surge zone polygon editor |
| State | **Redux Toolkit** | 2.x | Global user & booking state |
| Auth | **NextAuth.js v5** | beta.30 | Google OAuth + Credentials |
| HTTP | **Axios** | 1.x | Client-side API calls |
| Data Fetch | **SWR** | 2.x | Client-side data fetching with cache |
| Charts | **Recharts** | 3.x | Partner earnings & analytics |
| Icons | **Lucide React** | 1.x | Icon system |
| Payments | **Razorpay JS** | — | Checkout flow |
| Video KYC | **ZegoCloud UIKit** | 2.x | In-browser video calls |
| Images | **ImageKit** | 6.x | CDN upload + optimization |
| PWA | **@ducanh2912/next-pwa** | 10.x | Service worker, installable |
| Push Notifications | **Firebase Cloud Messaging** | 12.x | Browser push notifications |
| Email | **Nodemailer** | 7.x | Transactional email |
| DB Client | **Mongoose** | 9.x | MongoDB ODM |
| Realtime | **Socket.IO Client** | 4.x | WebSocket connection |
| Passwords | **bcryptjs** | 3.x | Password hashing |
| Observability | **OpenTelemetry SDK** | 0.203.x / 2.x | Distributed tracing & auto-instrumentation |

### Backend Socket Server (`socketServer`)

| Technology | Version | Role |
|---|---|---|
| **Node.js** | 24.x | Runtime |
| **Express** | 4.x | HTTP server + `/emit` endpoint |
| **Socket.IO** | 4.x | WebSocket engine |
| **Firebase Admin SDK** | 13.x | Push notifications (FCM) |
| **Redis** | 4.x | Distributed caching & pub/sub |
| **Mongoose** | 9.x | MongoDB ODM |
| **Axios** | 1.x | Internal HTTP calls (cascade) |
| **dotenv** | — | Environment config |
| **nodemon** | 3.x | Dev auto-restart |
| **OpenTelemetry SDK** | 0.203.x / 2.x | Distributed tracing, auto-instrumentation & trace propagation |

---

## Feature Map

### 👤 User Features
```
├── Auth
│   ├── Google OAuth (one-click)
│   ├── Email + Password (bcrypt)
│   └── OTP Email Verification
├── Booking
│   ├── Vehicle type selector (bike/car/SUV/van/truck/auto)
│   ├── Mapbox address autocomplete
│   ├── Real-time fare calculation (baseFare + perKm + waiting + surge)
│   ├── Scheduled bookings (book rides in advance)
│   ├── Razorpay checkout (UPI, cards, wallets)
│   └── Cash payment option
├── Ride Experience
│   ├── Live driver tracking (Mapbox + Socket.IO)
│   ├── OTP-verified pickup & drop
│   ├── In-app chat with driver
│   ├── SOS emergency trigger
│   └── Trip share link (public, no-auth)
├── Post-Ride
│   ├── Rate & review driver (1-5 stars)
│   ├── Detailed feedback comments
│   ├── Praise tag system
│   └── Driver rating aggregation
└── History
    └── Full booking history with status filters
```

### 🚗 Partner (Driver) Features
```
├── Onboarding
│   ├── 8-step onboarding flow
│   ├── Vehicle registration (type, model, plate, image)
│   ├── Document upload (ImageKit CDN)
│   ├── Bank details
│   ├── Pricing setup (baseFare, perKm, waitingCharge)
│   └── Video KYC (ZegoCloud)
├── Operations
│   ├── Live booking requests via push notifications (FCM)
│   ├── Accept / Reject incoming bookings
│   ├── Multi-device session support
│   ├── OTP-based ride start & end
│   ├── GPS location broadcast
│   └── In-app chat with rider
└── Analytics
    ├── Earnings dashboard (Recharts)
    ├── Weekly/monthly trends
    ├── Commission breakdown
    └── Booking history & status
```

### 🛡️ Admin Features
```
├── Partner Management
│   ├── Approve / Reject partner applications
│   ├── Approve / Reject vehicle registrations
│   └── Video KYC management
├── Pricing Management
│   ├── Surge zone editor (polygon draw on map)
│   ├── Dynamic multiplier-based pricing
│   └── Real-time surge status display
├── Live Map
│   ├── All active drivers on map
│   ├── Live booking heatmap
│   └── Surge zone editor (polygon draw)
├── Financials
│   └── Platform earnings & commission tracking
└── Reviews
    └── Pending partner/vehicle review queue
```

---

## Data Models

```mermaid
erDiagram
    USER {
        ObjectId _id
        string name
        string email
        string password
        enum role "user|partner|admin"
        boolean isEmailVerified
        string otp
        number partnerOnboardingSteps
        string mobileNumber
        enum partnerStatus "pending|approved|rejected"
        enum videoKycStatus "not_required|pending|in_progress|approved|rejected"
        string socketId
        string image
        GeoPoint location
        boolean isOnline
        number ratingAverage
        number ratingCount
        Map praiseTags
        string[] fcmTokens "Firebase Cloud Messaging tokens"
    }

    VEHICLE {
        ObjectId _id
        ObjectId owner
        enum type "bike|car|truck|loading|auto"
        string vehicleModel
        string vehicleNumber
        string imageUrl
        number baseFare
        number perKmRate
        number waitingCharge
        enum status "pending|approved|rejected"
        boolean isActive
    }

    BOOKING {
        ObjectId _id
        ObjectId user
        ObjectId driver
        ObjectId vehicle
        string pickupAddress
        string dropAddress
        GeoPoint pickupLocation
        GeoPoint dropLocation
        number fare
        enum status "requested|awaiting_payment|confirmed|arriving|arrived|started|completed|cancelled|rejected|expired|scheduled"
        enum paymentStatus "pending|paid|cash|failed"
        number adminCommission
        number partnerAmount
        string pickupOtp
        string dropOtp
        ObjectId[] attemptedDrivers
        enum vehicleType
        boolean sosTriggered
        Date scheduledTime "For scheduled bookings"
        number surgeMultiplier "Dynamic pricing"
    }

    REVIEW {
        ObjectId _id
        ObjectId booking
        ObjectId reviewer
        ObjectId reviewee
        number rating
        string comment
        string[] praiseTags
    }

    CHAT_MESSAGE {
        ObjectId _id
        ObjectId booking
        ObjectId sender
        string message
        Date createdAt
    }

    SURGE_ZONE {
        ObjectId _id
        string name
        GeoJSON geometry
        number multiplier
        boolean isActive
    }

    USER ||--o{ VEHICLE : "owns"
    USER ||--o{ BOOKING : "creates (user)"
    USER ||--o{ BOOKING : "drives (partner)"
    VEHICLE ||--o{ BOOKING : "used in"
    BOOKING ||--o{ CHAT_MESSAGE : "has"
    BOOKING ||--o{ REVIEW : "generates"
```

---

## Booking Lifecycle

```mermaid
stateDiagram-v2
    [*] --> scheduled : User schedules ride
    [*] --> requested : User books ride immediately

    requested --> awaiting_payment : Partner accepts
    requested --> expired : 20s timeout (matchmaker cascade)
    requested --> rejected : No drivers available

    scheduled --> requested : Scheduled time reached (cron triggers)

    awaiting_payment --> confirmed : Razorpay payment verified
    awaiting_payment --> cash : User selects cash

    confirmed --> arriving : Driver starts navigating
    cash --> arriving : Driver starts navigating

    arriving --> arrived : Driver reaches pickup

    arrived --> started : OTP verified at pickup

    started --> completed : OTP verified at drop

    completed --> [*]
    rejected --> [*]
    cancelled --> [*]

    requested --> cancelled : User cancels
    scheduled --> cancelled : User cancels
    confirmed --> cancelled : User cancels
    arriving --> cancelled : User cancels
```

---

## Matchmaker Algorithm

When a booking is created, the system assigns the nearest available driver. If that driver doesn't accept within **20 seconds**, the **cascade** triggers automatically.

```mermaid
flowchart TD
    A["User creates booking\n(POST /api/booking/create)"] --> B["Find nearest online approved partner\nwithin 5km radius via MongoDB $near"]
    B --> C{"Partner found?"}
    C -- No --> REJECT["Set status = rejected\nNotify user"]
    C -- Yes --> D["Assign driver to booking\nEmit new-booking via Socket.IO"]
    D --> E["Start 20s timer in socketServer"]
    E --> F{"Driver accepts\nwithin 20s?"}
    F -- Yes --> G["Booking proceeds → awaiting_payment"]
    F -- No --> H["POST /api/booking/:id/cascade"]
    H --> I["Add driver to attemptedDrivers\nFind next nearest driver\n(excluding already tried)"]
    I --> J{"Next driver found?"}
    J -- Yes --> D
    J -- No --> REJECT
```

---

## Real-time Event Pipeline

### Socket.IO Event Flow

```mermaid
sequenceDiagram
    participant U as User Client
    participant P as Partner Client
    participant IO as Socket.IO Server
    participant DB as MongoDB
    participant API as Next.js API
    participant FCM as Firebase Cloud Messaging

    Note over U, P: Both connect & send identity event
    U->>IO: identity(userId)
    IO->>DB: Update socketId + isOnline = true
    P->>IO: identity(partnerId)
    IO->>DB: Update socketId + isOnline = true

    Note over API, P: Booking created
    API->>IO: POST /emit {userId: partnerId, event: "new-booking"}
    IO->>P: Emit new-booking (WebSocket)
    IO->>FCM: sendPushNotification (if offline)
    FCM->>P: Browser push notification

    Note over P, IO: Partner accepts booking
    P->>U: join-booking(bookingId) [both join room]
    U->>IO: join-booking(bookingId)

    Note over P, U: Live tracking loop
    loop Every GPS update
        P->>IO: driver-location-update {bookingId, lat, lng}
        IO->>U: driver-location {lat, lng, status}
    end

    Note over P, U: In-app chat
    P->>IO: chat-message {rideId, message}
    IO->>U: chat-message
    U->>IO: chat-message {rideId, message}
    IO->>P: chat-message

    Note over U, DB: On socket reconnect
    U->>IO: identity(userId)
    IO->>DB: Sync active booking state
    DB->>U: Restore booking context

    Note over P, IO: Disconnect
    P->>IO: disconnect
    IO->>DB: isOnline = false, socketId = null
```

### Firebase Cloud Messaging (FCM)

When a user is **offline** or doesn't have an active WebSocket connection, the system automatically sends **browser push notifications** via FCM:

| Event | Notification | Triggered When |
|---|---|---|
| `new-booking` | "New Ride Request!" | Driver receives new booking |
| `booking-updated` | "Ride Status Updated" | Booking status changes |
| `new-notification` | Custom title & body | Admin or system notification |

**Implementation:**
- Client collects FCM tokens via `useFCM()` hook (requests browser notification permission)
- Tokens stored in `User.fcmTokens` array for multi-device support
- Server sends push via Firebase Admin SDK when WebSocket delivery fails
- Invalid/expired tokens are auto-cleaned from the database
- Clicking notification brings user to relevant page (e.g., `/ride/{bookingId}`)

---

## Observability & Distributed Tracing

Rydex includes full end-to-end distributed tracing utilizing **OpenTelemetry** to trace requests across services: `rydexx` (Next.js frontend/APIs) ➔ `socketServer` (Express WebSocket engine) ➔ Redis ➔ MongoDB.

### Architecture

```mermaid
graph LR
    subgraph "Next.js App (rydexx)"
        A["Incoming HTTP Requests"] --> B["tracing.ts (SDK)"]
        B --> C["matchmaker.ts (Custom Spans)"]
    end

    subgraph "Socket Server (socketServer)"
        D["W3C Traceparent Middleware"] --> E["tracing.ts (SDK)"]
        E --> F["MongoDB Auto-instrumentation"]
    end

    C -->|HTTP Post + Traceparent Header| D
    F --> G[("MongoDB / Redis")]
    B -->|OTLP Export| J["Jaeger UI (:16686)"]
    E -->|OTLP Export| J
```

### Features
1. **Context Propagation**: Automatically propagates trace context from the Next.js API client down to the socket server using standard W3C `traceparent` headers.
2. **Auto-Instrumentation**: Captures HTTP incoming/outgoing requests, Express routes and middleware operations, and MongoDB queries (including full database command sanitization).
3. **Manual Spanning**: Detailed lifecycle tracking of the `cascadeBooking` algorithm (including partner search, lock dispatching, and socket server updates) to isolate Matchmaker execution latencies.
4. **Resilient Production Mode**: In production, if `OTEL_EXPORTER_OTLP_ENDPOINT` is missing or undefined, tracing is disabled gracefully without logs pollution or runtime overhead.

### Local Setup
To run Jaeger locally using Docker:
```bash
docker run -d --name jaeger -p 16686:16686 -p 4317:4317 --restart unless-stopped jaegertracing/all-in-one:latest
```
Set the OTLP exporter endpoint in both `.env` configurations:
```env
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4317
```
Once configured, initiate a booking and view trace timelines at `http://localhost:16686`.

---

## API Reference

### Auth
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/auth/register` | Register with email + password |
| `POST` | `/api/auth/verify-email` | Verify OTP from email |
| `GET/POST` | `/api/auth/[...nextauth]` | NextAuth handlers (Google OAuth) |

### Booking
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/booking/create` | Create new booking + trigger matchmaker |
| `GET` | `/api/booking/my-active` | Get user's active booking |
| `GET` | `/api/booking/[id]/status` | Poll booking status |
| `POST` | `/api/booking/[id]/accept` | Partner accepts booking |
| `POST` | `/api/booking/[id]/reject` | Partner rejects booking |
| `POST` | `/api/booking/[id]/arriving` | Partner marks as arriving |
| `POST` | `/api/booking/[id]/arrived` | Partner marks as arrived |
| `POST` | `/api/booking/[id]/start` | Start ride (pickup OTP verified) |
| `POST` | `/api/booking/[id]/complete` | Complete ride (drop OTP verified) |
| `POST` | `/api/booking/[id]/cancel` | Cancel booking |
| `POST` | `/api/booking/[id]/cascade` | Internal: trigger matchmaker cascade |
| `POST` | `/api/booking/[id]/confirm-payment` | Verify Razorpay payment |
| `POST` | `/api/booking/[id]/sos` | Trigger SOS alert |
| `GET` | `/api/booking/[id]/share` | Public trip share link data |

### Partner
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/partner/onboarding/vehicle` | Register vehicle |
| `POST` | `/api/partner/onboarding/documents` | Upload KYC documents |
| `POST` | `/api/partner/onboarding/bank` | Save bank details |
| `POST` | `/api/partner/onboarding/pricing` | Set fare pricing |
| `GET` | `/api/partner/bookings/pending` | Pending booking requests |
| `GET` | `/api/partner/bookings/active` | Currently active ride |
| `GET` | `/api/partner/bookings/counts` | Badge counts (pending/active) |
| `POST` | `/api/partner/bookings/send-pickup-otp` | Send OTP to user |
| `POST` | `/api/partner/bookings/verify-pickup-otp` | Verify pickup OTP |
| `POST` | `/api/partner/bookings/send-drop-otp` | Send drop OTP |
| `POST` | `/api/partner/bookings/verify-drop-otp` | Verify drop OTP |
| `GET` | `/api/partner/earning` | Earnings data |
| `GET` | `/api/partner/analytics` | Full analytics dashboard data |
| `GET/POST` | `/api/partner/video-kyc` | Video KYC session |

### Admin
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/admin/dashboard` | Dashboard KPIs |
| `GET` | `/api/admin/earnings` | Platform commission data |
| `GET` | `/api/admin/map/live-data` | All active drivers for map |
| `GET` | `/api/admin/map/heatmap` | Booking heatmap data |
| `GET/POST` | `/api/admin/surge-zones` | Manage surge pricing zones |
| `GET` | `/api/admin/reviews/partner` | Pending partner approvals |
| `POST` | `/api/admin/reviews/partner/[id]/approve` | Approve partner |
| `POST` | `/api/admin/reviews/partner/[id]/reject` | Reject partner |
| `GET` | `/api/admin/reviews/vehicle` | Pending vehicle reviews |
| `GET` | `/api/admin/video-kyc/pending` | Pending KYC queue |
| `POST` | `/api/admin/video-kyc/start/[id]` | Start admin KYC session |
| `POST` | `/api/admin/video-kyc/complete/[id]` | Mark KYC complete |

### Payments
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/payment/create` | Create Razorpay order |
| `POST` | `/api/payment/verify` | Verify payment signature |

### Notifications
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/user/fcm-token` | Register FCM token for push notifications |
| `DELETE` | `/api/user/fcm-token` | Remove FCM token (on logout) |

### Other
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/me` | Get current user profile |
| `GET` | `/api/user/me` | Extended user data |
| `GET` | `/api/user/bookings` | User booking history |
| `GET` | `/api/vehicles` | List available vehicles |
| `GET` | `/api/vehicles/nearby` | Find nearby vehicles by type |
| `POST` | `/api/chat/send` | Send chat message |
| `GET` | `/api/chat/get-all` | Get all messages for a booking |
| `POST` | `/api/reviews` | Submit a review |
| `POST` | `/api/metrics/search-log` | Log a vehicle search |

### Socket Server Internal
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/health` | Health check |
| `POST` | `/emit` | Targeted socket emit by userId |

---

## Environment Variables

### `rydexx/.env.local`
```env
# Database
MONGODB_URL=mongodb+srv://<user>:<pass>@cluster.mongodb.net/rydex

# Auth
AUTH_SECRET=<random-secret-32-chars>
AUTH_GOOGLE_ID=<google-oauth-client-id>
AUTH_GOOGLE_SECRET=<google-oauth-client-secret>

# Socket Server
SOCKET_SERVER_URL=http://localhost:8000

# ImageKit
IMAGEKIT_PUBLIC_KEY=<public-key>
IMAGEKIT_PRIVATE_KEY=<private-key>
IMAGEKIT_URL_ENDPOINT=https://ik.imagekit.io/<your-id>

# Razorpay
RAZORPAY_KEY_ID=<key-id>
RAZORPAY_KEY_SECRET=<key-secret>

# Firebase Cloud Messaging
NEXT_PUBLIC_FIREBASE_API_KEY=<firebase-api-key>
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=<firebase-auth-domain>
NEXT_PUBLIC_FIREBASE_PROJECT_ID=<firebase-project-id>
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=<firebase-storage-bucket>
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=<firebase-messaging-sender-id>
NEXT_PUBLIC_FIREBASE_APP_ID=<firebase-app-id>
NEXT_PUBLIC_FIREBASE_VAPID_KEY=<firebase-vapid-key>

# ZegoCloud
ZEGO_APP_ID=<app-id>
ZEGO_SERVER_SECRET=<server-secret>

# Email
EMAIL_USER=<gmail-address>
EMAIL_PASS=<app-password>

# App
NEXT_PUBLIC_BASE_URL=http://localhost:3000
NEXT_PUBLIC_MAPBOX_TOKEN=<mapbox-token>

# OpenTelemetry Tracing (Optional in Dev / Safe fallback in Prod if blank)
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4317
```

### `socketServer/.env`
```env
PORT=8000
MONGODB_URL=mongodb+srv://<user>:<pass>@cluster.mongodb.net/rydex
NEXT_BASE_URL=http://localhost:3000
CLIENT_URL=http://localhost:3000

# Redis
REDIS_URL=redis://localhost:6379

# Firebase Admin SDK
FIREBASE_ADMIN_JSON_PATH=./firebase-admin.json

# OpenTelemetry Tracing (Optional in Dev / Safe fallback in Prod if blank)
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4317
```

---

## Testing

Rydex includes a comprehensive testing suite for both the Next.js app (`rydexx`) and the WebSocket engine (`socketServer`) to verify APIs, authentication, file uploads, and real-time events.

### Testing Architecture
* **In-Memory MongoDB:** Both directories use `mongodb-memory-server` to spin up isolated MongoDB instances in RAM for database integration tests.
* **In-Memory Redis:** The socket server mocks Redis clustering capabilities using `ioredis-mock`.
* **API Route Mocking:** NextAuth sessions and ImageKit file uploads are dynamically mocked for API validation.

### Running the Tests

**1. Next.js App / REST APIs (`rydexx`):**
```bash
cd rydexx
npm run test
```

**2. WebSocket Server (`socketServer`):**
```bash
cd socketServer
npm run test
```

For detailed testing guides and structures, refer to [Frontend Testing Docs](./rydexx/README.md#testing) and [Socket Server Testing Docs](./socketServer/README.md#testing).

---

## Getting Started

### Prerequisites

- Node.js **v20+**
- MongoDB Atlas cluster (or local MongoDB)
- Mapbox account (free tier works)
- Google Cloud project with OAuth credentials
- Razorpay account (test mode)
- Docker Desktop (for running local dependencies like Redis and Jaeger)

### 1. Clone the repo

```bash
git clone https://github.com/Zuhaib-dev/rydex.git
cd rydex
```

### 2. Start Local Services (Docker)

Before running the backend or frontend services, make sure you have Redis and Jaeger running locally:

```bash
# Start Redis (Required for Socket Server Pub/Sub and scaling)
docker run -d --name rydex-redis -p 6379:6379 --restart unless-stopped redis:alpine

# Start Jaeger (Required to view OpenTelemetry distributed traces)
docker run -d --name jaeger -p 16686:16686 -p 4317:4317 --restart unless-stopped jaegertracing/all-in-one:latest
```

### 3. Start the Socket Server

```bash
cd socketServer
npm install
# Create .env from the template above
npm run dev
# → server started at 8000
```

### 4. Start the Next.js App

```bash
cd rydexx
npm install
# Create .env.local from the template above
npm run dev
# → http://localhost:3000
```

### 5. Access the app

| URL | Description |
|---|---|
| `http://localhost:3000` | Public landing page |
| `http://localhost:3000/user/book` | Book a ride (auth required) |
| `http://localhost:3000/partner/...` | Partner dashboard |
| `http://localhost:8000/health` | Socket server health check |
| `http://localhost:16686` | Jaeger UI (OpenTelemetry distributed tracing) |

---

## Deployment

| Service | Unit | Notes |
|---|---|---|
| **Netlify** | `rydexx` | SSR via Netlify Next.js adapter |
| **Railway / Render** | `socketServer` | Always-on Node.js process |
| **MongoDB Atlas** | Database | Shared cluster, M0 free tier works |
| **ImageKit** | Media | Free 20GB/month |

> **Important:** The socket server must be deployed to a service that supports persistent WebSocket connections. Serverless platforms (Vercel functions, Netlify functions) **will not work** for `socketServer`.

---

## Author

<div align="center">

**Zuhaib Rashid**  
Full-stack engineer · UI/UX obsessive · Real-time systems nerd

[![Portfolio](https://img.shields.io/badge/Portfolio-zuhaibrashid.com-0078D4?style=for-the-badge&logo=microsoft-edge)](https://zuhaibrashid.com)
[![GitHub](https://img.shields.io/badge/GitHub-Zuhaib--dev-181717?style=for-the-badge&logo=github)](https://github.com/Zuhaib-dev)
[![LinkedIn](https://img.shields.io/badge/LinkedIn-Zuhaib_Rashid-0A66C2?style=for-the-badge&logo=linkedin)](https://www.linkedin.com/in/zuhaib-rashid-661345318/)
[![Twitter](https://img.shields.io/badge/Twitter-@xuhaib__x9-1DA1F2?style=for-the-badge&logo=twitter)](https://x.com/xuhaib_x9)

*Built with obsessive attention to detail, real-world production patterns, and way too much coffee.*

</div> 