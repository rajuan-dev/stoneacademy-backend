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
import rootRouter from "@/routes/index.route.js";

import swaggerUi from "swagger-ui-express";

import { swaggerSpec, swaggerUiOptions } from "./config/swagger.config.js";
import { env } from "./env.js";
import { pinoLogger } from "./middlewares/pino-logger.js";
import { requestBodyLogger } from "./middlewares/request-body-logger.middleware.js";

const app: Application = express();

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

app.use(env.BASE_URL, rootRouter);

app.use(notFound);
app.use(errorHandler);

export default app;
