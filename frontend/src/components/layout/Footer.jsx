import React from 'react';
import { PawPrint, MapPin, Phone, Mail, Clock } from 'lucide-react';

const Footer = () => {
  return (
    <footer className="bg-[#FDFBF7] pt-24 pb-12 px-6 relative overflow-hidden font-sans">
        <div className="absolute bottom-0 right-0 opacity-[0.03] pointer-events-none">
            <PawPrint size={400} />
        </div>

        <div className="container mx-auto relative z-10">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-12 mb-16">
            
            <div className="md:col-span-4">
              <div className="flex items-center gap-3 mb-6">
                <div className="bg-[#2D3436] p-3 rounded-2xl"><PawPrint size={28} className="text-white" /></div>
                <span className="text-2xl font-black tracking-tighter text-[#2D3436]">HAPPY<span className="text-[#D97853]">TAILS</span></span>
              </div>
              <p className="text-[#2D3436]/60 leading-relaxed mb-6 text-sm">
                Your pet wellness sanctuary. Where luxury meets technology for the ultimate pet care experience.
              </p>
              <div className="flex gap-3">
                 {['facebook', 'instagram', 'twitter'].map(s => (
                   <a key={s} href="#" className="w-10 h-10 rounded-full bg-[#2D3436]/5 flex items-center justify-center hover:bg-[#D97853] hover:text-white transition-all text-[#2D3436]/60">
                      <span className="text-xs font-bold uppercase">{s[0]}</span>
                   </a>
                 ))}
              </div>
            </div>

            <div className="md:col-span-2">
              <h4 className="text-sm font-black uppercase tracking-wider text-[#2D3436] mb-5">Services</h4>
              <ul className="space-y-3 text-sm">
                <li><a href="#" className="text-[#2D3436]/60 hover:text-[#D97853] transition-colors">Organic Spa</a></li>
                <li><a href="#" className="text-[#2D3436]/60 hover:text-[#D97853] transition-colors">AI Health Scan</a></li>
                <li><a href="#" className="text-[#2D3436]/60 hover:text-[#D97853] transition-colors">Luxury Boarding</a></li>
                <li><a href="#" className="text-[#2D3436]/60 hover:text-[#D97853] transition-colors">Styling and Groom</a></li>
              </ul>
            </div>

            <div className="md:col-span-2">
               <h4 className="text-sm font-black uppercase tracking-wider text-[#2D3436] mb-5">Company</h4>
              <ul className="space-y-3 text-sm">
                <li><a href="#" className="text-[#2D3436]/60 hover:text-[#D97853] transition-colors">About Us</a></li>
                <li><a href="#" className="text-[#2D3436]/60 hover:text-[#D97853] transition-colors">Our Team</a></li>
                <li><a href="#" className="text-[#2D3436]/60 hover:text-[#D97853] transition-colors">Blog and News</a></li>
                <li><a href="#" className="text-[#2D3436]/60 hover:text-[#D97853] transition-colors">Careers</a></li>
              </ul>
            </div>

            <div className="md:col-span-4">
              <h4 className="text-sm font-black uppercase tracking-wider text-[#2D3436] mb-5">Get In Touch</h4>
              <ul className="space-y-4 text-sm">
                <li className="flex items-start gap-3">
                  <MapPin size={18} className="text-[#D97853] mt-0.5 flex-shrink-0"/>
                  <span className="text-[#2D3436]/60">FPT University, Hoa Hai, Ngu Hanh Son<br/>Da Nang, Vietnam</span>
                </li>
                <li className="flex items-center gap-3">
                  <Phone size={18} className="text-[#D97853] flex-shrink-0"/>
                  <span className="text-[#2D3436]/60">+84 (43) 1234 5678</span>
                </li>
                <li className="flex items-center gap-3">
                  <Mail size={18} className="text-[#D97853] flex-shrink-0"/>
                  <span className="text-[#2D3436]/60">hello@happytails.vn</span>
                </li>
                 <li className="flex items-center gap-3">
                  <Clock size={18} className="text-[#D97853] flex-shrink-0"/>
                  <span className="text-[#2D3436]/60">Mon - Sat: 8AM - 8PM</span>
                </li>
              </ul>
            </div>
          </div>

          <div className="border-t border-[#2D3436]/10 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-xs text-[#2D3436]/40">HappyTails. All rights reserved 2026.</p>
            <div className="flex gap-6 text-xs">
              <a href="#" className="text-[#2D3436]/40 hover:text-[#D97853]">Privacy Policy</a>
              <a href="#" className="text-[#2D3436]/40 hover:text-[#D97853]">Terms of Service</a>
              <a href="#" className="text-[#2D3436]/40 hover:text-[#D97853]">Cookie Settings</a>
            </div>
          </div>
        </div>
      </footer>
  );
};

export default Footer;