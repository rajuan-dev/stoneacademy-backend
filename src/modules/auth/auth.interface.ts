// file: src/modules/auth/auth.interface.ts

export interface IRegisterRequest {
  email: string;
  password: string;
  confirmPassword?: string;
  fullName: string;
  role?: "user";
}

export interface ILoginRequest {
  email: string;
  password: string;
}

export interface IVerifyEmailRequest {
  email: string;
  code: string;
}

export interface IRequestPasswordResetRequest {
  email: string;
}

export interface IVerifyOTPRequest {
  email: string;
  purpose: "verify_email" | "reset_password" | "login_otp_optional";
  code: string;
}

export interface IResetPasswordRequest {
  email: string;
  code: string;
  newPassword: string;
}

export interface IRefreshTokenRequest {
  refreshToken: string;
}

export interface IAuthResponse {
  success: boolean;
  message: string;
  data?: {
    accessToken?: string;
    refreshToken?: string;
    user?: any;
  };
}
