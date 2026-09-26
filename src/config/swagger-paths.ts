/**
 * OpenAPI 3.0 Path Definitions for Stone Academy Platform API
 * Provides comprehensive documentation for all platform routes.
 */

export const swaggerPaths: Record<string, any> = {
  // ====================================================
  // 1. SYSTEM & HEALTH ENDPOINTS
  // ====================================================
  "/": {
    get: {
      tags: ["System"],
      summary: "Root service status",
      description: "Returns backend status, gateway uptime, and basic service descriptor.",
      responses: {
        200: {
          description: "Service is online and healthy",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ApiResponse" },
            },
          },
        },
      },
    },
  },
  "/healthz": {
    get: {
      tags: ["System"],
      summary: "Liveness and readiness healthcheck probe",
      description: "Used by Kubernetes / Docker / load balancers to probe backend health.",
      responses: {
        200: {
          description: "Health status OK",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: { type: "boolean", example: true },
                  message: { type: "string", example: "OK" },
                  status: { type: "string", example: "ok" },
                  uptime: { type: "number", example: 1245.3 },
                  timestamp: { type: "string", format: "date-time" },
                },
              },
            },
          },
        },
      },
    },
  },

  // ====================================================
  // 2. ADDITIONAL AUTH ENDPOINTS
  // ====================================================
  "/auth/admin/login": {
    post: {
      tags: ["Auth", "Admin Auth"],
      summary: "Admin login (Unified Auth Route)",
      description: "Authenticate administrative users and generate privileged JWT access and refresh tokens.",
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/AdminLoginRequest" },
          },
        },
      },
      responses: {
        200: {
          description: "Admin authenticated successfully",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/AdminLoginResponse" },
            },
          },
        },
        401: {
          description: "Invalid credentials or unauthorized role",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ErrorResponse" },
            },
          },
        },
      },
    },
  },
  "/auth/admin/change-password": {
    put: {
      tags: ["Auth", "Admin Auth"],
      summary: "Admin change password",
      description: "Change password for authenticated administrator.",
      security: [{ BearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/ChangePasswordRequest" },
          },
        },
      },
      responses: {
        200: {
          description: "Admin password successfully changed",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ApiResponse" },
            },
          },
        },
      },
    },
  },
  "/auth/logout-all": {
    post: {
      tags: ["Auth"],
      summary: "Revoke all user sessions",
      description: "Invalidates all active refresh tokens and sessions for the caller.",
      security: [{ BearerAuth: [] }],
      responses: {
        200: {
          description: "All active sessions revoked successfully",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ApiResponse" },
            },
          },
        },
      },
    },
  },

  // ====================================================
  // 3. ADDITIONAL USER PROFILE ENDPOINTS
  // ====================================================
  "/users/me": {
    delete: {
      tags: ["Users"],
      summary: "Delete my account",
      description: "Soft deletes or cancels the authenticated user account and revokes active credentials.",
      security: [{ BearerAuth: [] }],
      responses: {
        200: {
          description: "Account successfully deactivated/deleted",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ApiResponse" },
            },
          },
        },
      },
    },
  },
  "/users/me/cover-photo": {
    post: {
      tags: ["Users"],
      summary: "Upload cover banner photo",
      description: "Uploads cover banner photo to AWS S3 and links it to user profile.",
      security: [{ BearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          "multipart/form-data": {
            schema: {
              type: "object",
              properties: {
                photo: { type: "string", format: "binary" },
              },
            },
          },
        },
      },
      responses: {
        200: {
          description: "Cover photo uploaded successfully",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ApiResponse" },
            },
          },
        },
      },
    },
  },
  "/users/me/photos": {
    get: {
      tags: ["Users"],
      summary: "Get user photos",
      description: "Fetches user photos uploaded to their profile or event galleries.",
      security: [{ BearerAuth: [] }],
      responses: {
        200: {
          description: "List of photos retrieved",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ApiResponse" },
            },
          },
        },
      },
    },
  },
  "/users/me/videos": {
    get: {
      tags: ["Users"],
      summary: "Get user videos",
      description: "Fetches user videos uploaded to their profile.",
      security: [{ BearerAuth: [] }],
      responses: {
        200: {
          description: "List of user videos retrieved",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ApiResponse" },
            },
          },
        },
      },
    },
    post: {
      tags: ["Users"],
      summary: "Upload user video clips",
      description: "Uploads mp4/mov video files to S3.",
      security: [{ BearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          "multipart/form-data": {
            schema: {
              type: "object",
              properties: {
                media: {
                  type: "array",
                  items: { type: "string", format: "binary" },
                },
              },
            },
          },
        },
      },
      responses: {
        200: {
          description: "Videos uploaded successfully",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ApiResponse" },
            },
          },
        },
      },
    },
  },
  "/users/me/overview": {
    get: {
      tags: ["Users"],
      summary: "Get my user dashboard overview",
      description: "Returns summary counts: joined activities, hosted events, total workouts completed, and rating aggregates.",
      security: [{ BearerAuth: [] }],
      responses: {
        200: {
          description: "Overview metrics fetched",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ApiResponse" },
            },
          },
        },
      },
    },
  },
  "/users/me/joined/activities": {
    get: {
      tags: ["Users"],
      summary: "Get activities joined by current user",
      description: "Returns list of upcoming and past free activities user has joined.",
      security: [{ BearerAuth: [] }],
      parameters: [
        { in: "query", name: "page", schema: { type: "integer" } },
        { in: "query", name: "limit", schema: { type: "integer" } },
      ],
      responses: {
        200: {
          description: "Joined activities list",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ApiPaginatedResponse" },
            },
          },
        },
      },
    },
  },
  "/users/me/joined/events": {
    get: {
      tags: ["Users"],
      summary: "Get paid events joined by current user",
      description: "Returns list of creator events user has tickets for.",
      security: [{ BearerAuth: [] }],
      parameters: [
        { in: "query", name: "page", schema: { type: "integer" } },
        { in: "query", name: "limit", schema: { type: "integer" } },
      ],
      responses: {
        200: {
          description: "Joined events list",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ApiPaginatedResponse" },
            },
          },
        },
      },
    },
  },
  "/users/me/hosted/activities": {
    get: {
      tags: ["Users"],
      summary: "Get activities hosted by current user",
      description: "Returns list of free activities created and hosted by current user.",
      security: [{ BearerAuth: [] }],
      parameters: [
        { in: "query", name: "page", schema: { type: "integer" } },
        { in: "query", name: "limit", schema: { type: "integer" } },
      ],
      responses: {
        200: {
          description: "Hosted activities list",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ApiPaginatedResponse" },
            },
          },
        },
      },
    },
  },
  "/users/me/hosted/events": {
    get: {
      tags: ["Users"],
      summary: "Get events hosted by current creator",
      description: "Returns list of events hosted by creator.",
      security: [{ BearerAuth: [] }],
      parameters: [
        { in: "query", name: "page", schema: { type: "integer" } },
        { in: "query", name: "limit", schema: { type: "integer" } },
      ],
      responses: {
        200: {
          description: "Hosted events list",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ApiPaginatedResponse" },
            },
          },
        },
      },
    },
  },
  "/users/{id}/creator-profile": {
    get: {
      tags: ["Users"],
      summary: "Get full creator profile",
      description: "Fetches creator statistics, upcoming events, hosted activities, and ratings.",
      security: [{ BearerAuth: [] }],
      parameters: [
        { in: "path", name: "id", required: true, schema: { type: "string" } },
      ],
      responses: {
        200: {
          description: "Creator full profile",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ApiResponse" },
            },
          },
        },
      },
    },
  },
  "/users/{id}/host-profile": {
    get: {
      tags: ["Users"],
      summary: "Get public host profile",
      description: "Public view of an activity/event host with credentials and upcoming sessions.",
      parameters: [
        { in: "path", name: "id", required: true, schema: { type: "string" } },
      ],
      responses: {
        200: {
          description: "Host public profile",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ApiResponse" },
            },
          },
        },
      },
    },
  },

  // ====================================================
  // 4. CATEGORIES (ADMIN)
  // ====================================================
  "/admin/categories": {
    get: {
      tags: ["Categories", "Admin Operations"],
      summary: "List all categories (Admin)",
      description: "Admin view of all activity and event taxonomy categories including inactive/archived items.",
      security: [{ BearerAuth: [] }],
      parameters: [
        { in: "query", name: "page", schema: { type: "integer" } },
        { in: "query", name: "limit", schema: { type: "integer" } },
      ],
      responses: {
        200: {
          description: "Categories fetched",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ApiPaginatedResponse" },
            },
          },
        },
      },
    },
  },

  // ====================================================
  // 5. ACTIVITIES (ADDITIONAL PATHS)
  // ====================================================
  "/activities/{id}/join-status": {
    get: {
      tags: ["Activities"],
      summary: "Check current user join status",
      description: "Checks whether authenticated user is currently registered as a participant.",
      security: [{ BearerAuth: [] }],
      parameters: [
        { in: "path", name: "id", required: true, schema: { type: "string" } },
      ],
      responses: {
        200: {
          description: "Join status returned",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ApiResponse" },
            },
          },
        },
      },
    },
  },
  "/activities/{id}/joined-users": {
    get: {
      tags: ["Activities"],
      summary: "List activity participants",
      description: "Returns public participant list for an activity.",
      security: [{ BearerAuth: [] }],
      parameters: [
        { in: "path", name: "id", required: true, schema: { type: "string" } },
      ],
      responses: {
        200: {
          description: "Participant list fetched",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ApiResponse" },
            },
          },
        },
      },
    },
  },
  "/activities/{id}/message-host": {
    post: {
      tags: ["Activities", "Chat & Realtime"],
      summary: "Message activity host",
      description: "Initializes a realtime chat thread between participant and activity host.",
      security: [{ BearerAuth: [] }],
      parameters: [
        { in: "path", name: "id", required: true, schema: { type: "string" } },
      ],
      responses: {
        200: {
          description: "Chat thread established with host",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ChatThread" },
            },
          },
        },
      },
    },
  },

  // ====================================================
  // 6. EVENTS (CREATOR & PAID MODULE)
  // ====================================================
  "/events": {
    get: {
      tags: ["Events"],
      summary: "List and search events",
      description: "Search and filter events by price type (free/paid), category, date, and geolocation.",
      parameters: [
        { in: "query", name: "q", schema: { type: "string" }, description: "Keyword search" },
        { in: "query", name: "priceType", schema: { type: "string", enum: ["free", "paid"] } },
        { in: "query", name: "category", schema: { type: "string" } },
        { in: "query", name: "dateFrom", schema: { type: "string", format: "date-time" } },
        { in: "query", name: "dateTo", schema: { type: "string", format: "date-time" } },
        { in: "query", name: "page", schema: { type: "integer" } },
        { in: "query", name: "limit", schema: { type: "integer" } },
      ],
      responses: {
        200: {
          description: "Events list fetched successfully",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ApiPaginatedResponse" },
            },
          },
        },
      },
    },
    post: {
      tags: ["Events"],
      summary: "Create event",
      description: "Creates an event. Requires active creator subscription tier.",
      security: [{ BearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          "multipart/form-data": {
            schema: { $ref: "#/components/schemas/CreateEventRequest" },
          },
          "application/json": {
            schema: { $ref: "#/components/schemas/CreateEventRequest" },
          },
        },
      },
      responses: {
        201: {
          description: "Event created successfully",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/Event" },
            },
          },
        },
        403: {
          description: "Active creator subscription required",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ErrorResponse" },
            },
          },
        },
      },
    },
  },
  "/events/{id}": {
    get: {
      tags: ["Events"],
      summary: "Get event details",
      description: "Fetch comprehensive event details, pricing, tickets remaining, and host profile.",
      parameters: [
        { in: "path", name: "id", required: true, schema: { type: "string" } },
      ],
      responses: {
        200: {
          description: "Event fetched successfully",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/Event" },
            },
          },
        },
      },
    },
    patch: {
      tags: ["Events"],
      summary: "Update event",
      description: "Allows the event creator to update event metadata, timing, and capacity.",
      security: [{ BearerAuth: [] }],
      parameters: [
        { in: "path", name: "id", required: true, schema: { type: "string" } },
      ],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/CreateEventRequest" },
          },
        },
      },
      responses: {
        200: {
          description: "Event updated",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/Event" },
            },
          },
        },
      },
    },
    delete: {
      tags: ["Events"],
      summary: "Cancel or remove event",
      description: "Cancels event and triggers automatic Stripe refunds for paid participants.",
      security: [{ BearerAuth: [] }],
      parameters: [
        { in: "path", name: "id", required: true, schema: { type: "string" } },
      ],
      responses: {
        200: {
          description: "Event cancelled successfully",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ApiResponse" },
            },
          },
        },
      },
    },
  },
  "/events/{id}/fee": {
    get: {
      tags: ["Events"],
      summary: "Get event pricing fee breakdown",
      description: "Returns platform fee (10%) and creator revenue share (90%) breakdown for ticket checkout.",
      parameters: [
        { in: "path", name: "id", required: true, schema: { type: "string" } },
      ],
      responses: {
        200: {
          description: "Fee breakdown returned",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/EventFeeBreakdown" },
            },
          },
        },
      },
    },
  },
  "/events/{id}/join-status": {
    get: {
      tags: ["Events"],
      summary: "Check event join/ticket status",
      description: "Checks whether current user has purchased a ticket or joined.",
      security: [{ BearerAuth: [] }],
      parameters: [
        { in: "path", name: "id", required: true, schema: { type: "string" } },
      ],
      responses: {
        200: {
          description: "Status returned",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ApiResponse" },
            },
          },
        },
      },
    },
  },
  "/events/{id}/joined-users": {
    get: {
      tags: ["Events"],
      summary: "List event ticket holders / participants",
      description: "Returns confirmed participant list.",
      security: [{ BearerAuth: [] }],
      parameters: [
        { in: "path", name: "id", required: true, schema: { type: "string" } },
      ],
      responses: {
        200: {
          description: "Participants fetched",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ApiResponse" },
            },
          },
        },
      },
    },
  },
  "/events/{id}/join": {
    post: {
      tags: ["Events"],
      summary: "Join event",
      description: "For free events, immediately registers participant. For paid events, returns checkout intent status.",
      security: [{ BearerAuth: [] }],
      parameters: [
        { in: "path", name: "id", required: true, schema: { type: "string" } },
      ],
      responses: {
        200: {
          description: "Successfully joined event",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ApiResponse" },
            },
          },
        },
      },
    },
  },
  "/events/{id}/leave": {
    post: {
      tags: ["Events"],
      summary: "Leave event",
      description: "Relinquishes participant ticket spot.",
      security: [{ BearerAuth: [] }],
      parameters: [
        { in: "path", name: "id", required: true, schema: { type: "string" } },
      ],
      responses: {
        200: {
          description: "Successfully left event",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ApiResponse" },
            },
          },
        },
      },
    },
  },
  "/events/{id}/pass": {
    get: {
      tags: ["Events"],
      summary: "Get event QR pass",
      description: "Fetches participant QR barcode pass used for venue check-in.",
      security: [{ BearerAuth: [] }],
      parameters: [
        { in: "path", name: "id", required: true, schema: { type: "string" } },
      ],
      responses: {
        200: {
          description: "Event pass returned",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/EventPass" },
            },
          },
        },
      },
    },
  },
  "/events/{id}/message-host": {
    post: {
      tags: ["Events", "Chat & Realtime"],
      summary: "Message event host",
      description: "Initiates a realtime chat thread with the event creator.",
      security: [{ BearerAuth: [] }],
      parameters: [
        { in: "path", name: "id", required: true, schema: { type: "string" } },
      ],
      responses: {
        200: {
          description: "Chat thread established",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ChatThread" },
            },
          },
        },
      },
    },
  },

  // ====================================================
  // 7. SUBSCRIPTIONS (CREATOR PASS)
  // ====================================================
  "/subscriptions/fees": {
    get: {
      tags: ["Subscriptions"],
      summary: "Get creator subscription pricing plans",
      description: "Fetches active monthly and yearly subscription fees and benefits.",
      responses: {
        200: {
          description: "Subscription fees retrieved",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/SubscriptionFeesResponse" },
            },
          },
        },
      },
    },
  },
  "/subscriptions/me": {
    get: {
      tags: ["Subscriptions"],
      summary: "Get current creator subscription",
      description: "Fetches active creator subscription status, renewal date, and billing period.",
      security: [{ BearerAuth: [] }],
      responses: {
        200: {
          description: "Subscription details retrieved",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/CreatorSubscription" },
            },
          },
        },
      },
    },
  },
  "/subscriptions/checkout-intent": {
    post: {
      tags: ["Subscriptions"],
      summary: "Create subscription Stripe checkout intent",
      description: "Creates Stripe PaymentIntent client secret to activate monthly or yearly creator membership.",
      security: [{ BearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/SubscriptionCheckoutIntentRequest" },
          },
        },
      },
      responses: {
        200: {
          description: "Checkout intent created",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/SubscriptionCheckoutIntentResponse" },
            },
          },
        },
      },
    },
  },
  "/subscriptions/confirm-payment": {
    post: {
      tags: ["Subscriptions"],
      summary: "Confirm subscription payment",
      description: "Validates Stripe payment and activates creator tier.",
      security: [{ BearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["paymentIntentId"],
              properties: {
                paymentIntentId: { type: "string", example: "pi_123456" },
              },
            },
          },
        },
      },
      responses: {
        200: {
          description: "Subscription confirmed and activated",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/CreatorSubscription" },
            },
          },
        },
      },
    },
  },
  "/subscriptions/cancel": {
    post: {
      tags: ["Subscriptions"],
      summary: "Cancel creator subscription",
      description: "Sets subscription to cancel at the end of the current billing cycle.",
      security: [{ BearerAuth: [] }],
      responses: {
        200: {
          description: "Subscription cancelled successfully",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ApiResponse" },
            },
          },
        },
      },
    },
  },

  // ====================================================
  // 8. BILLING, PAYOUTS & REVENUE SPLIT
  // ====================================================
  "/billing/transactions/me": {
    get: {
      tags: ["Billing & Payouts"],
      summary: "Get my transactions",
      description: "List all payments made or received by the current user.",
      security: [{ BearerAuth: [] }],
      parameters: [
        { in: "query", name: "status", schema: { type: "string", enum: ["pending", "succeeded", "failed", "refunded"] } },
        { in: "query", name: "page", schema: { type: "integer" } },
        { in: "query", name: "limit", schema: { type: "integer" } },
      ],
      responses: {
        200: {
          description: "Transactions paginated list",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ApiPaginatedResponse" },
            },
          },
        },
      },
    },
  },
  "/billing/earnings/me": {
    get: {
      tags: ["Billing & Payouts"],
      summary: "Creator earnings summary",
      description: "Returns aggregated revenue metrics: gross event sales, 10% platform fee, 90% creator share, available balance, and pending payouts.",
      security: [{ BearerAuth: [] }],
      responses: {
        200: {
          description: "Earnings summary",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/EarningsSummary" },
            },
          },
        },
      },
    },
  },
  "/billing/payouts/withdraw": {
    post: {
      tags: ["Billing & Payouts"],
      summary: "Instant self-withdrawal via Stripe Connect",
      description: "Transfers creator available earnings directly to connected Stripe Express bank account.",
      security: [{ BearerAuth: [] }],
      requestBody: {
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/CreatePayoutRequestBody" },
          },
        },
      },
      responses: {
        201: {
          description: "Withdrawal processed",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/PayoutRequest" },
            },
          },
        },
      },
    },
  },
  "/billing/payouts/request": {
    post: {
      tags: ["Billing & Payouts"],
      summary: "Request manual creator payout",
      description: "Submits a manual payout request to admin review queue.",
      security: [{ BearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/CreatePayoutRequestBody" },
          },
        },
      },
      responses: {
        201: {
          description: "Payout request created",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/PayoutRequest" },
            },
          },
        },
      },
    },
  },
  "/billing/payouts/me": {
    get: {
      tags: ["Billing & Payouts"],
      summary: "Get my payout history",
      description: "Returns status of all payout requests submitted by the creator.",
      security: [{ BearerAuth: [] }],
      parameters: [
        { in: "query", name: "page", schema: { type: "integer" } },
        { in: "query", name: "limit", schema: { type: "integer" } },
      ],
      responses: {
        200: {
          description: "Payouts list",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ApiPaginatedResponse" },
            },
          },
        },
      },
    },
  },
  "/billing/events/{eventId}/checkout-intent": {
    post: {
      tags: ["Billing & Payouts", "Events"],
      summary: "Create Stripe ticket checkout intent",
      description: "Creates Stripe PaymentIntent for paid event ticket purchase, calculating exact 90% creator / 10% platform split.",
      security: [{ BearerAuth: [] }],
      parameters: [
        { in: "path", name: "eventId", required: true, schema: { type: "string" } },
      ],
      responses: {
        200: {
          description: "Payment intent client secret returned",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  paymentIntentClientSecret: { type: "string" },
                  paymentIntentId: { type: "string" },
                  transaction: { $ref: "#/components/schemas/Transaction" },
                },
              },
            },
          },
        },
      },
    },
  },
  "/billing/admin/transactions": {
    get: {
      tags: ["Billing & Payouts", "Admin Subscriptions & Payouts"],
      summary: "List all transactions (Admin)",
      description: "System-wide ledger of all platform payments and transactions.",
      security: [{ BearerAuth: [] }],
      parameters: [
        { in: "query", name: "status", schema: { type: "string" } },
        { in: "query", name: "page", schema: { type: "integer" } },
        { in: "query", name: "limit", schema: { type: "integer" } },
      ],
      responses: {
        200: {
          description: "All transactions",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ApiPaginatedResponse" },
            },
          },
        },
      },
    },
  },
  "/billing/admin/payouts": {
    get: {
      tags: ["Billing & Payouts", "Admin Subscriptions & Payouts"],
      summary: "List all creator payouts (Admin)",
      description: "Queue of all pending, approved, and completed creator payouts.",
      security: [{ BearerAuth: [] }],
      parameters: [
        { in: "query", name: "page", schema: { type: "integer" } },
        { in: "query", name: "limit", schema: { type: "integer" } },
      ],
      responses: {
        200: {
          description: "Admin payouts queue",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ApiPaginatedResponse" },
            },
          },
        },
      },
    },
  },
  "/billing/admin/payouts/{id}/status": {
    patch: {
      tags: ["Billing & Payouts", "Admin Subscriptions & Payouts"],
      summary: "Update payout status (Admin)",
      description: "Approve, reject, or mark a payout request as paid.",
      security: [{ BearerAuth: [] }],
      parameters: [
        { in: "path", name: "id", required: true, schema: { type: "string" } },
      ],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/UpdatePayoutStatusBody" },
          },
        },
      },
      responses: {
        200: {
          description: "Payout status updated",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/PayoutRequest" },
            },
          },
        },
      },
    },
  },

  // ====================================================
  // 9. HOST STRIPE CONNECT
  // ====================================================
  "/hosts/me": {
    get: {
      tags: ["Host Stripe Connect"],
      summary: "Get host Stripe Connect account status",
      description: "Checks onboarding readiness, charges_enabled, and payouts_enabled flags.",
      security: [{ BearerAuth: [] }],
      responses: {
        200: {
          description: "Stripe Connect status",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/StripeHostStatus" },
            },
          },
        },
      },
    },
  },
  "/hosts/create-stripe-account": {
    post: {
      tags: ["Host Stripe Connect"],
      summary: "Create Stripe Express Connected Account",
      description: "Initializes a custom/express Stripe connected account for creator payouts.",
      security: [{ BearerAuth: [] }],
      requestBody: {
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: { email: { type: "string", format: "email" } },
            },
          },
        },
      },
      responses: {
        200: {
          description: "Stripe account created",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/StripeHostStatus" },
            },
          },
        },
      },
    },
  },
  "/hosts/create-onboarding-link": {
    post: {
      tags: ["Host Stripe Connect"],
      summary: "Create hosted onboarding link",
      description: "Generates one-time Stripe Express hosted onboarding redirect link.",
      security: [{ BearerAuth: [] }],
      requestBody: {
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                refreshUrl: { type: "string", format: "uri" },
                returnUrl: { type: "string", format: "uri" },
              },
            },
          },
        },
      },
      responses: {
        200: {
          description: "Onboarding link created",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/CreateOnboardingLinkResponse" },
            },
          },
        },
      },
    },
  },
  "/hosts/create-dashboard-login-link": {
    post: {
      tags: ["Host Stripe Connect"],
      summary: "Create Stripe Express dashboard login link",
      description: "Generates single-sign-on link allowing host to view their payouts, bank accounts, and 1099 tax forms.",
      security: [{ BearerAuth: [] }],
      responses: {
        200: {
          description: "Dashboard link generated",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/CreateDashboardLoginLinkResponse" },
            },
          },
        },
      },
    },
  },
  "/hosts/sync-onboarding-status": {
    post: {
      tags: ["Host Stripe Connect"],
      summary: "Sync onboarding status from Stripe",
      description: "Fetches latest account details from Stripe API and synchronizes user profile flags.",
      security: [{ BearerAuth: [] }],
      responses: {
        200: {
          description: "Status synced",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/StripeHostStatus" },
            },
          },
        },
      },
    },
  },

  // ====================================================
  // 10. REALTIME CHAT & MESSAGING
  // ====================================================
  "/chat/threads": {
    get: {
      tags: ["Chat & Realtime"],
      summary: "List user chat threads",
      description: "Fetches all active conversations with hosts, admins, or peers.",
      security: [{ BearerAuth: [] }],
      responses: {
        200: {
          description: "Chat threads list",
          content: {
            "application/json": {
              schema: {
                type: "array",
                items: { $ref: "#/components/schemas/ChatThread" },
              },
            },
          },
        },
      },
    },
  },
  "/chat/threads/host": {
    post: {
      tags: ["Chat & Realtime"],
      summary: "Open or get host chat thread",
      description: "Creates or fetches direct messaging thread with an activity/event host.",
      security: [{ BearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/CreateHostThreadBody" },
          },
        },
      },
      responses: {
        200: {
          description: "Host thread ready",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ChatThread" },
            },
          },
        },
      },
    },
  },
  "/chat/threads/admin": {
    post: {
      tags: ["Chat & Realtime"],
      summary: "Open admin support chat thread",
      description: "Creates or fetches direct support thread between user and support administration.",
      security: [{ BearerAuth: [] }],
      responses: {
        200: {
          description: "Admin thread ready",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ChatThread" },
            },
          },
        },
      },
    },
  },
  "/chat/threads/{threadId}/messages": {
    get: {
      tags: ["Chat & Realtime"],
      summary: "Get messages in thread",
      description: "Fetches historical chat messages for the specified thread.",
      security: [{ BearerAuth: [] }],
      parameters: [
        { in: "path", name: "threadId", required: true, schema: { type: "string" } },
      ],
      responses: {
        200: {
          description: "Messages list",
          content: {
            "application/json": {
              schema: {
                type: "array",
                items: { $ref: "#/components/schemas/ChatMessage" },
              },
            },
          },
        },
      },
    },
    post: {
      tags: ["Chat & Realtime"],
      summary: "Send message in thread",
      description: "Dispatches text or image message and emits realtime Socket.io event to members.",
      security: [{ BearerAuth: [] }],
      parameters: [
        { in: "path", name: "threadId", required: true, schema: { type: "string" } },
      ],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/SendThreadMessageBody" },
          },
        },
      },
      responses: {
        201: {
          description: "Message sent",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ChatMessage" },
            },
          },
        },
      },
    },
  },
  "/chat/threads/{threadId}/seen": {
    post: {
      tags: ["Chat & Realtime"],
      summary: "Mark thread as seen",
      description: "Updates read receipts for messages in the specified thread.",
      security: [{ BearerAuth: [] }],
      parameters: [
        { in: "path", name: "threadId", required: true, schema: { type: "string" } },
      ],
      responses: {
        200: {
          description: "Thread marked seen",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ApiResponse" },
            },
          },
        },
      },
    },
  },
  "/messages/conversations": {
    get: {
      tags: ["Messages"],
      summary: "List conversations (Direct Messaging)",
      description: "List conversations with latest preview and participant info.",
      security: [{ BearerAuth: [] }],
      responses: {
        200: {
          description: "Conversations list",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ApiResponse" },
            },
          },
        },
      },
    },
  },
  "/messages/conversations/direct": {
    post: {
      tags: ["Messages"],
      summary: "Start 1-on-1 direct conversation",
      description: "Initializes a conversation with target user.",
      security: [{ BearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["recipientId"],
              properties: {
                recipientId: { type: "string", example: "665fe91a3f6b4a2b6c3a1234" },
              },
            },
          },
        },
      },
      responses: {
        200: {
          description: "Conversation opened",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ApiResponse" },
            },
          },
        },
      },
    },
  },
  "/messages/conversations/support": {
    post: {
      tags: ["Messages"],
      summary: "Start support conversation",
      description: "Opens live chat conversation with platform support staff.",
      security: [{ BearerAuth: [] }],
      responses: {
        200: {
          description: "Support conversation opened",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ApiResponse" },
            },
          },
        },
      },
    },
  },
  "/messages/conversations/{conversationId}/messages": {
    get: {
      tags: ["Messages"],
      summary: "Get conversation messages",
      description: "Returns paginated message thread.",
      security: [{ BearerAuth: [] }],
      parameters: [
        { in: "path", name: "conversationId", required: true, schema: { type: "string" } },
      ],
      responses: {
        200: {
          description: "Messages list",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ApiResponse" },
            },
          },
        },
      },
    },
  },
  "/messages": {
    post: {
      tags: ["Messages"],
      summary: "Send direct message",
      description: "Sends message to an existing conversation.",
      security: [{ BearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["conversationId", "text"],
              properties: {
                conversationId: { type: "string" },
                text: { type: "string" },
              },
            },
          },
        },
      },
      responses: {
        201: {
          description: "Message delivered",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ApiResponse" },
            },
          },
        },
      },
    },
  },
  "/messages/read": {
    post: {
      tags: ["Messages"],
      summary: "Mark conversation messages read",
      description: "Marks conversation messages as read.",
      security: [{ BearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["conversationId"],
              properties: {
                conversationId: { type: "string" },
              },
            },
          },
        },
      },
      responses: {
        200: {
          description: "Conversation marked as read",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ApiResponse" },
            },
          },
        },
      },
    },
  },
  "/messages/typing": {
    post: {
      tags: ["Messages"],
      summary: "Broadcast typing indicator",
      description: "Emits typing status to peers in conversation.",
      security: [{ BearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["conversationId", "isTyping"],
              properties: {
                conversationId: { type: "string" },
                isTyping: { type: "boolean" },
              },
            },
          },
        },
      },
      responses: {
        200: {
          description: "Typing indicator broadcasted",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ApiResponse" },
            },
          },
        },
      },
    },
  },

  // ====================================================
  // 11. FEED
  // ====================================================
  "/feed": {
    get: {
      tags: ["Feed"],
      summary: "Get aggregated discovery feed",
      description: "Returns personalized activity and event feed based on user preferences and location.",
      security: [{ BearerAuth: [] }],
      parameters: [
        { in: "query", name: "page", schema: { type: "integer" } },
        { in: "query", name: "limit", schema: { type: "integer" } },
      ],
      responses: {
        200: {
          description: "Feed items retrieved",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ApiPaginatedResponse" },
            },
          },
        },
      },
    },
  },
  "/feed/search-filter": {
    get: {
      tags: ["Feed"],
      summary: "Search & filter feed",
      description: "Advanced multi-criteria search over upcoming activities and events.",
      security: [{ BearerAuth: [] }],
      parameters: [
        { in: "query", name: "q", schema: { type: "string" } },
        { in: "query", name: "category", schema: { type: "string" } },
        { in: "query", name: "type", schema: { type: "string" } },
        { in: "query", name: "priceType", schema: { type: "string", enum: ["free", "paid"] } },
        { in: "query", name: "page", schema: { type: "integer" } },
        { in: "query", name: "limit", schema: { type: "integer" } },
      ],
      responses: {
        200: {
          description: "Search results",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ApiPaginatedResponse" },
            },
          },
        },
      },
    },
  },

  // ====================================================
  // 12. NOTIFICATIONS
  // ====================================================
  "/notifications": {
    get: {
      tags: ["Notifications"],
      summary: "List notifications",
      description: "Fetches user in-app notifications with pagination.",
      security: [{ BearerAuth: [] }],
      parameters: [
        { in: "query", name: "page", schema: { type: "integer" } },
        { in: "query", name: "limit", schema: { type: "integer" } },
      ],
      responses: {
        200: {
          description: "Notifications list",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ApiPaginatedResponse" },
            },
          },
        },
      },
    },
  },
  "/notifications/unread-count": {
    get: {
      tags: ["Notifications"],
      summary: "Get unread notification count",
      description: "Returns count of unread notifications for badge display.",
      security: [{ BearerAuth: [] }],
      responses: {
        200: {
          description: "Unread count returned",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  count: { type: "integer", example: 3 },
                },
              },
            },
          },
        },
      },
    },
  },
  "/notifications/preferences": {
    get: {
      tags: ["Notifications"],
      summary: "Get notification preferences",
      description: "Returns user push and email notification preferences.",
      security: [{ BearerAuth: [] }],
      responses: {
        200: {
          description: "Preferences returned",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/NotificationPreferences" },
            },
          },
        },
      },
    },
    patch: {
      tags: ["Notifications"],
      summary: "Update notification preferences",
      description: "Toggle email, push, or reminder channels.",
      security: [{ BearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/NotificationPreferences" },
          },
        },
      },
      responses: {
        200: {
          description: "Preferences updated",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/NotificationPreferences" },
            },
          },
        },
      },
    },
  },
  "/notifications/{id}/read": {
    patch: {
      tags: ["Notifications"],
      summary: "Mark notification read",
      description: "Sets notification status to read.",
      security: [{ BearerAuth: [] }],
      parameters: [
        { in: "path", name: "id", required: true, schema: { type: "string" } },
      ],
      responses: {
        200: {
          description: "Notification marked as read",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ApiResponse" },
            },
          },
        },
      },
    },
  },
  "/notifications/read-all": {
    patch: {
      tags: ["Notifications"],
      summary: "Mark all notifications read",
      description: "Clears unread badge across all user notifications.",
      security: [{ BearerAuth: [] }],
      responses: {
        200: {
          description: "All notifications marked read",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ApiResponse" },
            },
          },
        },
      },
    },
  },
  "/notifications/{id}": {
    delete: {
      tags: ["Notifications"],
      summary: "Delete notification",
      description: "Permanently removes notification from feed.",
      security: [{ BearerAuth: [] }],
      parameters: [
        { in: "path", name: "id", required: true, schema: { type: "string" } },
      ],
      responses: {
        200: {
          description: "Notification deleted",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ApiResponse" },
            },
          },
        },
      },
    },
  },

  // ====================================================
  // 13. REVIEWS & RATINGS
  // ====================================================
  "/reviews": {
    get: {
      tags: ["Reviews"],
      summary: "List reviews",
      description: "List reviews filtered by targetUserId, activityId, or eventId.",
      parameters: [
        { in: "query", name: "targetUserId", schema: { type: "string" } },
        { in: "query", name: "targetType", schema: { type: "string", enum: ["activity", "event"] } },
        { in: "query", name: "targetId", schema: { type: "string" } },
        { in: "query", name: "page", schema: { type: "integer" } },
        { in: "query", name: "limit", schema: { type: "integer" } },
      ],
      responses: {
        200: {
          description: "Reviews fetched",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ApiPaginatedResponse" },
            },
          },
        },
      },
    },
    post: {
      tags: ["Reviews"],
      summary: "Submit review and rating",
      description: "Submits rating (1-5), quick feedback tags, and comment for an activity/event host.",
      security: [{ BearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/CreateReviewBody" },
          },
        },
      },
      responses: {
        201: {
          description: "Review created and host aggregate updated",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/Review" },
            },
          },
        },
      },
    },
  },

  // ====================================================
  // 14. REPORTS & MODERATION
  // ====================================================
  "/reports": {
    post: {
      tags: ["Reports"],
      summary: "Submit abuse report",
      description: "Reports abusive behavior, harassment, spam, or inappropriate content on a user, event, activity, or post.",
      security: [{ BearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/CreateReportBody" },
          },
        },
      },
      responses: {
        201: {
          description: "Report filed and queued for admin moderation",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/Report" },
            },
          },
        },
      },
    },
  },
  "/reports/mine": {
    get: {
      tags: ["Reports"],
      summary: "List reports submitted by me",
      description: "Returns list of reports filed by current user.",
      security: [{ BearerAuth: [] }],
      parameters: [
        { in: "query", name: "page", schema: { type: "integer" } },
        { in: "query", name: "limit", schema: { type: "integer" } },
      ],
      responses: {
        200: {
          description: "User reports list",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ApiPaginatedResponse" },
            },
          },
        },
      },
    },
  },
  "/reports/{id}": {
    get: {
      tags: ["Reports"],
      summary: "Get report details",
      description: "Returns status of report filed by user.",
      security: [{ BearerAuth: [] }],
      parameters: [
        { in: "path", name: "id", required: true, schema: { type: "string" } },
      ],
      responses: {
        200: {
          description: "Report fetched",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/Report" },
            },
          },
        },
      },
    },
  },
  "/admin/reports": {
    get: {
      tags: ["Reports", "Admin Reports"],
      summary: "List all abuse reports (Admin)",
      description: "Admin moderation triage queue.",
      security: [{ BearerAuth: [] }],
      parameters: [
        { in: "query", name: "status", schema: { type: "string", enum: ["open", "under_review", "resolved", "rejected"] } },
        { in: "query", name: "entityType", schema: { type: "string" } },
        { in: "query", name: "page", schema: { type: "integer" } },
        { in: "query", name: "limit", schema: { type: "integer" } },
      ],
      responses: {
        200: {
          description: "Moderation queue reports",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ApiPaginatedResponse" },
            },
          },
        },
      },
    },
  },
  "/admin/reports/{id}": {
    get: {
      tags: ["Reports", "Admin Reports"],
      summary: "Get report by ID (Admin)",
      description: "Deep details of reported item, reporting user, and target entity.",
      security: [{ BearerAuth: [] }],
      parameters: [
        { in: "path", name: "id", required: true, schema: { type: "string" } },
      ],
      responses: {
        200: {
          description: "Report details",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/Report" },
            },
          },
        },
      },
    },
  },
  "/admin/reports/{id}/resolve": {
    post: {
      tags: ["Reports", "Admin Reports"],
      summary: "Resolve report (Admin)",
      description: "Marks report resolved with administrative findings and corrective actions.",
      security: [{ BearerAuth: [] }],
      parameters: [
        { in: "path", name: "id", required: true, schema: { type: "string" } },
      ],
      requestBody: {
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/AdminResolveReportBody" },
          },
        },
      },
      responses: {
        200: {
          description: "Report resolved",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/Report" },
            },
          },
        },
      },
    },
  },
  "/admin/reports/{id}/dismiss": {
    post: {
      tags: ["Reports", "Admin Reports"],
      summary: "Dismiss report (Admin)",
      description: "Rejects report as invalid or unfounded.",
      security: [{ BearerAuth: [] }],
      parameters: [
        { in: "path", name: "id", required: true, schema: { type: "string" } },
      ],
      requestBody: {
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                dismissalReason: { type: "string" },
              },
            },
          },
        },
      },
      responses: {
        200: {
          description: "Report dismissed",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/Report" },
            },
          },
        },
      },
    },
  },
  "/admin/reports/{id}/action": {
    post: {
      tags: ["Reports", "Admin Reports"],
      summary: "Execute admin punitive action",
      description: "Executes enforcement action: issue warning, disable target user account, or restore user.",
      security: [{ BearerAuth: [] }],
      parameters: [
        { in: "path", name: "id", required: true, schema: { type: "string" } },
      ],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/AdminReportActionBody" },
          },
        },
      },
      responses: {
        200: {
          description: "Punitive action successfully executed",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/Report" },
            },
          },
        },
      },
    },
  },

  // ====================================================
  // 15. SUPPORT TICKETS
  // ====================================================
  "/support/tickets": {
    post: {
      tags: ["Support"],
      summary: "Create support ticket",
      description: "Submits a new helpdesk support inquiry.",
      security: [{ BearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/CreateTicketBody" },
          },
        },
      },
      responses: {
        201: {
          description: "Support ticket created",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/SupportTicket" },
            },
          },
        },
      },
    },
  },
  "/support/tickets/mine": {
    get: {
      tags: ["Support"],
      summary: "List my support tickets",
      description: "Returns all support tickets opened by the current user.",
      security: [{ BearerAuth: [] }],
      parameters: [
        { in: "query", name: "status", schema: { type: "string" } },
        { in: "query", name: "page", schema: { type: "integer" } },
        { in: "query", name: "limit", schema: { type: "integer" } },
      ],
      responses: {
        200: {
          description: "Tickets fetched",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ApiPaginatedResponse" },
            },
          },
        },
      },
    },
  },
  "/support/tickets/{id}": {
    get: {
      tags: ["Support"],
      summary: "Get support ticket thread",
      description: "Returns ticket conversation history and current status.",
      security: [{ BearerAuth: [] }],
      parameters: [
        { in: "path", name: "id", required: true, schema: { type: "string" } },
      ],
      responses: {
        200: {
          description: "Ticket details",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/SupportTicket" },
            },
          },
        },
      },
    },
  },
  "/support/tickets/{id}/reply": {
    post: {
      tags: ["Support"],
      summary: "User reply to ticket",
      description: "Appends message to ticket conversation thread.",
      security: [{ BearerAuth: [] }],
      parameters: [
        { in: "path", name: "id", required: true, schema: { type: "string" } },
      ],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/AddTicketReplyBody" },
          },
        },
      },
      responses: {
        200: {
          description: "Reply added",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/SupportTicket" },
            },
          },
        },
      },
    },
  },
  "/support/admin/tickets": {
    get: {
      tags: ["Support", "Admin Operations"],
      summary: "List all support tickets (Admin)",
      description: "Admin helpdesk triage queue.",
      security: [{ BearerAuth: [] }],
      parameters: [
        { in: "query", name: "status", schema: { type: "string" } },
        { in: "query", name: "page", schema: { type: "integer" } },
        { in: "query", name: "limit", schema: { type: "integer" } },
      ],
      responses: {
        200: {
          description: "Support queue tickets",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ApiPaginatedResponse" },
            },
          },
        },
      },
    },
  },
  "/support/admin/tickets/{id}/reply": {
    post: {
      tags: ["Support", "Admin Operations"],
      summary: "Admin reply to support ticket",
      description: "Posts official support agent response to ticket and notifies user.",
      security: [{ BearerAuth: [] }],
      parameters: [
        { in: "path", name: "id", required: true, schema: { type: "string" } },
      ],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/AddTicketReplyBody" },
          },
        },
      },
      responses: {
        200: {
          description: "Agent reply appended",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/SupportTicket" },
            },
          },
        },
      },
    },
  },
  "/support/admin/tickets/{id}/status": {
    patch: {
      tags: ["Support", "Admin Operations"],
      summary: "Update ticket status (Admin)",
      description: "Transitions ticket between open, in_progress, resolved, and closed.",
      security: [{ BearerAuth: [] }],
      parameters: [
        { in: "path", name: "id", required: true, schema: { type: "string" } },
      ],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["status"],
              properties: {
                status: { type: "string", enum: ["open", "in_progress", "resolved", "closed"] },
              },
            },
          },
        },
      },
      responses: {
        200: {
          description: "Ticket status updated",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/SupportTicket" },
            },
          },
        },
      },
    },
  },

  // ====================================================
  // 16. SHOP & CART
  // ====================================================
  "/shop/cart": {
    get: {
      tags: ["Shop"],
      summary: "Get shopping cart",
      description: "Returns cart contents, unit prices, and subtotal.",
      security: [{ BearerAuth: [] }],
      responses: {
        200: {
          description: "Cart retrieved",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/Cart" },
            },
          },
        },
      },
    },
  },
  "/shop/cart/items": {
    post: {
      tags: ["Shop"],
      summary: "Add item to cart",
      description: "Adds merchandise item to cart or increments quantity.",
      security: [{ BearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/AddToCartBody" },
          },
        },
      },
      responses: {
        200: {
          description: "Item added to cart",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/Cart" },
            },
          },
        },
      },
    },
  },
  "/shop/cart/items/{productId}": {
    patch: {
      tags: ["Shop"],
      summary: "Update cart item quantity",
      description: "Sets item quantity in cart.",
      security: [{ BearerAuth: [] }],
      parameters: [
        { in: "path", name: "productId", required: true, schema: { type: "string" } },
      ],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["quantity"],
              properties: { quantity: { type: "integer", minimum: 1 } },
            },
          },
        },
      },
      responses: {
        200: {
          description: "Quantity updated",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/Cart" },
            },
          },
        },
      },
    },
    delete: {
      tags: ["Shop"],
      summary: "Remove item from cart",
      description: "Deletes item from cart.",
      security: [{ BearerAuth: [] }],
      parameters: [
        { in: "path", name: "productId", required: true, schema: { type: "string" } },
      ],
      responses: {
        200: {
          description: "Item removed from cart",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/Cart" },
            },
          },
        },
      },
    },
  },
  "/shop/checkout": {
    post: {
      tags: ["Shop"],
      summary: "Checkout cart",
      description: "Generates checkout intent or external redirect for merchandise.",
      security: [{ BearerAuth: [] }],
      responses: {
        200: {
          description: "Checkout session created",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ApiResponse" },
            },
          },
        },
      },
    },
  },

  // ====================================================
  // 17. ADS & PROMOTIONAL BANNERS
  // ====================================================
  "/ads": {
    get: {
      tags: ["Ads"],
      summary: "List active ads and promotions",
      description: "Public listing of promotional cards and banners targeted by location.",
      parameters: [
        { in: "query", name: "city", schema: { type: "string" } },
        { in: "query", name: "state", schema: { type: "string" } },
      ],
      responses: {
        200: {
          description: "Active ads list",
          content: {
            "application/json": {
              schema: {
                type: "array",
                items: { $ref: "#/components/schemas/Ad" },
              },
            },
          },
        },
      },
    },
  },
  "/ads/admin": {
    get: {
      tags: ["Ads", "Admin Operations"],
      summary: "List all ads (Admin)",
      description: "Admin management list of active and expired ads.",
      security: [{ BearerAuth: [] }],
      parameters: [
        { in: "query", name: "status", schema: { type: "string", enum: ["active", "expired"] } },
        { in: "query", name: "page", schema: { type: "integer" } },
        { in: "query", name: "limit", schema: { type: "integer" } },
      ],
      responses: {
        200: {
          description: "Ads list",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ApiPaginatedResponse" },
            },
          },
        },
      },
    },
    post: {
      tags: ["Ads", "Admin Operations"],
      summary: "Create ad (Admin)",
      description: "Creates promotional ad banner with image attachment.",
      security: [{ BearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          "multipart/form-data": {
            schema: {
              type: "object",
              required: ["name", "linkUrl", "country"],
              properties: {
                name: { type: "string" },
                category: { type: "string" },
                description: { type: "string" },
                price: { type: "number" },
                linkUrl: { type: "string" },
                country: { type: "string" },
                state: { type: "string" },
                city: { type: "string" },
                image: { type: "string", format: "binary" },
              },
            },
          },
        },
      },
      responses: {
        201: {
          description: "Ad created",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/Ad" },
            },
          },
        },
      },
    },
  },
  "/ads/admin/migrate-products": {
    post: {
      tags: ["Ads", "Admin Operations"],
      summary: "Migrate shop products into ads format",
      description: "Utility endpoint converting existing shop products into sponsored ads cards.",
      security: [{ BearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["country"],
              properties: {
                country: { type: "string" },
                state: { type: "string" },
                city: { type: "string" },
                onlyActive: { type: "boolean" },
                deleteSource: { type: "boolean" },
              },
            },
          },
        },
      },
      responses: {
        200: {
          description: "Migration completed",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ApiResponse" },
            },
          },
        },
      },
    },
  },
  "/ads/admin/{id}": {
    patch: {
      tags: ["Ads", "Admin Operations"],
      summary: "Update ad (Admin)",
      description: "Updates ad content or status.",
      security: [{ BearerAuth: [] }],
      parameters: [
        { in: "path", name: "id", required: true, schema: { type: "string" } },
      ],
      requestBody: {
        content: {
          "multipart/form-data": {
            schema: {
              type: "object",
              properties: {
                name: { type: "string" },
                category: { type: "string" },
                description: { type: "string" },
                price: { type: "number" },
                linkUrl: { type: "string" },
                status: { type: "string", enum: ["active", "expired"] },
                image: { type: "string", format: "binary" },
              },
            },
          },
        },
      },
      responses: {
        200: {
          description: "Ad updated",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/Ad" },
            },
          },
        },
      },
    },
    delete: {
      tags: ["Ads", "Admin Operations"],
      summary: "Delete ad (Admin)",
      description: "Removes ad banner from platform.",
      security: [{ BearerAuth: [] }],
      parameters: [
        { in: "path", name: "id", required: true, schema: { type: "string" } },
      ],
      responses: {
        200: {
          description: "Ad deleted",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ApiResponse" },
            },
          },
        },
      },
    },
  },

  // ====================================================
  // 18. CMS & STATIC CONTENT
  // ====================================================
  "/cms/about-us": {
    get: {
      tags: ["CMS"],
      summary: "Get About Us page",
      description: "Returns official About Us markdown / HTML content.",
      responses: {
        200: {
          description: "Content returned",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/CmsPage" },
            },
          },
        },
      },
    },
  },
  "/cms/privacy-policy": {
    get: {
      tags: ["CMS"],
      summary: "Get Privacy Policy page",
      description: "Returns platform Privacy Policy.",
      responses: {
        200: {
          description: "Privacy policy returned",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/CmsPage" },
            },
          },
        },
      },
    },
  },
  "/cms/terms-and-conditions": {
    get: {
      tags: ["CMS"],
      summary: "Get Terms and Conditions page",
      description: "Returns platform Terms and Conditions.",
      responses: {
        200: {
          description: "Terms and conditions returned",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/CmsPage" },
            },
          },
        },
      },
    },
  },
  "/cms/pages/{slug}": {
    get: {
      tags: ["CMS"],
      summary: "Get custom CMS page by slug",
      description: "Fetches dynamic CMS page.",
      parameters: [
        { in: "path", name: "slug", required: true, schema: { type: "string" } },
      ],
      responses: {
        200: {
          description: "Page fetched",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/CmsPage" },
            },
          },
        },
      },
    },
  },
  "/cms/admin/pages": {
    get: {
      tags: ["CMS", "Admin Operations"],
      summary: "List all CMS pages (Admin)",
      description: "Admin view of all static and dynamic CMS pages.",
      security: [{ BearerAuth: [] }],
      responses: {
        200: {
          description: "CMS pages list",
          content: {
            "application/json": {
              schema: {
                type: "array",
                items: { $ref: "#/components/schemas/CmsPage" },
              },
            },
          },
        },
      },
    },
    post: {
      tags: ["CMS", "Admin Operations"],
      summary: "Create CMS page (Admin)",
      description: "Publishes new CMS page with unique slug.",
      security: [{ BearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["slug", "title", "content"],
              properties: {
                slug: { type: "string" },
                title: { type: "string" },
                content: { type: "string" },
              },
            },
          },
        },
      },
      responses: {
        201: {
          description: "Page created",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/CmsPage" },
            },
          },
        },
      },
    },
  },
  "/cms/admin/about-us": {
    put: {
      tags: ["CMS", "Admin Operations"],
      summary: "Upsert About Us content (Admin)",
      description: "Updates master About Us content.",
      security: [{ BearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/UpsertCmsPageBody" },
          },
        },
      },
      responses: {
        200: {
          description: "About Us updated",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/CmsPage" },
            },
          },
        },
      },
    },
  },
  "/cms/admin/privacy-policy": {
    put: {
      tags: ["CMS", "Admin Operations"],
      summary: "Upsert Privacy Policy content (Admin)",
      description: "Updates master Privacy Policy content.",
      security: [{ BearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/UpsertCmsPageBody" },
          },
        },
      },
      responses: {
        200: {
          description: "Privacy policy updated",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/CmsPage" },
            },
          },
        },
      },
    },
  },
  "/cms/admin/terms-and-conditions": {
    put: {
      tags: ["CMS", "Admin Operations"],
      summary: "Upsert Terms & Conditions content (Admin)",
      description: "Updates master Terms and Conditions content.",
      security: [{ BearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/UpsertCmsPageBody" },
          },
        },
      },
      responses: {
        200: {
          description: "Terms updated",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/CmsPage" },
            },
          },
        },
      },
    },
  },

  // ====================================================
  // 19. ONBOARDING
  // ====================================================
  "/onboarding/slides": {
    get: {
      tags: ["Onboarding"],
      summary: "Get onboarding slides",
      description: "Returns carousel slide assets, titles, and explanations shown to first-time app users.",
      responses: {
        200: {
          description: "Slides list returned",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ApiResponse" },
            },
          },
        },
      },
    },
  },
  "/onboarding/status": {
    get: {
      tags: ["Onboarding"],
      summary: "Get user onboarding status",
      description: "Returns whether user has completed or skipped initial onboarding walkthrough.",
      security: [{ BearerAuth: [] }],
      responses: {
        200: {
          description: "Onboarding status returned",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  completed: { type: "boolean", example: true },
                  skipped: { type: "boolean", example: false },
                },
              },
            },
          },
        },
      },
    },
  },
  "/onboarding/complete": {
    post: {
      tags: ["Onboarding"],
      summary: "Complete onboarding walkthrough",
      description: "Marks onboarding completed for user account.",
      security: [{ BearerAuth: [] }],
      responses: {
        200: {
          description: "Onboarding marked complete",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ApiResponse" },
            },
          },
        },
      },
    },
  },
  "/onboarding/skip": {
    post: {
      tags: ["Onboarding"],
      summary: "Skip onboarding walkthrough",
      description: "Marks onboarding skipped for user account.",
      security: [{ BearerAuth: [] }],
      responses: {
        200: {
          description: "Onboarding skipped",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ApiResponse" },
            },
          },
        },
      },
    },
  },

  // ====================================================
  // 20. ADMIN AUTH & CREDENTIALS
  // ====================================================
  "/admin/login": {
    post: {
      tags: ["Admin Auth"],
      summary: "Admin login",
      description: "Authenticates admin account and returns admin JWT session tokens.",
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/AdminLoginRequest" },
          },
        },
      },
      responses: {
        200: {
          description: "Admin authenticated",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/AdminLoginResponse" },
            },
          },
        },
      },
    },
  },
  "/admin/logout": {
    post: {
      tags: ["Admin Auth"],
      summary: "Admin logout",
      description: "Revokes current administrator session.",
      security: [{ BearerAuth: [] }],
      responses: {
        200: {
          description: "Logged out",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ApiResponse" },
            },
          },
        },
      },
    },
  },
  "/admin/logout-all": {
    post: {
      tags: ["Admin Auth"],
      summary: "Revoke all admin sessions",
      description: "Revokes all tokens across all devices for this admin.",
      security: [{ BearerAuth: [] }],
      responses: {
        200: {
          description: "All admin sessions terminated",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ApiResponse" },
            },
          },
        },
      },
    },
  },
  "/admin/profile": {
    get: {
      tags: ["Admin Auth", "Admin Operations"],
      summary: "Get admin profile",
      description: "Returns profile details for the logged-in admin.",
      security: [{ BearerAuth: [] }],
      responses: {
        200: {
          description: "Admin profile",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/AdminProfile" },
            },
          },
        },
      },
    },
    patch: {
      tags: ["Admin Auth", "Admin Operations"],
      summary: "Update admin profile",
      description: "Updates admin name, contact details, and avatar image.",
      security: [{ BearerAuth: [] }],
      requestBody: {
        content: {
          "multipart/form-data": {
            schema: {
              type: "object",
              properties: {
                fullName: { type: "string" },
                email: { type: "string", format: "email" },
                phone: { type: "string" },
                photo: { type: "string", format: "binary" },
              },
            },
          },
        },
      },
      responses: {
        200: {
          description: "Profile updated",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/AdminProfile" },
            },
          },
        },
      },
    },
    put: {
      tags: ["Admin Auth"],
      summary: "Update admin profile (Full)",
      description: "Full update of admin profile.",
      security: [{ BearerAuth: [] }],
      requestBody: {
        content: {
          "multipart/form-data": {
            schema: {
              type: "object",
              properties: {
                fullName: { type: "string" },
                email: { type: "string", format: "email" },
                phone: { type: "string" },
                photo: { type: "string", format: "binary" },
              },
            },
          },
        },
      },
      responses: {
        200: {
          description: "Profile updated",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/AdminProfile" },
            },
          },
        },
      },
    },
  },
  "/admin/password": {
    put: {
      tags: ["Admin Auth"],
      summary: "Change admin password",
      description: "Updates admin password.",
      security: [{ BearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/ChangePasswordRequest" },
          },
        },
      },
      responses: {
        200: {
          description: "Password updated",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ApiResponse" },
            },
          },
        },
      },
    },
  },

  // ====================================================
  // 21. ADMIN DASHBOARD & METRICS
  // ====================================================
  "/admin/dashboard/overview": {
    get: {
      tags: ["Admin Dashboard"],
      summary: "Get platform overview KPIs",
      description: "Returns aggregated statistics: total users, active creators, hosted activities, paid events, and platform revenue.",
      security: [{ BearerAuth: [] }],
      responses: {
        200: {
          description: "Platform metrics overview",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/AdminDashboardOverview" },
            },
          },
        },
      },
    },
  },
  "/admin/dashboard/metrics": {
    get: {
      tags: ["Admin Dashboard"],
      summary: "Get dashboard metrics (Aliased)",
      description: "Alias for dashboard overview KPIs.",
      security: [{ BearerAuth: [] }],
      responses: {
        200: {
          description: "Dashboard metrics",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/AdminDashboardOverview" },
            },
          },
        },
      },
    },
  },
  "/admin/dashboard/analytics": {
    get: {
      tags: ["Admin Dashboard"],
      summary: "Get time-series platform analytics",
      description: "Returns time-series data for signups, activity participation, and revenue split over 30d/90d/1y periods.",
      security: [{ BearerAuth: [] }],
      parameters: [
        { in: "query", name: "period", schema: { type: "string", enum: ["7d", "30d", "90d", "1y"], default: "30d" } },
      ],
      responses: {
        200: {
          description: "Time-series analytics",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ApiResponse" },
            },
          },
        },
      },
    },
  },
  "/admin/dashboard/bootstrap": {
    get: {
      tags: ["Admin Dashboard"],
      summary: "Get dashboard bootstrap payload",
      description: "Fetches combined bootstrap payload required for initial admin portal load.",
      security: [{ BearerAuth: [] }],
      responses: {
        200: {
          description: "Bootstrap payload",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ApiResponse" },
            },
          },
        },
      },
    },
  },

  // ====================================================
  // 22. ADMIN USER MANAGEMENT
  // ====================================================
  "/admin/users": {
    get: {
      tags: ["Admin Users"],
      summary: "List users (Admin)",
      description: "Paginated user management list with role, status, and activity filters.",
      security: [{ BearerAuth: [] }],
      parameters: [
        { in: "query", name: "role", schema: { type: "string", enum: ["user", "creator", "admin", "super_admin"] } },
        { in: "query", name: "status", schema: { type: "string", enum: ["active", "suspended", "deleted"] } },
        { in: "query", name: "page", schema: { type: "integer" } },
        { in: "query", name: "limit", schema: { type: "integer" } },
      ],
      responses: {
        200: {
          description: "Users list",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ApiPaginatedResponse" },
            },
          },
        },
      },
    },
  },
  "/admin/users/search": {
    get: {
      tags: ["Admin Users"],
      summary: "Search users (Admin)",
      description: "Find users by email, name, phone, or ID.",
      security: [{ BearerAuth: [] }],
      parameters: [
        { in: "query", name: "q", required: true, schema: { type: "string" } },
      ],
      responses: {
        200: {
          description: "Search results",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ApiPaginatedResponse" },
            },
          },
        },
      },
    },
  },
  "/admin/users/blocked": {
    get: {
      tags: ["Admin Users"],
      summary: "List suspended/blocked users (Admin)",
      description: "Returns list of users with suspended or blocked standing.",
      security: [{ BearerAuth: [] }],
      responses: {
        200: {
          description: "Suspended users list",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ApiPaginatedResponse" },
            },
          },
        },
      },
    },
  },
  "/admin/users/{id}": {
    get: {
      tags: ["Admin Users"],
      summary: "Get user details (Admin)",
      description: "Deep audit of user profile, payment transactions, activities hosted, and reports filed against user.",
      security: [{ BearerAuth: [] }],
      parameters: [
        { in: "path", name: "id", required: true, schema: { type: "string" } },
      ],
      responses: {
        200: {
          description: "User details",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/UserProfile" },
            },
          },
        },
      },
    },
  },
  "/admin/users/{id}/status": {
    patch: {
      tags: ["Admin Users"],
      summary: "Update user status (Admin)",
      description: "Transitions user status to active, suspended, or deleted.",
      security: [{ BearerAuth: [] }],
      parameters: [
        { in: "path", name: "id", required: true, schema: { type: "string" } },
      ],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["status"],
              properties: {
                status: { type: "string", enum: ["active", "suspended", "deleted"] },
              },
            },
          },
        },
      },
      responses: {
        200: {
          description: "User status updated",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/UserProfile" },
            },
          },
        },
      },
    },
  },
  "/admin/users/{id}/role": {
    patch: {
      tags: ["Admin Users"],
      summary: "Update user role (Admin)",
      description: "Promotes or demotes user role (user, creator, admin, super_admin).",
      security: [{ BearerAuth: [] }],
      parameters: [
        { in: "path", name: "id", required: true, schema: { type: "string" } },
      ],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["role"],
              properties: {
                role: { type: "string", enum: ["user", "creator", "admin", "super_admin"] },
              },
            },
          },
        },
      },
      responses: {
        200: {
          description: "Role updated",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/UserProfile" },
            },
          },
        },
      },
    },
  },
  "/admin/users/{id}/block": {
    post: {
      tags: ["Admin Users"],
      summary: "Block user (Admin)",
      description: "Direct administrative suspension of target user.",
      security: [{ BearerAuth: [] }],
      parameters: [
        { in: "path", name: "id", required: true, schema: { type: "string" } },
      ],
      responses: {
        200: {
          description: "User blocked",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ApiResponse" },
            },
          },
        },
      },
    },
  },
  "/admin/users/{id}/unblock": {
    post: {
      tags: ["Admin Users"],
      summary: "Unblock user (Admin)",
      description: "Restores suspended user back to active status.",
      security: [{ BearerAuth: [] }],
      parameters: [
        { in: "path", name: "id", required: true, schema: { type: "string" } },
      ],
      responses: {
        200: {
          description: "User unblocked",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ApiResponse" },
            },
          },
        },
      },
    },
  },

  // ====================================================
  // 23. ADMIN CONTENT MODERATION (ACTIVITIES & EVENTS)
  // ====================================================
  "/admin/activities": {
    get: {
      tags: ["Admin Activities & Events"],
      summary: "List activities for moderation (Admin)",
      description: "Lists all activities platform-wide with status filters.",
      security: [{ BearerAuth: [] }],
      parameters: [
        { in: "query", name: "status", schema: { type: "string" } },
        { in: "query", name: "page", schema: { type: "integer" } },
        { in: "query", name: "limit", schema: { type: "integer" } },
      ],
      responses: {
        200: {
          description: "Activities list",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ApiPaginatedResponse" },
            },
          },
        },
      },
    },
  },
  "/admin/activities/{id}/status": {
    patch: {
      tags: ["Admin Activities & Events"],
      summary: "Update activity status (Admin)",
      description: "Force published, draft, or cancelled status for activity.",
      security: [{ BearerAuth: [] }],
      parameters: [
        { in: "path", name: "id", required: true, schema: { type: "string" } },
      ],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["status"],
              properties: {
                status: { type: "string", enum: ["draft", "published", "cancelled", "completed"] },
              },
            },
          },
        },
      },
      responses: {
        200: {
          description: "Activity status updated",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/Activity" },
            },
          },
        },
      },
    },
  },
  "/admin/events": {
    get: {
      tags: ["Admin Activities & Events"],
      summary: "List all events for moderation (Admin)",
      description: "Platform-wide event list with creator, ticket sales, and status information.",
      security: [{ BearerAuth: [] }],
      parameters: [
        { in: "query", name: "status", schema: { type: "string" } },
        { in: "query", name: "page", schema: { type: "integer" } },
        { in: "query", name: "limit", schema: { type: "integer" } },
      ],
      responses: {
        200: {
          description: "Events list",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ApiPaginatedResponse" },
            },
          },
        },
      },
    },
  },
  "/admin/events/{id}/status": {
    patch: {
      tags: ["Admin Activities & Events"],
      summary: "Update event status (Admin)",
      description: "Force event status update. Cancelling triggers participant refund pipeline.",
      security: [{ BearerAuth: [] }],
      parameters: [
        { in: "path", name: "id", required: true, schema: { type: "string" } },
      ],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["status"],
              properties: {
                status: { type: "string", enum: ["draft", "published", "cancelled", "completed"] },
              },
            },
          },
        },
      },
      responses: {
        200: {
          description: "Event status updated",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/Event" },
            },
          },
        },
      },
    },
  },
  "/admin/events/{eventId}/refunds/status": {
    get: {
      tags: ["Admin Activities & Events"],
      summary: "Get event refunds status (Admin)",
      description: "Checks progress of Stripe refunds for participants of a cancelled event.",
      security: [{ BearerAuth: [] }],
      parameters: [
        { in: "path", name: "eventId", required: true, schema: { type: "string" } },
      ],
      responses: {
        200: {
          description: "Refunds processing status",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ApiResponse" },
            },
          },
        },
      },
    },
  },
  "/admin/events/{eventId}/refunds/retry-failed": {
    post: {
      tags: ["Admin Activities & Events"],
      summary: "Retry failed participant refunds",
      description: "Retries refund processing for participants whose refunds initially failed.",
      security: [{ BearerAuth: [] }],
      parameters: [
        { in: "path", name: "eventId", required: true, schema: { type: "string" } },
      ],
      responses: {
        200: {
          description: "Refund retries initiated",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ApiResponse" },
            },
          },
        },
      },
    },
  },

  // ====================================================
  // 24. ADMIN SUBSCRIPTIONS & EARNINGS
  // ====================================================
  "/admin/subscriptions": {
    get: {
      tags: ["Admin Subscriptions & Payouts"],
      summary: "List all subscriptions (Admin)",
      description: "List of all active and past creator tier subscriptions.",
      security: [{ BearerAuth: [] }],
      parameters: [
        { in: "query", name: "page", schema: { type: "integer" } },
        { in: "query", name: "limit", schema: { type: "integer" } },
      ],
      responses: {
        200: {
          description: "Subscriptions list",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ApiPaginatedResponse" },
            },
          },
        },
      },
    },
  },
  "/admin/subscriptions/fees": {
    get: {
      tags: ["Admin Subscriptions & Payouts"],
      summary: "Get platform subscription pricing configuration",
      description: "Returns currently configured subscription prices.",
      security: [{ BearerAuth: [] }],
      responses: {
        200: {
          description: "Subscription fees",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/SubscriptionFeesResponse" },
            },
          },
        },
      },
    },
    patch: {
      tags: ["Admin Subscriptions & Payouts"],
      summary: "Update platform subscription pricing configuration",
      description: "Updates monthly and yearly creator subscription price points.",
      security: [{ BearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                subscriptionMonthlyPrice: { type: "number", example: 29.99 },
                subscriptionYearlyPrice: { type: "number", example: 299.99 },
              },
            },
          },
        },
      },
      responses: {
        200: {
          description: "Pricing configuration updated",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/SubscriptionFeesResponse" },
            },
          },
        },
      },
    },
  },
  "/admin/event-creators": {
    get: {
      tags: ["Admin Subscriptions & Payouts"],
      summary: "List all event creators",
      description: "Returns list of creators hosting events on the platform.",
      security: [{ BearerAuth: [] }],
      parameters: [
        { in: "query", name: "page", schema: { type: "integer" } },
        { in: "query", name: "limit", schema: { type: "integer" } },
      ],
      responses: {
        200: {
          description: "Event creators list",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ApiPaginatedResponse" },
            },
          },
        },
      },
    },
  },
  "/admin/event-creators/premium": {
    get: {
      tags: ["Admin Subscriptions & Payouts"],
      summary: "List premium event creators",
      description: "List creators with active paid membership subscriptions.",
      security: [{ BearerAuth: [] }],
      responses: {
        200: {
          description: "Premium creators list",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ApiPaginatedResponse" },
            },
          },
        },
      },
    },
  },
  "/admin/event-creators/{id}": {
    get: {
      tags: ["Admin Subscriptions & Payouts"],
      summary: "Get event creator financial details",
      description: "Returns revenue metrics, total payouts, and active event listing.",
      security: [{ BearerAuth: [] }],
      parameters: [
        { in: "path", name: "id", required: true, schema: { type: "string" } },
      ],
      responses: {
        200: {
          description: "Creator financial summary",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ApiResponse" },
            },
          },
        },
      },
    },
  },
  "/admin/event-creators/{id}/payout": {
    post: {
      tags: ["Admin Subscriptions & Payouts"],
      summary: "Process creator payout (Admin)",
      description: "Dispatches manual transfer to creator bank account.",
      security: [{ BearerAuth: [] }],
      parameters: [
        { in: "path", name: "id", required: true, schema: { type: "string" } },
      ],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/CreatePayoutRequestBody" },
          },
        },
      },
      responses: {
        200: {
          description: "Payout transfer processed",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/PayoutRequest" },
            },
          },
        },
      },
    },
  },
  "/admin/earnings/transactions": {
    get: {
      tags: ["Admin Subscriptions & Payouts"],
      summary: "List platform earning transactions",
      description: "Comprehensive financial ledger of all ticket sales, fees, and creator allocations.",
      security: [{ BearerAuth: [] }],
      parameters: [
        { in: "query", name: "page", schema: { type: "integer" } },
        { in: "query", name: "limit", schema: { type: "integer" } },
      ],
      responses: {
        200: {
          description: "Transactions ledger",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ApiPaginatedResponse" },
            },
          },
        },
      },
    },
  },
  "/admin/earnings/transactions/{id}": {
    get: {
      tags: ["Admin Subscriptions & Payouts"],
      summary: "Get earning transaction details",
      description: "Detailed view of individual transaction.",
      security: [{ BearerAuth: [] }],
      parameters: [
        { in: "path", name: "id", required: true, schema: { type: "string" } },
      ],
      responses: {
        200: {
          description: "Transaction details",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/Transaction" },
            },
          },
        },
      },
    },
  },
  "/admin/earnings/transactions/{id}/invoice": {
    post: {
      tags: ["Admin Subscriptions & Payouts"],
      summary: "Generate transaction invoice",
      description: "Generates formal printable invoice / receipt for the transaction.",
      security: [{ BearerAuth: [] }],
      parameters: [
        { in: "path", name: "id", required: true, schema: { type: "string" } },
      ],
      responses: {
        200: {
          description: "Invoice generated",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ApiResponse" },
            },
          },
        },
      },
    },
  },

  // ====================================================
  // 25. ADMIN NOTIFICATIONS
  // ====================================================
  "/admin/notifications": {
    get: {
      tags: ["Admin Notifications"],
      summary: "List admin system notifications",
      description: "Fetches alerts regarding system issues, large payouts, user reports, and platform events.",
      security: [{ BearerAuth: [] }],
      parameters: [
        { in: "query", name: "page", schema: { type: "integer" } },
        { in: "query", name: "limit", schema: { type: "integer" } },
      ],
      responses: {
        200: {
          description: "Admin alerts list",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ApiPaginatedResponse" },
            },
          },
        },
      },
    },
  },
  "/admin/notifications/unread-count": {
    get: {
      tags: ["Admin Notifications"],
      summary: "Admin unread notifications count",
      description: "Returns count of unread admin notifications.",
      security: [{ BearerAuth: [] }],
      responses: {
        200: {
          description: "Count returned",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: { count: { type: "integer", example: 5 } },
              },
            },
          },
        },
      },
    },
  },
  "/admin/notifications/{id}/read": {
    patch: {
      tags: ["Admin Notifications"],
      summary: "Mark admin notification read",
      description: "Sets notification read status.",
      security: [{ BearerAuth: [] }],
      parameters: [
        { in: "path", name: "id", required: true, schema: { type: "string" } },
      ],
      responses: {
        200: {
          description: "Marked read",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ApiResponse" },
            },
          },
        },
      },
    },
  },
  "/admin/notifications/read-all": {
    patch: {
      tags: ["Admin Notifications"],
      summary: "Mark all admin notifications read",
      description: "Clears all unread notifications for admin.",
      security: [{ BearerAuth: [] }],
      responses: {
        200: {
          description: "All notifications marked read",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ApiResponse" },
            },
          },
        },
      },
    },
  },

  // ====================================================
  // 26. ADMIN PLATFORM SETTINGS
  // ====================================================
  "/admin/settings/platform": {
    get: {
      tags: ["Admin Settings"],
      summary: "Get platform settings",
      description: "Returns platform fee percentage (default 10%), policies, reminder cadence, and subscription rates.",
      security: [{ BearerAuth: [] }],
      responses: {
        200: {
          description: "Platform settings",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/PlatformSettings" },
            },
          },
        },
      },
    },
    patch: {
      tags: ["Admin Settings"],
      summary: "Update platform settings",
      description: "Updates commission split, refund policies, and reminder timing.",
      security: [{ BearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/UpdatePlatformSettingsBody" },
          },
        },
      },
      responses: {
        200: {
          description: "Platform settings updated",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/PlatformSettings" },
            },
          },
        },
      },
    },
  },
  "/admin/settings/profile": {
    get: {
      tags: ["Admin Settings"],
      summary: "Get admin profile settings",
      description: "Profile contact info configuration.",
      security: [{ BearerAuth: [] }],
      responses: {
        200: {
          description: "Profile settings",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ApiResponse" },
            },
          },
        },
      },
    },
    put: {
      tags: ["Admin Settings"],
      summary: "Update admin profile settings",
      description: "Updates admin contact phone, email, and notification addresses.",
      security: [{ BearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                fullName: { type: "string" },
                email: { type: "string", format: "email" },
                phone: { type: "string" },
              },
            },
          },
        },
      },
      responses: {
        200: {
          description: "Settings updated",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ApiResponse" },
            },
          },
        },
      },
    },
  },
  "/admin/settings/security": {
    get: {
      tags: ["Admin Settings"],
      summary: "Get admin security settings",
      description: "Checks 2FA and password expiration policies.",
      security: [{ BearerAuth: [] }],
      responses: {
        200: {
          description: "Security settings",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ApiResponse" },
            },
          },
        },
      },
    },
    put: {
      tags: ["Admin Settings"],
      summary: "Update admin security credentials",
      description: "Enforces strong password change for administrator.",
      security: [{ BearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/ChangePasswordRequest" },
          },
        },
      },
      responses: {
        200: {
          description: "Security credentials updated",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ApiResponse" },
            },
          },
        },
      },
    },
  },

  // ====================================================
  // 27. STRIPE WEBHOOKS
  // ====================================================
  "/billing/webhook": {
    post: {
      tags: ["Webhooks"],
      summary: "Stripe Billing & Subscription Webhook",
      description: "Receives signed Stripe webhook events: payment_intent.succeeded, customer.subscription.*, invoice.*, and charge.refunded. Requires `stripe-signature` header.",
      parameters: [
        {
          in: "header",
          name: "stripe-signature",
          required: true,
          schema: { type: "string" },
          description: "Stripe HMAC signature header",
        },
      ],
      responses: {
        200: {
          description: "Webhook processed or queued successfully",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: { type: "boolean", example: true },
                  duplicate: { type: "boolean", example: false },
                },
              },
            },
          },
        },
        400: {
          description: "Invalid signature or payload",
        },
      },
    },
  },
  "/stripe/webhook": {
    post: {
      tags: ["Webhooks"],
      summary: "Stripe Connect Host Webhook",
      description: "Listens for Stripe Connect events like `account.updated` to synchronize charges_enabled and payouts_enabled flags for creators.",
      parameters: [
        {
          in: "header",
          name: "stripe-signature",
          required: true,
          schema: { type: "string" },
        },
      ],
      responses: {
        200: {
          description: "Connect webhook processed",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: { success: { type: "boolean", example: true } },
              },
            },
          },
        },
      },
    },
  },
};
