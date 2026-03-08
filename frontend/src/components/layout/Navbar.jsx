import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { PawPrint, User, Menu, X, LogOut, CalendarDays, UserCircle, ChevronDown } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const Navbar = ({ onLoginClick, onRegisterClick }) => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    setIsDropdownOpen(false);
    setIsMobileMenuOpen(false);
    navigate('/', { replace: true });
    await logout();
  };

  // Get initials for avatar
  const getInitials = (name) => {
    if (!name) return '?';
    return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  };

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
          <a href="#services" className="hover:text-primary transition-colors">Services</a>
          <a href="#about" className="hover:text-primary transition-colors">About Us</a>
          <a href="#news" className="hover:text-primary transition-colors">News</a>

          {user ? (
            /* === Logged in: Avatar + Dropdown === */
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-full hover:bg-slate-100 transition-all"
              >
                <div className="w-9 h-9 rounded-full bg-[#FF8C42] flex items-center justify-center text-white font-bold text-sm shadow-md overflow-hidden">
                  {user.avatar ? (
                    <img src={user.avatar} alt="Avatar" className="w-9 h-9 rounded-full object-cover" />
                  ) : (
                    getInitials(user.name)
                  )}
                </div>
                <span className="text-sm font-semibold text-slate-800 max-w-[120px] truncate">{user.name}</span>
                <ChevronDown size={16} className={`text-slate-500 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {isDropdownOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-slate-100 py-2 animate-in fade-in slide-in-from-top-2">
                  {/* User info header */}
                  <div className="px-4 py-3 border-b border-slate-100">
                    <p className="text-sm font-bold text-slate-800 truncate">{user.name}</p>
                    <p className="text-xs text-slate-500 truncate">{user.email}</p>
                  </div>

                  <div className="py-1">
                    <button
                      onClick={() => { setIsDropdownOpen(false); navigate('/profile'); }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 hover:text-[#FF8C42] transition-colors"
                    >
                      <UserCircle size={18} /> Profile
                    </button>
                    <button
                      onClick={() => { setIsDropdownOpen(false); navigate('/bookings'); }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 hover:text-[#FF8C42] transition-colors"
                    >
                      <CalendarDays size={18} /> Bookings
                    </button>
                  </div>

                  <div className="border-t border-slate-100 py-1">
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <LogOut size={18} /> Log Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* === Not logged in: Login button === */
            <button 
              onClick={onLoginClick}
              className="flex items-center gap-2 px-6 py-2.5 bg-slate-900 text-white rounded-full hover:bg-primary hover:shadow-lg transition-all"
            >
              <User size={18} /> Sign In
            </button>
          )}
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
            <a href="#services" className="hover:text-primary transition-colors py-2">Services</a>
            <a href="#about" className="hover:text-primary transition-colors py-2">About Us</a>
            <a href="#news" className="hover:text-primary transition-colors py-2">News</a>

            {user ? (
              <>
                {/* Mobile: user info */}
                <div className="flex items-center gap-3 py-2 border-t border-slate-100 pt-4">
                  <div className="w-10 h-10 rounded-full bg-[#FF8C42] flex items-center justify-center text-white font-bold text-sm shadow-md overflow-hidden">
                    {user.avatar ? (
                      <img src={user.avatar} alt="Avatar" className="w-10 h-10 rounded-full object-cover" />
                    ) : (
                      getInitials(user.name)
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-800">{user.name}</p>
                    <p className="text-xs text-slate-500">{user.email}</p>
                  </div>
                </div>
                <button onClick={() => { setIsMobileMenuOpen(false); navigate('/profile'); }}
                  className="flex items-center gap-3 py-2 text-slate-700 hover:text-[#FF8C42]">
                  <UserCircle size={18} /> Profile
                </button>
                <button onClick={() => { setIsMobileMenuOpen(false); navigate('/bookings'); }}
                  className="flex items-center gap-3 py-2 text-slate-700 hover:text-[#FF8C42]">
                  <CalendarDays size={18} /> Bookings
                </button>
                <button onClick={handleLogout}
                  className="flex items-center justify-center gap-2 px-6 py-2.5 bg-red-500 text-white rounded-full hover:bg-red-600 transition-all">
                  <LogOut size={18} /> Log Out
                </button>
              </>
            ) : (
              <>
                <button 
                  onClick={() => { setIsMobileMenuOpen(false); onLoginClick?.(); }}
                  className="flex items-center justify-center gap-2 px-6 py-2.5 bg-slate-900 text-white rounded-full hover:bg-primary hover:shadow-lg transition-all"
                >
                  <User size={18} /> Sign In
                </button>
                <button 
                  onClick={() => { setIsMobileMenuOpen(false); onRegisterClick?.(); }}
                  className="flex items-center justify-center gap-2 px-6 py-2.5 border-2 border-slate-900 text-slate-900 rounded-full hover:bg-slate-900 hover:text-white transition-all"
                >
                  Sign Up
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
