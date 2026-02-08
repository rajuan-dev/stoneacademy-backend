# StoneAcademy Backend Feature List (Source of Truth)

This checklist is prepared for a Node.js + Express + MongoDB/Mongoose backend with:
- Email OTP via Resend
- AWS S3 media storage
- Realtime chat
- Paid events with 10% platform fee / 90% creator share
- Admin module

Note: `stoneacademy.pdf` is not present in this repository, so this list is based on your provided requirements and currently available API/module structure.

## 1) Platform Core
- User roles: `user`, `creator`, `admin`, `super_admin`
- Account state: active/suspended/deleted + email verification state
- JWT auth with refresh token flow
- Global error handling, request validation, rate limiting, API docs

## 2) Auth and Account Lifecycle
- Register with email/password
- Login with email/password
- Email OTP send/verify (Resend-compatible email provider config exists)
- Forgot password + OTP verify + reset password
- Logout and token refresh
- Optional Google auth (future)

## 3) Profile and Identity
- My profile (read/update)
- Edit profile fields: name, email, phone, dob, gender, location
- Profile photo upload to S3
- Gallery upload/remove to S3
- Public profile endpoint (host profile view)
- Block/unblock user

## 4) Discovery and Taxonomy
- Category management
- Activity list search/filter/sort/pagination
- Geo filtering by radius
- Time-based filtering

## 5) Activities (Free/Social)
- Create/update/get/list/cancel activity
- Join/leave activity
- Participant limit validation
- QR activity pass generation per participant
- Activity pass fetch endpoint

## 6) Events (Paid Creator Module)
- Create/update/get/list/cancel event
- Event join/leave
- Paid vs free event filtering
- Ticket price + currency support
- Join restrictions (duplicate/full/already started)
- Creator cannot join own event
- Creator gating: event create requires active creator subscription

## 7) Creator Subscription
- Activate subscription (`monthly`/`yearly`)
- Cancel subscription
- Get my subscription
- Sync creator eligibility to user profile:
  - `creatorStatus.subscriptionActive`
  - `creatorStatus.subscriptionId`
  - auto role promotion/demotion (`user` <-> `creator`)

## 8) Payments and Revenue Split
- Payment transaction model for event ticketing
- Stored values:
  - gross amount
  - platform fee amount (10%)
  - creator share amount (90%)
  - provider reference
  - status
- Join-event flow records payment transaction for paid events

## 9) Notifications
- In-app notification entity + APIs
- Reminder scheduler (still missing)
- Join/rating/message/report/payout/support notifications

## 10) Realtime Messaging
- Socket server bootstrap exists
- Conversation list API + direct conversation creation
- Message send/list APIs
- Read receipts (conversation mark-read endpoint + socket emit)
- Typing indicators (API + socket events)
- Presence status events (basic online/offline emit)
- Chat moderation hooks (missing)

## 11) Reviews and Ratings
- Implemented:
  - rate activity/event host after participation
  - tag-based + comment feedback
  - user rating aggregation update

## 12) Reports and Trust/Safety
- Report endpoints/workflow implemented
- Admin moderation queue/actions implemented
- Abuse handling policies still missing (process-level)

## 13) Admin Backend
- Current: admin categories, admin seeder
- Implemented:
  - user management (list, status, role updates)
  - dashboard overview metrics
  - payout and transaction admin views
  - support ticket management APIs
- Missing:
  - explicit event/activity force-moderation endpoints
  - configurable platform policy/settings store

## 14) Earnings and Payouts
- Creator earnings summary API implemented
- Payout request + admin approval/rejection/paid APIs implemented
- Refund impact accounting still missing

## 15) Support Module
- Ticket APIs implemented (user create/list/reply, admin list/reply/status)
- Reply notifications implemented

## 16) Shop/Cart Module
- Product/cart/checkout module not implemented
- Keep out of MVP unless UI requires immediate release

## 17) Required Collections (target architecture)
- `users`
- `otp_codes`
- `media`
- `activities`
- `activity_participants`
- `qr_tokens`
- `events`
- `event_participants`
- `payment_transactions`
- `subscriptions`
- `conversations` (missing)
- `messages` (missing)
- `notifications` (missing)
- `reviews` (missing)
- `reports` (missing)
- `support_tickets` (missing)
- `admin_audit_logs` (missing)

## 18) API Groups (target)
- `/auth`
- `/users`
- `/categories`
- `/activities`
- `/events`
- `/subscriptions`
- `/payments` (partially represented via event join transaction record)
- `/billing` (transactions, earnings, payout flows, event checkout intent)
- `/messages`
- `/notifications`
- `/reviews`
- `/reports`
- `/support`
- `/admin/*` (expanded)

## 19) Implementation Status in This Repo
- Implemented: auth OTP flows, user profile + S3 media, categories, activities + join/leave + QR
- Implemented now: events + paid join transaction split tracking + creator subscription gating APIs + realtime chat core + notifications + reviews + reports + support + billing payouts + admin user/payment/support surfaces
- Partial: Stripe webhook lifecycle, event/activity moderation depth, policy/config modules, chat moderation workflows
- Missing: shop/cart, scheduled reminder engine, advanced refund automation, full productized admin policy center
