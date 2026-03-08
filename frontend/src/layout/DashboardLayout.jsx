import React, { useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { PawPrint, Menu, ChevronDown, User, LogOut, Settings } from 'lucide-react';
import AdminSidebar from './sidebar/AdminSidebar';
import StaffSidebar from './sidebar/StaffSidebar';

const DashboardLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  // Lấy thông tin user từ localStorage
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const userName = user?.name || user?.email?.split('@')[0] || 'Người dùng';
  const userAvatar = user?.avatar;

  // Determine role from path: /admin/* -> admin, /staff/* -> staff
  const isAdmin = location.pathname.startsWith('/admin');
  const role = isAdmin ? 'admin' : 'staff';

  const handleLogout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-[#FDFBF7] font-sans text-[#2D3436] flex">
      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-0 z-40 h-screen bg-white border-r border-[#2D3436]/10 transition-all duration-300 ${
          sidebarOpen ? 'w-64' : 'w-20'
        }`}
      >
        {/* Logo */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-[#2D3436]/10">
          <div className="flex items-center gap-2 overflow-hidden">
            <div className="bg-[#D97853] p-2 rounded-xl shrink-0">
              <PawPrint className="text-white" size={24} />
            </div>
            {sidebarOpen && (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-xl font-black tracking-tighter whitespace-nowrap"
              >
                HAPPY<span className="text-[#D97853]">TAILS</span>
              </motion.span>
            )}
          </div>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 rounded-lg hover:bg-[#2D3436]/5 transition-colors shrink-0"
          >
            <Menu size={20} className="text-[#2D3436]" />
          </button>
        </div>

        {/* Sidebar menu theo role */}
        <div className="py-4 overflow-y-auto h-[calc(100vh-4rem)]">
          {role === 'admin' ? <AdminSidebar collapsed={!sidebarOpen} /> : <StaffSidebar collapsed={!sidebarOpen} />}
        </div>
      </aside>

      {/* Main content area */}
      <div className={`flex-1 flex flex-col transition-all duration-300 ${sidebarOpen ? 'ml-64' : 'ml-20'}`}>
        {/* Header */}
        <header className="h-16 bg-white/80 backdrop-blur-md border-b border-[#2D3436]/10 flex items-center justify-between px-6 sticky top-0 z-30">
          <div>
            <h1 className="text-lg font-bold text-[#2D3436] capitalize">{role} Dashboard</h1>
            <p className="text-xs text-[#2D3436]/60">Welcome back</p>
          </div>
          <div className="relative">
            <button 
              onClick={() => setUserDropdownOpen(!userDropdownOpen)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#2D3436]/5 hover:bg-[#2D3436]/10 transition-colors"
            >
              {userAvatar ? (
                <img src={userAvatar} alt={userName} className="w-8 h-8 rounded-full object-cover" />
              ) : (
                <div className="w-8 h-8 rounded-full bg-[#D97853] flex items-center justify-center">
                  <User size={16} className="text-white" />
                </div>
              )}
              <div className="text-left hidden sm:block">
                <p className="text-sm font-bold text-[#2D3436]">{userName}</p>
                <p className="text-xs text-[#2D3436]/60 flex items-center gap-1">
                  {role === 'admin' ? 'Administrator' : 'Staff'} <ChevronDown size={12} />
                </p>
              </div>
            </button>

            {/* Dropdown Menu */}
            <AnimatePresence>
              {userDropdownOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl border border-[#2D3436]/10 shadow-lg overflow-hidden z-50"
                >
                  <div className="p-3 border-b border-[#2D3436]/10">
                    <p className="text-sm font-bold text-[#2D3436]">{userName}</p>
                    <p className="text-xs text-[#2D3436]/60">{user?.email || ''}</p>
                  </div>
                  <div className="py-1">
                    <button
                      onClick={() => {
                        setUserDropdownOpen(false);
                        // Navigate to profile page
                      }}
                      className="w-full px-4 py-2 text-left text-sm text-[#2D3436] hover:bg-[#2D3436]/5 flex items-center gap-2"
                    >
                      <Settings size={16} />
                      Cài đặt
                    </button>
                    <button
                      onClick={handleLogout}
                      className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                    >
                      <LogOut size={16} />
                      Đăng xuất
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-6 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
