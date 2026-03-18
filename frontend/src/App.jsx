import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import PrivateRoute from "./components/PrivateRoute";
import Home from "./pages/Home";
import Register from "./pages/Register";
import ResetPassword from "./pages/ResetPassword";
import Service from "./pages/Service";
import ServiceDetail from "./components/service/ServiceDetail";
import BoardingDetail from "./components/service/BoardingDetail";
import News from "./pages/News";
import NewsDetail from "./pages/NewsDetail";
import AIHealthScan from "./pages/AIHealthScan";
import Policy from "./pages/Policy";
import Cart from "./pages/Cart";
import Wallet from "./pages/Wallet";
import BookingHistory from "./pages/BookingHistory";
import ProfilePage from "./pages/ProfilePage";
import MyPetsPage from "./pages/MyPetsPage";
import PetDetailPage from "./pages/PetDetailPage";
import Unauthorized from "./pages/Unauthorized";
import DashboardLayout from "./layout/DashboardLayout";
import AdminDashboard from "./pages/dashboard/admin/AdminDashboard";
import StaffNewsManagement from "./pages/dashboard/staff/StaffNewsManagement";
import StaffDashboard from "./pages/dashboard/staff/StaffDashboard";
import StaffFeedbackPage from "./pages/dashboard/staff/StaffFeedbackPage";
import BookingBoard from "./pages/dashboard/BookingBoard";
import UserManagement from "./pages/dashboard/admin/AdminUserManagement";
import RoomManagement from "./pages/dashboard/admin/AdminRoomManagement";
import MedicalRecordManagement from "./pages/dashboard/admin/AdminMedicalRecordManagement";
import TransactionManagement from "./pages/dashboard/admin/AdminTransactionManagement";
import VoucherManagement from "./pages/dashboard/admin/AdminVoucherManagement";
import ServiceManagement from "./pages/dashboard/admin/AdminServiceManagement";
import AdminPolicyManagement from "./pages/dashboard/admin/AdminPolicyManagement";
import FloatingChatBubble from "./components/FloatingChatBubble";

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Navigate to="/" replace />} />
          <Route path="/register" element={<Register />} />
          <Route path="/reset-password/:token" element={<ResetPassword />} />
          <Route path="/service" element={<Service />} />
          <Route path="/service/:serviceSlug" element={<ServiceDetail />} />
          <Route path="/service-detail" element={<ServiceDetail />} />
          <Route path="/service-detail/:id" element={<ServiceDetail />} />
          <Route path="/boarding/:roomType" element={<BoardingDetail />} />
          <Route path="/news" element={<News />} />
          <Route path="/news/:slug" element={<NewsDetail />} />
          <Route path="/ai-health-scan" element={<AIHealthScan />} />
          <Route path="/policy" element={<Policy />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/unauthorized" element={<Unauthorized />} />

          {/* Protected customer routes */}
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <ProfilePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/pets"
            element={
              <ProtectedRoute>
                <MyPetsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/pets/:petId"
            element={
              <ProtectedRoute>
                <PetDetailPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/bookings"
            element={
              <ProtectedRoute>
                <BookingHistory />
              </ProtectedRoute>
            }
          />

          {/* Wallet */}
          <Route path="/wallet" element={<Wallet />} />

          {/* Admin Dashboard - requires admin role */}
          <Route
            path="/admin"
            element={
              <PrivateRoute allowedRoles={["admin"]}>
                <DashboardLayout />
              </PrivateRoute>
            }
          >
            <Route index element={<AdminDashboard />} />
            <Route path="bookings" element={<BookingBoard />} />
            <Route path="users" element={<UserManagement />} />
            <Route path="rooms" element={<RoomManagement />} />
            <Route path="services" element={<ServiceManagement />} />
            <Route
              path="medical-records"
              element={<MedicalRecordManagement />}
            />
            <Route path="transactions" element={<TransactionManagement />} />
            <Route path="policies" element={<AdminPolicyManagement />} />
            <Route path="vouchers" element={<VoucherManagement />} />
          </Route>

          {/* Staff Dashboard - requires staff or admin role */}
          <Route
            path="/staff"
            element={
              <PrivateRoute allowedRoles={["staff", "admin"]}>
                <DashboardLayout />
              </PrivateRoute>
            }
          >
            <Route index element={<StaffDashboard />} />
            <Route path="bookings" element={<BookingBoard />} />
            <Route
              path="feedback"
              element={
                <PrivateRoute allowedRoles={["staff"]}>
                  <StaffFeedbackPage />
                </PrivateRoute>
              }
            />
            <Route
              path="news"
              element={
                <PrivateRoute allowedRoles={["staff"]}>
                  <StaffNewsManagement />
                </PrivateRoute>
              }
            />
          </Route>
        </Routes>

        {/* Floating Chat Bubble - Available on all pages */}
        <FloatingChatBubble />
      </Router>
    </AuthProvider>
  );
}

export default App;
