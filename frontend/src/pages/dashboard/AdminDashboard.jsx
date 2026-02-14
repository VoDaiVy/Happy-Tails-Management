import React from 'react';
import { motion } from 'framer-motion';
import { LayoutDashboard } from 'lucide-react';

const AdminDashboard = () => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      <div className="bg-white rounded-2xl border border-[#2D3436]/10 p-12 text-center">
        <div className="w-16 h-16 mx-auto mb-4 bg-[#E8F3D6] rounded-2xl flex items-center justify-center">
          <LayoutDashboard size={32} className="text-[#5B8C51]" />
        </div>
        <h2 className="text-xl font-bold text-[#2D3436] mb-2">Admin Dashboard</h2>
        <p className="text-[#2D3436]/60 text-sm">Trang tổng quan dành cho quản trị viên</p>
      </div>
    </motion.div>
  );
};

export default AdminDashboard;
