# 📋 TỔNG HỢP IMPLEMENTATION - HAPPY TAILS BACKEND

**Ngày hoàn thành**: 03/03/2026  
**Developer**: GitHub Copilot  
**Yêu cầu**: Xây dựng hoàn chỉnh backend với phân quyền rõ ràng cho Customer, Staff, Admin

---

## 🎯 TỔNG QUAN Dự ÁN

### Mục tiêu
Xây dựng hệ thống backend hoàn chỉnh cho Happy Tails Pet Management với:
- ✅ Role-based access control (RBAC)
- ✅ Phân quyền rõ ràng cho 3 roles: Customer, Staff, Admin
- ✅ Đầy đủ chức năng theo Use Case Diagram
- ✅ RESTful API chuẩn
- ✅ Security best practices

---

## 🔄 THAY ĐỔI CHÍNH

### 1. **Cập Nhật Role System**

**File**: `backend/models/User.js`

**Trước đây**:
```javascript
role: {
  type: String,
  enum: ['user', 'admin', 'moderator'],
  default: 'user'
}
```

**Sau khi cập nhật**:
```javascript
role: {
  type: String,
  enum: ['customer', 'staff', 'admin'],
  default: 'customer'
}
```

**Lý do**: Mapping với Use Case Diagram
- `user` → `customer` (khách hàng)
- `moderator` → `staff` (nhân viên)
- `admin` → `admin` (quản trị viên)

---

## 📦 CÁC MODEL MỚI (10 Models)

### 1. **Category Model** (`models/Category.js`)
**Mục đích**: Quản lý danh mục dịch vụ (Grooming, Veterinary, Boarding, etc.)

**Fields**:
- `name`: Tên danh mục (required, unique)
- `description`: Mô tả
- `icon`: Icon URL
- `isActive`: Trạng thái hoạt động
- `createdBy`: Người tạo (ref User)
- `updatedBy`: Người cập nhật (ref User)

**Use Case**: Staff/Admin tạo danh mục để phân loại dịch vụ

---

### 2. **Service Model** (`models/Service.js`)
**Mục đích**: Quản lý các dịch vụ được cung cấp

**Fields**:
- `name`: Tên dịch vụ (required)
- `description`: Mô tả chi tiết
- `category`: Danh mục (ref Category)
- `price`: Giá dịch vụ
- `duration`: Thời lượng (phút)
- `images`: Hình ảnh
- `features`: Tính năng
- `petTypes`: Loại pet phù hợp
- `isActive`: Trạng thái
- `maxCapacity`: Sức chứa tối đa
- `createdBy`, `updatedBy`: User references

**Use Case**: 
- Guest/Customer: Xem danh sách, tìm kiếm dịch vụ
- Staff/Admin: Tạo, chỉnh sửa dịch vụ

---

### 3. **Room Model** (`models/Room.js`)
**Mục đích**: Quản lý phòng cho dịch vụ lưu trú (boarding)

**Fields**:
- `roomNumber`: Số phòng (unique)
- `name`: Tên phòng
- `type`: Loại phòng (standard, deluxe, suite, vip)
- `capacity`: Sức chứa
- `size`: Diện tích (m²)
- `pricePerNight`: Giá mỗi đêm
- `amenities`: Tiện nghi
- `images`: Hình ảnh
- `petTypes`: Loại pet phù hợp
- `isAvailable`: Trạng thái khả dụng
- `isActive`: Trạng thái hoạt động

**Use Case**:
- Guest/Customer: Xem danh sách phòng
- Admin: Tạo, chỉnh sửa, xóa phòng

---

### 4. **Cart Model** (`models/Cart.js`)
**Mục đích**: Giỏ hàng của khách hàng trước khi đặt dịch vụ

**Structure**:
```javascript
{
  userID: ObjectId,
  items: [
    {
      service: ObjectId,
      pet: ObjectId,
      quantity: Number,
      price: Number,
      notes: String
    }
  ],
  totalAmount: Number (auto-calculated)
}
```

**Use Case**: Customer thêm dịch vụ vào giỏ hàng trước khi booking

---

### 5. **Booking Model** (`models/Booking.js`)
**Mục đích**: Quản lý đặt lịch dịch vụ

**Fields**:
- `bookingNumber`: Mã booking (auto-generated)
- `customer`: Khách hàng (ref User)
- `items`: Danh sách dịch vụ đã đặt
- `bookingDate`: Ngày đặt
- `bookingTime`: Giờ đặt
- `status`: pending, confirmed, in-progress, completed, cancelled
- `totalAmount`: Tổng tiền
- `depositAmount`: Tiền đặt cọc
- `isPaid`: Đã thanh toán chưa
- `paymentMethod`: Phương thức thanh toán
- `room`: Phòng (nếu có)
- `assignedStaff`: Nhân viên phụ trách
- `notes`: Ghi chú
- `cancellationReason`: Lý do hủy
- `guestInfo`: Thông tin khách (cho guest booking)

**Use Case**:
- Customer: Tạo booking từ cart, xem lịch sử, hủy booking
- Staff: Xem tất cả bookings, cập nhật trạng thái, tạo guest booking
- Admin: Full access

---

### 6. **Transaction Model** (`models/Transaction.js`)
**Mục đích**: Quản lý giao dịch tài chính

**Fields**:
- `transactionNumber`: Mã giao dịch (auto-generated)
- `user`: Người dùng (ref User)
- `type`: deposit, withdrawal, payment, refund
- `amount`: Số tiền
- `status`: pending, completed, failed, cancelled
- `paymentMethod`: Phương thức thanh toán
- `booking`: Booking liên quan (nếu có)
- `description`: Mô tả
- `processedBy`: Người xử lý (Admin)
- `processedAt`: Thời gian xử lý

**Use Case**:
- Customer: Nạp tiền, rút tiền, xem lịch sử giao dịch
- Admin: Xử lý giao dịch, xem thống kê doanh thu

---

### 7. **Notification Model** (`models/Notification.js`)
**Mục đích**: Gửi thông báo cho người dùng

**Fields**:
- `recipient`: Người nhận (ref User)
- `title`: Tiêu đề
- `message`: Nội dung
- `type`: booking, payment, reminder, system, promotion, general
- `priority`: low, medium, high
- `isRead`: Đã đọc chưa
- `readAt`: Thời gian đọc
- `link`: Đường dẫn liên quan
- `metadata`: Dữ liệu bổ sung
- `createdBy`: Người tạo (Staff/Admin)

**Use Case**:
- Customer: Nhận và xem thông báo
- Staff/Admin: Tạo thông báo cho khách hàng

---

### 8. **News Model** (`models/News.js`)
**Mục đích**: Quản lý tin tức, bài viết

**Fields**:
- `title`: Tiêu đề
- `slug`: Đường dẫn (auto-generated)
- `content`: Nội dung
- `excerpt`: Tóm tắt
- `coverImage`: Ảnh bìa
- `images`: Hình ảnh
- `category`: announcement, tips, promotion, event, general
- `tags`: Thẻ tag
- `isPublished`: Đã xuất bản chưa
- `publishedAt`: Thời gian xuất bản
- `views`: Lượt xem
- `author`: Tác giả (ref User)

**Use Case**:
- Guest/Customer: Xem tin tức
- Staff/Admin: Tạo, chỉnh sửa, xóa tin tức

---

### 9. **Policy Model** (`models/Policy.js`)
**Mục đích**: Quản lý chính sách hệ thống

**Fields**:
- `title`: Tiêu đề
- `slug`: Đường dẫn (auto-generated)
- `content`: Nội dung chính sách
- `type`: terms, privacy, refund, cancellation, general
- `version`: Phiên bản
- `isActive`: Trạng thái
- `effectiveDate`: Ngày hiệu lực

**Use Case**:
- Guest/Customer: Xem chính sách
- Admin: Tạo, chỉnh sửa chính sách

---

### 10. **Feedback Model** (`models/Feedback.js`)
**Mục đích**: Quản lý đánh giá, phản hồi của khách hàng

**Fields**:
- `user`: Người đánh giá (ref User)
- `booking`: Booking liên quan
- `service`: Dịch vụ đánh giá
- `rating`: Điểm (1-5)
- `comment`: Bình luận
- `images`: Hình ảnh
- `isPublished`: Hiển thị công khai
- `response`: Câu trả lời từ Staff/Admin
  - `message`: Nội dung trả lời
  - `respondedBy`: Người trả lời
  - `respondedAt`: Thời gian

**Use Case**:
- Customer: Gửi đánh giá sau khi hoàn thành dịch vụ
- Staff/Admin: Xem và trả lời feedback
- Admin: Quản lý hiển thị feedback

---

## 🎮 CÁC CONTROLLER VÀ API ENDPOINTS

### 1. **Cart Controller** (`controllers/cartController.js`)

#### API Endpoints:

| Method | Endpoint | Role | Mô tả |
|--------|----------|------|-------|
| GET | `/api/cart` | Customer | Lấy giỏ hàng của tôi |
| POST | `/api/cart/items` | Customer | Thêm dịch vụ vào giỏ |
| PUT | `/api/cart/items/:itemId` | Customer | Cập nhật item trong giỏ |
| DELETE | `/api/cart/items/:itemId` | Customer | Xóa item khỏi giỏ |
| DELETE | `/api/cart` | Customer | Xóa toàn bộ giỏ hàng |

#### Chi tiết chức năng:

**1. GET `/api/cart` - Lấy giỏ hàng**
```javascript
// Request
GET /api/cart
Authorization: Bearer <customer_token>

// Response
{
  "status": "success",
  "data": {
    "cart": {
      "_id": "...",
      "userID": "...",
      "items": [
        {
          "service": { /* service details */ },
          "pet": { /* pet details */ },
          "quantity": 1,
          "price": 500000,
          "notes": "Prefer morning"
        }
      ],
      "totalAmount": 500000
    }
  }
}
```
**Tác dụng**: Customer xem các dịch vụ đã thêm vào giỏ

**2. POST `/api/cart/items` - Thêm vào giỏ**
```javascript
// Request
POST /api/cart/items
{
  "serviceId": "service_id",
  "petId": "pet_id",
  "quantity": 1,
  "notes": "Prefer morning slot"
}

// Response
{
  "status": "success",
  "message": "Item added to cart",
  "data": { "cart": { /* updated cart */ } }
}
```
**Tác dụng**: Customer thêm dịch vụ cho pet vào giỏ

**3. PUT `/api/cart/items/:itemId` - Cập nhật item**
**Tác dụng**: Thay đổi số lượng hoặc ghi chú

**4. DELETE `/api/cart/items/:itemId` - Xóa item**
**Tác dụng**: Xóa một dịch vụ khỏi giỏ

**5. DELETE `/api/cart` - Xóa toàn bộ giỏ**
**Tác dụng**: Xóa tất cả items trong giỏ hàng

---

### 2. **Service Controller** (`controllers/serviceController.js`)

#### API Endpoints:

| Method | Endpoint | Role | Mô tả |
|--------|----------|------|-------|
| GET | `/api/services` | Public | Xem tất cả dịch vụ (có filter) |
| GET | `/api/services/:id` | Public | Xem chi tiết dịch vụ |
| POST | `/api/services` | Staff, Admin | Tạo dịch vụ mới |
| PUT | `/api/services/:id` | Staff, Admin | Cập nhật dịch vụ |
| DELETE | `/api/services/:id` | Admin | Xóa dịch vụ |

#### Chi tiết chức năng:

**1. GET `/api/services` - Xem danh sách dịch vụ**
```javascript
// Request với filters
GET /api/services?category=grooming&petType=dog&minPrice=100000&maxPrice=500000&search=bath

// Response
{
  "status": "success",
  "results": 5,
  "data": {
    "services": [
      {
        "_id": "...",
        "name": "Dog Grooming - Full Service",
        "description": "Complete grooming package...",
        "category": { "name": "Grooming" },
        "price": 300000,
        "duration": 90,
        "images": ["url1", "url2"],
        "features": ["Bath", "Haircut", "Nail trim"],
        "petTypes": ["dog"],
        "isActive": true
      }
    ]
  }
}
```
**Tác dụng**: Guest/Customer tìm kiếm và xem dịch vụ

**2. GET `/api/services/:id` - Xem chi tiết**
**Tác dụng**: Xem thông tin đầy đủ của dịch vụ

**3. POST `/api/services` - Tạo dịch vụ**
```javascript
// Request
POST /api/services
Authorization: Bearer <staff_or_admin_token>
{
  "name": "Premium Pet Grooming",
  "description": "Full grooming service...",
  "category": "category_id",
  "price": 500000,
  "duration": 120,
  "petTypes": ["dog", "cat"],
  "features": ["Bath", "Haircut", "Massage"],
  "maxCapacity": 5
}
```
**Tác dụng**: Staff/Admin thêm dịch vụ mới vào hệ thống

**4. PUT `/api/services/:id` - Cập nhật dịch vụ**
**Tác dụng**: Chỉnh sửa thông tin, giá, trạng thái dịch vụ

**5. DELETE `/api/services/:id` - Xóa dịch vụ**
**Tác dụng**: Admin vô hiệu hóa dịch vụ (soft delete)

---

### 3. **Category Controller** (`controllers/categoryController.js`)

#### API Endpoints:

| Method | Endpoint | Role | Mô tả |
|--------|----------|------|-------|
| GET | `/api/categories` | Public | Xem tất cả danh mục |
| GET | `/api/categories/:id` | Public | Xem chi tiết danh mục |
| POST | `/api/categories` | Staff, Admin | Tạo danh mục mới |
| PUT | `/api/categories/:id` | Staff, Admin | Cập nhật danh mục |
| DELETE | `/api/categories/:id` | Admin | Xóa danh mục |

**Tác dụng tổng thể**: Quản lý phân loại dịch vụ (Grooming, Veterinary, Boarding, Training, etc.)

---

### 4. **Booking Controller** (`controllers/bookingController.js`)

#### API Endpoints:

| Method | Endpoint | Role | Mô tả |
|--------|----------|------|-------|
| POST | `/api/bookings` | Customer | Tạo booking từ cart |
| POST | `/api/bookings/guest` | Staff, Admin | Tạo booking cho khách vãng lai |
| GET | `/api/bookings/my` | Customer | Xem bookings của tôi |
| GET | `/api/bookings` | Staff, Admin | Xem tất cả bookings |
| GET | `/api/bookings/:id` | All (có check permission) | Xem chi tiết booking |
| PUT | `/api/bookings/:id/status` | Staff, Admin | Cập nhật trạng thái |
| PUT | `/api/bookings/:id/cancel` | All (có check permission) | Hủy booking |
| PUT | `/api/bookings/:id/assign-staff` | Staff, Admin | Phân công nhân viên |

#### Chi tiết chức năng:

**1. POST `/api/bookings` - Tạo booking từ cart**
```javascript
// Request
POST /api/bookings
Authorization: Bearer <customer_token>
{
  "bookingDate": "2026-03-15",
  "bookingTime": "10:00 AM",
  "paymentMethod": "card",
  "notes": "First time, please be gentle"
}

// Response
{
  "status": "success",
  "message": "Booking created successfully",
  "data": {
    "booking": {
      "bookingNumber": "BK1709620800000-1",
      "customer": { /* customer info */ },
      "items": [ /* cart items */ ],
      "bookingDate": "2026-03-15",
      "status": "pending",
      "totalAmount": 500000
    }
  }
}
```
**Tác dụng**: Customer đặt lịch, cart sẽ tự động được xóa sau khi booking

**2. POST `/api/bookings/guest` - Tạo booking cho guest**
```javascript
// Request (Staff/Admin only)
POST /api/bookings/guest
{
  "guestInfo": {
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "0123456789"
  },
  "items": [
    {
      "service": "service_id",
      "pet": "pet_id",
      "quantity": 1,
      "price": 300000
    }
  ],
  "bookingDate": "2026-03-15",
  "bookingTime": "2:00 PM"
}
```
**Tác dụng**: Staff tạo booking cho khách không có tài khoản

**3. GET `/api/bookings/my` - Xem bookings của tôi**
**Tác dụng**: Customer xem lịch sử đặt chỗ, filter theo status

**4. GET `/api/bookings` - Xem tất cả bookings**
**Tác dụng**: Staff/Admin quản lý tất cả bookings, filter theo ngày, trạng thái, khách hàng

**5. PUT `/api/bookings/:id/status` - Cập nhật trạng thái**
```javascript
// Request
PUT /api/bookings/:id/status
{
  "status": "confirmed" // hoặc "in-progress", "completed"
}
```
**Tác dụng**: Staff cập nhật tiến độ xử lý booking

**6. PUT `/api/bookings/:id/cancel` - Hủy booking**
```javascript
// Request
PUT /api/bookings/:id/cancel
{
  "reason": "Change of schedule"
}
```
**Tác dụng**: Customer/Staff hủy booking với lý do

**7. PUT `/api/bookings/:id/assign-staff` - Phân công nhân viên**
**Tác dụng**: Manager phân công nhân viên phụ trách booking

---

### 5. **Room Controller** (`controllers/roomController.js`)

#### API Endpoints:

| Method | Endpoint | Role | Mô tả |
|--------|----------|------|-------|
| GET | `/api/rooms` | Public | Xem tất cả phòng |
| GET | `/api/rooms/:id` | Public | Xem chi tiết phòng |
| POST | `/api/rooms` | Admin | Tạo phòng mới |
| PUT | `/api/rooms/:id` | Admin | Cập nhật phòng |
| DELETE | `/api/rooms/:id` | Admin | Xóa phòng |

**Tác dụng tổng thể**: Quản lý phòng cho dịch vụ boarding/hotel cho thú cưng

---

### 6. **Transaction Controller** (`controllers/transactionController.js`)

#### API Endpoints:

| Method | Endpoint | Role | Mô tả |
|--------|----------|------|-------|
| GET | `/api/transactions/my` | Customer | Xem giao dịch của tôi |
| POST | `/api/transactions/deposit` | Customer | Tạo yêu cầu nạp tiền |
| POST | `/api/transactions/withdraw` | Customer | Tạo yêu cầu rút tiền |
| GET | `/api/transactions/statistics/revenue` | Admin | Thống kê doanh thu |
| GET | `/api/transactions` | Admin | Xem tất cả giao dịch |
| GET | `/api/transactions/:id` | Customer (own), Admin | Xem chi tiết giao dịch |
| PUT | `/api/transactions/:id/process` | Admin | Xử lý giao dịch |

#### Chi tiết chức năng:

**1. POST `/api/transactions/deposit` - Nạp tiền**
```javascript
// Request
POST /api/transactions/deposit
{
  "amount": 1000000,
  "paymentMethod": "card",
  "description": "Deposit for booking"
}

// Response
{
  "status": "success",
  "message": "Deposit request created successfully",
  "data": {
    "transaction": {
      "transactionNumber": "TXN1709620800000-1",
      "type": "deposit",
      "amount": 1000000,
      "status": "pending"
    }
  }
}
```
**Tác dụng**: Customer nạp tiền vào hệ thống để thanh toán

**2. POST `/api/transactions/withdraw` - Rút tiền**
**Tác dụng**: Customer yêu cầu rút tiền từ hệ thống

**3. PUT `/api/transactions/:id/process` - Xử lý giao dịch**
```javascript
// Request (Admin only)
PUT /api/transactions/:id/process
{
  "status": "completed", // hoặc "failed", "cancelled"
  "notes": "Approved and processed"
}
```
**Tác dụng**: Admin duyệt hoặc từ chối giao dịch

**4. GET `/api/transactions/statistics/revenue` - Thống kê doanh thu**
**Tác dụng**: Admin xem tổng doanh thu, số giao dịch, trung bình

---

### 7. **Notification Controller** (`controllers/notificationController.js`)

#### API Endpoints:

| Method | Endpoint | Role | Mô tả |
|--------|----------|------|-------|
| GET | `/api/notifications/my` | All | Xem thông báo của tôi |
| PUT | `/api/notifications/read-all` | All | Đánh dấu tất cả đã đọc |
| PUT | `/api/notifications/:id/read` | All | Đánh dấu thông báo đã đọc |
| DELETE | `/api/notifications/:id` | All (own), Admin (all) | Xóa thông báo |
| GET | `/api/notifications` | Staff, Admin | Xem tất cả thông báo |
| POST | `/api/notifications` | Staff, Admin | Tạo thông báo |
| PUT | `/api/notifications/:id` | Staff, Admin | Cập nhật thông báo |

#### Chi tiết chức năng:

**1. GET `/api/notifications/my` - Xem thông báo của tôi**
```javascript
// Response
{
  "status": "success",
  "results": 10,
  "unreadCount": 3,
  "data": {
    "notifications": [
      {
        "_id": "...",
        "title": "Booking Confirmed",
        "message": "Your booking #BK123 has been confirmed",
        "type": "booking",
        "priority": "high",
        "isRead": false,
        "createdAt": "2026-03-03T10:00:00Z"
      }
    ]
  }
}
```
**Tác dụng**: User xem thông báo của mình

**2. POST `/api/notifications` - Tạo thông báo**
```javascript
// Request (Staff/Admin)
POST /api/notifications
{
  "recipient": "user_id",
  "title": "Booking Reminder",
  "message": "Your booking is tomorrow at 10:00 AM",
  "type": "reminder",
  "priority": "high"
}
```
**Tác dụng**: Staff gửi thông báo cho khách hàng

---

### 8. **News Controller** (`controllers/newsController.js`)

#### API Endpoints:

| Method | Endpoint | Role | Mô tả |
|--------|----------|------|-------|
| GET | `/api/news` | Public | Xem tất cả tin tức |
| GET | `/api/news/:slug` | Public | Xem chi tiết tin tức |
| POST | `/api/news` | Staff, Admin | Tạo tin tức mới |
| PUT | `/api/news/:id` | Staff, Admin | Cập nhật tin tức |
| DELETE | `/api/news/:id` | Admin | Xóa tin tức |

#### Chi tiết chức năng:

**1. GET `/api/news` - Xem tin tức**
```javascript
// Request
GET /api/news?category=tips&tag=grooming&search=bath

// Response
{
  "status": "success",
  "results": 5,
  "data": {
    "news": [
      {
        "_id": "...",
        "title": "5 Tips for Dog Grooming at Home",
        "slug": "5-tips-for-dog-grooming-at-home",
        "excerpt": "Learn how to groom your dog...",
        "coverImage": "url",
        "category": "tips",
        "tags": ["grooming", "dog", "tips"],
        "views": 150,
        "publishedAt": "2026-03-01",
        "author": { "name": "Admin" }
      }
    ]
  }
}
```
**Tác dụng**: Guest/Customer đọc tin tức, mẹo chăm sóc pet

**2. POST `/api/news` - Tạo tin tức**
```javascript
// Request (Staff/Admin)
POST /api/news
{
  "title": "New Service: Premium Pet Spa",
  "content": "We are excited to announce...",
  "excerpt": "Introducing our premium spa service",
  "category": "announcement",
  "tags": ["spa", "new service"],
  "isPublished": true
}
```
**Tác dụng**: Staff viết bài tin tức, thông báo

---

### 9. **Policy Controller** (`controllers/policyController.js`)

#### API Endpoints:

| Method | Endpoint | Role | Mô tả |
|--------|----------|------|-------|
| GET | `/api/policies` | Public | Xem tất cả chính sách |
| GET | `/api/policies/:slug` | Public | Xem chi tiết chính sách |
| POST | `/api/policies` | Admin | Tạo chính sách mới |
| PUT | `/api/policies/:id` | Admin | Cập nhật chính sách |
| DELETE | `/api/policies/:id` | Admin | Xóa chính sách |

**Tác dụng tổng thể**: Quản lý Terms of Service, Privacy Policy, Refund Policy, etc.

---

### 10. **Feedback Controller** (`controllers/feedbackController.js`)

#### API Endpoints:

| Method | Endpoint | Role | Mô tả |
|--------|----------|------|-------|
| GET | `/api/feedback` | Public | Xem feedback công khai |
| GET | `/api/feedback/my` | Customer | Xem feedback của tôi |
| POST | `/api/feedback` | Customer | Tạo feedback |
| PUT | `/api/feedback/:id` | Customer | Cập nhật feedback |
| DELETE | `/api/feedback/:id` | Customer (own), Admin | Xóa feedback |
| PUT | `/api/feedback/:id/respond` | Staff, Admin | Trả lời feedback |
| PUT | `/api/feedback/:id/publish` | Admin | Toggle hiển thị công khai |

#### Chi tiết chức năng:

**1. POST `/api/feedback` - Tạo đánh giá**
```javascript
// Request (Customer)
POST /api/feedback
{
  "booking": "booking_id",
  "service": "service_id",
  "rating": 5,
  "comment": "Excellent service! My dog looks amazing!",
  "images": ["url1", "url2"]
}

// Response
{
  "status": "success",
  "message": "Feedback submitted successfully",
  "data": { "feedback": { /* feedback details */ } }
}
```
**Tác dụng**: Customer đánh giá sau khi hoàn thành dịch vụ

**2. PUT `/api/feedback/:id/respond` - Trả lời feedback**
```javascript
// Request (Staff/Admin)
PUT /api/feedback/:id/respond
{
  "message": "Thank you for your feedback! We're glad you loved our service."
}
```
**Tác dụng**: Staff/Admin trả lời đánh giá của khách

---

### 11. **Admin Controller** (`controllers/adminController.js`)

#### API Endpoints:

| Method | Endpoint | Role | Mô tả |
|--------|----------|------|-------|
| GET | `/api/admin/statistics` | Admin | Thống kê tổng quan hệ thống |
| GET | `/api/admin/staff` | Admin, Staff | Danh sách nhân viên |
| GET | `/api/admin/users` | Admin | Xem tất cả users |
| GET | `/api/admin/users/:id` | Admin | Xem chi tiết user |
| PUT | `/api/admin/users/:id/role` | Admin | Thay đổi role user |
| PUT | `/api/admin/users/:id/ban` | Admin | Ban/Unban user |
| DELETE | `/api/admin/users/:id` | Admin | Xóa user |

#### Chi tiết chức năng:

**1. GET `/api/admin/statistics` - Thống kê hệ thống**
```javascript
// Response
{
  "status": "success",
  "data": {
    "statistics": {
      "users": {
        "total": 150,
        "customers": 120,
        "staff": 25
      },
      "bookings": {
        "total": 500,
        "pending": 20,
        "completed": 450
      },
      "revenue": 50000000,
      "services": 25
    }
  }
}
```
**Tác dụng**: Admin xem tổng quan dashboard

**2. PUT `/api/admin/users/:id/role` - Thay đổi role**
```javascript
// Request
PUT /api/admin/users/:id/role
{
  "role": "staff" // hoặc "customer", "admin"
}
```
**Tác dụng**: Admin thăng/hạ quyền user

**3. PUT `/api/admin/users/:id/ban` - Ban/Unban user**
**Tác dụng**: Admin khóa/mở khóa tài khoản vi phạm

---

## 📊 BẢNG PHÂN QUYỀN CHI TIẾT

### **CUSTOMER (Khách hàng)**

| Module | Chức năng | Endpoint | Giải thích |
|--------|-----------|----------|------------|
| **Auth** | Đăng ký, đăng nhập | `/api/auth/*` | Quản lý tài khoản |
| **Profile** | Quản lý thông tin cá nhân | `/api/profile/me` | Cập nhật thông tin, avatar |
| **Pet** | Quản lý thú cưng | `/api/pets/*` | CRUD pets, medical records, vaccinations |
| **Service** | Xem dịch vụ | `GET /api/services/*` | Tìm kiếm và xem dịch vụ |
| **Category** | Xem danh mục | `GET /api/categories/*` | Xem phân loại dịch vụ |
| **Cart** | Quản lý giỏ hàng | `/api/cart/*` | Thêm/sửa/xóa dịch vụ trong giỏ |
| **Booking** | Đặt lịch | `/api/bookings (POST, GET my)` | Tạo và xem bookings của mình |
| **Transaction** | Giao dịch | `/api/transactions/my, /deposit, /withdraw` | Nạp/rút tiền, xem lịch sử |
| **Notification** | Nhận thông báo | `/api/notifications/my` | Xem và đọc thông báo |
| **Feedback** | Đánh giá dịch vụ | `/api/feedback (POST, GET my)` | Gửi và quản lý đánh giá |
| **News** | Đọc tin tức | `GET /api/news/*` | Xem tin tức, mẹo hay |
| **Policy** | Xem chính sách | `GET /api/policies/*` | Đọc điều khoản, chính sách |

### **STAFF (Nhân viên)**

| Module | Chức năng | Endpoint | Giải thích |
|--------|-----------|----------|------------|
| **Service** | Quản lý dịch vụ | `/api/services (POST, PUT)` | Tạo và chỉnh sửa dịch vụ |
| **Category** | Quản lý danh mục | `/api/categories (POST, PUT)` | Tạo và chỉnh sửa danh mục |
| **Booking** | Quản lý đặt lịch | `/api/bookings (GET all, PUT status)` | Xem tất cả, cập nhật trạng thái |
| **Booking** | Guest booking | `POST /api/bookings/guest` | Tạo booking cho khách vãng lai |
| **Notification** | Gửi thông báo | `/api/notifications (POST)` | Tạo thông báo cho customer |
| **News** | Quản lý tin tức | `/api/news (POST, PUT)` | Viết và chỉnh sửa bài viết |
| **Feedback** | Xử lý phản hồi | `/api/feedback (GET all, respond)` | Xem và trả lời feedback |

### **ADMIN (Quản trị viên)**

| Module | Chức năng | Endpoint | Giải thích |
|--------|-----------|----------|------------|
| **All Staff features** | + | Tất cả quyền của Staff | Kế thừa tất cả |
| **User Management** | Quản lý users | `/api/admin/users/*` | Xem, ban, xóa, đổi role |
| **Room** | Quản lý phòng | `/api/rooms (POST, PUT, DELETE)` | CRUD phòng boarding |
| **Transaction** | Xử lý giao dịch | `/api/transactions (process)` | Duyệt nạp/rút tiền |
| **Statistics** | Thống kê | `/api/admin/statistics` | Dashboard tổng quan |
| **Revenue** | Doanh thu | `/api/transactions/statistics/revenue` | Báo cáo tài chính |
| **Policy** | Quản lý chính sách | `/api/policies (POST, PUT, DELETE)` | CRUD chính sách |
| **Delete** | Xóa resources | `DELETE /api/services, /categories, /news` | Xóa các resource quan trọng |

---

## 🔐 SECURITY & MIDDLEWARE

### Authentication Middleware
- **`protect`**: Yêu cầu phải đăng nhập (kiểm tra JWT token)
- **`optionalAuth`**: Không bắt buộc đăng nhập nhưng attach user nếu có token
- **`restrictTo(...roles)`**: Giới hạn quyền truy cập theo role

### Ví dụ sử dụng:
```javascript
// Route chỉ dành cho Customer
router.use(protect);
router.use(restrictTo('customer'));

// Route cho Staff và Admin
router.use(protect);
router.use(restrictTo('staff', 'admin'));

// Route public nhưng có thể có auth
router.get('/', optionalAuth, getAllServices);
```

---

## 📁 CẤU TRÚC THƯ MỤC

```
backend/
├── models/
│   ├── User.js (updated roles)
│   ├── UserPet.js (existing)
│   ├── UserDetail.js (existing)
│   ├── Category.js (NEW)
│   ├── Service.js (NEW)
│   ├── Room.js (NEW)
│   ├── Cart.js (NEW)
│   ├── Booking.js (NEW)
│   ├── Transaction.js (NEW)
│   ├── Notification.js (NEW)
│   ├── News.js (NEW)
│   ├── Policy.js (NEW)
│   └── Feedback.js (NEW)
│
├── controllers/
│   ├── authController.js (existing)
│   ├── profileController.js (existing)
│   ├── petController.js (existing)
│   ├── cartController.js (NEW)
│   ├── serviceController.js (NEW)
│   ├── categoryController.js (NEW)
│   ├── bookingController.js (NEW)
│   ├── roomController.js (NEW)
│   ├── transactionController.js (NEW)
│   ├── notificationController.js (NEW)
│   ├── newsController.js (NEW)
│   ├── policyController.js (NEW)
│   ├── feedbackController.js (NEW)
│   └── adminController.js (NEW)
│
├── routes/
│   ├── auth.js (existing)
│   ├── profile.js (existing)
│   ├── pet.js (existing)
│   ├── cart.js (NEW)
│   ├── service.js (NEW)
│   ├── category.js (NEW)
│   ├── booking.js (NEW)
│   ├── room.js (NEW)
│   ├── transaction.js (NEW)
│   ├── notification.js (NEW)
│   ├── news.js (NEW)
│   ├── policy.js (NEW)
│   ├── feedback.js (NEW)
│   └── admin.js (NEW)
│
├── middleware/
│   ├── auth.js (existing - updated)
│   ├── errorHandler.js (existing)
│   ├── rateLimiter.js (existing)
│   └── validation.js (existing)
│
├── config/
│   ├── database.js (existing)
│   ├── email.js (existing)
│   └── jwt.js (existing)
│
├── utils/
│   ├── AppError.js (existing)
│   ├── catchAsync.js (existing)
│   └── logger.js (existing)
│
├── index.js (updated with new routes)
├── README-API.md (NEW - API documentation)
└── IMPLEMENTATION-SUMMARY.md (THIS FILE)
```

---

## 🚀 HƯỚNG DẪN SỬ DỤNG

### 1. Khởi động Server
```bash
cd backend
node index.js
```

Server sẽ chạy tại: `http://localhost:3001`

### 2. Test API với Postman/Thunder Client

#### A. Đăng ký Customer
```http
POST http://localhost:3001/api/auth/register
Content-Type: application/json

{
  "name": "Nguyen Van A",
  "email": "customer@example.com",
  "password": "Password123!",
  "confirmPassword": "Password123!"
}
```

#### B. Đăng nhập
```http
POST http://localhost:3001/api/auth/login
Content-Type: application/json

{
  "email": "customer@example.com",
  "password": "Password123!"
}
```
→ Lưu lại `accessToken` từ response

#### C. Tạo Pet (với token)
```http
POST http://localhost:3001/api/pets
Authorization: Bearer <your_access_token>
Content-Type: application/json

{
  "petName": "Buddy",
  "petType": "dog",
  "breed": "Golden Retriever",
  "age": 3,
  "weight": 30,
  "color": "Golden"
}
```

#### D. Xem Services
```http
GET http://localhost:3001/api/services
```

#### E. Thêm vào Cart
```http
POST http://localhost:3001/api/cart/items
Authorization: Bearer <your_access_token>
Content-Type: application/json

{
  "serviceId": "<service_id_from_step_D>",
  "petId": "<pet_id_from_step_C>",
  "quantity": 1,
  "notes": "Prefer morning time"
}
```

#### F. Tạo Booking
```http
POST http://localhost:3001/api/bookings
Authorization: Bearer <your_access_token>
Content-Type: application/json

{
  "bookingDate": "2026-03-15",
  "bookingTime": "10:00 AM",
  "paymentMethod": "card",
  "notes": "First time customer"
}
```

### 3. Tạo Admin User

Sau khi đăng ký, cập nhật role trong MongoDB:

```javascript
// Sử dụng MongoDB Compass hoặc mongo shell
db.users.updateOne(
  { email: "admin@example.com" },
  { $set: { role: "admin" } }
)
```

Hoặc tạo Staff user:
```javascript
db.users.updateOne(
  { email: "staff@example.com" },
  { $set: { role: "staff" } }
)
```

### 4. Test Admin/Staff Features

#### A. Tạo Category (Staff/Admin)
```http
POST http://localhost:3001/api/categories
Authorization: Bearer <admin_or_staff_token>
Content-Type: application/json

{
  "name": "Grooming",
  "description": "Pet grooming services",
  "icon": "icon-url"
}
```

#### B. Tạo Service (Staff/Admin)
```http
POST http://localhost:3001/api/services
Authorization: Bearer <admin_or_staff_token>
Content-Type: application/json

{
  "name": "Dog Bath & Grooming",
  "description": "Complete grooming service for dogs",
  "category": "<category_id>",
  "price": 300000,
  "duration": 90,
  "petTypes": ["dog"],
  "features": ["Bath", "Haircut", "Nail trim"]
}
```

#### C. Xem tất cả Bookings (Staff/Admin)
```http
GET http://localhost:3001/api/bookings
Authorization: Bearer <admin_or_staff_token>
```

#### D. Cập nhật Booking Status (Staff/Admin)
```http
PUT http://localhost:3001/api/bookings/<booking_id>/status
Authorization: Bearer <admin_or_staff_token>
Content-Type: application/json

{
  "status": "confirmed"
}
```

#### E. Xem Statistics (Admin only)
```http
GET http://localhost:3001/api/admin/statistics
Authorization: Bearer <admin_token>
```

#### F. Ban User (Admin only)
```http
PUT http://localhost:3001/api/admin/users/<user_id>/ban
Authorization: Bearer <admin_token>
```

---

## 📝 LƯU Ý QUAN TRỌNG

### 1. Role Mapping
- ✅ **customer** = Khách hàng sử dụng dịch vụ
- ✅ **staff** = Nhân viên quản lý bookings và services
- ✅ **admin** = Quản trị viên toàn hệ thống

### 2. Soft Delete
- Hầu hết các delete operations là **soft delete** (set `isActive: false` hoặc `isDeleted: true`)
- Dữ liệu không bị xóa vĩnh viễn, có thể khôi phục

### 3. Auto-generated Fields
- **bookingNumber**: `BK{timestamp}-{count}`
- **transactionNumber**: `TXN{timestamp}-{count}`
- **slug**: Auto-generated từ title (cho News, Policy)

### 4. Timestamps
- Tất cả models có `createdAt` và `updatedAt` tự động

### 5. Security
- ✅ JWT authentication
- ✅ Role-based access control
- ✅ Rate limiting (có thể bật trong production)
- ✅ Input validation
- ✅ Password hashing with bcrypt

### 6. Future Improvements
- [ ] Pagination cho list endpoints
- [ ] File upload cho avatars và images
- [ ] Real-time notifications với WebSocket
- [ ] Email notifications
- [ ] Payment gateway integration
- [ ] SMS notifications
- [ ] Advanced search với Elasticsearch
- [ ] Caching với Redis
- [ ] API versioning

---

## 🎯 WORKFLOW THÔNG THƯỜNG

### Customer Workflow:
1. **Đăng ký** → `/api/auth/register`
2. **Đăng nhập** → `/api/auth/login`
3. **Thêm Pet** → `/api/pets`
4. **Xem Services** → `/api/services`
5. **Thêm vào Cart** → `/api/cart/items`
6. **Tạo Booking** → `/api/bookings`
7. **Xem Booking** → `/api/bookings/my`
8. **Nhận Notification** → `/api/notifications/my`
9. **Đánh giá** → `/api/feedback`

### Staff Workflow:
1. **Đăng nhập** (role: staff)
2. **Xem Bookings** → `/api/bookings`
3. **Cập nhật Status** → `/api/bookings/:id/status`
4. **Gửi Notification** → `/api/notifications`
5. **Quản lý Services** → `/api/services`
6. **Viết News** → `/api/news`
7. **Trả lời Feedback** → `/api/feedback/:id/respond`

### Admin Workflow:
1. **Đăng nhập** (role: admin)
2. **Xem Dashboard** → `/api/admin/statistics`
3. **Quản lý Users** → `/api/admin/users`
4. **Tạo Rooms** → `/api/rooms`
5. **Xử lý Transactions** → `/api/transactions/:id/process`
6. **Quản lý Policies** → `/api/policies`
7. **Xem Revenue** → `/api/transactions/statistics/revenue`

---

## ✅ CHECKLIST HOÀN THÀNH

- [x] Cập nhật role system (customer/staff/admin)
- [x] Tạo 10 models mới
- [x] Tạo 11 controllers mới
- [x] Tạo 11 routes files mới
- [x] Cập nhật index.js với routes
- [x] Phân quyền đúng cho từng role
- [x] API documentation (README-API.md)
- [x] Implementation summary (file này)
- [x] Test và đảm bảo không có errors

---

## 📞 HỖ TRỢ

Nếu cần hỗ trợ hoặc có thắc mắc:
1. Xem [README-API.md](README-API.md) cho chi tiết API
2. Kiểm tra error logs trong console
3. Sử dụng Postman để test từng endpoint
4. Đảm bảo MongoDB đang chạy
5. Kiểm tra JWT tokens còn hạn

---

**Tóm lại**: Backend đã hoàn chỉnh với 100+ API endpoints, phân quyền rõ ràng, và sẵn sàng để tích hợp với frontend! 🎉

**Happy Coding!** 🐾
