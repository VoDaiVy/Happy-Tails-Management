import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import DashboardLayout from "./layout/DashboardLayout";
import AdminDashboard from "./pages/dashboard/AdminDashboard";
import AdminNewsManagement from "./pages/dashboard/admin/AdminNewsManagement";
import StaffDashboard from "./pages/dashboard/StaffDashboard";
import BookingBoard from "./pages/dashboard/BookingBoard";
import UserManagement from "./pages/dashboard/UserManagement";
import RoomManagement from "./pages/dashboard/RoomManagement";
import MedicalRecordManagement from "./pages/dashboard/MedicalRecordManagement";
import TransactionManagement from "./pages/dashboard/TransactionManagement";
import VoucherManagement from "./pages/dashboard/VoucherManagement";
import ServiceManagement from "./pages/dashboard/ServiceManagement";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Service from "./pages/Service";
import News from "./pages/News";
import Cart from "./pages/Cart";
import CartDrawer from "./components/cart/CartDrawer";

function App() {
  return (
    <Router>
      {/* Global cart drawer — renders on top of all pages */}
      <CartDrawer />

      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/service" element={<Service />} />
        <Route path="/news" element={<News />} />
        <Route path="/cart" element={<Cart />} />

        {/* Admin Dashboard */}
        <Route path="/admin" element={<DashboardLayout />}>
          <Route index element={<AdminDashboard />} />
          <Route path="news" element={<AdminNewsManagement />} />
          <Route path="bookings" element={<BookingBoard />} />
          <Route path="users" element={<UserManagement />} />
          <Route path="rooms" element={<RoomManagement />} />
          <Route path="services" element={<ServiceManagement />} />
          <Route path="medical-records" element={<MedicalRecordManagement />} />
          <Route path="transactions" element={<TransactionManagement />} />
          <Route path="vouchers" element={<VoucherManagement />} />
        </Route>

        {/* Staff Dashboard */}
        <Route path="/staff" element={<DashboardLayout />}>
          <Route index element={<StaffDashboard />} />
          <Route path="bookings" element={<BookingBoard />} />
        </Route>
      </Routes>

      {/* Floating Chat Bubble - Available on all pages */}
      <FloatingChatBubble />
    </Router>
  );
}

export default App;
