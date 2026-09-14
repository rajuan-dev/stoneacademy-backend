# StoneAcademy Payment + Stripe Connect Frontend Guide

This guide documents the current backend payment APIs for frontend integration.

Production API base:

```text
https://api.exercisewithme.org/api/v1
```

Imported Postman collection:

```text
postman/stoneacademy-payment-connect-flow.postman_collection.json
```

Do not expose backend Stripe secrets in the frontend. The frontend should only use the Stripe publishable key from its own frontend environment and the `client_secret` returned by the backend.

## Response Shape

Most REST APIs return:

```json
{
  "success": true,
  "message": "Success message",
  "data": {},
  "meta": null,
  "timestamp": "2026-09-14T15:00:00.000Z"
}
```

Paginated APIs return the list in `data` and pagination in `meta`.

## Auth

Most payment APIs require:

```http
Authorization: Bearer <accessToken>
```

Admin APIs require an admin or super admin token.

## Architecture Summary

Event-ticket payments use this flow:

1. Buyer pays the platform Stripe account.
2. No destination charge is created during checkout.
3. No creator transfer happens during checkout.
4. Backend records creator earning as pending.
5. Platform share is 10%.
6. Creator share is 90%.
7. Attendees cannot self-refund paid tickets.
8. If creator/admin cancels the event, backend attempts a 100% Stripe refund to the buyer.
9. If admin marks the event completed, backend attempts a Stripe Connect Transfer of the 90% creator share.
10. Creator can then withdraw from their connected Stripe account balance using Stripe Payout.

## Frontend Integration Flow

### 1. Host Connect Onboarding

A creator/host must connect Stripe before receiving event earnings.

#### Get Host Stripe State

```http
GET /hosts/me
Authorization: Bearer <hostAccessToken>
```

Use this to decide whether to show onboarding, dashboard, or payout UI.

Important response fields:

```json
{
  "data": {
    "stripeAccountId": "acct_123",
    "stripeOnboardingCompleted": true,
    "stripeChargesEnabled": true,
    "stripePayoutsEnabled": true,
    "stripeDetailsSubmitted": true,
    "stripeDisabledReason": null,
    "hasStripeAccount": true
  }
}
```

#### Create Connected Account

```http
POST /hosts/create-stripe-account
Authorization: Bearer <hostAccessToken>
Content-Type: application/json
```

Body:

```json
{
  "email": "host@example.com"
}
```

`email` is optional. If omitted, backend uses the authenticated user's email.

#### Create Onboarding Link

```http
POST /hosts/create-onboarding-link
Authorization: Bearer <hostAccessToken>
Content-Type: application/json
```

Body:

```json
{
  "refreshUrl": "https://app.exercisewithme.org/host/stripe/refresh",
  "returnUrl": "https://app.exercisewithme.org/host/stripe/return"
}
```

Frontend action:

1. Call this endpoint.
2. Redirect the browser to `data.url`.
3. After Stripe redirects back to `returnUrl`, call `POST /hosts/sync-onboarding-status`.
4. Then refresh `GET /hosts/me`.

#### Sync Onboarding Status

```http
POST /hosts/sync-onboarding-status
Authorization: Bearer <hostAccessToken>
```

Use this after returning from Stripe onboarding, or when the host opens the payout settings page.

#### Create Stripe Dashboard Login Link

```http
POST /hosts/create-dashboard-login-link
Authorization: Bearer <hostAccessToken>
```

Use this for a "Open Stripe Dashboard" button after onboarding is complete.

## 2. Buyer Event Ticket Checkout

### Recommended UI Flow

1. Buyer opens event details.
2. Call `GET /events/:eventId/join-status`.
3. If `paymentRequired` is `true` and `paymentVerified` is `false`, call `POST /billing/events/:eventId/checkout-intent`.
4. Use returned `paymentIntentClientSecret` with Stripe.js.
5. Confirm payment in browser.
6. After Stripe confirms success, call `GET /events/:eventId/join-status` until joined/payment status updates.
7. Optional fallback: call `POST /events/:eventId/join` with `providerReference` equal to the PaymentIntent ID.

### Get Join Status

```http
GET /events/:eventId/join-status
Authorization: Bearer <buyerAccessToken>
```

Example response:

```json
{
  "success": true,
  "message": "Event join status fetched successfully",
  "data": {
    "eventId": "66f000000000000000000001",
    "isJoined": false,
    "joinedAt": null,
    "paymentRequired": true,
    "paymentVerified": false,
    "paymentStatus": null,
    "providerReference": null
  },
  "meta": null,
  "timestamp": "2026-09-14T15:00:00.000Z"
}
```

### Create Event Checkout Intent

```http
POST /billing/events/:eventId/checkout-intent
Authorization: Bearer <buyerAccessToken>
```

No request body is required.

Example response:

```json
{
  "success": true,
  "message": "Checkout intent created successfully",
  "data": {
    "paymentIntentClientSecret": "pi_123_secret_abc",
    "paymentIntentId": "pi_123",
    "transaction": {
      "_id": "66f100000000000000000001",
      "eventId": "66f000000000000000000001",
      "payerId": "66e900000000000000000001",
      "creatorId": "66e800000000000000000001",
      "grossAmount": 100,
      "grossAmountMinor": 10000,
      "currency": "USD",
      "platformFeeAmount": 10,
      "platformFeeAmountMinor": 1000,
      "creatorShareAmount": 90,
      "creatorShareAmountMinor": 9000,
      "paymentStatus": "pending",
      "creatorEarningStatus": "pending",
      "refundStatus": "none",
      "transferStatus": "not_created",
      "paymentArchitecture": "platform_charge_delayed_transfer",
      "provider": "stripe",
      "providerReference": "pi_123",
      "stripePaymentIntentId": "pi_123"
    }
  },
  "meta": null,
  "timestamp": "2026-09-14T15:00:00.000Z"
}
```

### Stripe.js Example

```ts
import { loadStripe } from "@stripe/stripe-js";

const stripe = await loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

const checkout = await api.post(
  `/billing/events/${eventId}/checkout-intent`,
  {},
);

const clientSecret = checkout.data.data.paymentIntentClientSecret;
const paymentIntentId = checkout.data.data.paymentIntentId;

const result = await stripe?.confirmCardPayment(clientSecret, {
  payment_method: {
    card: cardElement,
  },
});

if (result?.error) {
  showError(result.error.message || "Payment failed");
} else if (result?.paymentIntent?.status === "succeeded") {
  await api.get(`/events/${eventId}/join-status`);
  // Optional fallback if the webhook has not joined the user yet:
  // await api.post(`/events/${eventId}/join`, { providerReference: paymentIntentId });
}
```

### Join Event After Successful Payment

```http
POST /events/:eventId/join
Authorization: Bearer <buyerAccessToken>
Content-Type: application/json
```

Body for paid event:

```json
{
  "providerReference": "pi_123"
}
```

For paid events, `providerReference` must match a succeeded transaction for that user and event. For free events, body can be `{}`.

Preferred behavior: rely on the webhook to confirm the participant, then use join status polling. Keep this manual join call as a fallback.

## 3. Buyer Transaction History

```http
GET /billing/transactions/me?page=1&limit=20&status=succeeded
Authorization: Bearer <buyerAccessToken>
```

Allowed `status` query values:

```text
pending, succeeded, failed, refunded
```

## 4. Cancellation and Refund Flow

Attendees cannot self-refund paid tickets.

### Attendee Leave Event

```http
POST /events/:eventId/leave
Authorization: Bearer <buyerAccessToken>
```

For paid tickets this returns an error:

```json
{
  "success": false,
  "message": "Paid event tickets are non-refundable and cannot be cancelled by attendee."
}
```

### Creator Cancels Their Event

```http
DELETE /events/:eventId
Authorization: Bearer <creatorAccessToken>
```

Backend behavior:

1. Marks the event `cancelled`.
2. Marks joined participants `cancelled`.
3. Finds successful paid transactions.
4. Attempts a 100% Stripe refund for each eligible transaction.
5. Cancels pending creator earning.
6. Does not transfer creator money.

Frontend behavior:

1. Show confirmation before calling this endpoint.
2. After success, show event status as cancelled.
3. Admin can inspect refund status with the admin refund APIs below.

### Admin Cancels Event

```http
PATCH /admin/events/:eventId/status
Authorization: Bearer <adminAccessToken>
Content-Type: application/json
```

Body:

```json
{
  "status": "cancelled"
}
```

This triggers the same cancellation refund process.

### Admin Refund Status

```http
GET /admin/events/:eventId/refunds/status
Authorization: Bearer <adminAccessToken>
```

Example response:

```json
{
  "success": true,
  "message": "Event refund status fetched",
  "data": {
    "eventId": "66f000000000000000000001",
    "eventStatus": "cancelled",
    "totalSuccessfulPaidTickets": 3,
    "refundPending": 1,
    "refundSucceeded": 2,
    "refundFailed": 0,
    "refundNone": 0,
    "totalRefundedAmountMinor": 20000,
    "totalRefundedAmount": 200,
    "failedTransactionIds": []
  },
  "meta": null,
  "timestamp": "2026-09-14T15:00:00.000Z"
}
```

### Admin Retry Failed Refunds

```http
POST /admin/events/:eventId/refunds/retry-failed
Authorization: Bearer <adminAccessToken>
```

Use this only after `refundFailed > 0`.

Example response:

```json
{
  "success": true,
  "message": "Failed event refunds retried",
  "data": {
    "eventId": "66f000000000000000000001",
    "totalFailed": 1,
    "retried": 1,
    "succeeded": 1,
    "stillFailed": 0,
    "skipped": 0,
    "results": [
      {
        "transactionId": "66f100000000000000000001",
        "status": "succeeded"
      }
    ]
  },
  "meta": null,
  "timestamp": "2026-09-14T15:00:00.000Z"
}
```

## 5. Event Completion and Creator Settlement

Only admin/super admin should mark an event completed.

```http
PATCH /admin/events/:eventId/status
Authorization: Bearer <adminAccessToken>
Content-Type: application/json
```

Body:

```json
{
  "status": "completed"
}
```

Backend behavior:

1. Marks event `completed`.
2. Finds successful, not-refunded, not-disputed transactions.
3. Creates Stripe Connect Transfers for the 90% creator share.
4. Leaves platform with the 10% platform share.
5. Failed transfers remain retryable by completing/settlement logic.

Frontend behavior:

1. Admin UI should show a confirmation modal.
2. After completion, refresh admin transaction/earning views.
3. Creator UI should refresh `GET /billing/earnings/me`.

## 6. Creator Earnings and Withdrawal

### Get Creator Earnings

```http
GET /billing/earnings/me
Authorization: Bearer <creatorAccessToken>
```

Example response:

```json
{
  "success": true,
  "message": "Earnings fetched successfully",
  "data": {
    "totalGross": 300,
    "totalPlatformFee": 30,
    "totalCreatorShare": 270,
    "pendingCreatorShare": 180,
    "transferredCreatorShare": 90,
    "transactionsCount": 3,
    "totalPaidOut": 0,
    "availableBalance": 90,
    "ledgerAvailableBalance": 90,
    "currency": "USD",
    "stripe": {
      "accountId": "acct_123",
      "onboardingCompleted": true,
      "chargesEnabled": true,
      "payoutsEnabled": true,
      "availableBalance": 90,
      "pendingBalance": 0,
      "currency": "USD"
    }
  },
  "meta": null,
  "timestamp": "2026-09-14T15:00:00.000Z"
}
```

### Creator Self Withdrawal

This creates a Stripe Payout from the creator's connected account balance to their bank/debit payout destination configured in Stripe.

```http
POST /billing/payouts/withdraw
Authorization: Bearer <creatorAccessToken>
Content-Type: application/json
```

Body:

```json
{
  "amount": 50,
  "currency": "USD",
  "note": "Weekly withdrawal"
}
```

`amount` is optional. If omitted, backend attempts to withdraw the full available Stripe balance for the selected currency.

### Creator Manual Payout Request

```http
POST /billing/payouts/request
Authorization: Bearer <creatorAccessToken>
Content-Type: application/json
```

Body:

```json
{
  "amount": 50,
  "currency": "USD",
  "note": "Please review payout"
}
```

This creates an internal payout request. It is separate from direct Stripe self-withdrawal.

### List My Payouts

```http
GET /billing/payouts/me?page=1&limit=20
Authorization: Bearer <creatorAccessToken>
```

## 7. Admin Billing APIs

### List All Transactions

```http
GET /billing/admin/transactions?page=1&limit=20&status=succeeded
Authorization: Bearer <adminAccessToken>
```

### List All Payout Requests

```http
GET /billing/admin/payouts?page=1&limit=20
Authorization: Bearer <adminAccessToken>
```

### Update Payout Request Status

```http
PATCH /billing/admin/payouts/:payoutId/status
Authorization: Bearer <adminAccessToken>
Content-Type: application/json
```

Body:

```json
{
  "status": "approved",
  "note": "Approved after review"
}
```

Allowed statuses:

```text
approved, rejected, paid
```

### Legacy Admin Creator Payout Request

```http
POST /admin/event-creators/:creatorId/payout
Authorization: Bearer <adminAccessToken>
Content-Type: application/json
```

Body:

```json
{
  "amount": 90,
  "currency": "USD",
  "note": "Manual review payout request"
}
```

Current backend behavior: creates a manual-review `PayoutRequest`; it does not create a Stripe Transfer or Stripe Payout directly.

### Admin Earning Transactions

```http
GET /admin/earnings/transactions?page=1&limit=20&status=succeeded
Authorization: Bearer <adminAccessToken>
```

### Admin Earning Transaction Details

```http
GET /admin/earnings/transactions/:transactionId
Authorization: Bearer <adminAccessToken>
```

### Generate Earning Invoice

```http
POST /admin/earnings/transactions/:transactionId/invoice
Authorization: Bearer <adminAccessToken>
```

## 8. Subscription Payment APIs

Subscriptions are separate from event-ticket payments.

### Get Subscription Fees

```http
GET /subscriptions/fees
```

### Get My Subscription

```http
GET /subscriptions/me
Authorization: Bearer <accessToken>
```

### Create Subscription Checkout Intent

```http
POST /subscriptions/checkout-intent
Authorization: Bearer <accessToken>
Content-Type: application/json
```

Body:

```json
{
  "plan": "monthly"
}
```

Allowed plans:

```text
monthly, yearly
```

Use the returned `clientSecret` with Stripe.js.

### Confirm Subscription Payment

```http
POST /subscriptions/confirm-payment
Authorization: Bearer <accessToken>
Content-Type: application/json
```

Body:

```json
{
  "paymentIntentId": "pi_123"
}
```

The normal Stripe webhook also handles subscription events, but the frontend can call this endpoint after browser confirmation to refresh state faster.

### Cancel Subscription

```http
POST /subscriptions/cancel
Authorization: Bearer <accessToken>
```

## 9. Stripe Webhooks

These are not frontend APIs. Configure them in Stripe Dashboard.

### Normal Stripe Webhook

```text
https://api.exercisewithme.org/api/v1/billing/webhook
```

Stripe Dashboard endpoint type:

```text
Your account
```

Payload:

```text
Snapshot
```

Signing secret env:

```text
STRIPE_WEBHOOK_SECRET
```

Handled events:

```text
payment_intent.succeeded
payment_intent.payment_failed
charge.refunded
refund.updated
refund.failed
charge.dispute.created
invoice.payment_succeeded
invoice.payment_failed
customer.subscription.created
customer.subscription.updated
customer.subscription.deleted
```

### Stripe Connect Webhook

```text
https://api.exercisewithme.org/api/v1/stripe/webhook
```

Stripe Dashboard endpoint type:

```text
Connected accounts
```

Payload:

```text
Snapshot
```

Signing secret env:

```text
STRIPE_CONNECT_WEBHOOK_SECRET
```

Handled event:

```text
account.updated
```

## 10. Frontend State Machine

### Buyer Ticket State

Use these states in the UI:

```text
not_joined
checkout_pending
payment_processing
joined
payment_failed
refunded
event_cancelled
```

Recommended mapping:

- `paymentRequired=false` and `isJoined=false`: show Join button.
- `paymentRequired=true` and `paymentVerified=false`: show Pay button.
- `paymentStatus=pending`: show Resume Payment.
- `paymentStatus=succeeded` or `isJoined=true`: show Joined.
- `paymentStatus=refunded`: show Refunded.

### Creator Earnings State

Use:

```text
pendingCreatorShare
transferredCreatorShare
availableBalance
stripe.availableBalance
stripe.pendingBalance
```

Only show "Withdraw" when:

- `stripe.onboardingCompleted === true`
- `stripe.payoutsEnabled === true`
- `stripe.availableBalance > 0`

## 11. Important Current Backend Notes

These are integration notes from the current implementation:

- Do not call webhook endpoints from frontend.
- Do not send ticket amount from frontend; backend calculates amount from event data.
- Do not build attendee refund UI for paid tickets; attendee self-refund is blocked.
- Do not show creator earnings as withdrawable until event completion creates a Stripe Transfer and Stripe connected-account balance becomes available.
- For paid event success, webhook should create the participant. Keep `POST /events/:eventId/join` with `providerReference` as a compatibility fallback only.
- `POST /billing/payouts/withdraw` is a Stripe connected-account payout, not the event settlement transfer itself.

