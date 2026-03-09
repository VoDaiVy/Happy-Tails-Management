import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Home from './pages/Home';
import { Login } from './pages/Login';
import BookingHistory from './pages/BookingHistory';
import ProfilePage from './pages/ProfilePage';
import Unauthorized from './pages/Unauthorized';
import DashboardLayout from './layout/DashboardLayout';
import AdminDashboard from './pages/dashboard/AdminDashboard';
import AdminNewsManagement from './pages/dashboard/admin/AdminNewsManagement';
import StaffDashboard from './pages/dashboard/StaffDashboard';
import BookingBoard from './pages/dashboard/BookingBoard';
import UserManagement from './pages/dashboard/UserManagement';
import RoomManagement from './pages/dashboard/RoomManagement';
import MedicalRecordManagement from './pages/dashboard/MedicalRecordManagement';
import TransactionManagement from './pages/dashboard/TransactionManagement';
import VoucherManagement from './pages/dashboard/VoucherManagement';
import ServiceManagement from './pages/dashboard/ServiceManagement';
import Login from './pages/Login';
import Register from './pages/Register';
import Service from './pages/Service';
import News from './pages/News';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/service" element={<Service />} />
        <Route path="/news" element={<News />} />

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
    </Router>
  );
}

export default App;