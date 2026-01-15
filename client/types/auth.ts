export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  roles: string[];
  permissions: string[];
  departmentId?: string;
  department?: {
    code: string;
    name: string;
  };
  employeeId?: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
  sessionId: string;
  expiresIn: number;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface LogoutRequest {
  reason?: string;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

// MFA-related types
export interface MfaChallengeResponse {
  mfaRequired: true;
  tempToken: string;
  message: string;
}

export interface MfaSetupRequiredResponse {
  mfaSetupRequired: true;
  tempToken: string;
  message: string;
}

export interface MfaSetupResponse {
  secret: string;
  qrCode: string;
  backupCodes: string[];
}

// Login response can be either full auth, MFA challenge, or MFA setup required
export type LoginResponse = AuthResponse | MfaChallengeResponse | MfaSetupRequiredResponse;








