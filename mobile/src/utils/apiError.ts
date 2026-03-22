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
  INVALID_CREDENTIALS: "Email hoặc mật khẩu không đúng.",
  ACCOUNT_DISABLED: "Tài khoản đã bị vô hiệu hóa.",
  FORBIDDEN: "Ban khong co quyen thuc hien thao tac nay.",
  VALIDATION_ERROR: "Du lieu khong hop le. Vui long kiem tra lai.",
  MISSING_REQUIRED_FIELDS: "Thieu truong bat buoc.",
  INVALID_ID: "ID khong hop le.",
  INVALID_ROLE: "Role khong hop le.",
  INVALID_TRANSACTION_ID: "Ma giao dich khong hop le.",
  INVALID_AMOUNT: "So tien khong hop le.",
  INVALID_STATUS: "Trang thai khong hop le.",
  INVALID_DATE: "Ngay thang khong hop le.",
  INVALID_GROUP: "Nhom khong hop le.",
  INVALID_CAPACITY: "Suc chua khong hop le.",
  INVALID_ROOM_COUNT: "So phong khong hop le.",
  INVALID_SLOTS: "So slot khong hop le.",
  INVALID_STAGE: "Giai doan xu ly khong hop le.",
  INVALID_STAGE_TRANSITION: "Khong the chuyen lui giai doan xu ly.",
  INVALID_PET_TYPE: "Loai thu cung khong hop le.",
  INVALID_GENDER: "Gioi tinh thu cung khong hop le.",
  INVALID_OTP: "Ma OTP khong hop le hoac da het han.",
  USER_NOT_FOUND: "Khong tim thay nguoi dung.",
  PET_NOT_FOUND: "Khong tim thay thu cung.",
  SERVICE_NOT_FOUND: "Khong tim thay dich vu.",
  ROOM_NOT_FOUND: "Khong tim thay phong.",
  RECORD_NOT_FOUND: "Khong tim thay medical record.",
  BOOKING_NOT_FOUND: "Khong tim thay booking.",
  BOOKING_REQUIRED: "Can chon booking de tiep tuc.",
  SERVICE_NOT_IN_BOOKING: "Dich vu khong nam trong booking da chon.",
  FEEDBACK_NOT_FOUND: "Khong tim thay feedback.",
  FEEDBACK_EXISTS: "Feedback nay da ton tai.",
  CAMERA_NOT_FOUND: "Khong tim thay camera.",
  TRANSACTION_NOT_FOUND: "Khong tim thay giao dich.",
  ALREADY_PROCESSED: "Giao dich da duoc xu ly truoc do.",
  PROFILE_INCOMPLETE: "Can hoan thien profile truoc khi thuc hien thao tac nay.",
  PROFILE_NOT_FOUND: "Khong tim thay profile.",
  CONFIG_NOT_FOUND: "Khong tim thay cau hinh.",
  CONFIG_EXISTS: "Cau hinh da ton tai.",
  CODE_EXISTS: "Ma da ton tai trong he thong.",
  TOKEN_EXPIRED: "Phien dang nhap da het han. Vui long dang nhap lai.",
  TOKEN_INVALID: "Token khong hop le. Vui long dang nhap lai.",
  ROUTE_NOT_FOUND: "Endpoint khong ton tai.",
  NETWORK_ERROR: "Khong the ket noi may chu. Vui long kiem tra mang.",
  CANNOT_CHANGE_OWN_ROLE: "Khong the thay doi role cua chinh ban.",
  CANNOT_DELETE_SELF: "Khong the xoa chinh tai khoan cua ban.",
  CANNOT_BAN_SELF: "Khong the khoa chinh tai khoan cua ban.",
  CANNOT_BAN_ADMIN: "Khong the khoa tai khoan admin.",
  CANNOT_DELETE_ADMIN: "Khong the xoa tai khoan admin.",
  MISSING_FIELDS: "Thieu truong bat buoc.",
};

export function mapBackendErrorMessage(params: {
  code?: string | null;
  statusCode?: number;
  fallback?: string;
}) {
  const { code, statusCode, fallback } = params;
  const busyServerMessage = "Máy chủ hiện đang bận hoặc bảo trì. Vui lòng thử lại sau.";
  const normalizedFallback = typeof fallback === "string" ? fallback.toLowerCase() : "";

  if (normalizedFallback.includes("tunnel unavailable") || normalizedFallback.includes("timed out") || normalizedFallback.includes("timeout")) {
    return busyServerMessage;
  }

  if (code && ERROR_CODE_MAP[code]) {
    return ERROR_CODE_MAP[code];
  }

  if (statusCode === 401) return "Ban can dang nhap de tiep tuc.";
  if (statusCode === 403) return "Ban khong co quyen truy cap.";
  if (statusCode === 404) return "Khong tim thay tai nguyen.";
  if (statusCode === 409) return "Du lieu bi xung dot. Vui long thu lai.";
  if (statusCode === 502 || statusCode === 503 || statusCode === 504) return busyServerMessage;
  if (statusCode === 500) return "He thong dang ban. Vui long thu lai sau.";

  return fallback || "Yeu cau that bai";
}
