export type UserRole = "customer" | "staff" | "admin";

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  avatar?: string | null;
  role: UserRole;
  authProvider?: "local" | "google";
  isEmailVerified?: boolean;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken?: string;
  expiresIn?: string;
}

export interface LoginResponseData {
  user: AuthUser;
  tokens: AuthTokens;
}
