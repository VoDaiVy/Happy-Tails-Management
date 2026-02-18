import React from 'react';
import { PawPrint, MapPin, Phone, Mail, Facebook, Instagram, Youtube, ArrowRight } from 'lucide-react';

const Footer = () => {
  return (
    <footer className="relative mt-20 pb-10 px-4 font-sans text-slate-700">
      {/* Container chính: Thẻ nổi gọn gàng */}
      <div className="container mx-auto relative bg-white border border-slate-200 rounded-[2.5rem] shadow-xl shadow-slate-200/50 overflow-hidden">
        
        {/* Họa tiết trang trí nền */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-rose-100 rounded-full blur-[80px] -z-10 opacity-60" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-teal-100 rounded-full blur-[80px] -z-10 opacity-60" />
        
        <div className="p-10 grid grid-cols-1 lg:grid-cols-12 gap-10">
          
          {/* Cột 1: Branding */}
          <div className="lg:col-span-4 flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <div className="bg-[#D97853] p-2 rounded-xl text-white shadow-lg">
                <PawPrint size={22} fill="currentColor" />
              </div>
              <span className="text-2xl font-black tracking-tight text-slate-800">
                HAPPY<span className="text-[#D97853]">TAILS</span>
              </span>
            </div>
            <p className="text-sm font-medium text-slate-500 leading-relaxed max-w-xs">
              Premier 5-star pet care system. Where technology meets love to bring the best experience for your four-legged friends.
            </p>
            <div className="flex gap-3 mt-2">
              <SocialBtn icon={<Facebook size={18} />} />
              <SocialBtn icon={<Instagram size={18} />} />
              <SocialBtn icon={<Youtube size={18} />} />
            </div>
          </div>

          {/* Cột 2: Explore & Contact (Gộp để tiết kiệm chiều cao) */}
          <div className="lg:col-span-5 grid grid-cols-2 gap-6">
            <div>
              <h4 className="font-bold text-slate-900 mb-4 text-xs uppercase tracking-wider">Explore</h4>
              <ul className="space-y-3 text-sm font-medium text-slate-500">
                <li><a href="#" className="hover:text-[#D97853] transition-colors flex items-center gap-1 hover:translate-x-1 duration-200">About Us</a></li>
                <li><a href="#" className="hover:text-[#D97853] transition-colors flex items-center gap-1 hover:translate-x-1 duration-200">Spa Services</a></li>
                <li><a href="#" className="hover:text-[#D97853] transition-colors flex items-center gap-1 hover:translate-x-1 duration-200">Luxury Hotel</a></li>
                <li><a href="#" className="hover:text-[#D97853] transition-colors flex items-center gap-1 hover:translate-x-1 duration-200">AI Diagnosis</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold text-slate-900 mb-4 text-xs uppercase tracking-wider">Contact Info</h4>
              <ul className="space-y-3 text-sm font-medium text-slate-500">
                <li className="flex items-center gap-2"><Phone size={16} className="text-[#D97853]"/> +84 905 123 456</li>
                <li className="flex items-center gap-2"><MapPin size={16} className="text-[#D97853]"/> Da Nang, Vietnam</li>
                <li className="flex items-center gap-2"><Mail size={16} className="text-[#D97853]"/> hello@happytails.vn</li>
              </ul>
            </div>
          </div>

          {/* Cột 3: Newsletter */}
          <div className="lg:col-span-3">
            <h4 className="font-bold text-slate-900 mb-4 text-xs uppercase tracking-wider">Newsletter</h4>
            <p className="text-xs text-slate-500 mb-4">Subscribe to get a 10% discount voucher for your first booking.</p>
            <div className="relative">
              <input 
                type="email" 
                placeholder="Your email..." 
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#D97853] transition-colors"
              />
              <button className="absolute right-1 top-1 bottom-1 bg-[#D97853] text-white p-2 rounded-lg hover:bg-[#c46a47] transition-colors shadow-md">
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        </div>

        {/* Copyright Bar */}
        <div className="border-t border-slate-100 bg-slate-50/50 px-10 py-4 flex flex-col md:flex-row justify-between items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
          <p>© 2026 Happy Tails Inc. All rights reserved.</p>
          <div className="flex gap-6">
            <a href="#" className="hover:text-[#D97853]">Terms of Service</a>
            <a href="#" className="hover:text-[#D97853]">Privacy Policy</a>
          </div>
        </div>
      </div>
    </footer>
  );
};

const SocialBtn = ({ icon }) => (
  <a href="#" className="w-9 h-9 border border-slate-200 bg-white rounded-full flex items-center justify-center text-slate-400 hover:bg-[#D97853] hover:text-white hover:border-[#D97853] transition-all shadow-sm">
    {icon}
  </a>
);

export default Footer;