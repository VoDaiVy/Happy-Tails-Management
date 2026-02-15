# 🐾 Happy Tails Authentication API

## Authentication System Documentation

Hệ thống xác thực đầy đủ với JWT, refresh tokens, email verification, và security best practices.

---

## 📋 Danh sách API Endpoints

### Public Routes (Không cần đăng nhập)

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| POST | `/api/auth/register` | Đăng ký tài khoản mới |
| POST | `/api/auth/login` | Đăng nhập |
| POST | `/api/auth/refresh-token` | Làm mới access token |
| POST | `/api/auth/forgot-password` | Yêu cầu reset password |
| POST | `/api/auth/reset-password/:token` | Reset password với token |
| GET | `/api/auth/verify-email/:token` | Xác thực email |
| POST | `/api/auth/resend-verification` | Gửi lại email xác thực |

### Protected Routes (Yêu cầu đăng nhập)

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| POST | `/api/auth/logout` | Đăng xuất (thiết bị hiện tại) |
| POST | `/api/auth/logout-all` | Đăng xuất tất cả thiết bị |
| GET | `/api/auth/me` | Lấy thông tin user hiện tại |
| PUT | `/api/auth/profile` | Cập nhật profile |
| PUT | `/api/auth/change-password` | Đổi mật khẩu |

---

## 🔧 Cách sử dụng (Postman/Thunder Client)

### 1. Đăng ký (Register)

**Request:**
```http
POST http://localhost:5000/api/auth/register
Content-Type: application/json

{
  "email": "test@example.com",
  "password": "Test@1234",
  "confirmPassword": "Test@1234",
  "name": "Test User"
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "Registration successful. Please verify your email.",
  "data": {
    "user": {
      "id": "...",
      "email": "test@example.com",
      "name": "Test User",
      "role": "user",
      "isEmailVerified": false
    },
    "tokens": {
      "accessToken": "eyJhbGciOiJIUzI1NiIs...",
      "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
      "expiresIn": "7d"
    }
  }
}
```

### 2. Đăng nhập (Login)

**Request:**
```http
POST http://localhost:5000/api/auth/login
Content-Type: application/json

{
  "email": "test@example.com",
  "password": "Test@1234"
}
```

### 3. Lấy thông tin User (Protected)

**Request:**
```http
GET http://localhost:5000/api/auth/me
Authorization: Bearer <accessToken>
```

### 4. Đổi mật khẩu

**Request:**
```http
PUT http://localhost:5000/api/auth/change-password
Authorization: Bearer <accessToken>
Content-Type: application/json

{
  "currentPassword": "Test@1234",
  "newPassword": "NewTest@1234",
  "confirmPassword": "NewTest@1234"
}
```

### 5. Refresh Token

**Request:**
```http
POST http://localhost:5000/api/auth/refresh-token
Content-Type: application/json

{
  "refreshToken": "<refreshToken>"
}
```

---

## 🔐 Password Requirements

Mật khẩu phải có:
- Tối thiểu 8 ký tự
- Ít nhất 1 chữ hoa
- Ít nhất 1 chữ thường
- Ít nhất 1 số
- Ít nhất 1 ký tự đặc biệt (!@#$%^&*(),.?":{}|<>)

---

## 🛡️ Security Features

1. **JWT Authentication** - Access & Refresh tokens
2. **Password Hashing** - Bcrypt với 12 rounds
3. **Rate Limiting** - Giới hạn requests để chống brute-force
4. **Account Lockout** - Khóa tài khoản sau 5 lần đăng nhập thất bại
5. **Input Validation** - Kiểm tra và sanitize input
6. **NoSQL Injection Protection** - Chống injection attacks
7. **Helmet** - Security headers
8. **CORS** - Cross-Origin Resource Sharing
9. **HTTP Parameter Pollution Protection**

---

## 📁 Cấu trúc thư mục

```
backend/
├── config/
│   ├── database.js      # MongoDB connection
│   ├── jwt.js           # JWT utilities
│   └── email.js         # Email templates
├── controllers/
│   └── authController.js
├── middleware/
│   ├── auth.js          # Auth middleware
│   ├── errorHandler.js  # Error handling
│   ├── rateLimiter.js   # Rate limiting
│   └── validation.js    # Input validation
├── models/
│   └── User.js          # User model
├── routes/
│   └── auth.js          # Auth routes
├── utils/
│   ├── AppError.js      # Error class
│   ├── catchAsync.js    # Async wrapper
│   ├── emailService.js  # Email sender
│   ├── logger.js        # Logging
│   └── validators.js    # Validation helpers
├── .env                 # Environment variables
├── .env.example         # Example env file
└── index.js             # Entry point
```

---

## ⚙️ Environment Variables

Xem file `.env.example` để biết tất cả biến môi trường cần thiết.

---

## 🏃 Khởi chạy

```bash
# Cài dependencies
cd backend
npm install

# Development mode (auto-reload)
npm run dev

# Production mode
npm start
```

---

## ⚠️ Lưu ý MongoDB Atlas

Đảm bảo IP của bạn đã được whitelist trong MongoDB Atlas:
1. Vào Atlas Dashboard
2. Network Access
3. Add IP Address
4. Add Current IP hoặc "Allow Access from Anywhere" (0.0.0.0/0) cho development

---

## 📧 Email Configuration

Để gửi email thật (verification, password reset), cấu hình SMTP trong `.env`:

### Gmail (App Password):
1. Bật 2-Factor Authentication trong Google Account
2. Tạo App Password: Google Account > Security > App Passwords
3. Sử dụng App Password trong `EMAIL_PASS`

```env
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_16_character_app_password
```

---

© 2026 Happy Tails Management System
