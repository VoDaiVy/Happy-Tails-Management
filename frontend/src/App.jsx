import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import DashboardLayout from './layout/DashboardLayout';
import AdminDashboard from './pages/dashboard/AdminDashboard';
import StaffDashboard from './pages/dashboard/StaffDashboard';
import BookingBoard from './pages/dashboard/BookingBoard';
import UserManagement from './pages/dashboard/UserManagement';
import RoomManagement from './pages/dashboard/RoomManagement';
import Login from './pages/Login';
import Register from './pages/Register';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />

        {/* Admin Dashboard */}
        <Route path="/admin" element={<DashboardLayout />}>
          <Route index element={<AdminDashboard />} />
          <Route path="bookings" element={<BookingBoard />} />
          <Route path="users" element={<UserManagement />} />
          <Route path="rooms" element={<RoomManagement />} />
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