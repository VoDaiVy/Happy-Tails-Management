import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence, useMotionValue } from 'framer-motion';
import { PawPrint, User, Menu, X, ChevronRight, Zap } from 'lucide-react';

const Navbar = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [hoveredNav, setHoveredNav] = useState(null);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { name: 'Home', href: '#' },
    { name: 'Services', href: '#' },
    { name: 'About Us', href: '#' },
    { name: 'News', href: '#' },
    { name: 'Contact', href: '#' },
  ];

  return (
    <>
      <motion.nav
        initial={{ y: -100, scale: 0.9 }}
        animate={{ y: 0, scale: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 20 }}
        className={`fixed top-4 left-0 right-0 z-50 flex justify-center transition-all duration-500`}
      >
        {/* CONTAINER CHÍNH - Đổi sang tone Cam ấm áp khi cuộn */}
        <div 
          className={`
            relative flex items-center justify-between px-3 py-2 transition-all duration-500 ease-out
            ${isScrolled 
              ? 'w-[80%] bg-[#2D3436]/90 border-[#D97853]/30 shadow-[0_0_20px_rgba(217,120,83,0.3)] backdrop-blur-xl rounded-full' 
              : 'w-[90%] bg-white/70 border-white/40 shadow-xl backdrop-blur-md rounded-[2rem]'}
            border-2
          `}
        >
          {/* LOGO - Gradient Cam Đất */}
          <motion.div 
            whileHover={{ scale: 1.1 }}
            className="flex items-center gap-3 px-4 group cursor-pointer"
          >
            <div className={`p-2.5 rounded-full transition-all duration-500 relative overflow-hidden ${isScrolled ? 'bg-[#D97853]' : 'bg-[#2D3436]'}`}>
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent translate-x-[-150%] group-hover:translate-x-[150%] transition-transform duration-700" />
              <PawPrint size={22} className="text-white relative z-10" />
            </div>
            <span className={`text-xl font-black tracking-tighter transition-colors ${isScrolled ? 'text-white' : 'text-[#2D3436]'}`}>
              HAPPY<span className={isScrolled ? 'text-[#F5E6CA]' : 'text-[#D97853]'}>TAILS</span>
            </span>
          </motion.div>

          {/* DESKTOP MENU - Magnetic Pills (Màu Cam) */}
          <div className="hidden md:flex items-center gap-1 bg-slate-100/10 p-1 rounded-full border border-white/10" onMouseLeave={() => setHoveredNav(null)}>
            {navLinks.map((link, idx) => (
              <a
                key={link.name}
                href={link.href}
                onMouseEnter={() => setHoveredNav(idx)}
                className={`
                  relative px-6 py-2.5 rounded-full text-sm font-bold transition-all duration-300 z-10
                  ${isScrolled 
                    ? (hoveredNav === idx ? 'text-white' : 'text-gray-300') 
                    : (hoveredNav === idx ? 'text-white' : 'text-[#2D3436]')}
                `}
              >
                {link.name}
                
                {/* Background trượt theo chuột - Đổi sang màu Cam Đất */}
                {hoveredNav === idx && (
                  <motion.div
                    layoutId="nav-bg"
                    className={`absolute inset-0 rounded-full -z-10 ${isScrolled ? 'bg-[#D97853] shadow-[0_0_15px_rgba(217,120,83,0.6)]' : 'bg-[#2D3436] shadow-lg'}`}
                    transition={{ type: "spring", bounce: 0.25, duration: 0.5 }}
                  />
                )}
              </a>
            ))}
          </div>

          {/* ACTIONS - Nút Book Now Cam Rực Rỡ */}
          <div className="hidden md:flex items-center gap-3 px-2">
            <button className={`p-3 rounded-full transition-all ${isScrolled ? 'text-gray-300 hover:bg-white/10' : 'text-[#2D3436] hover:bg-slate-100'}`}>
               <User size={20} />
            </button>
            
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className={`
                relative overflow-hidden px-6 py-3 rounded-full font-bold text-sm flex items-center gap-2 group text-white
                ${isScrolled 
                  ? 'bg-gradient-to-r from-[#D97853] to-[#c46a47] shadow-[0_0_20px_rgba(217,120,83,0.5)]' 
                  : 'bg-[#2D3436] shadow-xl'}
              `}
            >
              <span className="relative z-10">Book Now</span>
              <div className="relative z-10 bg-white/20 p-1 rounded-full group-hover:rotate-90 transition-transform">
                 {isScrolled ? <Zap size={14} fill="currentColor"/> : <ChevronRight size={14} />}
              </div>
              
              {/* Hiệu ứng quét sáng */}
              <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full bg-gradient-to-r from-transparent via-white/30 to-transparent transition-transform duration-700 ease-in-out" />
            </motion.button>
          </div>

          {/* MOBILE TOGGLE */}
          <button 
            className={`md:hidden p-3 rounded-full ${isScrolled ? 'text-white bg-[#D97853]' : 'text-[#2D3436] bg-slate-100'}`}
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </motion.nav>

      {/* MOBILE MENU - Đồng bộ màu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 1.1 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="fixed inset-0 z-40 bg-[#FDFBF7]/95 backdrop-blur-2xl flex items-center justify-center"
          >
            <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20" />
            <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-[#D97853] rounded-full blur-[100px] opacity-20 animate-pulse" />
            
            <div className="relative z-10 flex flex-col gap-8 text-center">
              {navLinks.map((link, idx) => (
                <motion.a
                  key={link.name}
                  href={link.href}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  className="text-4xl font-black text-[#2D3436] hover:text-[#D97853] transition-all"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  {link.name}
                </motion.a>
              ))}
              
              <motion.button 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="mt-8 px-8 py-4 bg-[#D97853] text-white rounded-full font-black shadow-[0_0_30px_rgba(217,120,83,0.5)] hover:scale-110 transition-transform"
              >
                BOOK APPOINTMENT NOW
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default Navbar;