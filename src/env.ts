// file: src/env.ts
import { z } from "zod/v4";

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  APP_NAME: z.string().default("SuperFly - service provider Platform"),
  BASE_URL: z.string().default("/api/v1"),
  PORT: z.coerce.number().default(3000),
  MONGO_URI: z.string().trim().optional().default(""),
  JWT_SECRET: z.string().default("lp01yPo31ACozd4pDI9Z1DSD30A"),
  JWT_REFRESH_SECRET: z.string().default("rwN17KgtvujqVe6jANmu3r5FIFY0jw"),
  JWT_EXPIRY: z.string().default("7d"),
  JWT_REFRESH_EXPIRY: z.string().default("30d"),
  SALT_ROUNDS: z.coerce.number().default(12),
  OTP_SECRET: z.string().optional(),

  // Frontend URL
  CLIENT_URL: z.url().default("http://localhost:3000"),
  LOG_LEVEL: z
    .enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"])
    .default("info"),

  EMAIL_PROVIDER: z
    .enum(["auto", "postmark", "smtp", "resend", "disabled"])
    .default("auto"),
  EMAIL_MAX_RETRIES: z.coerce.number().int().min(0).default(0),
  EMAIL_RETRY_DELAY_MS: z.coerce.number().int().min(0).default(0),
  EMAIL_FROM_NAME: z.string().optional(),
  EMAIL_FROM_ADDRESS: z.string().email().optional(),
  EMAIL_REPLY_TO: z.string().email().optional(),
  EMAIL_LOGO_URL: z.string().optional(),
  EMAIL_BRAND_COLOR: z.string().optional(),

  POSTMARK_API_TOKEN: z.string().optional(),
  POSTMARK_MESSAGE_STREAM: z.string().optional(),
  POSTMARK_SANDBOX_MODE: z.coerce.boolean().optional(),
  RESEND_API_KEY: z.string().optional(),

  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().optional(),
  SMTP_SECURE: z.coerce.boolean().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_FROM: z.string().optional(),

  GOOGLE_CLIENT_ID: z.string().optional(),

  STRIPE_SECRET_KEY: z.string().optional().default(""),
  STRIPE_WEBHOOK_SECRET: z.string().optional().default(""),
  STRIPE_CHECKOUT_SUCCESS_URL: z.string().optional(),
  STRIPE_CHECKOUT_CANCEL_URL: z.string().optional(),

  AWS_ACCESS_KEY: z.string().optional().default(""),
  AWS_SECRET_ACCESS_KEY: z.string().optional().default(""),
  AWS_REGION: z.string().optional().default(""),
  AWS_S3_BUCKET: z.string().optional().default(""),
  AWS_S3_ENDPOINT: z.string().optional(),

  REMINDER_MINUTES: z.coerce.number().default(30),
});

try {
  // eslint-disable-next-line node/no-process-env
  envSchema.parse(process.env);
} catch (error) {
  if (error instanceof z.ZodError) {
    console.error(
      "Missing environment variables:",
      error.issues.flatMap((issue) => issue.path),
    );
  } else {
    console.error(error);
  }
  process.exit(1);
}

// eslint-disable-next-line node/no-process-env
export const env = envSchema.parse(process.env);

const requiredInProduction = ["MONGO_URI", "JWT_SECRET", "JWT_REFRESH_SECRET"];
if (env.NODE_ENV === "production") {
  const missing = requiredInProduction.filter((key) => {
    const value = env[key as keyof typeof env];
    return typeof value !== "string" || value.trim() === "";
  });
  if (missing.length > 0) {
    console.error(
      "Missing required environment variables for production:",
      missing,
    );
    process.exit(1);
  }
}
