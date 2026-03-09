import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Calendar, Clock, ArrowRight, User, PawPrint, Heart, ChevronRight, MapPin, Phone, Mail, Facebook, Instagram, Flame, Stethoscope, Scissors, PartyPopper, Utensils, Target, Compass, Rabbit, Sparkles, Newspaper } from 'lucide-react';
import Navbar from '../components/layout/Navbar';
import AuthModal from '../components/AuthModal';
import { Link, useNavigate } from 'react-router-dom';

// Placeholder Images
const imgs = {
  hero: "https://images.unsplash.com/photo-1548199973-03cce0bbc87b?auto=format&fit=crop&q=80&w=1200",
  trending1: "https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&q=80&w=600",
  trending2: "https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?auto=format&fit=crop&q=80&w=600",
  trending3: "https://images.unsplash.com/photo-1583337130417-3346a1be7dee?auto=format&fit=crop&q=80&w=600",
  trending4: "https://images.unsplash.com/photo-1576201836106-db1758fd1c97?auto=format&fit=crop&q=80&w=600",
  health1: "https://images.unsplash.com/photo-1505628346881-b72b27e84530?auto=format&fit=crop&q=80&w=800",
  health2: "https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?auto=format&fit=crop&q=80&w=800", // Fixed cat image
  health3: "https://images.unsplash.com/photo-1517849845537-4d257902454a?auto=format&fit=crop&q=80&w=800",
  health4: "https://images.unsplash.com/photo-1537151608828-ea2b11777ee8?auto=format&fit=crop&q=80&w=800",
  health5: "https://images.unsplash.com/photo-1518717758536-85ae29035b6d?auto=format&fit=crop&q=80&w=800",
  health6: "https://images.unsplash.com/photo-1497910091122-9f8a7746eb33?auto=format&fit=crop&q=80&w=800",
  groom1: "https://images.unsplash.com/photo-1516734212186-a967f81ad0d7?auto=format&fit=crop&q=80&w=800",
  groom2: "https://images.unsplash.com/photo-1596272875729-ed2ff7d6d9c5?auto=format&fit=crop&q=80&w=800",
  vet: "https://images.unsplash.com/photo-1601758124510-52d02ddb7cbd?auto=format&fit=crop&q=80&w=800",
  update1: "https://images.unsplash.com/photo-1544568100-847a948585b9?auto=format&fit=crop&q=80&w=600", // dog spa
  update2: "https://images.unsplash.com/photo-1537151608828-ea2b11777ee8?auto=format&fit=crop&q=80&w=600", // dog happy
  update3: "https://images.unsplash.com/photo-1516734212186-a967f81ad0d7?auto=format&fit=crop&q=80&w=600", // dog wash
  nutrition1: "https://images.unsplash.com/photo-1589923188900-85dae523342b?auto=format&fit=crop&q=80&w=600", 
  nutrition2: "https://images.unsplash.com/photo-1623387641168-d9803bbb3f35?auto=format&fit=crop&q=80&w=600",
  train1: "https://images.unsplash.com/photo-1552053831-71594a27632d?auto=format&fit=crop&q=80&w=600",
  train2: "https://images.unsplash.com/photo-1530281700549-e82e7bf110d6?auto=format&fit=crop&q=80&w=600",
  life1: "https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?auto=format&fit=crop&q=80&w=600",
  life2: "https://images.unsplash.com/photo-1541781774459-bb2af2f05b55?auto=format&fit=crop&q=80&w=600",
  other1: "https://images.unsplash.com/photo-1518796745738-41048802f99a?auto=format&fit=crop&q=80&w=600",
  other2: "https://images.unsplash.com/photo-1548767797-d8c844163c4c?auto=format&fit=crop&q=80&w=600", 
  other3: "https://eamc.vet/wp-content/uploads/2025/07/Edge-Worth-What-should-I-feed-my-pet-bird-instead.webp",
  other4: "https://images.unsplash.com/photo-1524704796725-9fc3044a58b2?auto=format&fit=crop&q=80&w=600",
};

const SectionHeader = ({ icon, title, color = "text-[#2D3436]", iconBg = "bg-[#FDF3EE]", iconColor = "text-[#D97853]", className = "mb-12" }) => (
  <h2 className={`text-2xl md:text-3xl font-black ${color} flex items-center gap-4 ${className}`}>
    <div className={`w-12 h-12 md:w-14 md:h-14 rounded-2xl ${iconBg} ${iconColor} flex items-center justify-center shrink-0 shadow-sm border border-black/5`}>
       {icon}
    </div>
    <span className="tracking-tight">{title}</span>
  </h2>
);

const News = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem('user');
    return stored ? JSON.parse(stored) : null;
  });
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState('login');

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const handleLoginSuccess = (userData) => {
    setUser(userData);
    setIsAuthModalOpen(false);
    // Role-based navigation
    if (userData.role === 'admin') {
      navigate('/admin');
    } else if (userData.role === 'staff') {
      navigate('/staff');
    }
    // Customer stays on News page
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
      <Navbar onLoginClick={openLoginModal} onRegisterClick={openRegisterModal} user={user} onLogout={() => setUser(null)} />
      <AuthModal 
        isOpen={isAuthModalOpen} 
        onClose={() => setIsAuthModalOpen(false)} 
        initialMode={authModalMode}
        onLoginSuccess={handleLoginSuccess}
      />

      <main className="pt-24 pb-12">
        
        {/* HERO NEWS SECTION - Yêu cầu 1: Làm to bài đầu tiên và bỏ card */}
        <section className="container mx-auto px-6 mb-12 max-w-7xl mt-4">
          <div className="flex flex-col md:flex-row items-center gap-8 lg:gap-14">
            {/* Left Content */}
            <div className="w-full md:w-1/2">
              <span className="inline-block bg-[#E8F3D6] text-[#5B8C51] text-[11px] font-bold px-3.5 py-1.5 rounded-full uppercase tracking-widest mb-4 shadow-sm">
                Pet Health
              </span>
              <h1 className="text-4xl md:text-5xl lg:text-[50px] font-black text-[#2D3436] mb-5 leading-[1.1] tracking-tight">
                The Ultimate Guide to Keeping Your Dog Healthy
              </h1>
              <p className="text-base md:text-[17px] text-[#2D3436]/70 mb-6 leading-relaxed max-w-xl">
                Discover the essential, veterinarian-approved tips and daily routines that will ensure your furry best friend lives a long, happy, and vibrant life.
              </p>
              
              <div className="flex flex-wrap items-center gap-4 mb-7 text-[14px] text-[#2D3436]/60 font-medium border-l-[3px] border-[#D97853] pl-3.5">
                <div className="flex items-center gap-1.5"><User size={16} className="text-[#D97853]" /><span>Dr. Emily Watson</span></div>
                <div className="flex items-center gap-1.5"><Calendar size={16} className="text-[#D97853]" /><span>Oct 24, 2024</span></div>
                <div className="flex items-center gap-1.5"><Clock size={16} className="text-[#D97853]" /><span>8 min read</span></div>
              </div>

              <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="bg-[#D97853] text-white px-7 py-3.5 rounded-full font-bold shadow-md hover:bg-[#c66846] transition-all flex items-center gap-2 text-[14px] w-max">
                Read Full Article <ArrowRight size={18} />
              </motion.button>
            </div>
            
            {/* Right Image */}
            <div className="w-full md:w-1/2 relative mt-4 md:mt-0">
              <div className="absolute inset-0 bg-[#D97853] blur-[70px] opacity-20 rounded-full w-[80%] h-[80%] left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2" />
              <img src={imgs.hero} alt="Happy Dog" className="relative z-10 w-full h-[280px] md:h-[340px] lg:h-[420px] object-cover rounded-[2rem] shadow-xl border-4 border-white/60" />
            </div>
          </div>
        </section>

        {/* LATEST NEWS (TechCrunch Style) Moved Below Hero */}
        <section className="container mx-auto px-6 mb-16 max-w-7xl">
          <div className="flex flex-col lg:flex-row gap-10 xl:gap-16">
             {/* Left Column: Latest News */}
             <div className="w-full lg:w-2/3">
                <div className="flex items-center justify-between border-b-[3px] border-[#0F172A]/10 pb-3 mb-6 pt-2">
                   <SectionHeader icon={<Newspaper size={24} fill="currentColor" />} title="Latest News" color="text-[#0F172A]" iconBg="bg-[#5B8C51]/20" iconColor="text-[#5B8C51]" className="mb-0" />
                   <button className="hidden md:flex items-center gap-2 text-xs font-bold text-[#0F172A] border border-[#0F172A]/20 px-3 py-1.5 rounded-full hover:bg-[#0F172A] hover:text-white transition-colors">
                     See More <ArrowRight size={14} className="-rotate-45" />
                   </button>
                </div>

                <div className="space-y-3">
                   {[
                     { img: imgs.update1, tag: 'COMMUNITY', title: 'HappyTails opens a new premium spa center in District 1', author: 'Marina Temkin', time: '5 hours ago' },
                     { img: imgs.update2, tag: 'INNOVATION', title: 'New AI Pet Health Scanner predicts early signs of arthritis in senior dogs', author: 'Sarah Perez', time: '8 hours ago' },
                     { img: imgs.health3, tag: 'IN BRIEF', isGreen: true, title: 'HappyTails partners with local shelters for free vaccination month', author: 'Amanda Silberling', time: '8 hours ago' },
                     { img: imgs.life2, tag: 'TRAVEL', title: 'Why more pet owners are choosing luxury pet hotels over traditional boarding', author: 'Sean O\'Kane', time: '10 hours ago' },
                     { img: imgs.nutrition1, tag: 'NUTRITION', title: 'Top veterinarians warn against raw diets for immune-compromised pets', author: 'Julie Bort', time: '11 hours ago' }
                   ].map((news, idx) => (
                     <div key={idx} className="flex flex-col sm:flex-row gap-3.5 group cursor-pointer border-b border-[#2D3436]/5 pb-3 last:border-0 hover:bg-black/[0.02] p-1.5 -mx-1.5 rounded-lg transition-all">
                        <div className="w-full sm:w-[120px] h-[85px] shrink-0 overflow-hidden relative border border-gray-100 bg-[#f4f4f4] rounded-md">
                           <img src={news.img} className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-90 group-hover:opacity-100" alt={news.title} />
                        </div>
                        <div className="flex flex-col justify-center py-0.5">
                           <div className="flex items-center gap-1.5 mb-1">
                             {news.isGreen && <div className="bg-[#5B8C51] text-white p-[1px] rounded-sm"><Heart size={8} fill="white" /></div>}
                             <span className={`text-[9px] font-black uppercase tracking-widest ${news.isGreen || news.tag === 'INNOVATION' ? 'text-[#5B8C51]' : 'text-[#D97853]'}`}>
                               {news.tag}
                             </span>
                           </div>
                           <h3 className="text-[13.5px] font-bold text-[#0F172A] leading-snug mb-1 group-hover:text-[#D97853] transition-colors">{news.title}</h3>
                           <div className="text-[11px] text-[#2D3436]/40 font-medium mt-auto">
                             {news.author} <span className="mx-1">•</span> {news.time}
                           </div>
                        </div>
                     </div>
                   ))}
                </div>
             </div>

             {/* Right Column: Most Popular */}
             <div className="w-full lg:w-1/3">
                <div className="bg-white border border-gray-200 p-4 mb-5 relative hidden lg:block hover:shadow-sm transition-shadow rounded-lg">
                   <div className="text-[9px] font-black uppercase text-[#0F172A]/40 tracking-widest mb-2">SPONSORED</div>
                   <h4 className="font-bold text-[#0F172A] text-[15px] leading-tight mb-2">Premium Wellness Package 2026</h4>
                   <p className="text-[12px] text-[#2D3436]/60 mb-4">Register by March 13 to save up to $300 on our all-inclusive annual pet healthcare plan.</p>
                   <button className="bg-[#5B8C51] text-white font-bold text-[10px] uppercase px-3 py-1.5 rounded hover:bg-[#4a7242] transition-colors flex items-center gap-1.5 w-max">
                     REGISTER NOW <ChevronRight size={12} />
                   </button>
                </div>

                <div className="bg-[#0F172A] text-white p-5 relative overflow-hidden shadow-xl rounded-xl border border-white/5">
                   {/* Decorative background element */}
                   <div className="absolute top-0 right-0 w-20 h-20 bg-[#D97853] opacity-20 blur-2xl rounded-full translate-x-1/2 -translate-y-1/2 max-w-none"></div>
                   
                   <div className="flex justify-between items-start mb-5 relative z-10">
                     <h3 className="text-xl font-black leading-none tracking-tight">Most<br/>Popular</h3>
                     <div className="w-8 h-8 bg-[#E8F3D6] rounded-sm flex items-center justify-center -rotate-6">
                        <ArrowRight size={14} className="text-[#0F172A] -rotate-45" />
                     </div>
                   </div>

                   <ul className="space-y-3 relative z-10 font-medium">
                     {[
                       'Study shows daily walks extend dog lifespan by up to 2 years',
                       'Why does your cat stare at the blank wall? Experts explain',
                       'The best grain-free kibble brands of 2025 reviewed',
                       'Anxious puppy? Try these 3 massage techniques',
                       'Are automatic feeders making pets lazy? New debate arises'
                     ].map((item, idx) => (
                       <li key={idx} className="flex gap-2.5 group cursor-pointer border-b border-white/10 pb-3 last:border-0 last:pb-0">
                         <div className="w-1.5 h-1.5 rounded-sm bg-[#D97853] mt-1.5 shrink-0 group-hover:scale-150 transition-transform" />
                         <span className="text-[12px] leading-snug group-hover:text-[#D97853] transition-colors text-white/90">{item}</span>
                       </li>
                     ))}
                   </ul>
                </div>
             </div>
          </div>
        </section>

        {/* PET HEALTH & WELLNESS SECTION (Moved up, Black theme) */}
        <section className="bg-[#111111] py-8 mb-8">
          <div className="container mx-auto px-6 max-w-7xl">
            <SectionHeader 
               icon={<Heart size={16} fill="currentColor" />} 
               title="Pet Health & Wellness" 
               color="text-white" 
               iconBg="bg-[#5B8C51]/20" 
               iconColor="text-[#5B8C51]" 
               className="mb-4"
            />
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
               {[
                 { img: imgs.health1, tag: 'Health', title: '5 Signs Your Dog Might Be Sick', desc: 'Learn to recognize the subtle symptoms that indicate your dog needs veterinary attention immediately.', date: 'Oct 20', read: '5 min' },
                 { img: imgs.health2, tag: 'Wellness', title: 'Common Cat Skin Problems', desc: 'From fleas to allergies, discover the most frequent feline skin issues and how to effectively treat them.', date: 'Oct 18', read: '6 min' },
                 { img: imgs.health3, tag: 'Prevention', title: 'Why Regular Vet Checkups Matter', desc: 'Preventive care is key to a long life. Here is why annual wellness exams are crucial for your pet.', date: 'Oct 15', read: '4 min' },
                 { img: imgs.health4, tag: 'Care', title: 'Winter Pet Care Guide', desc: 'Keep your pets warm and safe during the cold winter months with these essential tips.', date: 'Oct 10', read: '5 min' },
                 { img: imgs.health5, tag: 'Tips', title: 'How to Clean Your Dog’s Ears', desc: 'A step-by-step guide to naturally cleaning pet ears to prevent infections and discomfort.', date: 'Oct 08', read: '3 min' },
                 { img: imgs.health6, tag: 'Health', title: 'Recognizing Feline Stress', desc: 'Stress in cats can lead to physical illness. Learn the signs to look out for in your kitty.', date: 'Oct 05', read: '6 min' },
               ].map((art, i) => (
                  <div key={i} className="bg-[#1A1A1A] rounded-[0.8rem] p-1.5 border border-white/5 hover:border-[#5B8C51]/50 transition-all duration-500 group cursor-pointer hover:-translate-y-1 relative shadow-xl flex flex-col h-full">
                     <div className="relative h-[100px] rounded-[0.6rem] overflow-hidden mb-2 w-full shrink-0">
                        <img src={art.img} className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 opacity-90 group-hover:opacity-100" alt={art.title} />
                        <div className="absolute top-2 left-2 bg-black/70 backdrop-blur-md text-[#5B8C51] text-[7px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-widest border border-white/10">{art.tag}</div>
                     </div>
                     <div className="px-1.5 pb-1 flex flex-col grow">
                         <h3 className="font-extrabold text-white text-[13px] mb-1 leading-tight group-hover:text-[#5B8C51] transition-colors line-clamp-2">{art.title}</h3>
                         <p className="text-[10px] text-white/50 line-clamp-2 leading-tight mb-2">{art.desc}</p>
                         <div className="mt-auto flex items-center gap-1.5 text-[8px] font-bold text-white/30 uppercase tracking-wider">
                            <span>{art.date}</span>
                            <span className="w-1 h-1 rounded-full bg-white/20" />
                            <span>{art.read}</span>
                         </div>
                     </div>
                  </div>
               ))}
            </div>
          </div>
        </section>

        {/* TRENDING PET ARTICLES */}
        <section className="mb-24">
          <div className="container mx-auto px-6 mb-8 flex justify-between items-end max-w-7xl">
             <SectionHeader icon={<Flame size={26} fill="currentColor" />} title="Trending Pet Articles" iconBg="bg-[#5B8C51]/20" iconColor="text-[#5B8C51]" className="mb-0" />
             <div className="flex gap-2">
               <button className="w-10 h-10 rounded-full bg-white shadow-sm border border-gray-100 flex items-center justify-center hover:bg-[#D97853] hover:text-white transition-colors"><ArrowRight size={18} className="rotate-180" /></button>
               <button className="w-10 h-10 rounded-full bg-white shadow-sm border border-gray-100 flex items-center justify-center hover:bg-[#D97853] hover:text-white transition-colors"><ArrowRight size={18} /></button>
             </div>
          </div>
          
          {/* Scroll container */}
          <div className="w-full overflow-x-auto pb-4 px-6 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            <div className="flex gap-6 w-max mx-auto md:mx-0 pr-6">
              {[
                { img: imgs.trending1, title: 'Top 10 Dog Breeds for Families', tag: 'Pet Guide' },
                { img: imgs.trending2, title: 'Why Cats Knead Blankets', tag: 'Behavior' },
                { img: imgs.trending3, title: 'Understanding Your Dog’s Body Language', tag: 'Training' },
                { img: imgs.trending4, title: 'Best Toys for Active Dogs', tag: 'Lifestyle' },
                { img: imgs.train1, title: 'How to Train Your Puppy at Home Successfully', tag: 'Puppy' },
                { img: imgs.health4, title: 'Winter Pet Care Guide: Keep Them Safe', tag: 'Care' },
                { img: imgs.life2, title: 'Traveling Safely With Your Pet During Holidays', tag: 'Travel' },
                { img: imgs.groom2, title: 'How Often Should You Groom Your Dog?', tag: 'Grooming' }
              ].map((article, idx) => (
                <div key={idx} className="w-[280px] h-[340px] rounded-[2rem] overflow-hidden relative group cursor-pointer shadow-sm hover:shadow-xl transition-all border border-gray-100 bg-white">
                  <div className="absolute inset-0 w-full h-full">
                    <img src={article.img} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" alt={article.title} />
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                  <div className="absolute bottom-0 left-0 p-6 z-10">
                     <span className="bg-[#D97853] text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-widest mb-3 inline-block shadow-sm">
                       {article.tag}
                     </span>
                     <h3 className="text-white font-bold text-lg leading-tight group-hover:text-[#FDF3EE] transition-colors">{article.title}</h3>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>



        {/* VETERINARY INSIGHTS SECTION */}
        <section className="bg-[#E8F3D6] py-16">
          <div className="container mx-auto px-6 max-w-7xl">
            <SectionHeader 
              icon={<Stethoscope size={24} fill="currentColor" />} 
              title="Veterinary Insights" 
              iconBg="bg-[#5B8C51]/20"
              iconColor="text-[#5B8C51]"
              className="mb-8"
            />
            <div className="flex flex-col lg:flex-row gap-8 items-stretch">
               <div className="w-full lg:w-1/2">
                 <div className="bg-white rounded-[1.5rem] overflow-hidden shadow-sm group cursor-pointer hover:-translate-y-1 transition-transform duration-500 h-full flex flex-col">
                   <div className="h-[200px] overflow-hidden relative w-full shrink-0">
                      <img src={imgs.vet} className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" alt="Veterinary Insight" />
                      <div className="absolute top-3 left-3 bg-white/95 backdrop-blur-sm text-[#5B8C51] text-[9px] font-bold px-3 py-1.5 rounded-full uppercase tracking-widest shadow-sm">Featured Insight</div>
                   </div>
                   <div className="p-6 flex flex-col grow justify-between">
                     <div>
                       <h3 className="text-xl font-black text-[#2D3436] mb-2 group-hover:text-[#5B8C51] transition-colors leading-tight">Essential Health Tips for Every Pet Parent</h3>
                       <p className="text-[#2D3436]/70 text-[14px] leading-relaxed mb-4 line-clamp-3">Expert advice from our chief veterinarian on maintaining optimal health throughout every stage of your pet's life, preventing diseases, and recognizing subtle signs of discomfort.</p>
                     </div>
                     <div className="flex items-center text-[#5B8C51] font-bold text-xs gap-1.5 uppercase tracking-wide mt-auto">
                        Read Guide <ArrowRight size={14} />
                     </div>
                   </div>
                 </div>
               </div>
               <div className="w-full lg:w-1/2 flex flex-col justify-between">
                 <div className="space-y-3">
                    {[
                      'Common Dog Skin Problems',
                      'How to Prevent Parasites',
                      'Vaccination Guide for Pets',
                      'Dental Care for Dogs',
                      'How to Detect Early Signs of Illness'
                    ].map((tip, idx) => (
                      <div key={idx} className="flex items-center gap-4 group cursor-pointer bg-white/60 p-3.5 rounded-2xl hover:bg-white hover:shadow-sm transition-all border border-[#5B8C51]/5">
                        <div className="w-10 h-10 rounded-xl bg-[#5B8C51] text-white flex items-center justify-center font-black text-lg shrink-0 group-hover:rotate-6 transition-transform shadow-sm">
                          {idx + 1}
                        </div>
                        <h4 className="text-[15px] font-bold text-[#2D3436] group-hover:text-[#5B8C51] transition-colors">{tip}</h4>
                        <ChevronRight className="ml-auto w-4 h-4 text-[#2D3436]/30 group-hover:text-[#5B8C51]" />
                      </div>
                    ))}
                 </div>
               </div>
            </div>
          </div>
        </section>

        {/* HAPPYTAILS UPDATES SECTION */}
        <section className="bg-[#FFF5ED] py-20 z-10 border-t border-gray-100/50">
          <div className="container mx-auto px-6 max-w-7xl">
               <div className="flex items-center gap-4 mb-8">
                 <div className="w-11 h-11 md:w-12 md:h-12 rounded-2xl bg-[#FF8A5B] flex items-center justify-center text-white shadow-[0_4px_12px_rgba(255,138,91,0.3)]">
                   <Sparkles size={22} fill="currentColor" />
                 </div>
                 <h2 className="text-2xl md:text-3xl font-black tracking-tight text-[#2D3436]">HappyTails Updates</h2>
                 <div className="bg-[#FFE5D6] text-[#FF8A5B] text-[12px] font-medium px-3.5 py-1.5 rounded-full flex items-center gap-1.5 ml-2">
                   🎉 Special Offers
                 </div>
               </div>

               <div className="grid md:grid-cols-3 gap-6">
                  {[
                    { title: 'Bring 5 Pets – Get 20% Spa Discount', desc: 'Special offer for multi-pet families! Book grooming for 5 or more pets and save.', tag: 'Limited Time', img: imgs.update1 },
                    { title: 'Free Health Check Week', desc: 'Complimentary health checkups for all pets. Book your appointment today!', tag: 'This Week', img: imgs.update2 },
                    { title: 'Weekend Grooming Special', desc: 'Save 15% on all grooming services this Saturday and Sunday.', tag: 'Weekend Deal', img: imgs.update3 }
                  ].map((promo, idx) => (
                    <div key={idx} className="bg-white rounded-[1.5rem] shadow-sm hover:shadow-2xl transition-all duration-500 border border-gray-100 group cursor-pointer flex flex-col h-full transform hover:-translate-y-1 overflow-hidden relative">
                      <div className="relative h-[220px] w-full shrink-0">
                         <img src={promo.img} className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" alt={promo.title} />
                         <div className="absolute top-4 right-4 bg-[#FF8A5B] text-white text-[11px] font-bold px-3 py-1.5 rounded-full flex items-center gap-1.5 shadow-md">
                           <Sparkles size={12} fill="currentColor" />
                           {promo.tag}
                         </div>
                      </div>
                      <div className="p-6 flex flex-col grow relative bg-white">
                         <h3 className="font-bold text-[#2D3436] text-[17px] mb-3 leading-snug group-hover:text-[#FF8A5B] transition-colors">{promo.title}</h3>
                         <p className="text-[14px] text-[#2D3436]/60 leading-relaxed mb-8 relative z-10">{promo.desc}</p>
                         
                         <div className="mt-auto relative z-10 flex items-center gap-1.5 text-[#FF8A5B] font-bold text-[13px] hover:text-[#D97853] transition-colors">
                            Learn More <ArrowRight className="group-hover:translate-x-1 transition-transform" size={16}/>
                         </div>
                         
                         {/* Faint Paw Background inside card */}
                         <PawPrint size={140} className="absolute -bottom-8 -right-8 text-[#2D3436]/[0.03] pointer-events-none -rotate-12 group-hover:scale-110 transition-transform duration-500" />
                      </div>
                    </div>
                  ))}
               </div>
          </div>
        </section>

        {/* MORE PET CARE SECTION */}
        <section className="bg-[#F5F9F5] py-20">
          <div className="container mx-auto px-6 max-w-7xl">
            <SectionHeader icon={<PawPrint size={26} fill="currentColor" />} title="More Pet Care" color="text-[#5B8C51]" iconBg="bg-[#5B8C51]/20" iconColor="text-[#5B8C51]" className="mb-10" />

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { img: imgs.other1, title: 'Caring for Rabbits: Beginner Guide', desc: 'Everything you need to know about rabbit care, housing, and diet.', date: 'Feb 22, 2026', read: '6 min read' },
                { img: imgs.other2, title: 'How to Build a Safe Habitat for Hamsters', desc: 'Create the perfect living space for your hamster with these tips.', date: 'Feb 21, 2026', read: '5 min read' },
                { img: imgs.other3, title: 'Best Diet for Pet Birds', desc: 'Nutritional guidelines for keeping your feathered friend healthy.', date: 'Feb 20, 2026', read: '4 min read' },
                { img: imgs.other4, title: 'Tips for Keeping Aquarium Fish Healthy', desc: 'Maintain a thriving aquarium with proper water quality and fish care.', date: 'Feb 19, 2026', read: '6 min read' },
              ].map((art, i) => (
                <div key={i} className="bg-white rounded-3xl shadow-sm border border-gray-100 hover:shadow-xl transition-all duration-500 group cursor-pointer flex flex-col hover:-translate-y-1">
                  <div className="relative h-[200px] w-full rounded-t-3xl overflow-hidden shrink-0">
                    <img src={art.img} className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" alt={art.title} />
                    <div className="absolute top-4 left-4 bg-[#F2F7F2] border border-[#5B8C51]/20 text-[#5B8C51] text-[11px] font-bold px-4 py-1.5 rounded-full shadow-sm">
                      Exotic Pets
                    </div>
                  </div>
                  <div className="p-6 flex flex-col grow justify-between">
                    <div>
                      <h3 className="font-bold text-[#5B8C51] text-lg mb-3 leading-tight group-hover:text-[#D97853] transition-colors line-clamp-2">
                        {art.title}
                      </h3>
                      <p className="text-[14px] text-[#2D3436]/60 leading-relaxed mb-6 line-clamp-2">
                        {art.desc}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 text-[12px] font-medium text-[#2D3436]/40 mt-auto">
                      <div className="flex items-center gap-1.5">
                        <Calendar size={14} />
                        <span>{art.date}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Clock size={14} />
                        <span>{art.read}</span>
                      </div>
                      <ArrowRight size={16} className="ml-auto text-[#5B8C51] opacity-0 group-hover:opacity-100 transition-all -translate-x-2 group-hover:translate-x-0 duration-300" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

      </main>

      {/* FOOTER - COPIED EXACTLY FROM HOME.JSX Yêu cầu 1 */}
      <footer className="bg-[#FDFBF7] pt-24 pb-12 px-6 relative overflow-hidden font-sans border-t border-gray-200">
        <div className="absolute bottom-0 right-0 opacity-[0.03] pointer-events-none">
            <PawPrint size={400} />
        </div>

        <div className="container mx-auto relative z-10">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-12 mb-16">
            
            <div className="md:col-span-4">
              <div className="flex items-center gap-3 mb-6 group cursor-pointer">
                <div className="bg-[#2D3436] p-3 rounded-2xl group-hover:bg-[#D97853] transition-colors"><PawPrint size={28} className="text-white" /></div>
                <span className="text-2xl font-black tracking-tighter text-[#2D3436]">HAPPY<span className="text-[#D97853]">TAILS</span></span>
              </div>
              <p className="text-[#2D3436]/60 leading-relaxed mb-6 text-sm">
                Your pet wellness sanctuary. Where luxury meets technology for the ultimate pet care experience.
              </p>
              <div className="flex gap-3">
                 {['facebook', 'instagram', 'twitter'].map(s => (
                   <a key={s} href="#" className="w-10 h-10 rounded-full bg-[#2D3436]/5 flex items-center justify-center hover:bg-[#D97853] hover:text-white transition-all text-[#2D3436]/60 shadow-sm border border-gray-100/50">
                      <span className="text-xs font-bold uppercase">{s[0]}</span>
                   </a>
                 ))}
              </div>
            </div>

            <div className="md:col-span-2">
              <h4 className="text-sm font-black uppercase tracking-wider text-[#2D3436] mb-5">Services</h4>
              <ul className="space-y-3 text-sm">
                <li><Link to="/service" className="text-[#2D3436]/60 hover:text-[#D97853] transition-colors">Organic Spa</Link></li>
                <li><Link to="/service" className="text-[#2D3436]/60 hover:text-[#D97853] transition-colors">AI Health Scan</Link></li>
                <li><Link to="/service" className="text-[#2D3436]/60 hover:text-[#D97853] transition-colors">Luxury Boarding</Link></li>
                <li><Link to="/service" className="text-[#2D3436]/60 hover:text-[#D97853] transition-colors">Styling and Groom</Link></li>
              </ul>
            </div>

            <div className="md:col-span-2">
               <h4 className="text-sm font-black uppercase tracking-wider text-[#2D3436] mb-5">Company</h4>
              <ul className="space-y-3 text-sm">
                <li><a href="#" className="text-[#2D3436]/60 hover:text-[#D97853] transition-colors">About Us</a></li>
                <li><a href="#" className="text-[#2D3436]/60 hover:text-[#D97853] transition-colors">Our Team</a></li>
                <li><Link to="/news" className="text-[#D97853] hover:text-[#D97853] font-medium transition-colors">Blog and News</Link></li>
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

// Reusable Article Card Component - Beautiful Design
const ArticleCard = ({ img, tag, title, desc, date, read, badgeColor, isWide = false }) => {
  if (isWide) {
    return (
      <div className="bg-white rounded-[2rem] p-3 flex flex-col sm:flex-row gap-6 items-center shadow-lg border border-gray-100 hover:shadow-2xl hover:-translate-y-2 transition-all duration-500 group cursor-pointer w-full h-full">
         <div className="relative w-full sm:w-[240px] h-[240px] shrink-0 rounded-[1.5rem] overflow-hidden">
            <img src={img} className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" alt={title} />
         </div>
         <div className="flex-1 py-4 pr-6 flex flex-col justify-center h-full">
            <span className={`${badgeColor} text-[11px] font-black px-4 py-1.5 rounded-full uppercase tracking-widest shadow-sm inline-block mb-4 w-max`}>{tag}</span>
            <h3 className="font-black text-[#2D3436] text-2xl mb-3 leading-tight group-hover:text-[#D97853] transition-colors">{title}</h3>
            <p className="text-[15px] text-[#2D3436]/60 leading-relaxed mb-6 line-clamp-3">{desc}</p>
            <div className="flex items-center gap-3 text-[12px] font-bold text-[#2D3436]/40 uppercase tracking-wider mt-auto">
               <span>{date}</span>
               <span className="w-1.5 h-1.5 rounded-full bg-[#D97853]/50" />
               <span>{read}</span>
            </div>
         </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-[2rem] shadow-md border border-gray-100 hover:shadow-2xl transition-all duration-500 group cursor-pointer flex flex-col overflow-hidden relative top-0 hover:-translate-y-2 p-2 h-full">
       <div className={`relative overflow-hidden shrink-0 rounded-[1.5rem] w-full h-[240px]`}>
          <img src={img} className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" alt={title} />
          <div className="absolute top-4 left-4">
            <span className={`${badgeColor} text-[10px] font-black px-4 py-1.5 rounded-full uppercase tracking-widest shadow-md backdrop-blur-md bg-white/95`}>{tag}</span>
          </div>
       </div>
       <div className="p-5 md:p-6 flex flex-col justify-between grow">
          <div>
            <h3 className="font-black text-[#2D3436] mb-3 leading-tight group-hover:text-[#D97853] transition-colors text-xl">
              {title}
            </h3>
            <p className="text-[14px] text-[#2D3436]/60 line-clamp-3 leading-relaxed mb-6">
              {desc}
            </p>
          </div>
          <div className="flex items-center gap-3 text-[11px] font-bold text-[#2D3436]/40 uppercase tracking-wider">
             <span>{date}</span>
             <span className="w-1.5 h-1.5 rounded-full bg-[#D97853]/50" />
             <span>{read}</span>
          </div>
       </div>
    </div>
  );
};

// Smaller List Style Card - Beautiful Design
const ListCard = ({ img, tag, title, date, read, badgeColor }) => (
  <div className="bg-white rounded-[2rem] p-3 flex flex-col sm:flex-row gap-5 items-center shadow-md border border-gray-100 hover:shadow-xl hover:-translate-y-1 transition-all duration-500 group cursor-pointer">
    <div className="w-full sm:w-[150px] h-[150px] rounded-[1.5rem] overflow-hidden shrink-0 relative">
      <img src={img} className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" alt={title} />
    </div>
    <div className="py-2 pr-4 flex flex-col justify-center flex-grow">
      <span className={`${badgeColor} text-[10px] font-black px-3 py-1.5 rounded-full uppercase tracking-widest w-max mb-3 shadow-sm`}>{tag}</span>
      <h4 className="font-bold text-[#2D3436] text-[17px] md:text-lg leading-tight group-hover:text-[#D97853] transition-colors mb-3">{title}</h4>
      <div className="flex items-center gap-2.5 text-[11px] font-bold text-[#2D3436]/40 uppercase tracking-wider">
          <span>{date}</span>
          <span className="w-1.5 h-1.5 rounded-full bg-[#D97853]/50" />
          <span>{read}</span>
      </div>
    </div>
  </div>
);

export default News;
