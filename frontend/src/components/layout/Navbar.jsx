import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { PawPrint, User, Menu, X } from 'lucide-react';

const Navbar = ({ onLoginClick, onRegisterClick }) => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <nav className={`fixed w-full z-50 transition-all duration-300 ${isScrolled ? 'bg-white/80 backdrop-blur-md shadow-lg py-3' : 'bg-transparent py-5'}`}>
      <div className="container mx-auto px-6 flex justify-between items-center">
        <Link to="/" className="flex items-center gap-2 group cursor-pointer">
          <div className="bg-primary p-2 rounded-xl group-hover:rotate-12 transition-transform">
            <PawPrint className="text-white" size={28} />
          </div>
          <span className="text-2xl font-black tracking-tighter text-slate-900">HAPPY<span className="text-primary">TAILS</span></span>
        </Link>

        <div className="hidden md:flex items-center gap-10 font-bold text-slate-700">
          <Link to="/service" className="hover:text-primary transition-colors">Dich vu</Link>
          <a href="#about" className="hover:text-primary transition-colors">Ve chung toi</a>
          <a href="#news" className="hover:text-primary transition-colors">Tin tuc</a>
          <button 
            onClick={onLoginClick}
            className="flex items-center gap-2 px-6 py-2.5 bg-slate-900 text-white rounded-full hover:bg-primary hover:shadow-lg transition-all"
          >
            <User size={18} /> Dang nhap
          </button>
        </div>
        
        <button 
          className="md:hidden text-slate-900"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        >
          {isMobileMenuOpen ? <X size={28} /> : <Menu size={28} />}
        </button>
      </div>

      {isMobileMenuOpen && (
        <div className="md:hidden absolute top-full left-0 w-full bg-white shadow-lg py-4 px-6">
          <div className="flex flex-col gap-4 font-bold text-slate-700">
            <Link to="/service" className="hover:text-primary transition-colors py-2">Dich vu</Link>
            <a href="#about" className="hover:text-primary transition-colors py-2">Ve chung toi</a>
            <a href="#news" className="hover:text-primary transition-colors py-2">Tin tuc</a>
            <button 
              onClick={() => {
                setIsMobileMenuOpen(false);
                onLoginClick?.();
              }}
              className="flex items-center justify-center gap-2 px-6 py-2.5 bg-slate-900 text-white rounded-full hover:bg-primary hover:shadow-lg transition-all"
            >
              <User size={18} /> Dang nhap
            </button>
            <button 
              onClick={() => {
                setIsMobileMenuOpen(false);
                onRegisterClick?.();
              }}
              className="flex items-center justify-center gap-2 px-6 py-2.5 border-2 border-slate-900 text-slate-900 rounded-full hover:bg-slate-900 hover:text-white transition-all"
            >
              Dang ky
            </button>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
