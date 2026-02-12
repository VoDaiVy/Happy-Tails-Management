import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { PawPrint, User, Menu } from 'lucide-react';

const Navbar = () => {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <nav className={`fixed w-full z-50 transition-all duration-300 ${isScrolled ? 'bg-white/80 backdrop-blur-md shadow-lg py-3' : 'bg-transparent py-5'}`}>
      <div className="container mx-auto px-6 flex justify-between items-center">
        <div className="flex items-center gap-2 group cursor-pointer">
          <div className="bg-primary p-2 rounded-xl group-hover:rotate-12 transition-transform">
            <PawPrint className="text-white" size={28} />
          </div>
          <span className="text-2xl font-black tracking-tighter text-slate-900">HAPPY<span className="text-primary">TAILS</span></span>
        </div>

        <div className="hidden md:flex items-center gap-10 font-bold text-slate-700">
          <a href="#" className="hover:text-primary transition-colors">Dịch vụ</a>
          <a href="#" className="hover:text-primary transition-colors">Về chúng tôi</a>
          <a href="#" className="hover:text-primary transition-colors">Tin tức</a>
          <button className="flex items-center gap-2 px-6 py-2.5 bg-slate-900 text-white rounded-full hover:bg-primary hover:shadow-lg transition-all">
            <User size={18} /> Đăng nhập
          </button>
        </div>
        
        <Menu className="md:hidden text-slate-900" size={28} />
      </div>
    </nav>
  );
};

export default Navbar;