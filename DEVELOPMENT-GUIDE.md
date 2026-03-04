# 🚀 Happy Tails Development Guide

## Giải thích lỗi Duplicate Index

### Lỗi là gì?
```
Warning: mongoose: Duplicate schema index on {"name":1} for model "Category"
```

### Nguyên nhân
- Khi định nghĩa field với `unique: true`, Mongoose **tự động tạo index**
- Nếu sau đó còn gọi `schema.index({ fieldName: 1 })`, sẽ tạo index **lần thứ 2** → **Trùng lặp**

### Ví dụ
```javascript
// ❌ SAI - Duplicate index
const schema = new Schema({
  name: { type: String, unique: true }  // Tự động tạo index
});
schema.index({ name: 1 });  // Tạo index lần 2 → DUPLICATE!

// ✅ ĐÚNG - Chỉ cần unique: true
const schema = new Schema({
  name: { type: String, unique: true }  // Đủ rồi!
});
// Không cần thêm schema.index({ name: 1 })
```

### Đã fix
Đã xóa các duplicate index trong 7 models:
- ✅ Category.js - removed `name` index
- ✅ Booking.js - removed `bookingNumber` index  
- ✅ Room.js - removed `roomNumber` index
- ✅ Transaction.js - removed `transactionNumber` index
- ✅ Cart.js - removed `userID` index
- ✅ News.js - removed `slug` index
- ✅ Policy.js - removed `slug` index

---

## 📦 Cài đặt Dependencies

### Backend
```bash
cd backend
npm install
```

### Frontend
```bash
cd frontend
npm install
```

---

## 🔧 Cấu hình Environment Variables

### Backend (.env)
File `backend/.env` đã tồn tại với config:
```env
NODE_ENV=development
PORT=3001
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
JWT_EXPIRES_IN=7d
JWT_REFRESH_SECRET=your_refresh_secret
JWT_REFRESH_EXPIRES_IN=30d
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASSWORD=your_app_password
EMAIL_FROM=Happy Tails <noreply@happytails.com>
FRONTEND_URL=http://localhost:5173
```

### Frontend (.env)
File `frontend/.env` đã được tạo với config:
```env
# Backend API Configuration
VITE_API_URL=http://localhost:3001/api

# App Configuration
VITE_APP_NAME="Happy Tails Management"
VITE_APP_VERSION=1.0.0

# Environment
NODE_ENV=development
```

**Lưu ý Vite:** Environment variables trong Vite phải có prefix `VITE_` để expose cho client-side code.

---

## 🏃‍♂️ Cách chạy Development

### Option 1: Chạy riêng lẻ (2 terminals)

#### Terminal 1 - Backend
```bash
cd backend
node index.js
```
Hoặc với nodemon (auto-restart khi code thay đổi):
```bash
cd backend
npm run dev
```
Backend chạy tại: **http://localhost:3001**

#### Terminal 2 - Frontend
```bash
cd frontend
npm run dev
```
Frontend chạy tại: **http://localhost:5173**

---

### Option 2: Chạy đồng thời (concurrently)

Sử dụng root `package.json` để chạy cả 2 cùng lúc:

```bash
# Từ root directory
npm install
npm run dev
```

Lệnh này sẽ:
- ✅ Khởi động backend tại http://localhost:3001
- ✅ Khởi động frontend tại http://localhost:5173
- ✅ Hiển thị logs của cả 2 trong cùng 1 terminal
- ✅ Tự động restart khi có thay đổi

---

### Option 3: Chạy với PM2 (Production-like)

PM2 giúp quản lý processes tốt hơn:

```bash
# Cài PM2 globally (chỉ cần 1 lần)
npm install -g pm2

# Chạy cả backend và frontend
pm2 start ecosystem.config.js

# Xem logs
pm2 logs

# Xem status
pm2 status

# Restart
pm2 restart all

# Stop
pm2 stop all

# Delete processes
pm2 delete all
```

---

## 📂 File Structure

```
Happy-Tails-Management/
├── backend/
│   ├── index.js                 # Main server file
│   ├── package.json
│   ├── .env                     # Backend config
│   ├── config/
│   │   ├── database.js
│   │   ├── email.js
│   │   └── jwt.js
│   ├── controllers/             # 11 controllers
│   ├── models/                  # 13 models
│   ├── routes/                  # 11 route files
│   ├── middleware/
│   └── utils/
│
├── frontend/
│   ├── package.json
│   ├── .env                     # Frontend config (VITE_ prefix)
│   ├── vite.config.js
│   ├── src/
│   │   ├── main.jsx
│   │   ├── App.jsx
│   │   ├── components/
│   │   ├── pages/
│   │   ├── services/            # API calls
│   │   └── redux/
│   └── public/
│
├── package.json                 # Root - run both
├── ecosystem.config.js          # PM2 config
├── DEVELOPMENT-GUIDE.md         # This file
├── IMPLEMENTATION-SUMMARY.md    # API docs
└── README-API.md                # API reference
```

---

## 🧪 Testing the Setup

### 1. Kiểm tra Backend
```bash
# Health check
curl http://localhost:3001/api/health

# Should return:
# {"status":"success","message":"API is running"}
```

### 2. Kiểm tra Frontend
Mở browser: http://localhost:5173

### 3. Test API từ Frontend
Trong file frontend sử dụng:
```javascript
const API_URL = import.meta.env.VITE_API_URL;

// Example API call
const response = await fetch(`${API_URL}/auth/login`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password })
});
```

---

## 🐛 Troubleshooting

### Backend không start
```bash
# Check MongoDB connection
# Verify .env có MONGODB_URI đúng

# Check port 3001 có bị chiếm không
lsof -i :3001
kill -9 <PID>  # Nếu cần kill process

# Clear node_modules và reinstall
cd backend
rm -rf node_modules package-lock.json
npm install
```

### Frontend không start  
```bash
# Check port 5173 có bị chiếm không
lsof -i :5173
kill -9 <PID>

# Clear và reinstall
cd frontend
rm -rf node_modules package-lock.json
npm install
```

### CORS errors
Kiểm tra `backend/index.js` có config CORS đúng không:
```javascript
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));
```

### Environment variables không load
- **Backend:** Check file `.env` có ở đúng `backend/` folder không
- **Frontend:** 
  - Check file `.env` có ở đúng `frontend/` folder không
  - Check variables có prefix `VITE_` không
  - **Restart dev server** sau khi change .env

---

## 📝 Tips cho Development

### 1. Hot Reload
- **Backend:** Dùng `nodemon` để auto-restart khi code thay đổi
- **Frontend:** Vite đã có HMR (Hot Module Replacement) sẵn

### 2. Debug
- **Backend:** Thêm `console.log()` hoặc dùng VS Code debugger
- **Frontend:** Dùng React DevTools và Browser DevTools

### 3. API Testing
- Dùng **Postman** hoặc **Thunder Client** (VS Code extension)
- Hoặc dùng `curl` command

### 4. Database Management
- Dùng **MongoDB Compass** để view/edit data
- Hoặc **mongosh** CLI

### 5. Git Best Practices
```bash
# Không commit .env files!
# .gitignore đã có:
.env
node_modules/
```

---

## 🚀 Next Steps

### Tạo Admin User
```javascript
// Connect to MongoDB và run:
use happy_tails_db
db.users.updateOne(
  { email: "admin@happytails.com" },
  { $set: { role: "admin" } }
)
```

### Seed Data
Tạo file `backend/scripts/seedData.js` để populate initial data:
- Categories
- Services  
- Rooms
- Sample users

### Frontend Integration
Tạo API service layer trong `frontend/src/services/api.js`:
```javascript
const API_URL = import.meta.env.VITE_API_URL;

export const api = {
  login: (credentials) => fetch(`${API_URL}/auth/login`, {...}),
  getPets: () => fetch(`${API_URL}/pets`, {...}),
  // ... other endpoints
};
```

---

## 📞 Support

Nếu gặp vấn đề:
1. Check console logs (backend terminal + browser console)
2. Verify .env files
3. Check MongoDB connection
4. Review IMPLEMENTATION-SUMMARY.md for API details

Happy coding! 🎉
