import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import DashboardLayout from './layout/DashboardLayout';
import AdminDashboard from './pages/dashboard/AdminDashboard';
import AdminNewsManagement from './pages/dashboard/admin/AdminNewsManagement';
import StaffDashboard from './pages/dashboard/StaffDashboard';
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

        {/* Auth Routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Admin Dashboard */}
        <Route path="/admin" element={<DashboardLayout />}>
          <Route index element={<AdminDashboard />} />
          <Route path="news" element={<AdminNewsManagement />} />
        </Route>

        {/* Staff Dashboard */}
        <Route path="/staff" element={<DashboardLayout />}>
          <Route index element={<StaffDashboard />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;