import path from "node:path";
import swaggerJsdoc from "swagger-jsdoc";

import { env } from "@/env";

import { swaggerPaths } from "./swagger-paths.js";
import { swaggerSchemas } from "./swagger-schemas.js";

const swaggerDefinition: swaggerJsdoc.OAS3Definition = {
  openapi: "3.0.3",
  info: {
    title: "Stone Academy Enterprise API",
    description:
      "Enterprise-grade RESTful API documentation for Stone Academy — the modern community fitness, creator event ticketing, and activity platform. Fully integrated with Stripe Connect (90% creator / 10% platform fee split), realtime chat (Socket.io), AWS S3 media infrastructure, and comprehensive administrative moderation tooling.",
    version: "2.0.0",
    contact: {
      name: "Stone Academy Engineering Support",
      email: "support@exercisewithme.org",
      url: "https://exercisewithme.org",
    },
    license: {
      name: "Proprietary / All Rights Reserved",
    },
  },
  security: [
    {
      BearerAuth: [],
    },
  ],
  servers: [
    {
      url: `${env.BASE_URL}`,
      description: "Primary API Gateway (/api/v1)",
    },
    {
      url: "/",
      description: "Root Host Gateway",
    },
  ],
  tags: [
    { name: "System", description: "Health checks, gateway status, and onboarding redirects" },
    { name: "Auth", description: "User authentication, registration, OTP verification, and JWT session handling" },
    { name: "Users", description: "User profile management, galleries, media, and social blocklists" },
    { name: "Categories", description: "Activity and event taxonomy management" },
    { name: "Activities", description: "Free & social community activities, scheduling, join/leave, and QR pass generation" },
    { name: "Events", description: "Creator ticketed events, fees, participant rosters, and ticketing workflows" },
    { name: "Subscriptions", description: "Creator membership subscription tiers and gating" },
    { name: "Billing & Payouts", description: "Transactions ledger, creator earnings (90/10 split), and Stripe Connect payouts" },
    { name: "Host Stripe Connect", description: "Stripe Express connected accounts, hosted onboarding, and dashboard links" },
    { name: "Chat & Realtime", description: "Realtime messaging threads with hosts, peers, and support staff" },
    { name: "Messages", description: "Direct 1-on-1 messaging, read receipts, and typing indicators" },
    { name: "Feed", description: "Personalized discovery feed and multi-criteria activity/event search" },
    { name: "Community", description: "Social community feed posts, likes, comment threads, and replies" },
    { name: "Community Creator", description: "Creator rich posting with multi-asset media uploads and event tagging" },
    { name: "Notifications", description: "In-app notifications, badges, and user preference controls" },
    { name: "Reviews", description: "Participant ratings, host feedback, and aggregate score tracking" },
    { name: "Reports", description: "Abuse reporting for users, events, activities, posts, and comments" },
    { name: "Support", description: "Customer helpdesk ticketing, replies, and status transitions" },
    { name: "Shop", description: "Merchandise catalog, cart management, and checkout" },
    { name: "Ads", description: "Promotional ads, sponsored banners, and product conversions" },
    { name: "CMS", description: "Dynamic CMS pages, About Us, Privacy Policy, Terms & Conditions" },
    { name: "Onboarding", description: "First-time user onboarding slides and progress tracking" },
    { name: "Admin Auth", description: "Dedicated administrative authentication and session revocation" },
    { name: "Admin Dashboard", description: "Platform executive overview, analytics, growth metrics, and bootstrap data" },
    { name: "Admin Users", description: "Administrative user moderation, role assignment, and suspension" },
    { name: "Admin Activities & Events", description: "Platform-wide content moderation, event cancellation, and refund retries" },
    { name: "Admin Subscriptions & Payouts", description: "Creator membership oversight, platform fee config, and manual payout execution" },
    { name: "Admin Notifications", description: "System telemetry and administrative alerts" },
    { name: "Admin Settings", description: "Platform policies, commission split rates, and admin security settings" },
    { name: "Admin Reports", description: "Abuse report moderation queue and punitive enforcement actions" },
    { name: "Admin Operations", description: "Core administrator workflows and oversight endpoints" },
    { name: "Webhooks", description: "Stripe billing and Stripe Connect webhook listener endpoints" },
  ],
  components: {
    securitySchemes: {
      BearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
        description:
          "Provide the JWT access token retrieved from `/auth/login` or `/admin/login`. Example: `Bearer eyJhbGci...`",
      },
    },
    schemas: swaggerSchemas,
  },
  paths: swaggerPaths,
};

const options: swaggerJsdoc.Options = {
  swaggerDefinition,
  apis: [
    path.join(__dirname, "../modules/**/*.route.ts"),
    path.join(__dirname, "../modules/**/*.route.js"),
    path.join(__dirname, "../modules/**/*.controller.ts"),
    path.join(__dirname, "../modules/**/*.controller.js"),
    path.join(__dirname, "../modules/**/*.schema.ts"),
    path.join(__dirname, "../modules/**/*.schema.js"),
    path.join(__dirname, "../docs/**/*.swagger.ts"),
    path.join(__dirname, "../docs/**/*.swagger.js"),
  ],
};

export const swaggerSpec = swaggerJsdoc(options);

export const swaggerUiOptions = {
  customCss: `
    :root {
      --sa-primary: #0f766e;
      --sa-primary-dark: #115e59;
      --sa-accent: #f59e0b;
      --sa-bg: #0f172a;
    }
    .swagger-ui .topbar {
      background: #0f172a;
      border-bottom: 2px solid var(--sa-primary);
      padding: 12px 0;
    }
    .swagger-ui .topbar .download-url-wrapper {
      background: transparent;
    }
    .swagger-ui .topbar .link {
      font-weight: 700;
      color: #f8fafc;
      font-size: 1.15rem;
      letter-spacing: 0.5px;
    }
    .swagger-ui .topbar .link span {
      color: #38bdf8;
    }
    .swagger-ui .btn,
    .swagger-ui .opblock-summary-control,
    .swagger-ui .opblock-tag-section h3 span {
      border-radius: 6px;
    }
    .swagger-ui .btn.authorize {
      background: var(--sa-primary);
      border-color: var(--sa-primary);
      color: #fff;
    }
    .swagger-ui .btn.authorize svg {
      fill: #fff;
    }
    .swagger-ui .btn.try-out__btn,
    .swagger-ui .btn.execute {
      background: var(--sa-primary);
      border-color: var(--sa-primary-dark);
      color: #fff;
      font-weight: 600;
    }
    .swagger-ui .opblock-tag-section h3 {
      font-size: 1.1rem;
      color: #0f172a;
      border-bottom: 1px solid #e2e8f0;
    }
    .swagger-ui .btn.try-out__btn:hover,
    .swagger-ui .btn.execute:hover,
    .swagger-ui .btn.authorize:hover {
      background: var(--sa-primary-dark);
    }
    .swagger-ui .opblock-summary-method {
      border-radius: 4px;
      font-weight: 700;
      min-width: 80px;
    }
    .swagger-ui .tab li.active h4 span {
      color: var(--sa-primary);
    }
    .swagger-ui .information-container {
      background: #ffffff;
      border-radius: 8px;
      padding: 24px;
      margin-bottom: 20px;
      border: 1px solid #e2e8f0;
      box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1);
    }
    .swagger-ui .information-container .title {
      font-size: 2rem;
      color: #0f172a;
      font-weight: 800;
    }
    .swagger-ui .scheme-container {
      background: #ffffff;
      box-shadow: none;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      margin: 16px 0;
      padding: 16px 24px;
    }
    body {
      font-family: "Inter", "Segoe UI", system-ui, -apple-system, sans-serif;
      background: #f8fafc;
      color: #1e293b;
    }
  `,
  customSiteTitle: "Stone Academy API Documentation",
};
