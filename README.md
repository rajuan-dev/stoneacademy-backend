# Stone Academy - Enterprise Backend API & Realtime Service
**Platform:** [exercisewithme.org](https://exercisewithme.org) | `api.exercisewithme.org`  
**API Documentation:** [https://api.exercisewithme.org/docs](https://api.exercisewithme.org/docs) (or local `http://localhost:5000/docs`)  
**Raw OpenAPI Spec:** [https://api.exercisewithme.org/docs.json](https://api.exercisewithme.org/docs.json)

---

## 📋 Overview

**Stone Academy** is a high-performance community fitness and creator event platform backend built with Node.js 22 LTS, Express 5, TypeScript 5.8, MongoDB/Mongoose, Stripe Connect, AWS S3, and Socket.io.

### Key Capabilities
* **Identity & Authentication:** JWT authentication with secure refresh token rotation, email OTP verification via Resend/SMTP, and role-based access control (`user`, `creator`, `admin`, `super_admin`).
* **Activities & Free Social Workouts:** Discovery, geofencing radius searches, registration, and QR activity pass generation.
* **Creator Events & Monetized Ticketing:** Paid events with automated **90% Creator / 10% Platform fee split**, participant roster caps, and Stripe PaymentIntent checkouts.
* **Creator Subscriptions:** Monthly ($29.99/mo) and yearly ($299.99/yr) creator membership passes gating paid event hosting.
* **Stripe Connect Express Payouts:** Automated host onboarding, instant balance withdrawals, manual payout review queues, and webhook processing.
* **Realtime Messaging:** Socket.io powered direct chat, activity/event host threads, presence tracking, typing indicators, and read receipts.
* **Trust, Safety & Moderation:** Abuse reporting, admin dispute resolution, account sanctions, and helpdesk support ticketing.
* **Dynamic CMS, Ads & Commerce:** In-app merchandise cart/checkout, dynamic CMS pages (Terms, Privacy, About Us), and targeted local ad cards.

---

## 🛠 Tech Stack

* **Runtime:** Node.js v22 LTS / `tsx`
* **Framework:** Express.js v5 with strict TypeScript
* **Database:** MongoDB with Mongoose ODM
* **Realtime:** Socket.io 4.8
* **Payments:** Stripe SDK (PaymentIntents, Stripe Connect Express, Webhooks)
* **File Storage:** AWS S3 (Presigned URLs / Multer-S3)
* **Validation:** Zod 4 runtime schema parsing
* **Documentation:** Swagger UI Express & Swagger-JSDoc (OpenAPI 3.0.3)
* **Logging:** Pino & Pino-HTTP structured JSON logger
* **Security:** Helmet, CORS, Express-Rate-Limit, Cookie-Parser, Compression

---

## 🚀 Quick Start Guide

### 1. Prerequisites
* Node.js `v22.x` or higher
* npm or bun
* Running MongoDB instance or MongoDB Atlas cluster connection string

### 2. Installation
```bash
git clone <repository-url>
cd stoneacademy/stoneacademy-backend
npm install
```

### 3. Environment Configuration
Create `.env` in `stoneacademy-backend/` (refer to `.env.example` or root `PROJECT_DOCUMENTATION.md` for full schema):
```ini
PORT=5000
APP_NAME="Stone Academy"
BASE_URL=/api/v1
MONGO_URI=mongodb+srv://...
JWT_SECRET=super_strong_jwt_access_secret_key_minimum_32_characters
JWT_REFRESH_SECRET=super_strong_jwt_refresh_secret_key_minimum_32_characters
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...
AWS_S3_BUCKET_NAME=stoneacademy-media
```

### 4. Seed Initial Super Admin
```bash
npm run seed:super-admin
```

### 5. Start Development Server
```bash
npm run dev
```
The server will boot at `http://localhost:5000`.

---

## 📖 Interactive Swagger API Documentation

Stone Academy features an interactive OpenAPI 3.0.3 Swagger interface documenting **177+ endpoints** across 32 domain modules:

* **Interactive Swagger UI:** Visit [`http://localhost:5000/docs`](http://localhost:5000/docs) in your browser.
* **OpenAPI 3.0 JSON Specification:** Available at [`http://localhost:5000/docs.json`](http://localhost:5000/docs.json).

### How to Authenticate in Swagger UI
1. Execute `POST /api/v1/auth/login` (for user/creator) or `POST /api/v1/admin/login` (for admin).
2. Copy the returned `accessToken`.
3. Click the green **Authorize** button at the top of `/docs`.
4. Enter `Bearer <your_access_token>` and click **Authorize**.
5. Test any protected endpoint directly from the browser!

---

## 📂 Module Directory Overview

All business domains are decoupled under `src/modules/`:

| Module | Route Prefix | Description |
| :--- | :--- | :--- |
| `auth` | `/api/v1/auth` | User registration, login, Google/Apple OAuth, OTP, password recovery |
| `user` | `/api/v1/users` | User profile, photo/cover uploads, galleries, ratings, blocklists |
| `activity` | `/api/v1/activities` | Free social workouts, radius searches, participants, QR passes |
| `event` | `/api/v1/events` | Paid creator events, pricing, capacity, ticket check-in passes |
| `subscription` | `/api/v1/subscriptions` | Creator tier subscription checkout intents and gating |
| `billing` | `/api/v1/billing` | Transactions, creator earnings (90/10 split), payouts, Stripe webhooks |
| `host-stripe` | `/api/v1/hosts` | Stripe Connect Express onboarding links, status, and dashboard logins |
| `chat` | `/api/v1/chat` | Realtime messaging threads with hosts and support |
| `message` | `/api/v1/messages` | 1-on-1 direct conversations, typing indicators, read receipts |
| `feed` | `/api/v1/feed` | Aggregated discovery feed and multi-criteria search |
| `community` | `/api/v1/community` | Social posts, comments, nested replies, post likes |
| `community-creator`| `/api/v1/community-creator` | Rich post publishing with multi-asset media attachments |
| `notification` | `/api/v1/notifications` | User notifications, unread badges, notification preferences |
| `review` | `/api/v1/reviews` | Post-workout host reviews and rating score aggregation |
| `report` | `/api/v1/reports` | Abuse reporting and moderation enforcement workflows |
| `support` | `/api/v1/support` | Helpdesk customer inquiry tickets and replies |
| `shop` | `/api/v1/shop` | Merchandise cart, items, and checkout |
| `ads` | `/api/v1/ads` | Promotional ad cards and sponsored city banners |
| `cms` | `/api/v1/cms` | Dynamic CMS pages, About Us, Privacy Policy, Terms & Conditions |
| `onboarding` | `/api/v1/onboarding` | Walkthrough carousel slides and onboarding status |
| `admin` | `/api/v1/admin` | Platform KPIs, user moderation, refund status, manual payouts |
| `admin-auth` | `/api/v1/admin` | Dedicated admin authentication and session revocation |
| `admin-notification`| `/api/v1/admin/notifications` | Administrative system alerts and telemetry |
| `settings` | `/api/v1/admin/settings`| Commission rate configuration, refund policies, admin credentials |

---

## 🧪 Testing & Validation

```bash
# Typecheck TypeScript codebase with strict compiler flags
npm run typecheck

# Run unit and integration tests
npm test

# Run ESLint validation
npm run lint
```

---

## 🚢 Production Deployment

Refer to [`DEPLOYMENT.md`](../DEPLOYMENT.md) and [`PROJECT_DOCUMENTATION.md`](../PROJECT_DOCUMENTATION.md) in the workspace root for complete Docker Compose orchestration, Nginx reverse proxy routing, and Let's Encrypt automated SSL certificate management.
