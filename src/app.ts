// file: src/app.ts
import type { Application } from "express";

import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";

import { errorHandler } from "@/middlewares/error-handler.middleware";
import { notFound } from "@/middlewares/not-found.middleware";
import billingWebhookRouter from "@/modules/billing/billing-webhook.route.js";
import stripeConnectWebhookRouter from "@/modules/host-stripe/stripe-connect-webhook.route.js";
import rootRouter from "@/routes/index.route.js";

import swaggerUi from "swagger-ui-express";

import { swaggerSpec, swaggerUiOptions } from "./config/swagger.config.js";
import { env } from "./env.js";
import { pinoLogger } from "./middlewares/pino-logger.js";
import { requestBodyLogger } from "./middlewares/request-body-logger.middleware.js";

const app: Application = express();
app.set("trust proxy", 1);

app.use(
  cors({
    origin: true,
    credentials: true,
  }),
);

app.use(
  `${env.BASE_URL}/billing/webhook`,
  express.raw({ type: "application/json" }),
  billingWebhookRouter,
);
app.use(
  `${env.BASE_URL}/stripe`,
  express.raw({ type: "application/json" }),
  stripeConnectWebhookRouter,
);

app.use(express.json());
app.use(pinoLogger());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(morgan("dev"));
app.use(helmet());
app.use(requestBodyLogger);

app.use(
  "/docs",
  swaggerUi.serve,
  swaggerUi.setup(swaggerSpec, {
    ...swaggerUiOptions,
    swaggerOptions: {
      persistAuthorization: true,
      tagsSorter: "alpha",
      operationsSorter: "method",
    },
  }),
);

app.get<object>("/", (_req, res) => {
  res.json({
    success: true,
    message: "Stone Academy admin backend is running",
    data: {
      name: "project-service-API",
      version: "1.0.0",
    },
    meta: null,
    timestamp: new Date().toISOString(),
  });
});

app.get("/healthz", (_req, res) => {
  res.status(200).json({
    success: true,
    status: "ok",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

// Temporary public fallback pages for Stripe Connect onboarding redirects.
// These let you test the flow before mobile/web frontend screens are ready.
app.get("/onboarding/success", (_req, res) => {
  res.status(200).type("html").send(`<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Stone Academy - Stripe Onboarding Success</title>
    <style>
      body { font-family: Arial, sans-serif; background: #f4f7fb; color: #10233a; margin: 0; padding: 24px; }
      .card { max-width: 680px; margin: 0 auto; background: #fff; border: 1px solid #d7e3ef; border-radius: 12px; padding: 20px; }
      h1 { margin-top: 0; }
      code { background: #eef3f8; padding: 2px 6px; border-radius: 6px; }
    </style>
  </head>
  <body>
    <div class="card">
      <h1>Stripe onboarding completed</h1>
      <p>You can close this page and return to the app.</p>
      <p>Next step: verify webhook delivery to <code>/api/v1/stripe/webhook</code> and check <code>stripeOnboardingCompleted</code> from <code>/api/v1/users/me</code>.</p>
    </div>
  </body>
</html>`);
});

app.get("/onboarding/refresh", (_req, res) => {
  res.status(200).type("html").send(`<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Stone Academy - Stripe Onboarding Refresh</title>
    <style>
      body { font-family: Arial, sans-serif; background: #f4f7fb; color: #10233a; margin: 0; padding: 24px; }
      .card { max-width: 680px; margin: 0 auto; background: #fff; border: 1px solid #d7e3ef; border-radius: 12px; padding: 20px; }
      h1 { margin-top: 0; }
      a { color: #0f766e; text-decoration: none; font-weight: 600; }
    </style>
  </head>
  <body>
    <div class="card">
      <h1>Stripe onboarding needs refresh</h1>
      <p>The onboarding link expired or was interrupted.</p>
      <p>Go back to your app and request a new onboarding link.</p>
    </div>
  </body>
</html>`);
});

app.use(env.BASE_URL, rootRouter);

app.use(notFound);
app.use(errorHandler);

export default app;
