export class ApiError extends Error {
  statusCode?: number;
  isNetworkError: boolean;
  code?: string;
  details?: unknown;

  constructor(message: string, statusCode?: number, isNetworkError = false, code?: string, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.statusCode = statusCode;
    this.isNetworkError = isNetworkError;
    this.code = code;
    this.details = details;
  }
}

export function extractApiMessage(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null;

  const data = payload as Record<string, unknown>;

  if (typeof data.message === "string" && data.message.trim()) {
    return data.message;
  }

  const error = data.error as Record<string, unknown> | undefined;
  if (error && typeof error.message === "string" && error.message.trim()) {
    return error.message;
  }

  const details = error?.details;
  if (Array.isArray(details) && details.length > 0) {
    const first = details[0] as Record<string, unknown>;
    const message = first?.message;
    if (Array.isArray(message) && message.length > 0 && typeof message[0] === "string") {
      return message[0];
    }
    if (typeof message === "string") {
      return message;
    }
  }

  return null;
}

export function extractApiCode(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null;

  const data = payload as Record<string, unknown>;

  if (typeof data.code === "string" && data.code.trim()) {
    return data.code;
  }

  const error = data.error as Record<string, unknown> | undefined;
  if (error && typeof error.code === "string" && error.code.trim()) {
    return error.code;
  }

  return null;
}

export function extractApiDetails(payload: unknown): unknown {
  if (!payload || typeof payload !== "object") return null;

  const data = payload as Record<string, unknown>;
  const error = data.error as Record<string, unknown> | undefined;

  if (error && Object.prototype.hasOwnProperty.call(error, "details")) {
    return error.details;
  }

  if (Object.prototype.hasOwnProperty.call(data, "details")) {
    return data.details;
  }

  return null;
}

const ERROR_CODE_MAP: Record<string, string> = {
  FORBIDDEN: "You do not have permission to perform this action.",
  VALIDATION_ERROR: "Invalid data. Please review and try again.",
  MISSING_REQUIRED_FIELDS: "Required fields are missing.",
  INVALID_ID: "Invalid ID.",
  INVALID_ROLE: "Invalid role.",
  INVALID_TRANSACTION_ID: "Invalid transaction ID.",
  INVALID_AMOUNT: "Invalid amount.",
  INVALID_STATUS: "Invalid status.",
  INVALID_DATE: "Invalid date.",
  INVALID_GROUP: "Invalid group.",
  INVALID_CAPACITY: "Invalid capacity.",
  INVALID_ROOM_COUNT: "Invalid room count.",
  INVALID_SLOTS: "Invalid slot count.",
  INVALID_STAGE: "Invalid workflow stage.",
  INVALID_STAGE_TRANSITION: "Cannot move workflow stage backward.",
  INVALID_PET_TYPE: "Invalid pet type.",
  INVALID_GENDER: "Invalid pet gender.",
  INVALID_OTP: "Invalid or expired OTP code.",
  INVALID_CREDENTIALS: "Incorrect email or password.",
  ACCOUNT_LOCKED: "Account is temporarily locked. Please try again later.",
  ACCOUNT_DISABLED: "This account has been disabled.",
  USER_NOT_FOUND: "User not found.",
  PET_NOT_FOUND: "Pet not found.",
  SERVICE_NOT_FOUND: "Service not found.",
  ROOM_NOT_FOUND: "Room not found.",
  RECORD_NOT_FOUND: "Medical record not found.",
  BOOKING_NOT_FOUND: "Booking not found.",
  BOOKING_REQUIRED: "Please choose a booking to continue.",
  SERVICE_NOT_IN_BOOKING: "The service is not included in the selected booking.",
  FEEDBACK_NOT_FOUND: "Feedback not found.",
  FEEDBACK_EXISTS: "This feedback already exists.",
  CAMERA_NOT_FOUND: "Camera not found.",
  TRANSACTION_NOT_FOUND: "Transaction not found.",
  ALREADY_PROCESSED: "Transaction has already been processed.",
  PROFILE_INCOMPLETE: "Please complete your profile before performing this action.",
  PROFILE_NOT_FOUND: "Profile not found.",
  CONFIG_NOT_FOUND: "Configuration not found.",
  CONFIG_EXISTS: "Configuration already exists.",
  CODE_EXISTS: "This code already exists in the system.",
  TOKEN_EXPIRED: "Your session has expired. Please sign in again.",
  TOKEN_INVALID: "Invalid token. Please sign in again.",
  ROUTE_NOT_FOUND: "Endpoint does not exist.",
  NETWORK_ERROR: "Cannot connect to the server. Please check your network.",
  CANNOT_CHANGE_OWN_ROLE: "You cannot change your own role.",
  CANNOT_DELETE_SELF: "You cannot delete your own account.",
  CANNOT_BAN_SELF: "You cannot ban your own account.",
  CANNOT_BAN_ADMIN: "You cannot ban an admin account.",
  CANNOT_DELETE_ADMIN: "You cannot delete an admin account.",
  MISSING_FIELDS: "Required fields are missing.",
};

export function mapBackendErrorMessage(params: {
  code?: string | null;
  statusCode?: number;
  fallback?: string;
}) {
  const { code, statusCode, fallback } = params;

  if (code && ERROR_CODE_MAP[code]) {
    return ERROR_CODE_MAP[code];
  }

  // Prefer backend message when available to avoid masking useful auth errors.
  if (fallback && fallback.trim()) {
    return fallback;
  }

  if (statusCode === 401) return "You need to sign in to continue.";
  if (statusCode === 403) return "You do not have access permission.";
  if (statusCode === 404) return "Resource not found.";
  if (statusCode === 409) return "Data conflict detected. Please try again.";
  if (statusCode === 500) return "The system is busy. Please try again later.";

  return "Request failed.";
}
