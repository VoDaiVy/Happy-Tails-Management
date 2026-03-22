import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  CalendarCheck,
  CheckCircle2,
  ChevronDown,
  CreditCard,
  Mail,
  MessageCircle,
  PhoneCall,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  Home,
  UserCheck,
  XCircle,
} from "lucide-react";
import Navbar from "../components/layout/Navbar";
import Footer from "../components/layout/Footer";
import AuthModal from "../components/AuthModal";

const HERO_IMAGES = {
  main: "https://images.unsplash.com/photo-1548199973-03cce0bbc87b?auto=format&fit=crop&w=1200&q=80",
  side: "https://images.unsplash.com/photo-1517849845537-4d257902454a?auto=format&fit=crop&w=800&q=80",
};

const POLICY_OVERVIEW = [
  {
    id: "booking",
    title: "Booking Rules",
    icon: CalendarCheck,
    desc: "Choose available slots and confirm.",
  },
  {
    id: "cancellation",
    title: "Cancellation",
    icon: XCircle,
    desc: "Cancel before your appointment.",
  },
  {
    id: "health",
    title: "Pet Health",
    icon: ShieldCheck,
    desc: "Pets must be healthy and fully vaccinated.",
  },
  {
    id: "payment",
    title: "Payment",
    icon: CreditCard,
    desc: "Payments collected after service.",
  },
];

const POLICY_ACCORDION = [
  {
    id: "booking-policy",
    title: "Booking Policy",
    icon: CalendarCheck,
    items: [
      "Select an available time slot before confirming.",
      "Availability depends on staff and room capacity.",
      "Each pet needs a separate booking.",
    ],
  },
  {
    id: "cancellation-policy",
    title: "Cancellation Policy",
    icon: XCircle,
    items: [
      "Cancel or reschedule at least 2 hours ahead.",
      "Late cancellations may limit future bookings.",
      "No-shows could require a deposit next time.",
    ],
  },
  {
    id: "grooming-policy",
    title: "Grooming Safety",
    icon: Stethoscope,
    items: [
      "We use pet-safe, hypoallergenic products.",
      "Tools are sanitized between every pet.",
      "We pause if a pet shows stress or discomfort.",
    ],
  },
  {
    id: "boarding-policy",
    title: "Boarding Policy",
    icon: Home,
    items: [
      "Reservations are required for overnight stays.",
      "Bring essentials and an emergency contact.",
      "Check-in and pick-up windows are scheduled.",
    ],
  },
  {
    id: "payment-policy",
    title: "Payment Policy",
    icon: CreditCard,
    items: [
      "Payments are collected after service unless noted.",
      "We accept cash, card, and approved online options.",
      "Refunds follow the cancellation policy.",
    ],
  },
];

const QUICK_NOTICES = [
  {
    id: "health-req",
    title: "Pet Health Requirements",
    icon: ShieldCheck,
    items: [
      "Must be free from contagious illnesses.",
      "Vaccinations required for boarding & daycare.",
      "Share allergies and medications.",
    ],
  },
  {
    id: "quick-reminder",
    title: "Quick Reminder",
    icon: Sparkles,
    desc: "Arriving on time and keeping your pet's information updated helps us deliver smoother, safer care.",
  },
];

const SAFETY_PROMISES = [
  {
    id: "products",
    title: "Safe grooming products",
    icon: Sparkles,
    description: "pH-balanced formulas and gentle scents.",
  },
  {
    id: "clean",
    title: "Clean spa environment",
    icon: ShieldCheck,
    description: "Sanitized tools and fresh towels every visit.",
  },
  {
    id: "staff",
    title: "Professional staff care",
    icon: UserCheck,
    description: "Calm handling from certified groomers.",
  },
];

const FAQ_ITEMS = [
  {
    id: "cancel",
    question: "Can I cancel my booking?",
    answer: "Yes. Please cancel or reschedule at least 2 hours ahead.",
  },
  {
    id: "vaccination",
    question: "Do pets need vaccination before service?",
    answer: "Vaccinations are required for boarding and daycare services.",
  },
  {
    id: "payment",
    question: "How do I pay for services?",
    answer: "We accept cash, card, and approved online payment methods.",
  },
  {
    id: "nervous",
    question: "What if my pet is nervous during grooming?",
    answer: "We slow down, use calming techniques, and keep you informed.",
  },
];

const AccordionItem = ({
  id,
  title,
  icon: Icon,
  items,
  answer,
  isOpen,
  onToggle,
  className = "",
  iconClassName = "text-[color:var(--navy)]",
  iconBgClassName = "bg-[var(--surface)]",
  compact = false,
}) => {
  const iconBoxClass = compact ? "h-8 w-8 rounded-lg" : "h-9 w-9 rounded-xl";
  const iconSize = compact ? 14 : 16;

  return (
    <div id={id} className={`group ${className}`}>
      <button
        type="button"
        onClick={() => onToggle(id)}
        aria-expanded={isOpen}
        aria-controls={`${id}-panel`}
        className={`flex w-full items-center justify-between gap-4 text-left transition-colors hover:bg-[rgba(244,246,248,0.7)] ${
          compact ? "px-0 py-3" : "px-4 py-4"
        }`}
      >
        <span className="flex items-center gap-3">
          <span
            className={`flex items-center justify-center ${iconBoxClass} ${iconBgClassName} ${iconClassName}`}
          >
            {React.createElement(Icon, { size: iconSize })}
          </span>
          <span
            className={`font-semibold text-[color:var(--navy)] ${
              compact ? "text-sm" : "text-base"
            }`}
          >
            {title}
          </span>
        </span>
        <ChevronDown
          size={18}
          className={`text-[color:var(--text)] opacity-70 transition-transform ${
            isOpen ? "rotate-180" : "rotate-0"
          }`}
        />
      </button>
      <div
        id={`${id}-panel`}
        className={`grid transition-all duration-300 ${
          isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        }`}
      >
        <div className={`overflow-hidden ${compact ? "pb-3" : "px-4 pb-4"}`}>
          {items ? (
            <ul className="space-y-2 text-sm text-[color:rgba(59,70,84,0.75)]">
              {items.map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <CheckCircle2
                    size={15}
                    className="mt-0.5 text-[color:var(--orange)]"
                  />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-[color:rgba(59,70,84,0.75)]">{answer}</p>
          )}
        </div>
      </div>
    </div>
  );
};

const Policy = () => {
  const navigate = useNavigate();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState("login");
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem("user");
    return stored ? JSON.parse(stored) : null;
  });
  const [openPolicyId, setOpenPolicyId] = useState(POLICY_ACCORDION[0].id);
  const [openFaqId, setOpenFaqId] = useState(FAQ_ITEMS[0].id);

  const togglePolicy = (id) => {
    setOpenPolicyId((current) => (current === id ? "" : id));
  };

  const toggleFaq = (id) => {
    setOpenFaqId((current) => (current === id ? "" : id));
  };

  const openLoginModal = () => {
    setAuthModalMode("login");
    setIsAuthModalOpen(true);
  };

  const openRegisterModal = () => {
    setAuthModalMode("register");
    setIsAuthModalOpen(true);
  };

  const handleLoginSuccess = (userData) => {
    setUser(userData);
    setIsAuthModalOpen(false);

    if (userData?.role === "admin") {
      navigate("/admin");
      return;
    }
    if (userData?.role === "staff") {
      navigate("/staff");
    }
  };

  const handleSupportClick = (event) => {
    event.preventDefault();
    const target = document.getElementById("support");
    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <div
      className="min-h-screen font-sans bg-white text-[color:var(--navy)] selection:bg-[var(--orange)] selection:text-white"
      style={{
        "--navy": "#1E2A3A",
        "--orange": "#FF8A4C",
        "--green": "#6FCF97",
        "--beige": "#F7F3EF",
        "--surface": "#F4F6F8",
        "--border": "#E4E8EE",
        "--text": "#3B4654",
      }}
    >
      <style>{`
        @keyframes policy-fade {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes policy-rise {
          from { opacity: 0; transform: translateY(18px) scale(0.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes policy-float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-6px); }
        }
        .policy-fade { animation: policy-fade 0.6s ease both; }
        .policy-rise { animation: policy-rise 0.7s ease both; }
        .policy-float { animation: policy-float 6s ease-in-out infinite; }
        .policy-section {
          animation: policy-fade 0.65s ease both;
          animation-delay: var(--delay, 0s);
        }
        .policy-display { font-weight: 700; letter-spacing: -0.02em; }
        .policy-kicker {
          font-size: 0.62rem;
          font-weight: 600;
          letter-spacing: 0.32em;
          text-transform: uppercase;
        }
        .policy-card {
          box-shadow: 0 12px 26px rgba(30,42,58,0.08);
          transition: transform 0.25s ease, box-shadow 0.25s ease, border-color 0.25s ease;
        }
        .policy-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 18px 38px rgba(30,42,58,0.12);
          border-color: rgba(30,42,58,0.2);
        }
        .policy-btn { transition: transform 0.2s ease, box-shadow 0.2s ease; }
        .policy-btn:hover { transform: translateY(-1px); }
        .policy-safety {
          background: #1e2a3a;
          color: #f8fafc;
        }
        .policy-support {
          background: linear-gradient(135deg, #1e2a3a 0%, #25344a 100%);
          color: #f8fafc;
        }
        @media (prefers-reduced-motion: reduce) {
          .policy-fade,
          .policy-rise,
          .policy-float,
          .policy-section {
            animation: none;
          }
          .policy-card,
          .policy-btn {
            transition: none;
          }
        }
      `}</style>

      <Navbar
        user={user}
        onLogout={() => setUser(null)}
        onLoginClick={openLoginModal}
        onRegisterClick={openRegisterModal}
      />

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        initialMode={authModalMode}
        onLoginSuccess={handleLoginSuccess}
      />

      <main className="relative bg-white pb-10">
        <section className="relative px-4 pb-20 pt-32 sm:px-6 lg:pb-32 lg:pt-40 min-h-[650px] flex items-center">
          {/* Background layered correctly with z-0, span full width */}
          <div className="absolute inset-0 z-0 bg-gradient-to-b from-[#1E2A3A] to-[#151d28] overflow-hidden shadow-xl">
            <div className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-[rgba(255,138,76,0.18)] blur-[80px]" />
            <div className="pointer-events-none absolute -bottom-24 right-0 h-96 w-96 rounded-full bg-[rgba(111,207,151,0.12)] blur-[80px]" />
          </div>

          <div className="relative z-10 mx-auto grid w-full max-w-5xl items-center gap-12 lg:grid-cols-[1.1fr_0.9fr] px-4 lg:px-8">
            <div className="policy-fade space-y-6">
              <div className="policy-kicker inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-[color:var(--orange)] shadow-sm backdrop-blur-md">
                <Sparkles size={14} />
                HappyTails Guide
              </div>

              <div>
                <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-6xl lg:leading-[1.1]">
                  Pet Care <br />
                  <span className="text-[color:var(--orange)]">Policies</span>
                </h1>
                <p className="mt-4 text-base leading-relaxed text-[rgba(255,255,255,0.7)] sm:text-lg">
                  Transparent guidelines crafted to ensure a safe, calm, and
                  joyful experience for every furry friend visiting HappyTails.
                </p>
              </div>

              <ul className="flex flex-col gap-3 text-sm font-medium text-white/90">
                {[
                  "Certified safe grooming practices",
                  "Flexible & transparent booking",
                  "Strict pet health requirements",
                ].map((item) => (
                  <li key={item} className="flex items-center gap-3">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[rgba(111,207,151,0.2)] text-[#6FCF97]">
                      <CheckCircle2 size={13} />
                    </span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>

              <div className="flex flex-wrap items-center gap-4 pt-2">
                <Link
                  to="/service"
                  className="inline-flex h-12 items-center justify-center rounded-full bg-[color:var(--orange)] px-8 text-sm font-bold tracking-wide text-white shadow-[0_8px_20px_rgba(255,138,76,0.25)] transition-all hover:-translate-y-0.5 hover:bg-[#ff7a33] hover:shadow-[0_12px_24px_rgba(255,138,76,0.3)]"
                >
                  View Services
                </Link>
                <a
                  href="#support"
                  onClick={handleSupportClick}
                  className="inline-flex h-12 items-center justify-center rounded-full border-2 border-[rgba(255,255,255,0.2)] bg-transparent px-8 text-sm font-bold tracking-wide text-white transition-all hover:-translate-y-0.5 hover:border-[rgba(255,255,255,0.5)] hover:bg-white/5"
                >
                  Contact Support
                </a>
              </div>
            </div>

            <div className="relative policy-rise">
              <div className="pointer-events-none absolute -right-10 -top-10 h-64 w-64 rounded-full bg-[rgba(255,138,76,0.1)] blur-3xl" />

              <div className="relative aspect-[4/5] w-full max-w-md mx-auto lg:ml-auto overflow-hidden rounded-[2.5rem] bg-white p-2 shadow-[0_20px_40px_rgba(30,42,58,0.06)] ring-1 ring-white/10">
                <img
                  src={HERO_IMAGES.main}
                  alt="Happy pet at the spa"
                  className="h-full w-full rounded-[2rem] object-cover"
                />

                <div className="policy-float absolute bottom-6 left-[-1.5rem] flex items-center gap-3 rounded-2xl bg-white/95 p-3.5 pl-4 shadow-xl backdrop-blur-md ring-1 ring-black/5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[rgba(111,207,151,0.15)] text-[#20834B]">
                    <ShieldCheck size={18} />
                  </div>
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-wider text-[color:var(--navy)]">
                      Vaccinated Care
                    </p>
                    <p className="text-[10px] font-medium text-[color:var(--text)] opacity-70">
                      100% verified pets
                    </p>
                  </div>
                </div>

                <div
                  className="policy-float absolute right-4 top-6 flex items-center gap-2 rounded-full bg-white/95 px-3 py-1.5 shadow-lg backdrop-blur-md ring-1 ring-black/5"
                  style={{ animationDelay: "1s" }}
                >
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[color:var(--orange)] opacity-75"></span>
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-[color:var(--orange)]"></span>
                  </span>
                  <p className="text-[11px] font-bold text-[color:var(--navy)]">
                    Gentle Touch
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section
          className="policy-section mt-12 px-4 sm:px-6 relative z-10"
          style={{ "--delay": "0.05s" }}
        >
          <div className="mx-auto w-full max-w-6xl">
            <h2 className="mb-10 text-center text-sm font-bold uppercase tracking-widest text-[color:var(--text)] opacity-60">
              Policy Overview
            </h2>
            <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4 lg:divide-x divide-none sm:gap-y-12 divide-[color:var(--border)]">
              {POLICY_OVERVIEW.map((item, index) => {
                const Icon = item.icon;
                const colors = [
                  { bg: "bg-blue-50", text: "text-blue-500" },
                  { bg: "bg-red-50", text: "text-red-500" },
                  { bg: "bg-green-50", text: "text-green-500" },
                  { bg: "bg-purple-50", text: "text-purple-500" },
                ];
                const theme = colors[index % colors.length];

                return (
                  <div
                    key={item.id}
                    className={`flex flex-col items-center text-center ${index !== 0 ? "lg:pl-10" : "lg:pr-4"}`}
                  >
                    <div
                      className={`mb-5 inline-flex h-14 w-14 items-center justify-center rounded-2xl ${theme.bg} ${theme.text} transition-transform hover:-translate-y-1`}
                    >
                      <Icon size={24} strokeWidth={2.5} />
                    </div>
                    <h3 className="text-base font-bold text-[color:var(--navy)]">
                      {item.title}
                    </h3>
                    <p className="mt-2.5 text-sm leading-relaxed text-[color:var(--text)] opacity-70 px-2 lg:px-0">
                      {item.desc}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section
          className="policy-section mt-24 px-4 sm:px-6 relative z-10"
          style={{ "--delay": "0.1s" }}
        >
          <div className="mx-auto w-full max-w-5xl">
            <div className="grid gap-8 lg:gap-10 lg:grid-cols-[1.3fr_0.9fr] items-start">
              
              {/* Left Column: Accordion */}
              <div className="space-y-6 sm:space-y-8">
                <div>
                  <h2 className="text-2xl font-extrabold tracking-tight text-[color:var(--navy)] sm:text-3xl relative inline-block">
                    Detailed Guidelines
                    <svg className="absolute -bottom-3 left-0 w-16 text-[color:var(--orange)]" viewBox="0 0 100 10" preserveAspectRatio="none">
                      <path d="M0 5 Q 50 15 100 0" stroke="currentColor" strokeWidth="4" fill="none" strokeLinecap="round"/>
                    </svg>
                  </h2>
                  <p className="mt-4 text-sm sm:text-base leading-relaxed text-[color:var(--text)] opacity-80 max-w-xl">
                    Everything you need to know to ensure a smooth, pleasant experience for you and your beloved pet.
                  </p>
                </div>

                <div className="relative rounded-[2rem] bg-white p-2 sm:p-4 shadow-[0_15px_40px_-15px_rgba(30,42,58,0.06)] ring-1 ring-[color:var(--border)] overflow-visible">
                  {/* Subtle background layers */}
                  <div className="absolute top-0 right-0 -mr-4 -mt-4 h-32 w-32 rounded-full bg-[rgba(255,138,76,0.1)] blur-3xl pointer-events-none" />
                  <div className="absolute bottom-0 left-0 -ml-4 -mb-4 h-32 w-32 rounded-full bg-[rgba(111,207,151,0.08)] blur-3xl pointer-events-none" />
                  
                  <div className="flex flex-col relative z-10 gap-1.5 sm:gap-2">
                    {POLICY_ACCORDION.map((section, index) => {
                      const isActive = openPolicyId === section.id;
                      const Icon = section.icon;
                      const isMostImportant = index === 0;

                      return (
                        <div 
                          key={section.id} 
                          className={`group relative overflow-hidden rounded-[1.25rem] transition-all duration-300 ${
                            isActive 
                              ? "bg-[#FFF7F2] shadow-[0_8px_30px_rgba(255,138,76,0.08)] ring-1 ring-[rgba(255,138,76,0.2)] pb-4" 
                              : "bg-transparent hover:bg-[#F9FAFB] pb-0"
                          }`}
                        >
                          {/* Active Accent Line */}
                          {isActive && (
                            <div className="absolute left-0 top-4 bottom-4 w-1.5 bg-[color:var(--orange)] rounded-r-lg shadow-[0_0_12px_rgba(255,138,76,0.4)]" />
                          )}

                          <button
                            type="button"
                            onClick={() => togglePolicy(section.id)}
                            className="flex w-full items-center justify-between gap-3 p-4 sm:p-5 text-left"
                          >
                            <div className="flex items-center gap-3 sm:gap-4 flex-1">
                              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-all duration-300 ${
                                isActive 
                                  ? "bg-white text-[color:var(--orange)] shadow-md shadow-[rgba(255,138,76,0.2)] scale-105" 
                                  : "bg-[#F3F5F7] text-[color:var(--navy)] opacity-80 group-hover:bg-white group-hover:shadow-sm"
                              }`}>
                                <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <h3 className={`text-sm sm:text-base transition-colors font-bold ${
                                    isActive ? "text-[color:var(--orange)]" : "text-[color:var(--navy)]"
                                  }`}>
                                    {section.title}
                                  </h3>
                                  {isMostImportant && (
                                    <span className="hidden sm:inline-flex items-center rounded-full bg-[#FFEAE0] px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-[color:var(--orange)] ring-1 ring-inset ring-[rgba(255,138,76,0.3)]">
                                      Required
                                    </span>
                                  )}
                                </div>
                                <p className="mt-0.5 text-xs text-[color:var(--text)] opacity-60 hidden sm:block transition-opacity">
                                  {isActive ? "Tap to collapse details" : "Tap to expand details"}
                                </p>
                              </div>
                            </div>
                            <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-all duration-300 ${
                              isActive ? "bg-[rgba(255,138,76,0.15)] text-[color:var(--orange)] rotate-180" : "bg-[#F3F5F7] text-[#9BA3AF] group-hover:bg-[#EAECEF]"
                            }`}>
                              <ChevronDown size={18} className="transition-transform" />
                            </div>
                          </button>

                          <div
                            className={`grid transition-[grid-template-rows,opacity] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] ${
                              isActive ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                            }`}
                          >
                            <div className="overflow-hidden">
                              <div className="px-4 sm:px-5 pb-2 sm:pl-[4.5rem] pt-0">
                                <ul className="space-y-2.5">
                                  {section.items.map((item, i) => (
                                    <li key={i} className="flex items-start gap-2.5 group/item">
                                      <span className="mt-1 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-[#FFEAE0] text-[color:var(--orange)]">
                                        <CheckCircle2 size={10} strokeWidth={3} />
                                      </span>
                                      <span className="text-[13px] sm:text-sm leading-relaxed text-[color:rgba(59,70,84,0.85)] font-medium">
                                        {item}
                                      </span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            </div>
                          </div>
                          
                          {/* Elegant Separator */}
                          {!isActive && index !== POLICY_ACCORDION.length - 1 && (
                            <div className="absolute bottom-0 left-16 right-6 h-[1px] bg-gradient-to-r from-[rgba(0,0,0,0.05)] to-transparent" />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Right Column: Highlight Sidebar */}
              <div className="lg:pt-[4.5rem] flex flex-col gap-4 sm:gap-5 relative">
                {/* Decorative blob behind right column */}
                <div className="absolute -inset-8 bg-[rgba(255,138,76,0.04)] rounded-[4rem] -z-10 blur-3xl pointer-events-none hidden lg:block" />

                {/* Highlight Cards */}
                {QUICK_NOTICES.map((notice) => {
                  if (notice.id === "health-req") {
                    const Icon = notice.icon;
                    return (
                      <div
                        key={notice.id}
                        className="relative overflow-hidden rounded-[1.75rem] bg-gradient-to-br from-[#FFF8F5] to-[#FFF0E8] p-5 sm:p-6 shadow-[0_10px_30px_-10px_rgba(255,138,76,0.15)] ring-1 ring-[rgba(255,138,76,0.2)] transform transition-transform hover:-translate-y-1"
                      >
                        {/* Decorative pattern/shape */}
                        <div className="absolute -right-6 -top-6 text-[rgba(255,138,76,0.1)] rotate-12 pointer-events-none">
                          <ShieldCheck size={100} strokeWidth={1} />
                        </div>
                        
                        <div className="relative z-10">
                          <span className="mb-4 inline-flex items-center gap-1.5 rounded-full bg-white/80 backdrop-blur-md px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[color:var(--orange)] shadow-sm ring-1 ring-[rgba(255,138,76,0.2)]">
                            <span className="relative flex h-1.5 w-1.5">
                              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[color:var(--orange)] opacity-75"></span>
                              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[color:var(--orange)]"></span>
                            </span>
                            Required before visit
                          </span>
                          
                          <div className="flex items-center gap-3 mb-4">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[0.85rem] bg-white text-[color:var(--orange)] shadow-[0_8px_16px_rgba(255,138,76,0.15)] ring-1 ring-[rgba(255,138,76,0.1)]">
                              <Icon size={20} strokeWidth={2.5} />
                            </div>
                            <h3 className="text-base sm:text-lg font-extrabold text-[color:var(--navy)] leading-tight">
                              {notice.title}
                            </h3>
                          </div>

                          <ul className="space-y-2.5 text-[13px] sm:text-[14px] font-medium text-[color:var(--navy)] opacity-80">
                            {notice.items.map((li) => (
                              <li key={li} className="flex items-start gap-2.5">
                                <div className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-white text-[color:var(--orange)] shadow-sm ring-1 ring-[rgba(255,138,76,0.15)]">
                                  <CheckCircle2 size={10} strokeWidth={3} />
                                </div>
                                <span className="leading-snug">{li}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    );
                  }

                  if (notice.id === "quick-reminder") {
                    const Icon = notice.icon;
                    return (
                      <div
                        key={notice.id}
                        className="relative rounded-[1.5rem] bg-gradient-to-br from-[#1E2A3A] to-[#151d28] p-5 sm:p-6 shadow-[0_15px_30px_-10px_rgba(30,42,58,0.4)] mt-2 overflow-visible transform transition-transform hover:-translate-y-1"
                      >
                        {/* Floating Badge */}
                        <div className="absolute -top-4 left-5 flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#FF8A4C] to-[#ff7029] text-white shadow-[0_8px_16px_rgba(255,138,76,0.4)] ring-4 ring-white">
                          <Icon size={18} className="animate-pulse" style={{ animationDuration: '3s' }} />
                        </div>

                        <div className="relative z-10 pt-3">
                          <h3 className="text-sm sm:text-base font-bold text-white mb-2 tracking-wide">
                            {notice.title}
                          </h3>
                          <p className="text-[13px] sm:text-[14px] leading-relaxed text-[#94A3B8] font-medium">
                            {notice.desc}
                          </p>
                        </div>
                      </div>
                    );
                  }
                  
                  return null;
                })}
              </div>
            </div>
          </div>
        </section>

        <section
          id="safety-promise"
          className="policy-section mt-24 relative"
          style={{ "--delay": "0.15s" }}
        >
          <div className="relative w-full overflow-hidden bg-gradient-to-br from-[#FF8A4C] to-[#ff6a1a] py-12 sm:py-16 lg:py-20 shadow-[0_20px_50px_-10px_rgba(255,138,76,0.25)]">
            {/* Background patterns */}
            <div className="pointer-events-none absolute -left-20 -top-20 h-80 w-80 rounded-full bg-white/20 blur-[70px]" />
            <div className="pointer-events-none absolute bottom-0 right-0 h-[30rem] w-[30rem] rounded-full bg-[#FFEAE0]/20 blur-[80px]" />
            
            {/* Subtle texture overlay */}
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-5 mix-blend-overlay pointer-events-none"></div>

            <div className="relative z-10 mx-auto w-full max-w-6xl px-4 sm:px-6">
              <div className="flex flex-col gap-12 lg:flex-row lg:items-center xl:gap-16">
                <div className="lg:w-[45%]">
                  <div className="mb-6 inline-flex items-center gap-2.5 rounded-full bg-white/20 px-4 py-1.5 backdrop-blur-md ring-1 ring-white/40 shadow-sm">
                    <ShieldCheck size={14} className="text-white" strokeWidth={2.5}/>
                    <span className="text-[11px] font-bold uppercase tracking-[0.15em] text-white">
                      Pet Safety Promise
                    </span>
                  </div>
                  <h3 className="text-3xl font-black leading-[1.15] tracking-tight text-white sm:text-4xl lg:text-5xl drop-shadow-sm">
                    A safer, calmer <br className="hidden sm:inline" /> spa experience.
                  </h3>
                  <p className="mt-6 text-[15px] sm:text-[16px] leading-relaxed text-white/95 font-medium max-w-md">
                    Your pet's well-being is our top priority. We strictly
                    follow certified safety protocols to ensure a stress-free
                    and joyful environment.
                  </p>
                </div>

                <div className="grid flex-1 gap-4 sm:gap-5 sm:grid-cols-3">
                  {SAFETY_PROMISES.map((item, idx) => {
                    const Icon = item.icon;
                    return (
                      <div
                        key={item.id}
                        className="group relative flex flex-col items-start gap-4 rounded-[1.5rem] bg-white p-6 shadow-xl ring-1 ring-black/5 transition-all duration-300 hover:-translate-y-2 hover:shadow-[0_20px_40px_-5px_rgba(0,0,0,0.15)]"
                        style={{ transitionDelay: `${idx * 50}ms` }}
                      >
                        <div className="inline-flex h-12 w-12 items-center justify-center rounded-[1rem] bg-[#FFF7F2] text-[color:var(--orange)] shadow-inner ring-1 ring-[rgba(255,138,76,0.15)] group-hover:scale-110 group-hover:bg-[color:var(--orange)] group-hover:text-white transition-all duration-300">
                          <Icon size={22} strokeWidth={2.5} />
                        </div>
                        <div>
                          <h4 className="font-extrabold text-[color:var(--navy)] text-[15px] leading-tight mb-2">
                            {item.title}
                          </h4>
                          <p className="text-[13px] font-medium text-[color:var(--text)] opacity-75 leading-relaxed">
                            {item.description}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section
          className="policy-section mt-16 sm:mt-24 py-16 sm:py-24 relative overflow-visible"
          style={{ "--delay": "0.2s" }}
        >
          {/* Expanded premium background */}
          <div className="absolute inset-0 bg-[#FFFbf9]" />
          
          <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-[rgba(255,138,76,0.2)] to-transparent" />
          
          {/* Soft background blobs */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-5xl h-full pointer-events-none">
            <div className="absolute top-10 -left-20 w-96 h-96 rounded-full bg-[rgba(255,138,76,0.06)] blur-3xl" />
            <div className="absolute bottom-10 -right-20 w-[30rem] h-[30rem] rounded-full bg-[rgba(111,207,151,0.04)] blur-[100px]" />
          </div>

          <div className="mx-auto w-full max-w-4xl relative z-10 px-4 sm:px-6">
            <div className="text-center mb-10 sm:mb-12">
              <span className="mb-4 inline-flex items-center gap-2 rounded-full border border-[rgba(255,138,76,0.3)] bg-white px-4 py-1.5 shadow-sm text-[12px] font-bold tracking-widest text-[color:var(--orange)] uppercase">
                <MessageCircle size={14} className="text-[color:var(--orange)]" />
                Helpful Answers
              </span>
              <h2 className="text-3xl sm:text-[40px] font-black tracking-tight text-[color:var(--navy)] leading-tight">
                Quick answers for <br className="hidden sm:inline" /> pet parents
              </h2>
              <p className="mt-4 text-[15px] sm:text-[16px] text-[color:var(--text)] opacity-80 max-w-2xl mx-auto font-medium leading-relaxed">
                Find out everything you need to know about our policies, procedures, 
                and how we ensure the best care for your furry friends.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:gap-4">
              {FAQ_ITEMS.map((item, index) => {
                const isActive = openFaqId === item.id;
                const isMostAsked = index === 0;

                return (
                  <div
                    key={item.id}
                    className={`group relative overflow-hidden rounded-[1.25rem] transition-all duration-300 bg-white ring-1 ring-[rgba(228,232,238,0.8)] shadow-[0_2px_10px_rgba(30,42,58,0.02)] hover:shadow-[0_8px_30px_rgba(30,42,58,0.06)] hover:ring-[rgba(228,232,238,1)] ${
                      isActive ? "ring-[rgba(255,138,76,0.3)] shadow-[0_8px_30px_rgba(255,138,76,0.08)]" : ""
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => toggleFaq(item.id)}
                      className="flex w-full items-center justify-between gap-4 px-5 py-4 sm:px-6 sm:py-5 text-left"
                    >
                      <div className="flex items-center gap-4 flex-1 pr-6">
                        <div className="flex h-10 w-10 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-xl bg-[#F8FAFC] text-[color:var(--text)] opacity-70 transition-all duration-300 group-hover:bg-[#F1F5F9] group-hover:text-[color:var(--navy)] group-hover:opacity-100">
                          <Sparkles size={20} className={isActive ? "text-[color:var(--orange)]" : ""} />
                        </div>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                          <h3 className="text-[15px] sm:text-[16px] font-bold text-[color:var(--navy)] transition-colors">
                            {item.question}
                          </h3>
                          {isMostAsked && (
                            <span className="inline-flex items-center rounded-full bg-[#FFF0E6] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[color:var(--orange)]">
                              Most Asked
                            </span>
                          )}
                        </div>
                      </div>
                      
                      <div className={`shrink-0 text-[#94A3B8] transition-transform duration-300 ${isActive ? "rotate-180 text-[color:var(--orange)]" : ""}`}>
                        <ChevronDown size={20} strokeWidth={2.5} />
                      </div>
                    </button>

                    <div
                      className={`grid transition-[grid-template-rows,opacity] duration-300 ease-in-out ${
                        isActive ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                      }`}
                    >
                      <div className="overflow-hidden">
                        <div className="px-5 pb-5 sm:px-6 sm:pb-6 pt-0 sm:pl-[4.5rem]">
                          <p className="text-[14px] sm:text-[15px] leading-relaxed text-[color:var(--text)] opacity-80 font-medium">
                            {item.answer}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section
          id="support"
          className="policy-section policy-support relative overflow-hidden mt-16 px-4 py-16 sm:px-6 shadow-[0_20px_50px_-10px_rgba(30,42,58,0.2)]"
        >
          <div className="pointer-events-none absolute -left-20 -top-20 h-[500px] w-[500px] rounded-full bg-[rgba(255,138,76,0.15)] blur-[100px]" />
          <div className="pointer-events-none absolute -bottom-20 -right-20 h-[500px] w-[500px] rounded-full bg-[rgba(111,207,151,0.1)] blur-[100px]" />

          <div className="mx-auto w-full max-w-6xl">
            <div className="relative z-10 flex flex-col gap-8 md:flex-row md:items-center md:justify-between px-4 sm:px-8">
              <div className="md:max-w-md lg:max-w-lg">
                <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-3.5 py-1.5 backdrop-blur-md ring-1 ring-white/20 shadow-md shadow-black/10">
                   <span className="policy-kicker mb-0 text-white/90 font-semibold tracking-wider">SUPPORT TEAM</span>
                </div>
                <h2 className="policy-display text-3xl font-bold text-white sm:text-[40px] leading-[1.15]">
                  Need help understanding our policies?
                </h2>
                <p className="mt-5 text-[16px] text-white/80 font-medium max-w-sm">
                  We are here to explain anything in plain language and assist you with your bookings.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row items-center gap-4 md:justify-end shrink-0 w-full sm:w-auto mt-4 md:mt-0">
                <button className="w-full sm:w-auto justify-center inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[color:var(--orange)] to-[#ff7029] px-7 py-4 text-[15px] font-bold tracking-wide text-white shadow-[0_8px_20px_rgba(255,138,76,0.3)] transition-all hover:shadow-[0_12px_24px_rgba(255,138,76,0.4)] hover:-translate-y-1 hover:brightness-110">
                  <MessageCircle size={18} strokeWidth={2.5}/>
                  Live Chat
                </button>
                <button className="w-full sm:w-auto justify-center inline-flex items-center gap-2 rounded-full bg-white/5 border border-white/20 px-7 py-4 text-[15px] font-bold tracking-wide text-white transition-all hover:bg-white/10 hover:border-white/40 hover:-translate-y-1 backdrop-blur-sm">
                  <Mail size={18} strokeWidth={2.5}/>
                  Email
                </button>
                <button className="w-full sm:w-auto justify-center inline-flex items-center gap-2 rounded-full bg-white/5 border border-white/20 px-7 py-4 text-[15px] font-bold tracking-wide text-white transition-all hover:bg-white/10 hover:border-white/40 hover:-translate-y-1 backdrop-blur-sm">
                  <PhoneCall size={18} strokeWidth={2.5}/>
                  Call Us
                </button>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default Policy;
