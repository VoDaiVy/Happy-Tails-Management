# Happy Tails Management - API Documentation

## Base URL
```
http://localhost:3001/api
```

## Authentication
Most endpoints require authentication via JWT token in the Authorization header:
```
Authorization: Bearer <token>
```

---

## Role-Based Access Control

### Roles
- **Customer**: Regular users who book services for their pets
- **Staff**: Employees who manage bookings, services, and customer interactions
- **Admin**: Full system access including user management and system configuration

---

## API Endpoints

### 🔐 Authentication (`/api/auth`)
| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| POST | `/register` | Public | Register new user |
| POST | `/login` | Public | Login user |
| POST | `/logout` | Private | Logout user |
| POST | `/refresh-token` | Public | Refresh access token |
| POST | `/forgot-password` | Public | Request password reset |
| POST | `/reset-password/:token` | Public | Reset password |
| POST | `/verify-email/:token` | Public | Verify email |
| POST | `/resend-verification` | Private | Resend verification email |
| PUT | `/change-password` | Private | Change password |

### 👤 Profile Management (`/api/profile`)
| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | `/me` | Private (All) | Get my profile |
| PUT | `/me` | Private (All) | Update my profile |
| DELETE | `/me` | Private (All) | Delete my profile |
| PUT | `/avatar` | Private (All) | Update avatar |
| GET | `/completion` | Private (All) | Get profile completion status |
| GET | `/analytics/age-range` | Private (Admin) | Get profiles by age range |

### 🐾 Pet Management (`/api/pets`)
| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | `/` | Private (Customer) | Get all my pets |
| POST | `/` | Private (Customer) | Create new pet |
| GET | `/statistics` | Private (Customer) | Get pet statistics |
| GET | `/vaccination-reminders` | Private (Customer) | Get vaccination reminders |
| GET | `/:id` | Private (Customer) | Get specific pet |
| PUT | `/:id` | Private (Customer) | Update pet |
| DELETE | `/:id` | Private (Customer) | Delete pet |
| POST | `/:id/medical-records` | Private (Customer) | Add medical record |
| POST | `/:id/vaccinations` | Private (Customer) | Add vaccination record |

### 🛒 Cart Management (`/api/cart`)
| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | `/` | Private (Customer) | Get my cart |
| DELETE | `/` | Private (Customer) | Clear cart |
| POST | `/items` | Private (Customer) | Add item to cart |
| PUT | `/items/:itemId` | Private (Customer) | Update cart item |
| DELETE | `/items/:itemId` | Private (Customer) | Remove item from cart |

### 🏪 Service Management (`/api/services`)
| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | `/` | Public | Get all services (with filters) |
| GET | `/:id` | Public | Get service details |
| POST | `/` | Private (Staff, Admin) | Create service |
| PUT | `/:id` | Private (Staff, Admin) | Update service |
| DELETE | `/:id` | Private (Admin) | Delete service |

### 📂 Category Management (`/api/categories`)
| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | `/` | Public | Get all categories |
| GET | `/:id` | Public | Get category details |
| POST | `/` | Private (Staff, Admin) | Create category |
| PUT | `/:id` | Private (Staff, Admin) | Update category |
| DELETE | `/:id` | Private (Admin) | Delete category |

### 📅 Booking Management (`/api/bookings`)
| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| POST | `/` | Private (Customer) | Create booking from cart |
| POST | `/guest` | Private (Staff, Admin) | Create guest booking |
| GET | `/my` | Private (Customer) | Get my bookings |
| GET | `/` | Private (Staff, Admin) | Get all bookings |
| GET | `/:id` | Private | Get booking details |
| PUT | `/:id/status` | Private (Staff, Admin) | Update booking status |
| PUT | `/:id/cancel` | Private | Cancel booking |
| PUT | `/:id/assign-staff` | Private (Staff, Admin) | Assign staff to booking |

### 🏠 Room Management (`/api/rooms`)
| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | `/` | Public | Get all rooms |
| GET | `/:id` | Public | Get room details |
| POST | `/` | Private (Admin) | Create room |
| PUT | `/:id` | Private (Admin) | Update room |
| DELETE | `/:id` | Private (Admin) | Delete room |

### 💰 Transaction Management (`/api/transactions`)
| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | `/my` | Private (Customer) | Get my transactions |
| POST | `/deposit` | Private (Customer) | Create deposit request |
| POST | `/withdraw` | Private (Customer) | Create withdrawal request |
| GET | `/statistics/revenue` | Private (Admin) | Get revenue statistics |
| GET | `/` | Private (Admin) | Get all transactions |
| GET | `/:id` | Private | Get transaction details |
| PUT | `/:id/process` | Private (Admin) | Process transaction |

### 🔔 Notification Management (`/api/notifications`)
| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | `/my` | Private (All) | Get my notifications |
| PUT | `/read-all` | Private (All) | Mark all as read |
| PUT | `/:id/read` | Private (All) | Mark notification as read |
| DELETE | `/:id` | Private (All) | Delete notification |
| GET | `/` | Private (Staff, Admin) | Get all notifications |
| POST | `/` | Private (Staff, Admin) | Create notification |
| PUT | `/:id` | Private (Staff, Admin) | Update notification |

### 📰 News Management (`/api/news`)
| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | `/` | Public | Get all news |
| GET | `/:slug` | Public | Get news by slug |
| POST | `/` | Private (Staff, Admin) | Create news |
| PUT | `/:id` | Private (Staff, Admin) | Update news |
| DELETE | `/:id` | Private (Admin) | Delete news |

### 📜 Policy Management (`/api/policies`)
| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | `/` | Public | Get all policies |
| GET | `/:slug` | Public | Get policy by slug |
| POST | `/` | Private (Admin) | Create policy |
| PUT | `/:id` | Private (Admin) | Update policy |
| DELETE | `/:id` | Private (Admin) | Delete policy |

### ⭐ Feedback Management (`/api/feedback`)
| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | `/` | Public | Get all published feedback |
| GET | `/my` | Private (Customer) | Get my feedback |
| POST | `/` | Private (Customer) | Create feedback |
| PUT | `/:id` | Private (Customer) | Update feedback |
| DELETE | `/:id` | Private | Delete feedback |
| PUT | `/:id/respond` | Private (Staff, Admin) | Respond to feedback |
| PUT | `/:id/publish` | Private (Admin) | Toggle publish status |

### 👨‍💼 Admin Operations (`/api/admin`)
| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | `/statistics` | Private (Admin) | Get system statistics |
| GET | `/staff` | Private (Admin, Staff) | Get staff list |
| GET | `/users` | Private (Admin) | Get all users |
| GET | `/users/:id` | Private (Admin) | Get user by ID |
| PUT | `/users/:id/role` | Private (Admin) | Update user role |
| PUT | `/users/:id/ban` | Private (Admin) | Ban/Unban user |
| DELETE | `/users/:id` | Private (Admin) | Delete user |

---

## Request Examples

### Register User
```bash
POST /api/auth/register
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "SecurePass123!",
  "confirmPassword": "SecurePass123!"
}
```

### Login
```bash
POST /api/auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "SecurePass123!"
}
```

### Create Pet
```bash
POST /api/pets
Authorization: Bearer <token>
Content-Type: application/json

{
  "petName": "Buddy",
  "petType": "dog",
  "breed": "Golden Retriever",
  "age": 3,
  "weight": 30
}
```

### Add to Cart
```bash
POST /api/cart/items
Authorization: Bearer <token>
Content-Type: application/json

{
  "serviceId": "service_id_here",
  "petId": "pet_id_here",
  "quantity": 1,
  "notes": "Prefer morning slot"
}
```

### Create Booking
```bash
POST /api/bookings
Authorization: Bearer <token>
Content-Type: application/json

{
  "bookingDate": "2026-03-15",
  "bookingTime": "10:00 AM",
  "paymentMethod": "card",
  "notes": "Please be gentle, first time at clinic"
}
```

---

## Response Format

### Success Response
```json
{
  "status": "success",
  "message": "Operation completed successfully",
  "data": {
    // Response data here
  }
}
```

### Error Response
```json
{
  "status": "error",
  "message": "Error message here",
  "errorCode": "ERROR_CODE",
  "stack": "Stack trace (development only)"
}
```

---

## Query Parameters

### Filtering Examples

#### Services
```
GET /api/services?category=grooming&petType=dog&minPrice=100&maxPrice=500&search=bath
```

#### Bookings
```
GET /api/bookings?status=pending&date=2026-03-15
```

#### Transactions
```
GET /api/transactions?type=deposit&status=completed&startDate=2026-01-01&endDate=2026-03-31
```

---

## Status Codes

| Code | Description |
|------|-------------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not Found |
| 500 | Internal Server Error |

---

## Notes

1. **Role Mapping**: 
   - `customer` = users who book services
   - `staff` = employees who manage operations
   - `admin` = full system access

2. **Timestamps**: All resources include `createdAt` and `updatedAt` fields

3. **Soft Deletes**: Most delete operations are soft deletes (set `isActive: false` or `isDeleted: true`)

4. **Pagination**: Not yet implemented. Consider adding for production use.

5. **File Uploads**: Avatar and image uploads need additional configuration (not yet implemented).

---

## Environment Variables Required

```env
PORT=3001
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/happy-tails
JWT_SECRET=your_jwt_secret_here
JWT_EXPIRES_IN=7d
JWT_REFRESH_SECRET=your_refresh_secret_here
JWT_REFRESH_EXPIRES_IN=30d
```
