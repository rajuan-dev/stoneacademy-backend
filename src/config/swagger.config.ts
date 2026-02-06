import path from "path";
import swaggerJsdoc from "swagger-jsdoc";

import { env } from "@/env";

const swaggerDefinition: swaggerJsdoc.OAS3Definition = {
  openapi: "3.0.3",
  info: {
    title: `${env.APP_NAME} API`,
    description:
      "REST API documentation for the SuperFly service platform. All endpoints follow REST best practices, use JSON payloads, and require HTTPS.",
    version: "1.0.0",
    contact: {
      name: "SuperFly Support",
      email: "support@superfly.com",
    },
    security: [
      {
        BearerAuth: [],
      },
    ],
  },
  servers: [
    {
      url: `${env.BASE_URL}`,
      description: "Primary API gateway",
    },
  ],
  components: {
    securitySchemes: {
      BearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
        description:
          "Provide the JWT access token retrieved from the `/auth/login` endpoint. Example: `Bearer eyJhbGci...`",
      },
    },
    schemas: {
      AuthRegisterRequest: {
        type: "object",
        required: ["email", "password", "confirmPassword", "fullName"],
        properties: {
          email: {
            type: "string",
            format: "email",
            example: "client@superfly.com",
          },
          password: { type: "string", minLength: 8, example: "StrongP@ssw0rd" },
          confirmPassword: {
            type: "string",
            minLength: 8,
            example: "StrongP@ssw0rd",
          },
          fullName: { type: "string", example: "Jane Client" },
          role: { type: "string", enum: ["user"], example: "user" },
        },
      },
      AuthRegisterResponse: {
        type: "object",
        properties: {
          user: {
            $ref: "#/components/schemas/UserProfile",
          },
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
          email: {
            type: "string",
            format: "email",
            example: "client@superfly.com",
          },
          password: { type: "string", example: "StrongP@ssw0rd" },
        },
      },
      AuthLoginResponse: {
        type: "object",
        properties: {
          user: { $ref: "#/components/schemas/UserProfile" },
          accessToken: { type: "string", description: "JWT access token" },
          expiresIn: { type: "string", example: "7d" },
        },
      },
      OtpSendRequest: {
        type: "object",
        required: ["email", "purpose"],
        properties: {
          email: { type: "string", format: "email" },
          purpose: {
            type: "string",
            enum: ["verify_email", "reset_password", "login_otp_optional"],
          },
        },
      },
      OtpVerifyRequest: {
        type: "object",
        required: ["email", "purpose", "code"],
        properties: {
          email: { type: "string", format: "email" },
          purpose: {
            type: "string",
            enum: ["verify_email", "reset_password", "login_otp_optional"],
          },
          code: { type: "string", example: "1234" },
        },
      },
      Category: {
        type: "object",
        properties: {
          _id: { type: "string" },
          name: { type: "string" },
          isActive: { type: "boolean" },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
      },
      Activity: {
        type: "object",
        properties: {
          _id: { type: "string" },
          hostId: { type: "string" },
          title: { type: "string" },
          typeCategoryId: { type: "string" },
          description: { type: "string", nullable: true },
          startAt: { type: "string", format: "date-time" },
          endAt: { type: "string", format: "date-time", nullable: true },
          status: {
            type: "string",
            enum: ["draft", "published", "cancelled", "completed"],
          },
          participantLimit: { type: "integer", nullable: true },
          distanceMiles: { type: "number", nullable: true },
        },
      },
      UserProfile: {
        type: "object",
        properties: {
          _id: { type: "string", example: "665fe91a3f6b4a2b6c3a1234" },
          email: { type: "string", format: "email" },
          fullName: { type: "string" },
          phone: { type: "string", nullable: true },
          dob: { type: "string", format: "date-time", nullable: true },
          gender: {
            type: "string",
            enum: ["male", "female", "other", "prefer_not"],
            nullable: true,
          },
          role: {
            type: "string",
            enum: ["user", "creator", "admin", "super_admin"],
          },
          status: { type: "string", enum: ["active", "suspended", "deleted"] },
          emailVerifiedAt: {
            type: "string",
            format: "date-time",
            nullable: true,
          },
          lastLoginAt: { type: "string", format: "date-time", nullable: true },
          profileImage: { type: "string", nullable: true },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
      },
      QuoteResponse: {
        type: "object",
        properties: {
          _id: { type: "string" },
          userId: { type: "string", nullable: true },
          serviceType: {
            type: "string",
            enum: ["residential", "commercial", "post_construction"],
          },
          status: { type: "string" },
          contactName: { type: "string" },
          firstName: { type: "string" },
          lastName: { type: "string" },
          email: { type: "string" },
          phoneNumber: { type: "string" },
          companyName: { type: "string", nullable: true },
          businessAddress: { type: "string", nullable: true },
          serviceDate: { type: "string" },
          preferredTime: { type: "string", nullable: true },
          notes: { type: "string", nullable: true },
          services: {
            type: "array",
            items: {
              type: "object",
              properties: {
                key: { type: "string" },
                label: { type: "string" },
                unitPrice: { type: "number" },
                quantity: { type: "number" },
                subtotal: { type: "number" },
              },
            },
          },
          totalPrice: { type: "number" },
          currency: { type: "string" },
          paymentStatus: { type: "string" },
          paymentAmount: { type: "number" },
          paidAt: { type: "string", format: "date-time", nullable: true },
          adminNotifiedAt: {
            type: "string",
            format: "date-time",
            nullable: true,
          },
          assignedCleanerId: { type: "string", nullable: true },
          assignedCleanerAt: {
            type: "string",
            format: "date-time",
            nullable: true,
          },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
      },
      ErrorResponse: {
        type: "object",
        properties: {
          success: { type: "boolean", example: false },
          message: { type: "string", example: "Validation failed" },
          errors: {
            type: "array",
            items: { type: "string" },
          },
        },
      },
    },
  },
  tags: [
    { name: "Auth", description: "Authentication & authorization" },
    { name: "Categories", description: "Activity categories" },
    { name: "Activities", description: "Activities and participation" },
    { name: "Quotes", description: "Quote management & cleaner workflow" },
    { name: "Users", description: "User profile & account endpoints" },
    { name: "Password", description: "Password reset & recovery" },
  ],
};

const options: swaggerJsdoc.Options = {
  swaggerDefinition,
  apis: [
    path.join(__dirname, "../modules/**/*.route.ts"),
    path.join(__dirname, "../modules/**/*.controller.ts"),
    path.join(__dirname, "../modules/**/*.schema.ts"),
  ],
};

export const swaggerSpec = swaggerJsdoc(options);

export const swaggerUiOptions = {
  customCss: `
    :root {
      --sf-primary: #C85344;
      --sf-primary-dark: #a34135;
    }
    .swagger-ui .topbar,
    .swagger-ui .topbar .download-url-wrapper {
      background: var(--sf-primary);
    }
    .swagger-ui .topbar .link span,
    .swagger-ui .topbar .download-url-wrapper .download-url-button {
      color: #fff;
    }
    .swagger-ui .btn,
    .swagger-ui .opblock-summary-control,
    .swagger-ui .opblock-tag-section h3 span {
      border-radius: 4px;
    }
    .swagger-ui .btn.authorize,
    .swagger-ui .btn.try-out__btn,
    .swagger-ui .btn.execute,
    .swagger-ui .opblock-tag-section h3 {
      background: var(--sf-primary);
      border-color: var(--sf-primary-dark);
      color: #fff;
    }
    .swagger-ui .btn.try-out__btn:hover,
    .swagger-ui .btn.execute:hover,
    .swagger-ui .btn.authorize:hover {
      background: var(--sf-primary-dark);
    }
    .swagger-ui .opblock-summary-method,
    .swagger-ui .tab li.active h4 span {
      color: var(--sf-primary);
    }
    .swagger-ui .information-container,
    .swagger-ui .opblock-tag.no-desc span {
      border-left: 4px solid var(--sf-primary);
      padding-left: 8px;
    }
    .swagger-ui .scheme-container {
      box-shadow: none;
      border: 1px solid #e3e3e3;
    }
    body {
      font-family: "Inter", "Segoe UI", system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
      background: #f7f7f8;
    }
  `,
  customSiteTitle: `${env.APP_NAME} API Docs`,
};
