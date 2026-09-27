// file: src/app.ts
import type { Application } from "express";

import compression from "compression";
import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import swaggerUi from "swagger-ui-express";

import { errorHandler } from "@/middlewares/error-handler.middleware";
import { notFound } from "@/middlewares/not-found.middleware";
import { responseCache } from "@/middlewares/response-cache.middleware";
import billingWebhookRouter from "@/modules/billing/billing-webhook.route.js";
import stripeConnectWebhookRouter from "@/modules/host-stripe/stripe-connect-webhook.route.js";
import rootRouter from "@/routes/index.route.js";

import { swaggerSpec, swaggerUiOptions } from "./config/swagger.config.js";
import { env } from "./env.js";
import { pinoLogger } from "./middlewares/pino-logger.js";
import { requestBodyLogger } from "./middlewares/request-body-logger.middleware.js";

const app: Application = express();
app.set("trust proxy", 1);

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const stripeOnboardingPage = ({
  title,
  message,
  tone = "success",
}: {
  title: string;
  message: string;
  tone?: "success" | "warning";
}) => {
  const safeClientUrl = escapeHtml(env.CLIENT_URL);
  const accent = tone === "success" ? "#0ea5e9" : "#f59e0b";

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(title)}</title>
    <style>
      * { box-sizing: border-box; }
      body {
        margin: 0;
        min-height: 100vh;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 24px;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        background: #f5f8fc;
        color: #10233a;
      }
      .card {
        width: 100%;
        max-width: 420px;
        background: #fff;
        border: 1px solid #d8e5f2;
        border-radius: 18px;
        padding: 24px;
        box-shadow: 0 18px 45px rgba(15, 35, 58, 0.08);
      }
      .icon {
        width: 44px;
        height: 44px;
        display: grid;
        place-items: center;
        border-radius: 999px;
        background: ${accent}1f;
        color: ${accent};
        font-size: 24px;
        font-weight: 700;
        margin-bottom: 16px;
      }
      h1 {
        margin: 0 0 10px;
        font-size: 24px;
        line-height: 1.2;
      }
      p {
        margin: 0;
        color: #4b5f76;
        font-size: 15px;
        line-height: 1.55;
      }
      .actions {
        display: grid;
        gap: 10px;
        margin-top: 22px;
      }
      button, a {
        width: 100%;
        min-height: 44px;
        border-radius: 10px;
        border: 0;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        font: inherit;
        font-weight: 700;
        text-decoration: none;
      }
      button {
        background: ${accent};
        color: #fff;
      }
      a {
        background: #eef4fb;
        color: #10233a;
      }
    </style>
  </head>
  <body>
    <main class="card">
      <div class="icon">${tone === "success" ? "✓" : "!"}</div>
      <h1>${escapeHtml(title)}</h1>
      <p>${escapeHtml(message)}</p>
      <div class="actions">
        <button type="button" onclick="window.close()">Close</button>
        <a href="${safeClientUrl}">Return to app</a>
      </div>
    </main>
  </body>
</html>`;
};

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
app.use(compression());
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

app.get("/docs.json", (_req, res) => {
  res.setHeader("Content-Type", "application/json");
  res.send(swaggerSpec);
});

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
    message: "OK",
    status: "ok",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

app.get("/onboarding/success", (_req, res) => {
  res.status(200).type("html").send(stripeOnboardingPage({
    title: "Stripe onboarding completed",
    message: "Your payout account setup is complete. You can close this page and return to the app.",
  }));
});

app.get("/onboarding/refresh", (_req, res) => {
  res.status(200).type("html").send(stripeOnboardingPage({
    title: "Onboarding link expired",
    message: "This setup link expired or was interrupted. Return to the app and start Stripe onboarding again.",
    tone: "warning",
  }));
});

app.use(env.BASE_URL, responseCache, rootRouter);

app.use(notFound);
app.use(errorHandler);

export default app;
