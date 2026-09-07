import { describe, expect, it, vi } from "vitest";
import request from "supertest";
import app from "../src/app";

vi.mock("../src/modules/auth/auth.service", () => {
  class AuthService {
    register = vi.fn().mockResolvedValue({
      user: { _id: "u1", email: "test@example.com", fullName: "Test User" },
      tokens: { accessToken: "access", refreshToken: "refresh", expiresIn: "7d" },
      verification: {
        expiresAt: new Date().toISOString(),
        expiresInMinutes: 10,
      },
    });
    login = vi.fn().mockResolvedValue({
      user: { _id: "u1", email: "test@example.com", fullName: "Test User" },
      tokens: { accessToken: "access", refreshToken: "refresh", expiresIn: "7d" },
    });
    loginWithGoogle = vi.fn().mockResolvedValue({
      user: { _id: "u1", email: "test@example.com", fullName: "Test User" },
      tokens: { accessToken: "access", refreshToken: "refresh", expiresIn: "7d" },
    });
    loginWithApple = vi.fn().mockResolvedValue({
      user: { _id: "u1", email: "apple@example.com", fullName: "Apple User" },
      tokens: { accessToken: "access", refreshToken: "refresh", expiresIn: "7d" },
    });
    sendOtp = vi.fn().mockResolvedValue({
      expiresAt: new Date().toISOString(),
      expiresInMinutes: 10,
    });
    verifyOtp = vi.fn().mockResolvedValue({ message: "OTP verified successfully" });
    requestPasswordReset = vi.fn().mockResolvedValue({ message: "OTP sent" });
    resetPassword = vi.fn().mockResolvedValue({ message: "Password reset" });
    refreshAccessToken = vi.fn().mockResolvedValue({ accessToken: "new-access" });
    logout = vi.fn().mockResolvedValue({ message: "Logged out successfully" });
    changePassword = vi.fn().mockResolvedValue({ message: "Password changed" });
  }

  return { AuthService };
});

describe("Auth routes", () => {
  it("registers a user", async () => {
    const res = await request(app)
      .post("/api/v1/auth/register")
      .send({
        email: "test@example.com",
        password: "StrongP@ssw0rd",
        confirmPassword: "StrongP@ssw0rd",
        fullName: "Test User",
        country: "Bangladesh",
      })
      .expect(201);

    expect(res.body.success).toBe(true);
    expect(res.body.data.accessToken).toBe("access");
    expect(res.body.data.expiresIn).toBe("7d");
  });

  it("registers a user without country", async () => {
    const res = await request(app)
      .post("/api/v1/auth/register")
      .send({
        email: "nocountry@example.com",
        password: "StrongP@ssw0rd",
        confirmPassword: "StrongP@ssw0rd",
        fullName: "No Country User",
      })
      .expect(201);

    expect(res.body.success).toBe(true);
    expect(res.body.data.accessToken).toBe("access");
    expect(res.body.data.expiresIn).toBe("7d");
  });

  it("sends OTP", async () => {
    const res = await request(app)
      .post("/api/v1/auth/otp/send")
      .send({ email: "test@example.com", purpose: "verify_email" })
      .expect(200);

    expect(res.body.success).toBe(true);
  });

  it("verifies OTP", async () => {
    const res = await request(app)
      .post("/api/v1/auth/otp/verify")
      .send({ email: "test@example.com", purpose: "verify_email", code: "1234" })
      .expect(200);

    expect(res.body.success).toBe(true);
  });

  it("requests password reset", async () => {
    const res = await request(app)
      .post("/api/v1/auth/password/forgot")
      .send({ email: "test@example.com" })
      .expect(200);

    expect(res.body.success).toBe(true);
  });

  it("resets password", async () => {
    const res = await request(app)
      .post("/api/v1/auth/password/reset")
      .send({
        email: "test@example.com",
        code: "1234",
        newPassword: "StrongP@ssw0rd",
      })
      .expect(200);

    expect(res.body.success).toBe(true);
  });

  it("refreshes token", async () => {
    const res = await request(app)
      .post("/api/v1/auth/token/refresh")
      .send({ refreshToken: "refresh" })
      .expect(200);

    expect(res.body.success).toBe(true);
  });

  it("logs in with Google", async () => {
    const res = await request(app)
      .post("/api/v1/auth/google")
      .send({
        idToken: "valid-google-id-token",
        fullName: "Test User",
      })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.accessToken).toBe("access");
  });

  it("logs in with Apple", async () => {
    const res = await request(app)
      .post("/api/v1/auth/apple")
      .send({
        idToken: "valid-firebase-id-token",
        fullName: "Apple User",
        user: {
          uid: "firebase-uid",
          email: "apple@privaterelay.appleid.com",
          appleUserIdentifier: "apple-sub",
        },
      })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.accessToken).toBe("access");
  });
});
