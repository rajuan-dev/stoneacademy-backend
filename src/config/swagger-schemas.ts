/**
 * OpenAPI 3.0 Component Schemas for Stone Academy Backend API
 */

export const swaggerSchemas: Record<string, any> = {
  // ----------------------------------------------------
  // Common / API Envelope Schemas
  // ----------------------------------------------------
  ApiResponse: {
    type: "object",
    properties: {
      success: { type: "boolean", example: true },
      message: { type: "string", example: "Operation completed successfully" },
      data: { type: "object", nullable: true },
      meta: { type: "object", nullable: true },
      timestamp: { type: "string", format: "date-time", example: "2026-09-26T10:00:00.000Z" },
    },
  },
  ApiPaginatedResponse: {
    type: "object",
    properties: {
      success: { type: "boolean", example: true },
      message: { type: "string", example: "Data fetched successfully" },
      data: {
        type: "array",
        items: { type: "object" },
      },
      meta: {
        type: "object",
        properties: {
          page: { type: "integer", example: 1 },
          limit: { type: "integer", example: 10 },
          totalDocs: { type: "integer", example: 42 },
          totalPages: { type: "integer", example: 5 },
          hasNextPage: { type: "boolean", example: true },
          hasPrevPage: { type: "boolean", example: false },
        },
      },
      timestamp: { type: "string", format: "date-time" },
    },
  },
  ErrorResponse: {
    type: "object",
    properties: {
      success: { type: "boolean", example: false },
      message: { type: "string", example: "Validation failed or resource not found" },
      errors: {
        type: "array",
        items: {
          type: "object",
          properties: {
            field: { type: "string", example: "email" },
            message: { type: "string", example: "Invalid email format" },
          },
        },
      },
      timestamp: { type: "string", format: "date-time" },
    },
  },

  // ----------------------------------------------------
  // User & Identity Schemas
  // ----------------------------------------------------
  UserProfile: {
    type: "object",
    properties: {
      _id: { type: "string", example: "665fe91a3f6b4a2b6c3a1234" },
      id: { type: "string", example: "665fe91a3f6b4a2b6c3a1234" },
      email: { type: "string", format: "email", example: "athlete@stoneacademy.com" },
      fullName: { type: "string", example: "Marcus Stone" },
      phoneNumber: { type: "string", nullable: true, example: "+15551234567" },
      phone: { type: "string", nullable: true, example: "+15551234567" },
      dob: { type: "string", format: "date", nullable: true, example: "1994-06-15" },
      gender: { type: "string", enum: ["male", "female", "other", "prefer_not"], nullable: true, example: "male" },
      bio: { type: "string", nullable: true, example: "Fitness coach & endurance athlete." },
      country: { type: "string", nullable: true, example: "United States" },
      state: { type: "string", nullable: true, example: "California" },
      city: { type: "string", nullable: true, example: "Los Angeles" },
      location: {
        type: "object",
        nullable: true,
        properties: {
          label: { type: "string", example: "Venice Beach, CA" },
          coordinates: {
            type: "array",
            items: { type: "number" },
            example: [-118.4695, 33.985]
          }
        }
      },
      role: { type: "string", enum: ["user", "creator", "admin", "super_admin"], example: "user" },
      status: { type: "string", enum: ["active", "suspended", "deleted"], example: "active" },
      emailVerifiedAt: { type: "string", format: "date-time", nullable: true },
      isEmailVerified: { type: "boolean", example: true },
      profileImage: { type: "string", nullable: true, example: "https://s3.amazonaws.com/stoneacademy/avatars/user.jpg" },
      coverImage: { type: "string", nullable: true, example: "https://s3.amazonaws.com/stoneacademy/covers/cover.jpg" },
      stripeCustomerId: { type: "string", nullable: true, example: "cus_N123456" },
      stripeConnectedAccountId: { type: "string", nullable: true, example: "acct_123456" },
      stripeOnboardingCompleted: { type: "boolean", example: false },
      creatorStatus: {
        type: "object",
        properties: {
          subscriptionActive: { type: "boolean", example: false },
          subscriptionId: { type: "string", nullable: true },
          expiresAt: { type: "string", format: "date-time", nullable: true },
        },
      },
      ratingAverage: { type: "number", example: 4.8 },
      ratingCount: { type: "integer", example: 24 },
      blockedUsers: {
        type: "array",
        items: { type: "string" },
        example: []
      },
      createdAt: { type: "string", format: "date-time" },
      updatedAt: { type: "string", format: "date-time" },
    },
  },
  AdminProfile: {
    type: "object",
    properties: {
      _id: { type: "string", example: "665fe91a3f6b4a2b6c3a9999" },
      email: { type: "string", format: "email", example: "admin@stoneacademy.com" },
      fullName: { type: "string", example: "System Administrator" },
      phone: { type: "string", nullable: true, example: "+15559876543" },
      role: { type: "string", enum: ["admin", "super_admin"], example: "super_admin" },
      status: { type: "string", enum: ["active", "suspended", "deleted"], example: "active" },
      profileImage: { type: "string", nullable: true },
      createdAt: { type: "string", format: "date-time" },
      updatedAt: { type: "string", format: "date-time" },
    },
  },

  // ----------------------------------------------------
  // Auth Schemas
  // ----------------------------------------------------
  AuthRegisterRequest: {
    type: "object",
    required: ["fullName", "email", "password", "confirmPassword"],
    properties: {
      fullName: { type: "string", example: "Jane Athlete" },
      email: { type: "string", format: "email", example: "athlete@stoneacademy.com" },
      password: { type: "string", minLength: 8, example: "Str0ngP@ssw0rd!" },
      confirmPassword: { type: "string", minLength: 8, example: "Str0ngP@ssw0rd!" },
      dob: { type: "string", format: "date", example: "1998-04-12" },
      country: { type: "string", example: "United States" },
      state: { type: "string", example: "California" },
      city: { type: "string", example: "San Francisco" },
    },
  },
  AuthRegisterResponse: {
    type: "object",
    properties: {
      user: { $ref: "#/components/schemas/UserProfile" },
      accessToken: { type: "string", description: "JWT Access Token" },
      refreshToken: { type: "string", description: "JWT Refresh Token" },
      expiresIn: { type: "string", example: "7d" },
      verification: {
        type: "object",
        properties: {
          expiresAt: { type: "string", format: "date-time" },
          expiresInMinutes: { type: "integer", example: 10 },
        },
      },
    },
  },
  AuthLoginRequest: {
    type: "object",
    required: ["email", "password"],
    properties: {
      email: { type: "string", format: "email", example: "athlete@stoneacademy.com" },
      password: { type: "string", example: "Str0ngP@ssw0rd!" },
    },
  },
  AuthLoginResponse: {
    type: "object",
    properties: {
      user: { $ref: "#/components/schemas/UserProfile" },
      accessToken: { type: "string" },
      refreshToken: { type: "string" },
      expiresIn: { type: "string", example: "7d" },
    },
  },
  AdminLoginRequest: {
    type: "object",
    required: ["email", "password"],
    properties: {
      email: { type: "string", format: "email", example: "admin@stoneacademy.com" },
      password: { type: "string", example: "AdminSecret123!" },
    },
  },
  AdminLoginResponse: {
    type: "object",
    properties: {
      admin: { $ref: "#/components/schemas/AdminProfile" },
      accessToken: { type: "string" },
      refreshToken: { type: "string" },
      expiresIn: { type: "string", example: "1d" },
    },
  },
  OtpSendRequest: {
    type: "object",
    required: ["email", "purpose"],
    properties: {
      email: { type: "string", format: "email", example: "athlete@stoneacademy.com" },
      purpose: {
        type: "string",
        enum: ["verify_email", "reset_password", "login_otp_optional"],
        example: "verify_email",
      },
    },
  },
  OtpVerifyRequest: {
    type: "object",
    required: ["email", "purpose", "code"],
    properties: {
      email: { type: "string", format: "email", example: "athlete@stoneacademy.com" },
      purpose: {
        type: "string",
        enum: ["verify_email", "reset_password", "login_otp_optional"],
        example: "verify_email",
      },
      code: { type: "string", example: "482910" },
    },
  },
  ForgotPasswordRequest: {
    type: "object",
    required: ["email"],
    properties: {
      email: { type: "string", format: "email", example: "athlete@stoneacademy.com" },
    },
  },
  ResetPasswordRequest: {
    type: "object",
    required: ["email", "code", "newPassword"],
    properties: {
      email: { type: "string", format: "email", example: "athlete@stoneacademy.com" },
      code: { type: "string", example: "482910" },
      newPassword: { type: "string", minLength: 8, example: "N3wStrongP@ss!" },
    },
  },
  ChangePasswordRequest: {
    type: "object",
    required: ["currentPassword", "newPassword"],
    properties: {
      currentPassword: { type: "string", example: "OldPassword123!" },
      newPassword: { type: "string", minLength: 8, example: "N3wStrongP@ss!" },
    },
  },
  RefreshTokenRequest: {
    type: "object",
    properties: {
      refreshToken: { type: "string", example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." },
    },
  },

  // ----------------------------------------------------
  // Taxonomy & Categories
  // ----------------------------------------------------
  Category: {
    type: "object",
    properties: {
      _id: { type: "string", example: "665fe91a3f6b4a2b6c3a1111" },
      name: { type: "string", example: "Cardio & HIIT" },
      slug: { type: "string", example: "cardio-hiit" },
      iconUrl: { type: "string", nullable: true },
      isActive: { type: "boolean", example: true },
      createdAt: { type: "string", format: "date-time" },
      updatedAt: { type: "string", format: "date-time" },
    },
  },
  CreateCategoryRequest: {
    type: "object",
    required: ["name"],
    properties: {
      name: { type: "string", example: "Strength Training" },
      isActive: { type: "boolean", default: true },
    },
  },

  // ----------------------------------------------------
  // Activities (Free & Social)
  // ----------------------------------------------------
  Activity: {
    type: "object",
    properties: {
      _id: { type: "string", example: "665fe91a3f6b4a2b6c3a2222" },
      hostId: { type: "string", example: "665fe91a3f6b4a2b6c3a1234" },
      title: { type: "string", example: "Sunset 5K Beach Run" },
      type: { type: "string", example: "Running" },
      description: { type: "string", example: "Casual scenic 5k run along the coastline." },
      startAt: { type: "string", format: "date-time", example: "2026-10-01T18:00:00Z" },
      endAt: { type: "string", format: "date-time", nullable: true, example: "2026-10-01T19:30:00Z" },
      status: { type: "string", enum: ["draft", "published", "cancelled", "completed"], example: "published" },
      participantLimit: { type: "integer", nullable: true, example: 25 },
      participantsCount: { type: "integer", example: 12 },
      distanceMiles: { type: "number", nullable: true, example: 3.1 },
      location: {
        type: "object",
        properties: {
          label: { type: "string", example: "Santa Monica Pier, CA" },
          coordinates: {
            type: "array",
            items: { type: "number" },
            example: [-118.496, 34.009]
          }
        }
      },
      media: {
        type: "array",
        items: {
          type: "object",
          properties: {
            url: { type: "string" },
            type: { type: "string", enum: ["image", "video"] }
          }
        }
      },
      createdAt: { type: "string", format: "date-time" },
      updatedAt: { type: "string", format: "date-time" },
    },
  },
  CreateActivityRequest: {
    type: "object",
    required: ["title", "type", "startAt"],
    properties: {
      title: { type: "string", example: "Sunset 5K Beach Run" },
      type: { type: "string", example: "Running" },
      description: { type: "string", example: "Casual scenic 5k run along the coastline." },
      startAt: { type: "string", format: "date-time", example: "2026-10-01T18:00:00Z" },
      endAt: { type: "string", format: "date-time", example: "2026-10-01T19:30:00Z" },
      location: {
        type: "object",
        properties: {
          label: { type: "string", example: "Santa Monica Pier" },
          latitude: { type: "number", example: 34.009 },
          longitude: { type: "number", example: -118.496 }
        }
      },
      participantLimit: { type: "integer", example: 30 },
      distanceMiles: { type: "number", example: 3.1 },
    },
  },
  ActivityPass: {
    type: "object",
    properties: {
      passId: { type: "string", example: "PASS-ACT-665FE-9988" },
      activityId: { type: "string" },
      userId: { type: "string" },
      qrCodeData: { type: "string", example: "data:image/png;base64,iVBORw0KGgoAAAANSU..." },
      status: { type: "string", example: "valid" },
      startAt: { type: "string", format: "date-time" },
    },
  },

  // ----------------------------------------------------
  // Events (Creator & Paid Modules)
  // ----------------------------------------------------
  Event: {
    type: "object",
    properties: {
      _id: { type: "string", example: "665fe91a3f6b4a2b6c3a3333" },
      creatorId: { type: "string", example: "665fe91a3f6b4a2b6c3a1234" },
      title: { type: "string", example: "Masterclass: High Altitude Marathon Prep" },
      category: { type: "string", example: "Marathon" },
      type: { type: "string", example: "Masterclass" },
      description: { type: "string", example: "Deep dive workshop into altitude conditioning and nutrition." },
      date: { type: "string", format: "date-time" },
      startAt: { type: "string", format: "date-time" },
      endAt: { type: "string", format: "date-time" },
      durationMinutes: { type: "integer", example: 90 },
      priceType: { type: "string", enum: ["free", "paid"], example: "paid" },
      ticketPrice: { type: "number", example: 45.00 },
      discountPercentage: { type: "number", nullable: true, example: 10 },
      currency: { type: "string", example: "usd" },
      country: { type: "string", example: "United States" },
      state: { type: "string", example: "Colorado" },
      city: { type: "string", example: "Boulder" },
      location: {
        type: "object",
        properties: {
          label: { type: "string", example: "Boulder Peak Center" },
          coordinates: {
            type: "array",
            items: { type: "number" },
            example: [-105.2705, 40.0150]
          }
        }
      },
      participantLimit: { type: "integer", example: 50 },
      participantsCount: { type: "integer", example: 28 },
      status: { type: "string", enum: ["draft", "published", "cancelled", "completed"], example: "published" },
      media: {
        type: "array",
        items: {
          type: "object",
          properties: {
            url: { type: "string" },
            type: { type: "string" }
          }
        }
      },
      createdAt: { type: "string", format: "date-time" },
      updatedAt: { type: "string", format: "date-time" },
    },
  },
  CreateEventRequest: {
    type: "object",
    required: ["title", "country", "priceType"],
    properties: {
      title: { type: "string", example: "Masterclass: High Altitude Marathon Prep" },
      category: { type: "string", example: "Marathon" },
      type: { type: "string", example: "Workshop" },
      description: { type: "string", example: "Comprehensive workshop." },
      startAt: { type: "string", format: "date-time", example: "2026-11-10T15:00:00Z" },
      endAt: { type: "string", format: "date-time", example: "2026-11-10T17:00:00Z" },
      durationMinutes: { type: "integer", example: 120 },
      priceType: { type: "string", enum: ["free", "paid"], example: "paid" },
      ticketPrice: { type: "number", example: 45.00 },
      discountPercentage: { type: "number", example: 0 },
      currency: { type: "string", example: "usd" },
      country: { type: "string", example: "United States" },
      state: { type: "string", example: "California" },
      city: { type: "string", example: "Los Angeles" },
      participantLimit: { type: "integer", example: 40 },
    },
  },
  EventFeeBreakdown: {
    type: "object",
    properties: {
      ticketPrice: { type: "number", example: 50.00 },
      platformFeePercent: { type: "number", example: 10 },
      platformFeeAmount: { type: "number", example: 5.00 },
      creatorShareAmount: { type: "number", example: 45.00 },
      currency: { type: "string", example: "usd" },
    },
  },
  EventPass: {
    type: "object",
    properties: {
      passId: { type: "string", example: "PASS-EVT-44321-ABCD" },
      eventId: { type: "string" },
      userId: { type: "string" },
      qrCodeData: { type: "string" },
      ticketStatus: { type: "string", example: "confirmed" },
      paidAmount: { type: "number", example: 45.00 },
      currency: { type: "string", example: "usd" },
    },
  },

  // ----------------------------------------------------
  // Subscriptions & Creator Gating
  // ----------------------------------------------------
  SubscriptionFeesResponse: {
    type: "object",
    properties: {
      monthlyPrice: { type: "number", example: 29.99 },
      yearlyPrice: { type: "number", example: 299.99 },
      currency: { type: "string", example: "usd" },
      platformFeePercent: { type: "number", example: 10 },
      creatorRevenueSharePercent: { type: "number", example: 90 },
    },
  },
  CreatorSubscription: {
    type: "object",
    properties: {
      _id: { type: "string", example: "665fe91a3f6b4a2b6c3a4444" },
      userId: { type: "string", example: "665fe91a3f6b4a2b6c3a1234" },
      plan: { type: "string", enum: ["monthly", "yearly"], example: "monthly" },
      amount: { type: "number", example: 29.99 },
      currency: { type: "string", example: "usd" },
      status: { type: "string", enum: ["active", "cancelled", "past_due", "expired"], example: "active" },
      currentPeriodStart: { type: "string", format: "date-time" },
      currentPeriodEnd: { type: "string", format: "date-time" },
      cancelAtPeriodEnd: { type: "boolean", example: false },
    },
  },
  SubscriptionCheckoutIntentRequest: {
    type: "object",
    required: ["plan"],
    properties: {
      plan: { type: "string", enum: ["monthly", "yearly"], example: "monthly" },
    },
  },
  SubscriptionCheckoutIntentResponse: {
    type: "object",
    properties: {
      clientSecret: { type: "string", example: "pi_123456_secret_654321" },
      subscriptionId: { type: "string" },
      plan: { type: "string", example: "monthly" },
      amount: { type: "number", example: 29.99 },
    },
  },

  // ----------------------------------------------------
  // Billing, Transactions & Payouts
  // ----------------------------------------------------
  Transaction: {
    type: "object",
    properties: {
      _id: { type: "string", example: "665fe91a3f6b4a2b6c3a5555" },
      type: { type: "string", enum: ["event_ticket", "subscription", "payout", "refund"], example: "event_ticket" },
      payerId: { type: "string", example: "665fe91a3f6b4a2b6c3a1234" },
      recipientId: { type: "string", nullable: true, example: "665fe91a3f6b4a2b6c3a7777" },
      eventId: { type: "string", nullable: true },
      grossAmount: { type: "number", example: 50.00 },
      platformFeeAmount: { type: "number", example: 5.00 },
      creatorShareAmount: { type: "number", example: 45.00 },
      currency: { type: "string", example: "usd" },
      status: { type: "string", enum: ["pending", "succeeded", "failed", "refunded"], example: "succeeded" },
      provider: { type: "string", example: "stripe" },
      providerReference: { type: "string", example: "pi_3Nxyz12345" },
      createdAt: { type: "string", format: "date-time" },
    },
  },
  EarningsSummary: {
    type: "object",
    properties: {
      totalGrossSales: { type: "number", example: 1250.00 },
      platformFeesDeducted: { type: "number", example: 125.00 },
      totalCreatorEarnings: { type: "number", example: 1125.00 },
      availableForWithdrawal: { type: "number", example: 850.00 },
      pendingPayouts: { type: "number", example: 275.00 },
      paidOutTotal: { type: "number", example: 3400.00 },
      currency: { type: "string", example: "usd" },
    },
  },
  PayoutRequest: {
    type: "object",
    properties: {
      _id: { type: "string", example: "665fe91a3f6b4a2b6c3a6666" },
      creatorId: { type: "string", example: "665fe91a3f6b4a2b6c3a1234" },
      amount: { type: "number", example: 250.00 },
      currency: { type: "string", example: "usd" },
      status: { type: "string", enum: ["pending", "approved", "rejected", "paid"], example: "pending" },
      note: { type: "string", nullable: true },
      adminNote: { type: "string", nullable: true },
      createdAt: { type: "string", format: "date-time" },
      updatedAt: { type: "string", format: "date-time" },
    },
  },
  CreatePayoutRequestBody: {
    type: "object",
    required: ["amount"],
    properties: {
      amount: { type: "number", example: 250.00 },
      currency: { type: "string", example: "usd" },
      note: { type: "string", example: "Withdrawal for October coaching events." },
    },
  },
  UpdatePayoutStatusBody: {
    type: "object",
    required: ["status"],
    properties: {
      status: { type: "string", enum: ["approved", "rejected", "paid"], example: "approved" },
      note: { type: "string", example: "Payout approved for batch processing." },
    },
  },

  // ----------------------------------------------------
  // Host Stripe Connect Schemas
  // ----------------------------------------------------
  StripeHostStatus: {
    type: "object",
    properties: {
      stripeConnectedAccountId: { type: "string", nullable: true, example: "acct_1OuABC123456" },
      chargesEnabled: { type: "boolean", example: true },
      payoutsEnabled: { type: "boolean", example: true },
      detailsSubmitted: { type: "boolean", example: true },
      disabledReason: { type: "string", nullable: true },
      onboardingCompleted: { type: "boolean", example: true },
    },
  },
  CreateOnboardingLinkResponse: {
    type: "object",
    properties: {
      url: { type: "string", example: "https://connect.stripe.com/setup/s/acct_123/..." },
      expiresAt: { type: "integer", example: 1727345678 },
    },
  },
  CreateDashboardLoginLinkResponse: {
    type: "object",
    properties: {
      url: { type: "string", example: "https://connect.stripe.com/express/acct_123/..." },
    },
  },

  // ----------------------------------------------------
  // Realtime Chat & Messaging Schemas
  // ----------------------------------------------------
  ChatThread: {
    type: "object",
    properties: {
      _id: { type: "string", example: "665fe91a3f6b4a2b6c3a7777" },
      type: { type: "string", enum: ["direct", "host", "admin"], example: "host" },
      memberUserIds: {
        type: "array",
        items: { type: "string" },
        example: ["665fe91a3f6b4a2b6c3a1234", "665fe91a3f6b4a2b6c3a5678"]
      },
      lastMessage: {
        type: "object",
        properties: {
          text: { type: "string", example: "What gear should I bring to the run?" },
          senderId: { type: "string" },
          sentAt: { type: "string", format: "date-time" }
        }
      },
      unreadCount: { type: "integer", example: 2 },
      updatedAt: { type: "string", format: "date-time" },
    },
  },
  ChatMessage: {
    type: "object",
    properties: {
      _id: { type: "string", example: "665fe91a3f6b4a2b6c3a8888" },
      threadId: { type: "string", example: "665fe91a3f6b4a2b6c3a7777" },
      senderId: { type: "string", example: "665fe91a3f6b4a2b6c3a1234" },
      type: { type: "string", enum: ["text", "image"], example: "text" },
      text: { type: "string", example: "See you at 6 PM sharp!" },
      imageUrl: { type: "string", nullable: true },
      seenBy: {
        type: "array",
        items: { type: "string" }
      },
      createdAt: { type: "string", format: "date-time" },
    },
  },
  CreateHostThreadBody: {
    type: "object",
    properties: {
      hostUserId: { type: "string", example: "665fe91a3f6b4a2b6c3a1234" },
      targetId: { type: "string", example: "665fe91a3f6b4a2b6c3a2222" },
    },
  },
  SendThreadMessageBody: {
    type: "object",
    required: ["type"],
    properties: {
      type: { type: "string", enum: ["text", "image"], example: "text" },
      text: { type: "string", example: "Looking forward to joining tomorrow!" },
      imageUrl: { type: "string", format: "uri", example: "https://s3.amazonaws.com/stoneacademy/chat/pic.jpg" },
    },
  },

  // ----------------------------------------------------
  // Notifications Schemas
  // ----------------------------------------------------
  Notification: {
    type: "object",
    properties: {
      _id: { type: "string", example: "665fe91a3f6b4a2b6c3a9999" },
      userId: { type: "string" },
      title: { type: "string", example: "Activity Reminder" },
      message: { type: "string", example: "Your beach run starts in 1 hour." },
      type: { type: "string", enum: ["activity", "event", "payment", "chat", "system"], example: "activity" },
      referenceId: { type: "string", nullable: true },
      isRead: { type: "boolean", example: false },
      createdAt: { type: "string", format: "date-time" },
    },
  },
  NotificationPreferences: {
    type: "object",
    properties: {
      emailNotifications: { type: "boolean", example: true },
      pushNotifications: { type: "boolean", example: true },
      activityReminders: { type: "boolean", example: true },
      eventUpdates: { type: "boolean", example: true },
      chatMessages: { type: "boolean", example: true },
      marketingPromotions: { type: "boolean", example: false },
    },
  },

  // ----------------------------------------------------
  // Reviews & Ratings Schemas
  // ----------------------------------------------------
  Review: {
    type: "object",
    properties: {
      _id: { type: "string", example: "665fe91a3f6b4a2b6c3aaa11" },
      reviewerId: { type: "string" },
      targetType: { type: "string", enum: ["activity", "event"], example: "activity" },
      targetId: { type: "string" },
      targetUserId: { type: "string" },
      rating: { type: "number", minimum: 1, maximum: 5, example: 5 },
      tags: {
        type: "array",
        items: { type: "string", enum: ["friendly", "ontime", "motivating", "professional", "not_punctual", "disrespectful"] },
        example: ["friendly", "motivating"]
      },
      comment: { type: "string", example: "Great pacing, high energy, fantastic coach!" },
      createdAt: { type: "string", format: "date-time" },
    },
  },
  CreateReviewBody: {
    type: "object",
    required: ["targetType", "targetId", "rating"],
    properties: {
      targetType: { type: "string", enum: ["activity", "event"], example: "activity" },
      targetId: { type: "string", example: "665fe91a3f6b4a2b6c3a2222" },
      rating: { type: "number", minimum: 1, maximum: 5, example: 5 },
      tags: {
        type: "array",
        items: { type: "string", enum: ["friendly", "ontime", "motivating", "professional", "not_punctual", "disrespectful"] },
        example: ["friendly", "motivating"]
      },
      comment: { type: "string", example: "Super supportive host, definitely coming back!" },
    },
  },

  // ----------------------------------------------------
  // Reports & Moderation Schemas
  // ----------------------------------------------------
  Report: {
    type: "object",
    properties: {
      _id: { type: "string", example: "665fe91a3f6b4a2b6c3abb22" },
      reporterId: { type: "string" },
      entityType: { type: "string", enum: ["user", "activity", "event", "message", "community_post"], example: "user" },
      entityId: { type: "string" },
      reason: { type: "string", example: "harassment" },
      details: { type: "string", example: "Sent harassing messages in chat." },
      status: { type: "string", enum: ["open", "under_review", "resolved", "rejected"], example: "open" },
      adminNote: { type: "string", nullable: true },
      createdAt: { type: "string", format: "date-time" },
      updatedAt: { type: "string", format: "date-time" },
    },
  },
  CreateReportBody: {
    type: "object",
    required: ["entityType", "entityId", "reason"],
    properties: {
      entityType: { type: "string", enum: ["user", "activity", "event", "message", "community_post"], example: "user" },
      entityId: { type: "string", example: "665fe91a3f6b4a2b6c3a1234" },
      reason: { type: "string", example: "inappropriate_content" },
      details: { type: "string", example: "Offensive language in public event description." },
    },
  },
  AdminResolveReportBody: {
    type: "object",
    properties: {
      status: { type: "string", enum: ["resolved", "under_review", "closed"], default: "resolved" },
      adminNote: { type: "string", example: "Warning issued to host. Content removed." },
    },
  },
  AdminReportActionBody: {
    type: "object",
    required: ["action"],
    properties: {
      action: { type: "string", enum: ["warn", "disable_user", "recover_user"], example: "warn" },
      note: { type: "string", example: "Official platform policy warning dispatched." },
    },
  },

  // ----------------------------------------------------
  // Support Tickets Schemas
  // ----------------------------------------------------
  SupportTicket: {
    type: "object",
    properties: {
      _id: { type: "string", example: "665fe91a3f6b4a2b6c3acc33" },
      userId: { type: "string" },
      category: { type: "string", example: "Billing & Subscriptions" },
      subject: { type: "string", example: "Charged twice for October creator pass" },
      status: { type: "string", enum: ["open", "in_progress", "resolved", "closed"], example: "open" },
      messages: {
        type: "array",
        items: {
          type: "object",
          properties: {
            senderRole: { type: "string", enum: ["user", "admin"] },
            senderId: { type: "string" },
            message: { type: "string" },
            sentAt: { type: "string", format: "date-time" }
          }
        }
      },
      createdAt: { type: "string", format: "date-time" },
      updatedAt: { type: "string", format: "date-time" },
    },
  },
  CreateTicketBody: {
    type: "object",
    required: ["category", "subject", "message"],
    properties: {
      category: { type: "string", example: "Technical Issue" },
      subject: { type: "string", example: "Cannot generate QR activity pass" },
      message: { type: "string", example: "Whenever I click pass, it gives a network timeout error." },
    },
  },
  AddTicketReplyBody: {
    type: "object",
    required: ["message"],
    properties: {
      message: { type: "string", example: "Here is the error screenshot URL and additional info." },
    },
  },

  // ----------------------------------------------------
  // Shop & Merchandise Schemas
  // ----------------------------------------------------
  Cart: {
    type: "object",
    properties: {
      userId: { type: "string" },
      items: {
        type: "array",
        items: {
          type: "object",
          properties: {
            productId: { type: "string" },
            name: { type: "string" },
            price: { type: "number" },
            quantity: { type: "integer" },
            imageUrl: { type: "string" }
          }
        }
      },
      subtotal: { type: "number", example: 120.00 },
      itemCount: { type: "integer", example: 3 }
    }
  },
  AddToCartBody: {
    type: "object",
    required: ["productId", "quantity"],
    properties: {
      productId: { type: "string", example: "665fe91a3f6b4a2b6c3add44" },
      quantity: { type: "integer", minimum: 1, example: 2 },
    },
  },

  // ----------------------------------------------------
  // Promotional Ads Schemas
  // ----------------------------------------------------
  Ad: {
    type: "object",
    properties: {
      _id: { type: "string", example: "665fe91a3f6b4a2b6c3aee55" },
      name: { type: "string", example: "Hydration Electrolyte Packs" },
      category: { type: "string", example: "Nutrition" },
      description: { type: "string", example: "Get 20% off high performance hydration salts." },
      price: { type: "number", example: 24.99 },
      imageUrl: { type: "string", example: "https://s3.amazonaws.com/stoneacademy/ads/drink.jpg" },
      linkUrl: { type: "string", example: "https://shop.exercisewithme.org/hydration" },
      country: { type: "string", example: "United States" },
      state: { type: "string", example: "California" },
      city: { type: "string", example: "Los Angeles" },
      status: { type: "string", enum: ["active", "expired"], example: "active" },
      createdAt: { type: "string", format: "date-time" },
    },
  },

  // ----------------------------------------------------
  // CMS & Static Pages Schemas
  // ----------------------------------------------------
  CmsPage: {
    type: "object",
    properties: {
      _id: { type: "string", example: "665fe91a3f6b4a2b6c3aff66" },
      slug: { type: "string", example: "privacy-policy" },
      title: { type: "string", example: "Privacy Policy" },
      content: { type: "string", example: "# Stone Academy Privacy Policy\n\nYour privacy is paramount..." },
      updatedAt: { type: "string", format: "date-time" },
    },
  },
  UpsertCmsPageBody: {
    type: "object",
    required: ["content"],
    properties: {
      title: { type: "string", example: "Terms of Service" },
      content: { type: "string", example: "# Terms of Service\n\nBy accessing Stone Academy..." },
    },
  },

  // ----------------------------------------------------
  // Admin Dashboard & Settings Schemas
  // ----------------------------------------------------
  AdminDashboardOverview: {
    type: "object",
    properties: {
      totalUsers: { type: "integer", example: 4520 },
      activeUsers: { type: "integer", example: 3890 },
      totalCreators: { type: "integer", example: 215 },
      totalActivities: { type: "integer", example: 840 },
      totalEvents: { type: "integer", example: 320 },
      totalPlatformRevenue: { type: "number", example: 45890.00 },
      pendingPayoutsCount: { type: "integer", example: 14 },
      openSupportTickets: { type: "integer", example: 6 },
    },
  },
  PlatformSettings: {
    type: "object",
    properties: {
      platformFeePercent: { type: "number", example: 10 },
      cancellationPolicy: { type: "string", example: "Full refund 24 hours prior to event start." },
      refundPolicy: { type: "string", example: "Automatic refund on event cancellation by creator." },
      reminderMinutes: { type: "integer", example: 60 },
      subscriptionMonthlyPrice: { type: "number", example: 29.99 },
      subscriptionYearlyPrice: { type: "number", example: 299.99 },
    },
  },
  UpdatePlatformSettingsBody: {
    type: "object",
    properties: {
      platformFeePercent: { type: "number", example: 10 },
      cancellationPolicy: { type: "string" },
      refundPolicy: { type: "string" },
      reminderMinutes: { type: "integer", example: 60 },
      subscriptionMonthlyPrice: { type: "number", example: 29.99 },
      subscriptionYearlyPrice: { type: "number", example: 299.99 },
    },
  },
};
