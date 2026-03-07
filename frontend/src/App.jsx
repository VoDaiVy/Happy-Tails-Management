import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import DashboardLayout from './layout/DashboardLayout';
import AdminDashboard from './pages/dashboard/AdminDashboard';
import StaffDashboard from './pages/dashboard/StaffDashboard';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />

        {/* Admin Dashboard */}
        <Route path="/admin" element={<DashboardLayout />}>
          <Route index element={<AdminDashboard />} />
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