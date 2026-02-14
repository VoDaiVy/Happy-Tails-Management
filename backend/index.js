const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const mongoose = require("mongoose"); // 1. Gọi thư viện mongoose

// Cấu hình dotenv
dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// 2. Kết nối MongoDB
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("✅ Kết nối thành công với MongoDB!");
  })
  .catch((err) => {
    console.error("❌ Lỗi kết nối MongoDB:", err);
  });

// Route kiểm tra
app.get("/", (req, res) => {
  res.send("Hello! Backend Happy Tails đang chạy ngon lành!");
});

// Chạy server
app.listen(port, () => {
  console.log(`Server backend đang chạy tại: http://localhost:${port}`);
});
