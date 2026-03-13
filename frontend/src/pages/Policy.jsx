import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  ArrowUp,
  CalendarCheck,
  CheckCircle2,
  Clock3,
  CreditCard,
  Home,
  LifeBuoy,
  Link2,
  Lock,
  Search,
  ShieldCheck,
  Siren,
  Sparkles,
  Stethoscope,
  TriangleAlert,
  UserCheck,
  XCircle,
  ChevronRight,
  Mail,
  PhoneCall,
} from "lucide-react";
import Navbar from "../components/layout/Navbar";
import Footer from "../components/layout/Footer";
import { getPublicPolicies } from "../api/policyApi";

const NAVBAR_OFFSET = 108;
const LAST_UPDATED = "2026-03-13";
const TOAST_DURATION = 2200;

const HERO_IMAGE =
  "https://images.unsplash.com/photo-1548199973-03cce0bbc87b?auto=format&fit=crop&w=1400&q=80";
const SUPPORT_IMAGE =
  "https://images.unsplash.com/photo-1601758124510-52d02ddb7cbd?auto=format&fit=crop&w=1400&q=80";

const POLICY_SECTIONS = [
  {
    id: "booking",
    title: "Booking Policy",
    tocTitle: "Booking",
    icon: CalendarCheck,
    tone: "coral",
    points: [
      "Select an available time slot before confirming a booking.",
      "Bookings are assigned based on staff and room availability.",
      "Multiple pets require separate bookings unless a package supports multi-pet.",
      "Confirmation is available in your dashboard.",
    ],
    tip: "Tip: Book early on weekends to secure your preferred slot.",
  },
  {
    id: "cancellation",
    title: "Cancellation Policy",
    tocTitle: "Cancellation",
    icon: XCircle,
    tone: "sage",
    points: [
      "Cancel or reschedule at least 2 hours before appointment time.",
      "Late cancellations may result in temporary booking restrictions.",
      "No-show appointments may affect future booking privileges.",
    ],
    tip: "Tip: Use your dashboard to reschedule quickly when plans change.",
  },
  {
    id: "health",
    title: "Pet Health Requirements",
    tocTitle: "Health Requirements",
    icon: ShieldCheck,
    tone: "sage",
    points: [
      "Pets must be free from contagious diseases.",
      "Vaccination records may be required for boarding services.",
      "Aggressive behavior must be reported in advance.",
      "Please share current medications before the appointment.",
    ],
    tip: "Tip: Up-to-date health records help us serve your pet faster and safer.",
  },
  {
    id: "safety",
    title: "Grooming & Veterinary Safety",
    tocTitle: "Grooming & Vet Safety",
    icon: Stethoscope,
    tone: "coral",
    points: [
      "Safe handling procedures are applied for grooming and veterinary services.",
      "Equipment is sanitized and service areas are monitored.",
      "Emergency support is available if unexpected issues occur.",
      "Any unusual signs are communicated to owners promptly.",
    ],
  },
  {
    id: "boarding",
    title: "Boarding Policy",
    tocTitle: "Boarding",
    icon: Home,
    tone: "sage",
    points: [
      "Boarding requires advance reservations.",
      "An emergency contact is required for every boarding stay.",
      "Vaccinations are required before check-in.",
      "Check-in and check-out windows must be followed.",
    ],
  },
  {
    id: "payment",
    title: "Payment Policy",
    tocTitle: "Payment",
    icon: CreditCard,
    tone: "coral",
    points: [
      "Payment timing depends on the selected service type.",
      "Online payments are securely processed.",
      "Refunds follow the applicable cancellation conditions.",
      "Receipts are accessible from your booking history.",
    ],
  },
  {
    id: "responsibilities",
    title: "Customer Responsibilities",
    tocTitle: "Responsibilities",
    icon: UserCheck,
    tone: "sage",
    points: [
      "Provide accurate pet information before service starts.",
      "Arrive on time to avoid delays and service disruptions.",
      "Inform our team of special conditions or allergies.",
      "Follow check-in instructions from staff.",
    ],
  },
  {
    id: "emergency",
    title: "Emergency Policy",
    tocTitle: "Emergency",
    icon: Siren,
    tone: "coral",
    points: [
      "Our vet team provides immediate care when needed.",
      "Owners are contacted as soon as possible during urgent situations.",
      "Critical decisions prioritize pet safety and stabilization.",
    ],
  },
  {
    id: "privacy",
    title: "Privacy Policy",
    tocTitle: "Privacy",
    icon: Lock,
    tone: "sage",
    points: [
      "Customer and pet data is stored securely.",
      "No third-party sharing occurs without consent.",
      "Access to sensitive data is role-restricted internally.",
      "Policy updates are reflected on this page.",
    ],
  },
  {
    id: "support",
    title: "Contact Support",
    tocTitle: "Support",
    icon: LifeBuoy,
    tone: "coral",
    points: [
      "Email: support@happytails.com",
      "Phone: +84 000 000 000",
      "Hours: 08:00 - 23:00",
      "Support team is available before and after your booking.",
    ],
  },
];

const toneStyles = {
  coral: {
    accent: "bg-[#E07A5F]",
    badge: "bg-[#E07A5F]/12",
    icon: "text-[#E07A5F]",
    chipActive: "border-[#E07A5F]/50 bg-[#E07A5F]/12 text-[#1F2A37]",
  },
  sage: {
    accent: "bg-[#7FB069]",
    badge: "bg-[#7FB069]/16",
    icon: "text-[#5F8E4D]",
    chipActive: "border-[#7FB069]/50 bg-[#7FB069]/12 text-[#1F2A37]",
  },
};

const SECTION_KEYWORDS = {
  booking: ["booking", "book", "slot", "appointment"],
  cancellation: ["cancellation", "cancel", "reschedule", "no-show"],
  health: ["health", "vaccination", "disease", "medical", "contagious"],
  safety: ["safety", "groom", "veterinary", "sanitize", "handling"],
  boarding: ["boarding", "check-in", "check in", "stay"],
  payment: ["payment", "pay", "billing", "refund", "transaction"],
  responsibilities: ["responsibil", "owner", "customer", "allerg"],
  emergency: ["emergency", "urgent", "asap"],
  privacy: ["privacy", "data", "consent", "third-party", "personal"],
  support: ["support", "contact", "help", "email", "phone"],
};

const SECTION_TYPE_MAP = {
  cancellation: "cancellation",
  privacy: "privacy",
};

const getPolicyKey = (policy) =>
  policy?._id || policy?.id || policy?.slug || policy?.title || "";

const toYmd = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
};

const decodeHtmlEntities = (value) =>
  value
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'");

const extractPolicyPoints = (content, fallbackPoints) => {
  if (!content || typeof content !== "string") return fallbackPoints;

  const plainText = decodeHtmlEntities(content)
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<\/li>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/\r/g, "")
    .replace(/\t/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();

  const byLine = plainText
    .split("\n")
    .map((line) => line.replace(/^\s*[-*•]\s*/, "").trim())
    .filter((line) => line.length > 12);

  const source =
    byLine.length >= 3
      ? byLine
      : plainText
          .split(/(?<=[.!?])\s+/)
          .map((line) => line.replace(/^\s*[-*•]\s*/, "").trim())
          .filter((line) => line.length > 20);

  const unique = [];
  source.forEach((point) => {
    const normalized = point.replace(/\s+/g, " ").trim();
    if (!normalized) return;
    if (!unique.includes(normalized)) unique.push(normalized);
  });

  if (unique.length < 3) return fallbackPoints;
  return unique.slice(0, 5);
};

const findPolicyForSection = (sectionId, policies, usedKeys) => {
  const directBySlug = policies.find((policy) => {
    const key = getPolicyKey(policy);
    if (usedKeys.has(key)) return false;
    return policy?.slug === sectionId;
  });
  if (directBySlug) return directBySlug;

  const mappedType = SECTION_TYPE_MAP[sectionId];
  if (mappedType) {
    const directByType = policies.find((policy) => {
      const key = getPolicyKey(policy);
      if (usedKeys.has(key)) return false;
      return policy?.type === mappedType;
    });
    if (directByType) return directByType;
  }

  const keywords = SECTION_KEYWORDS[sectionId] || [];
  let bestMatch = null;
  let bestScore = 0;

  policies.forEach((policy) => {
    const key = getPolicyKey(policy);
    if (usedKeys.has(key)) return;

    const haystack =
      `${policy?.title || ""} ${policy?.slug || ""} ${policy?.type || ""} ${policy?.content || ""}`.toLowerCase();
    const score = keywords.reduce(
      (sum, keyword) => (haystack.includes(keyword) ? sum + 1 : sum),
      0,
    );

    if (score > bestScore) {
      bestScore = score;
      bestMatch = policy;
    }
  });

  return bestScore > 0 ? bestMatch : null;
};

const mergeSectionsWithPolicies = (sections, policies) => {
  const usedKeys = new Set();

  return sections.map((section) => {
    const matchedPolicy = findPolicyForSection(section.id, policies, usedKeys);
    if (!matchedPolicy) return section;

    const policyKey = getPolicyKey(matchedPolicy);
    if (policyKey) usedKeys.add(policyKey);

    const merged = {
      ...section,
      points: extractPolicyPoints(matchedPolicy.content, section.points),
    };

    const versionText = matchedPolicy?.version
      ? `Version ${matchedPolicy.version}`
      : "";
    const effectiveText = toYmd(matchedPolicy?.effectiveDate)
      ? `Effective ${toYmd(matchedPolicy.effectiveDate)}`
      : "";
    const tipText = [versionText, effectiveText].filter(Boolean).join(" | ");

    if (tipText) {
      merged.tip = tipText;
    }

    return merged;
  });
};

const getLatestPolicyDate = (policies) => {
  const timestamps = policies
    .map(
      (policy) =>
        policy?.updatedAt || policy?.effectiveDate || policy?.createdAt,
    )
    .map((value) => new Date(value).getTime())
    .filter((time) => Number.isFinite(time));

  if (timestamps.length === 0) return LAST_UPDATED;
  return new Date(Math.max(...timestamps)).toISOString().slice(0, 10);
};

const PolicySectionCard = ({ section, isActive, onCopyLink }) => {
  const Icon = section.icon;
  const tone = toneStyles[section.tone] || toneStyles.coral;

  return (
    <article
      id={section.id}
      className={`relative overflow-hidden rounded-3xl border bg-white px-5 py-5 shadow-[0_20px_45px_rgba(15,23,42,0.08)] transition-all scroll-mt-32 md:px-6 md:py-6 ${
        isActive
          ? "border-[#E07A5F]/45 ring-2 ring-[#E07A5F]/20"
          : "border-[#1F2A37]/10 hover:border-[#1F2A37]/15"
      }`}
    >
      <span className={`absolute left-0 top-0 h-full w-1.5 ${tone.accent}`} />

      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3">
          <div
            className={`mt-0.5 flex h-9 w-9 items-center justify-center rounded-xl ${tone.badge}`}
          >
            <Icon size={17} className={tone.icon} />
          </div>
          <div className="min-w-0">
            <h2 className="text-xl font-black tracking-tight text-[#1F2A37] md:text-2xl">
              {section.title}
            </h2>
          </div>
        </div>

        <button
          type="button"
          onClick={() => onCopyLink(section.id)}
          className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[#1F2A37]/15 bg-white text-[#1F2A37]/60 transition-all hover:border-[#E07A5F]/40 hover:text-[#E07A5F] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E07A5F] focus-visible:ring-offset-2"
          aria-label={`Copy link to ${section.title}`}
        >
          <Link2 size={15} />
        </button>
      </div>

      <ul className="mt-5 space-y-3">
        {section.points.map((point) => (
          <li
            key={point}
            className="flex items-start gap-3 text-[14px] leading-relaxed text-[#1F2A37]/80"
          >
            <CheckCircle2
              size={16}
              className="mt-0.5 shrink-0 text-[#7FB069]"
            />
            <span>{point}</span>
          </li>
        ))}
      </ul>

      {section.tip && (
        <div className="mt-4 rounded-2xl border border-[#1F2A37]/10 bg-[#F8F6F2] px-4 py-2.5 text-xs text-[#1F2A37]/65">
          {section.tip}
        </div>
      )}

      {section.id === "support" && (
        <div className="mt-5 flex flex-wrap gap-2.5">
          <a
            href="mailto:support@happytails.com"
            className="inline-flex items-center gap-2 rounded-full bg-[#1F2A37] px-4 py-2 text-xs font-bold text-white transition-all hover:bg-[#E07A5F] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E07A5F] focus-visible:ring-offset-2"
          >
            <Mail size={16} />
            Email Support
          </a>
          <a
            href="tel:+84000000000"
            className="inline-flex items-center gap-2 rounded-full border border-[#1F2A37]/20 bg-white px-4 py-2 text-xs font-bold text-[#1F2A37] transition-all hover:border-[#E07A5F]/40 hover:bg-[#E07A5F]/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E07A5F] focus-visible:ring-offset-2"
          >
            <PhoneCall size={16} />
            Call Now
          </a>
        </div>
      )}
    </article>
  );
};

const Policy = () => {
  const navigate = useNavigate();
  const toastTimerRef = useRef(null);

  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem("user");
    return stored ? JSON.parse(stored) : null;
  });
  const [policySections, setPolicySections] = useState(POLICY_SECTIONS);
  const [lastUpdated, setLastUpdated] = useState(LAST_UPDATED);
  const [isPolicyLoading, setIsPolicyLoading] = useState(false);
  const [activeSection, setActiveSection] = useState(POLICY_SECTIONS[0].id);
  const [searchText, setSearchText] = useState("");
  const [showBackTop, setShowBackTop] = useState(false);
  const [toastMessage, setToastMessage] = useState("");

  const filteredSections = useMemo(() => {
    const keyword = searchText.trim().toLowerCase();
    if (!keyword) return policySections;
    return policySections.filter((item) =>
      item.title.toLowerCase().includes(keyword),
    );
  }, [searchText, policySections]);

  const sectionsBeforeSupport = useMemo(
    () => policySections.filter((item) => item.id !== "support"),
    [policySections],
  );
  const supportSection = useMemo(
    () => policySections.find((item) => item.id === "support"),
    [policySections],
  );

  const showToast = useCallback((message) => {
    setToastMessage(message);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(
      () => setToastMessage(""),
      TOAST_DURATION,
    );
  }, []);

  const scrollToSection = useCallback((sectionId) => {
    const target = document.getElementById(sectionId);
    if (!target) return;

    const y =
      target.getBoundingClientRect().top + window.scrollY - NAVBAR_OFFSET;
    window.scrollTo({ top: y, behavior: "smooth" });
    window.history.replaceState(null, "", `#${sectionId}`);
  }, []);

  const copySectionLink = useCallback(
    async (sectionId) => {
      const fullUrl = `${window.location.origin}${window.location.pathname}#${sectionId}`;

      const fallbackCopy = () => {
        const temp = document.createElement("textarea");
        temp.value = fullUrl;
        temp.style.position = "fixed";
        temp.style.opacity = "0";
        document.body.appendChild(temp);
        temp.focus();
        temp.select();
        document.execCommand("copy");
        document.body.removeChild(temp);
      };

      try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(fullUrl);
        } else {
          fallbackCopy();
        }
        window.history.replaceState(null, "", `#${sectionId}`);
        showToast("Section link copied to clipboard");
      } catch {
        showToast("Unable to copy link right now");
      }
    },
    [showToast],
  );

  useEffect(() => {
    let isMounted = true;

    const loadPolicies = async () => {
      setIsPolicyLoading(true);

      try {
        const response = await getPublicPolicies();
        const policies = response?.data?.policies;

        if (Array.isArray(policies) && policies.length > 0 && isMounted) {
          setPolicySections(
            mergeSectionsWithPolicies(POLICY_SECTIONS, policies),
          );
          setLastUpdated(getLatestPolicyDate(policies));
        }
      } catch (error) {
        console.error("Failed to load policy API data:", error);
      } finally {
        if (isMounted) setIsPolicyLoading(false);
      }
    };

    loadPolicies();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);

        if (visible.length > 0) {
          setActiveSection(visible[0].target.id);
        }
      },
      {
        root: null,
        rootMargin: `-${NAVBAR_OFFSET + 20}px 0px -55% 0px`,
        threshold: [0.2, 0.45, 0.7],
      },
    );

    policySections.forEach((section) => {
      const element = document.getElementById(section.id);
      if (element) observer.observe(element);
    });

    return () => observer.disconnect();
  }, [policySections]);

  useEffect(() => {
    const updateScrollUi = () => {
      setShowBackTop(window.scrollY > 560);
    };

    updateScrollUi();
    window.addEventListener("scroll", updateScrollUi, { passive: true });
    window.addEventListener("resize", updateScrollUi);

    return () => {
      window.removeEventListener("scroll", updateScrollUi);
      window.removeEventListener("resize", updateScrollUi);
    };
  }, []);

  useEffect(() => {
    const initialHash = window.location.hash.replace("#", "");
    if (!initialHash) return;

    const exists = policySections.some((item) => item.id === initialHash);
    if (!exists) return;

    const timer = setTimeout(() => {
      scrollToSection(initialHash);
      setActiveSection(initialHash);
    }, 180);

    return () => clearTimeout(timer);
  }, [scrollToSection, policySections]);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, []);

  const handleTocClick = (sectionId) => {
    setActiveSection(sectionId);
    scrollToSection(sectionId);
  };

  return (
    <div className="min-h-screen bg-[#F5F1EB] text-[#1F2A37] selection:bg-[#E07A5F] selection:text-white">
      <Navbar user={user} onLogout={() => setUser(null)} />

      <main>
        <section className="relative overflow-hidden bg-gradient-to-b from-[#0B1220] via-[#111B2B] to-[#1F2A37] px-4 pb-14 pt-28 sm:px-6">
          <div className="pointer-events-none absolute -left-16 -top-24 h-72 w-72 rounded-full bg-[#E07A5F]/30 blur-3xl" />
          <div className="pointer-events-none absolute -right-20 top-20 h-80 w-80 rounded-full bg-[#7FB069]/25 blur-3xl" />
          <div className="pointer-events-none absolute bottom-0 left-1/3 h-52 w-52 rounded-full bg-white/10 blur-3xl" />

          <div className="relative mx-auto grid w-full max-w-6xl items-center gap-8 lg:grid-cols-12">
            <div className="lg:col-span-7">
              <div className="mb-6 flex items-center gap-2 text-sm text-slate-300/90">
                <Link
                  to="/"
                  className="font-medium transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E07A5F] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B1220]"
                >
                  Home
                </Link>
                <ChevronRight size={15} className="text-slate-500" />
                <span className="text-white">Policies</span>
              </div>

              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.24em] text-slate-200">
                <Sparkles size={14} className="text-[#E07A5F]" />
                HappyTails
              </div>

              <h1 className="text-3xl font-black leading-tight text-white sm:text-4xl lg:text-5xl">
                <span className="text-[#E07A5F]">Service</span> Policies
              </h1>

              <p className="mt-4 max-w-2xl text-sm leading-relaxed text-slate-300 sm:text-base">
                Please read these policies before booking services for your pet.
              </p>

              <ul className="mt-6 space-y-2.5">
                {[
                  "Secure booking and payments",
                  "Pet safety and health requirements",
                  "Transparent cancellation rules",
                ].map((item) => (
                  <li
                    key={item}
                    className="flex items-center gap-3 text-slate-100"
                  >
                    <CheckCircle2
                      size={16}
                      className="shrink-0 text-[#7FB069]"
                    />
                    <span className="text-sm font-medium sm:text-[15px]">
                      {item}
                    </span>
                  </li>
                ))}
              </ul>

              <div className="mt-7 flex flex-wrap gap-2.5">
                <button
                  type="button"
                  onClick={() => handleTocClick("support")}
                  className="inline-flex items-center gap-2 rounded-full bg-[#E07A5F] px-5 py-2.5 text-xs font-bold text-white shadow-[0_14px_28px_rgba(224,122,95,0.35)] transition-all hover:bg-[#d96f54] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E07A5F] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B1220]"
                >
                  Contact Support
                  <ArrowRight size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => navigate("/service")}
                  className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/5 px-5 py-2.5 text-xs font-bold text-white transition-all hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E07A5F] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B1220]"
                >
                  Go to Services
                </button>
              </div>
            </div>

            <div className="lg:col-span-5">
              <div className="relative">
                <div className="absolute -inset-3 rounded-[2rem] bg-gradient-to-br from-[#E07A5F]/35 via-transparent to-[#7FB069]/35 blur-2xl" />
                <div className="relative overflow-hidden rounded-[2rem] border border-white/15 shadow-[0_26px_70px_rgba(0,0,0,0.45)]">
                  <img
                    src={HERO_IMAGE}
                    alt="Happy pet with caregiver"
                    className="h-[360px] w-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0B1220]/65 via-transparent to-[#0B1220]/25" />

                  <div className="absolute left-4 top-4 rounded-full border border-white/30 bg-white/15 px-3 py-1.5 text-xs font-bold text-white backdrop-blur-md">
                    Trusted Care
                  </div>
                  <div className="absolute bottom-4 right-4 rounded-full border border-white/25 bg-black/35 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur-md">
                    Updated {lastUpdated}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="px-4 pb-16 pt-7 sm:px-6">
          <div className="mx-auto w-full max-w-6xl">
            <div className="mb-6 lg:hidden">
              <p className="px-1 text-[10px] font-bold tracking-widest uppercase text-[#2D3436]/45">
                Policy Menu
              </p>
              <h2 className="mt-1 px-1 text-xl font-black tracking-tight text-[#1F2A37]">
                On this page
              </h2>
              <p className="mt-1 px-1 text-xs text-[#2D3436]/55">
                Updated {lastUpdated}
              </p>
              {isPolicyLoading && (
                <p className="mt-1 px-1 text-[11px] text-[#2D3436]/50">
                  Syncing policy data...
                </p>
              )}

              <div className="relative mt-3">
                <Search
                  size={16}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#1F2A37]/45"
                />
                <input
                  type="text"
                  value={searchText}
                  onChange={(event) => setSearchText(event.target.value)}
                  placeholder="Search section..."
                  className="h-10 w-full rounded-xl border border-[#2D3436]/10 bg-white pl-9 pr-4 text-sm text-[#1F2A37] outline-none transition-all placeholder:text-[#1F2A37]/45 focus:border-[#D97853]/45 focus:ring-2 focus:ring-[#D97853]/20"
                />
              </div>

              <div className="mt-3 space-y-1">
                {filteredSections.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeSection === item.id;

                  return (
                    <button
                      key={`mobile-${item.id}`}
                      type="button"
                      onClick={() => handleTocClick(item.id)}
                      className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D97853] focus-visible:ring-offset-2 ${
                        isActive
                          ? "bg-[#D97853] text-white"
                          : "text-[#2D3436]/70 hover:bg-[#2D3436]/5 hover:text-[#2D3436]"
                      }`}
                    >
                      <Icon size={18} className="shrink-0" />
                      <span className="truncate">
                        {item.tocTitle || item.title}
                      </span>
                    </button>
                  );
                })}

                {filteredSections.length === 0 && (
                  <p className="px-3 py-2 text-sm text-[#1F2A37]/55">
                    No matching sections.
                  </p>
                )}
              </div>
            </div>

            <div className="grid items-start gap-6 lg:grid-cols-[290px_minmax(0,1fr)]">
              <aside className="hidden lg:block lg:sticky lg:top-24">
                <div className="px-1">
                  <p className="px-3 mb-1 text-[10px] font-bold tracking-widest uppercase text-[#2D3436]/40">
                    Policies
                  </p>
                  <h2 className="px-3 text-lg font-black tracking-tight text-[#1F2A37]">
                    On this page
                  </h2>
                  <p className="px-3 mt-1 text-xs text-[#2D3436]/55">
                    Updated {lastUpdated}
                  </p>
                  {isPolicyLoading && (
                    <p className="px-3 mt-1 text-[11px] text-[#2D3436]/50">
                      Syncing policy data...
                    </p>
                  )}

                  <div className="relative mt-4">
                    <Search
                      size={16}
                      className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#1F2A37]/45"
                    />
                    <input
                      type="text"
                      value={searchText}
                      onChange={(event) => setSearchText(event.target.value)}
                      placeholder="Search section..."
                      className="h-10 w-full rounded-xl border border-[#2D3436]/10 bg-white pl-9 pr-4 text-sm text-[#1F2A37] outline-none transition-all placeholder:text-[#1F2A37]/45 focus:border-[#D97853]/45 focus:ring-2 focus:ring-[#D97853]/20"
                    />
                  </div>

                  <div className="mt-4 space-y-1">
                    {filteredSections.map((item) => {
                      const Icon = item.icon;
                      const isActive = activeSection === item.id;

                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => handleTocClick(item.id)}
                          className={`flex w-full items-center gap-3 px-3 py-2.5 rounded-xl font-medium text-sm transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D97853] focus-visible:ring-offset-2 ${
                            isActive
                              ? "bg-[#D97853] text-white"
                              : "text-[#2D3436]/70 hover:bg-[#2D3436]/5 hover:text-[#2D3436]"
                          }`}
                        >
                          <Icon size={18} className="shrink-0" />
                          <span className="truncate">
                            {item.tocTitle || item.title}
                          </span>
                        </button>
                      );
                    })}

                    {filteredSections.length === 0 && (
                      <p className="px-3 py-2 text-sm text-[#1F2A37]/55">
                        No matching sections.
                      </p>
                    )}
                  </div>
                </div>
              </aside>

              <div>
                <div className="space-y-4">
                  {sectionsBeforeSupport.map((section) => (
                    <PolicySectionCard
                      key={section.id}
                      section={section}
                      isActive={activeSection === section.id}
                      onCopyLink={copySectionLink}
                    />
                  ))}

                  <div className="relative overflow-hidden rounded-3xl border border-[#E07A5F]/30 bg-gradient-to-br from-[#E07A5F]/18 via-[#FBE4DD] to-[#F5F1EB] px-5 py-5 shadow-[0_20px_40px_rgba(224,122,95,0.14)] md:px-6">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#E07A5F]/20 text-[#E07A5F]">
                        <TriangleAlert size={20} />
                      </div>
                      <div>
                        <h3 className="text-lg font-black tracking-tight text-[#1F2A37]">
                          Important Notice
                        </h3>
                        <p className="mt-2 text-[14px] leading-relaxed text-[#1F2A37]/78">
                          HappyTails reserves the right to refuse service if a
                          pet&apos;s health condition poses a risk to other pets
                          or staff.
                        </p>
                      </div>
                    </div>
                  </div>

                  {supportSection && (
                    <PolicySectionCard
                      section={supportSection}
                      isActive={activeSection === supportSection.id}
                      onCopyLink={copySectionLink}
                    />
                  )}

                  <div className="relative overflow-hidden rounded-[2rem] bg-[#1F2A37] p-5 text-white shadow-[0_26px_60px_rgba(15,23,42,0.35)] md:p-6">
                    <div className="pointer-events-none absolute -right-14 -top-14 h-48 w-48 rounded-full bg-[#E07A5F]/25 blur-3xl" />
                    <div className="pointer-events-none absolute -bottom-14 left-20 h-44 w-44 rounded-full bg-[#7FB069]/20 blur-3xl" />

                    <div className="relative grid items-center gap-7 lg:grid-cols-12">
                      <div className="lg:col-span-7">
                        <p className="text-xs font-bold uppercase tracking-[0.22em] text-slate-300">
                          Need Assistance
                        </p>
                        <h3 className="mt-3 text-2xl font-black tracking-tight md:text-[2rem]">
                          We&apos;re here to help before and after your booking.
                        </h3>
                        <p className="mt-3 max-w-xl text-sm leading-relaxed text-slate-300">
                          Reach out anytime for policy clarification, booking
                          guidance, or special pet care requests.
                        </p>

                        <div className="mt-5 flex flex-wrap gap-2.5">
                          <a
                            href="mailto:support@happytails.com"
                            className="inline-flex items-center gap-2 rounded-full bg-[#E07A5F] px-4 py-2 text-xs font-bold text-white transition-all hover:bg-[#d96f54] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E07A5F] focus-visible:ring-offset-2 focus-visible:ring-offset-[#1F2A37]"
                          >
                            <Mail size={16} />
                            Email Support
                          </a>
                          <a
                            href="tel:+84000000000"
                            className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-4 py-2 text-xs font-bold text-white transition-all hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E07A5F] focus-visible:ring-offset-2 focus-visible:ring-offset-[#1F2A37]"
                          >
                            <PhoneCall size={16} />
                            Call Now
                          </a>
                        </div>

                        <div className="mt-5 inline-flex items-center gap-2 text-xs text-slate-300">
                          <Clock3 size={15} className="text-[#7FB069]" />
                          Available daily from 08:00 to 23:00
                        </div>
                      </div>

                      <div className="lg:col-span-5">
                        <div className="relative overflow-hidden rounded-3xl border border-white/15">
                          <img
                            src={SUPPORT_IMAGE}
                            alt="Happy pet support"
                            className="h-[230px] w-full object-cover"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-[#0B1220]/40 via-transparent to-transparent" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />

      {toastMessage && (
        <div
          className="fixed bottom-24 right-5 z-[70] rounded-full border border-[#1F2A37]/15 bg-white px-4 py-2 text-sm font-semibold text-[#1F2A37] shadow-[0_18px_35px_rgba(15,23,42,0.18)]"
          role="status"
          aria-live="polite"
        >
          {toastMessage}
        </div>
      )}

      {showBackTop && (
        <button
          type="button"
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          className="fixed bottom-6 right-6 z-[60] inline-flex h-12 w-12 items-center justify-center rounded-full bg-[#1F2A37] text-white shadow-[0_12px_26px_rgba(15,23,42,0.35)] transition-all hover:bg-[#E07A5F] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E07A5F] focus-visible:ring-offset-2"
          aria-label="Back to top"
        >
          <ArrowUp size={18} />
        </button>
      )}
    </div>
  );
};

export default Policy;
