import React, { useState, useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { PawPrint, Sparkles, Heart, Activity, Music, VolumeX, ArrowRight, Star, Play, CheckCircle, MapPin, Phone, Clock, Mail } from 'lucide-react';
import Navbar from '../components/layout/Navbar';
import AuthModal from '../components/AuthModal';

const Home = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState('login');
  const audioRef = useRef(null);
  const { scrollYProgress } = useScroll();
  
  const y1 = useTransform(scrollYProgress, [0, 1], [0, -50]);
  const y2 = useTransform(scrollYProgress, [0, 1], [0, 50]);

  const toggleMusic = () => {
    if(!audioRef.current) return;
    if (isPlaying) audioRef.current.pause();
    else audioRef.current.play();
    setIsPlaying(!isPlaying);
  };

  const openLoginModal = () => {
    setAuthModalMode('login');
    setIsAuthModalOpen(true);
  };

  const openRegisterModal = () => {
    setAuthModalMode('register');
    setIsAuthModalOpen(true);
  };

  return (
    <div className="bg-[#FDFBF7] min-h-screen font-sans text-[#2D3436] selection:bg-[#D97853] selection:text-white overflow-x-hidden">
      <Navbar onLoginClick={openLoginModal} onRegisterClick={openRegisterModal} />
      
      <AuthModal 
        isOpen={isAuthModalOpen} 
        onClose={() => setIsAuthModalOpen(false)} 
        initialMode={authModalMode}
      />
      <audio ref={audioRef} loop src="https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3" />

      <div className="fixed bottom-6 left-6 z-50">
        <button 
          onClick={toggleMusic}
          className="group flex items-center gap-3 bg-[#2D3436] text-[#FDFBF7] px-3 py-2 rounded-full shadow-xl hover:scale-105 transition-all duration-500"
        >
          <div className="relative">
             {isPlaying ? <div className="absolute inset-0 bg-[#D97853] rounded-full animate-ping opacity-50"/> : null}
             {isPlaying ? <Music size={16} /> : <VolumeX size={16} />}
          </div>
          <span className="text-[10px] font-bold tracking-widest uppercase overflow-hidden w-0 group-hover:w-20 transition-all duration-500 whitespace-nowrap">
            {isPlaying ? 'Relaxing' : 'Play'}
          </span>
        </button>
      </div>

      <section className="relative pt-28 pb-16 px-6 flex items-center">
        <div className="container mx-auto grid lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-6 relative z-10">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}>
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[#2D3436]/10 bg-white mb-6">
                <span className="w-1.5 h-1.5 rounded-full bg-[#D97853] animate-pulse"/>
                <span className="text-[10px] font-bold tracking-widest uppercase text-[#2D3436]/60">The Future of Pet Wellness</span>
              </div>
              
              <h1 className="text-5xl lg:text-6xl font-black leading-[1.1] mb-6 tracking-tight text-[#2D3436]">
                Sanctuary for <br />
                <span className="text-[#D97853] italic font-serif">Paws and Soul.</span>
              </h1>
              
              <p className="text-base text-[#2D3436]/70 mb-8 max-w-md leading-relaxed font-medium">
                Experience the perfect blend of luxurious spa treatments and cutting-edge AI health diagnostics.
              </p>
              
              <div className="flex flex-wrap gap-4">
                <button 
                  onClick={openLoginModal}
                  className="px-8 py-3 bg-[#2D3436] text-white rounded-full font-bold text-sm hover:bg-[#D97853] transition-colors duration-300 shadow-lg"
                >
                  Book Appointment
                </button>
                <button className="px-8 py-3 border border-[#2D3436]/20 rounded-full font-bold text-sm hover:bg-white transition-all flex items-center gap-2">
                  <Play size={16} fill="currentColor" /> Our Story
                </button>
              </div>

              <div className="mt-8 flex items-center gap-3">
                <div className="flex -space-x-3">
                  {[1,2,3,4].map(i => (
                    <img key={i} src={`https://i.pravatar.cc/100?img=${i+20}`} className="w-10 h-10 rounded-full border-2 border-[#FDFBF7]" alt="user" />
                  ))}
                </div>
                <div>
                  <div className="flex text-[#D97853]"><Star size={12} fill="currentColor"/><Star size={12} fill="currentColor"/><Star size={12} fill="currentColor"/><Star size={12} fill="currentColor"/><Star size={12} fill="currentColor"/></div>
                  <p className="text-[10px] font-bold text-[#2D3436]/60">Trusted by 2,000+ Owners</p>
                </div>
              </div>
            </motion.div>
          </div>

          <div className="lg:col-span-6 relative lg:h-[480px]">
             <motion.div style={{ y: y1 }} className="relative z-10 h-full">
               <img 
                 src="https://images.unsplash.com/photo-1516734212186-a967f81ad0d7?q=80&w=1000" 
                 className="w-full h-full object-cover rounded-[4rem] rounded-tr-none shadow-xl"
                 alt="Spa Dog" 
               />
               
               <motion.div 
                 animate={{ y: [0, 8, 0] }}
                 transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                 className="absolute bottom-6 -left-6 bg-white/90 backdrop-blur-md p-4 rounded-2xl shadow-lg border border-white/50 max-w-[200px]"
               >
                 <div className="flex items-center gap-3">
                   <div className="bg-[#E8F3D6] p-2 rounded-full text-[#5B8C51]">
                     <Activity size={20} />
                   </div>
                   <div>
                     <p className="text-[10px] font-bold text-[#2D3436]/50 uppercase">AI Health Scan</p>
                     <p className="text-sm font-bold text-[#2D3436]">Rex is completely healthy!</p>
                   </div>
                 </div>
               </motion.div>
             </motion.div>
             
             <div className="absolute top-8 -right-8 w-full h-full bg-[#E8F3D6] rounded-[4rem] rounded-tr-none -z-10" />
          </div>
        </div>
      </section>

      <div className="bg-[#D97853] py-4 overflow-hidden rotate-[-1deg] border-y-2 border-[#2D3436]">
        <div className="flex w-full overflow-hidden">
          <motion.div 
            className="flex whitespace-nowrap"
            animate={{ x: "-50%" }}
            transition={{ repeat: Infinity, duration: 20, ease: "linear" }}
          >
            {[...Array(2)].map((_, i) => (
              <div key={i} className="flex items-center gap-12 mx-6">
                <span className="text-2xl font-black text-white uppercase italic tracking-tighter">PREMIUM SPA</span>
                <Star fill="white" size={18} className="text-white" />
                <span className="text-2xl font-black text-[#2D3436] uppercase italic tracking-tighter">AI DIAGNOSIS</span>
                <Star fill="#2D3436" size={18} className="text-[#2D3436]" />
                <span className="text-2xl font-black text-white uppercase italic tracking-tighter">LUXURY HOTEL</span>
                <Star fill="white" size={18} className="text-white" />
                <span className="text-2xl font-black text-[#2D3436] uppercase italic tracking-tighter">GROOMING ART</span>
                <Star fill="#2D3436" size={18} className="text-[#2D3436]" />
              </div>
            ))}
          </motion.div>
        </div>
      </div>

      <section className="py-20 px-6 bg-[#FDFBF7]">
        <div className="container mx-auto text-center max-w-3xl">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <h2 className="text-2xl md:text-4xl font-serif text-[#2D3436] mb-6 leading-tight">
              We believe pets are family, and family deserves the <span className="text-[#5B8C51] italic">ultimate relaxation</span>.
            </h2>
            <div className="grid md:grid-cols-3 gap-6 text-left mt-12">
              <PhilosophyItem title="Organic Products" desc="100% natural, chemical-free shampoos." />
              <PhilosophyItem title="Stress-Free Zone" desc="Sound-proofed rooms with calming pheromones." />
              <PhilosophyItem title="AI Transparency" desc="Real-time health updates sent to your phone." />
            </div>
          </motion.div>
        </div>
      </section>

      <section className="py-16 px-6 bg-white rounded-t-[3rem]">
        <div className="container mx-auto">
          <div className="flex justify-between items-end mb-10">
            <div>
              <span className="text-[#D97853] font-bold tracking-widest uppercase text-xs">Our Expertise</span>
              <h2 className="text-3xl md:text-4xl font-black text-[#2D3436] mt-2">Holistic Services</h2>
            </div>
            <button className="hidden md:flex items-center gap-2 text-[#2D3436] font-bold text-sm border-b border-[#2D3436] pb-1 hover:text-[#D97853] hover:border-[#D97853] transition-all">
              View All Services <ArrowRight size={16} />
            </button>
          </div>

          <div className="grid md:grid-cols-3 gap-6 h-auto md:h-[450px]">
            <motion.div 
              whileHover={{ scale: 0.98 }}
              className="md:col-span-1 bg-[#E8F3D6] rounded-[2.5rem] p-6 flex flex-col justify-between group cursor-pointer relative overflow-hidden"
            >
              <div className="w-12 h-12 bg-[#5B8C51] rounded-2xl flex items-center justify-center text-white mb-4">
                <Sparkles size={24} />
              </div>
              <div>
                <h3 className="text-2xl font-black text-[#2D3436] mb-2">Organic Spa</h3>
                <p className="text-[#2D3436]/70 font-medium text-sm mb-4">Aromatherapy baths, pawdicures, and deep tissue massages.</p>
                <div className="inline-flex items-center gap-2 font-bold text-[#5B8C51] text-sm">Book Spa <ArrowRight size={14}/></div>
              </div>
              <img src="https://images.unsplash.com/photo-1596272875729-ed2ff7d6d9c5?q=80&w=400" className="absolute bottom-[-20px] right-[-20px] w-40 h-40 object-cover rounded-full border-4 border-white shadow-lg opacity-80 group-hover:opacity-100 transition-opacity" alt="spa" />
            </motion.div>

            <div className="md:col-span-1 flex flex-col gap-6">
              <motion.div whileHover={{ scale: 0.98 }} className="flex-1 bg-[#2D3436] rounded-[2.5rem] p-6 flex flex-col justify-center text-white relative overflow-hidden cursor-pointer">
                 <div className="relative z-10">
                   <Activity className="text-[#D97853] mb-3" size={28} />
                   <h3 className="text-xl font-bold mb-1">AI Health Scan</h3>
                   <p className="text-gray-400 text-xs">Instant dermatology and mood analysis.</p>
                 </div>
                 <div className="absolute right-0 bottom-0 opacity-10"><Activity size={100}/></div>
              </motion.div>
              
              <motion.div whileHover={{ scale: 0.98 }} className="flex-1 bg-[#F5E6CA] rounded-[2.5rem] p-6 flex flex-col justify-center text-[#2D3436] cursor-pointer">
                 <Heart className="text-[#D97853] mb-3" size={28} />
                 <h3 className="text-xl font-bold mb-1">Luxury Boarding</h3>
                 <p className="text-[#2D3436]/70 text-xs">Penthouse suites with 24/7 webcams.</p>
              </motion.div>
            </div>

            <motion.div 
              whileHover={{ scale: 0.98 }}
              className="md:col-span-1 bg-[#D97853] rounded-[2.5rem] p-6 flex flex-col justify-between group cursor-pointer text-white relative overflow-hidden"
            >
               <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-xl flex items-center justify-center text-white mb-4">
                <PawPrint size={24} />
              </div>
              <div className="relative z-10">
                <h3 className="text-2xl font-black mb-2">Styling and Groom</h3>
                <p className="text-white/80 font-medium text-sm mb-4">Breed-specific cuts by award-winning stylists.</p>
                <div className="inline-flex items-center gap-2 font-bold text-white border-b border-white pb-0.5 text-sm">View Lookbook <ArrowRight size={14}/></div>
              </div>
              <img src="https://images.unsplash.com/photo-1516734212186-a967f81ad0d7?q=80&w=400" className="absolute top-10 right-[-40px] w-60 h-full object-cover opacity-20 group-hover:opacity-40 transition-opacity mix-blend-overlay" alt="grooming" />
            </motion.div>
          </div>
        </div>
      </section>

      <section className="py-20 px-6 bg-[#2D3436] text-white overflow-hidden rounded-b-[3rem]">
        <div className="container mx-auto grid lg:grid-cols-2 gap-12 items-center">
          <motion.div style={{ y: y2 }}>
            <span className="text-[#D97853] font-bold tracking-widest uppercase text-xs mb-4 block">Powered by Google Gemini</span>
            <h2 className="text-4xl lg:text-5xl font-black mb-6 leading-none">
              It speaks <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#D97853] to-[#F5E6CA]">Dog and Cat.</span>
            </h2>
            <p className="text-gray-400 text-base mb-8 leading-relaxed max-w-md">
              Our AI analyzes your pet photos to detect skin conditions, suggests diet plans, and interprets body language.
            </p>
            <ul className="space-y-3 mb-8 text-sm">
              <li className="flex items-center gap-3"><CheckCircle size={18} className="text-[#5B8C51]" /> <span>Early Disease Detection</span></li>
              <li className="flex items-center gap-3"><CheckCircle size={18} className="text-[#5B8C51]" /> <span>Personalized Nutrition Plans</span></li>
              <li className="flex items-center gap-3"><CheckCircle size={18} className="text-[#5B8C51]" /> <span>Mood Monitoring System</span></li>
            </ul>
            <button className="bg-white text-[#2D3436] px-6 py-3 rounded-full font-bold text-sm hover:bg-[#D97853] hover:text-white transition-all">
              Try AI Scanner Now
            </button>
          </motion.div>
          
          <div className="relative h-[350px] lg:h-[400px]">
             <div className="absolute inset-0 bg-gradient-to-tr from-[#D97853] to-[#5B8C51] rounded-full blur-[80px] opacity-20"/>
             <img src="https://images.unsplash.com/photo-1628009368231-7bb7cfcb0def?w=800" className="relative z-10 rounded-3xl border border-white/10 shadow-2xl rotate-3 hover:rotate-0 transition-all duration-700 object-cover w-full h-full" alt="AI Scan" />
          </div>
        </div>
      </section>

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
                  <span className="text-[#2D3436]/60">123 Pet Wellness Ave, Suite 100<br/>Saigon, Vietnam</span>
                </li>
                <li className="flex items-center gap-3">
                  <Phone size={18} className="text-[#D97853] flex-shrink-0"/>
                  <span className="text-[#2D3436]/60">+84 (28) 1234 5678</span>
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
            <p className="text-xs text-[#2D3436]/40">2024 HappyTails. All rights reserved.</p>
            <div className="flex gap-6 text-xs">
              <a href="#" className="text-[#2D3436]/40 hover:text-[#D97853]">Privacy Policy</a>
              <a href="#" className="text-[#2D3436]/40 hover:text-[#D97853]">Terms of Service</a>
              <a href="#" className="text-[#2D3436]/40 hover:text-[#D97853]">Cookie Settings</a>
            </div>
          </div>
        </div>
      </footer>

    </div>
  );
};

const PhilosophyItem = ({ title, desc }) => (
  <div className="border-l-2 border-[#D97853] pl-4">
    <h4 className="text-lg font-bold text-[#2D3436] mb-1">{title}</h4>
    <p className="text-[#2D3436]/70 leading-relaxed text-sm">{desc}</p>
  </div>
);

export default Home;
