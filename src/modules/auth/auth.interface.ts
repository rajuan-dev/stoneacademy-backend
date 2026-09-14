// file: src/modules/auth/auth.interface.ts

export type IRegisterRequest = {
  email: string;
  password: string;
  confirmPassword?: string;
  fullName: string;
  role?: "user";
};

export type ILoginRequest = {
  email: string;
  password: string;
};

export type IVerifyEmailRequest = {
  email: string;
  code: string;
};

export type IRequestPasswordResetRequest = {
  email: string;
};

export type IVerifyOTPRequest = {
  email: string;
  purpose: "verify_email" | "reset_password" | "login_otp_optional";
  code: string;
};

export type IResetPasswordRequest = {
  email: string;
  code: string;
  newPassword: string;
};

export type IRefreshTokenRequest = {
  refreshToken: string;
};

export type IAuthResponse = {
  success: boolean;
  message: string;
  data?: {
    accessToken?: string;
    refreshToken?: string;
    user?: any;
  };
};
