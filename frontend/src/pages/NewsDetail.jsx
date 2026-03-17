import React, { useEffect, useState } from "react";
import {
  Calendar,
  Clock,
  User,
  ChevronLeft,
  PawPrint,
  MapPin,
  Phone,
  Mail,
} from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import Navbar from "../components/layout/Navbar";
import AuthModal from "../components/AuthModal";
import { getNewsBySlug } from "../api/newsApi";

const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1548199973-03cce0bbc87b?auto=format&fit=crop&q=80&w=1200";

const toPlainText = (value) =>
  String(value || "")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const formatDate = (value) => {
  if (!value) return "--";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "--";

  return parsed.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const estimateReadTime = (text) => {
  const words = toPlainText(text).split(" ").filter(Boolean).length;
  return `${Math.max(2, Math.ceil(words / 220))} min read`;
};

const mapNewsDetail = (item) => {
  const publishedAt = item?.publishedAt || item?.createdAt;
  const description = toPlainText(item?.excerpt || item?.content);
  const coverCandidate = item?.coverImage;
  const firstImageCandidate = Array.isArray(item?.images) ? item.images[0] : "";
  const hasCover =
    typeof coverCandidate === "string" && /^https?:\/\//i.test(coverCandidate);
  const hasFirst =
    typeof firstImageCandidate === "string" &&
    /^https?:\/\//i.test(firstImageCandidate);

  return {
    title: item?.title || "Untitled article",
    author: item?.author?.name || "HappyTails Editorial",
    dateLabel: formatDate(publishedAt),
    readTime: estimateReadTime(item?.content || item?.excerpt),
    image: hasCover
      ? coverCandidate
      : hasFirst
        ? firstImageCandidate
        : FALLBACK_IMAGE,
    description:
      description || "No description available for this article yet.",
  };
};

const NewsDetail = () => {
  const { slug } = useParams();
  const navigate = useNavigate();

  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem("user");
    return stored ? JSON.parse(stored) : null;
  });
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState("login");

  const [newsDetail, setNewsDetail] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [slug]);

  useEffect(() => {
    const fetchNewsDetail = async () => {
      if (!slug) {
        setErrorMessage("Invalid news detail URL.");
        return;
      }

      setIsLoading(true);
      setErrorMessage("");

      try {
        const response = await getNewsBySlug(slug);
        const item = response?.data?.news;

        if (!item) {
          setErrorMessage("News detail not found.");
          setNewsDetail(null);
          return;
        }

        setNewsDetail(mapNewsDetail(item));
      } catch (error) {
        const payload = error?.response?.data;
        const rawMessage =
          payload?.error?.message ||
          payload?.message ||
          error?.message ||
          "Unable to load news detail right now.";

        const message =
          /app\s*error\s*is\s*not\s*a\s*constructor/i.test(rawMessage) ||
          /is not a constructor/i.test(rawMessage)
            ? "Unable to load this article right now. Please try again shortly."
            : rawMessage;

        setErrorMessage(message);
        setNewsDetail(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchNewsDetail();
  }, [slug]);

  const handleLoginSuccess = (userData) => {
    setUser(userData);
    setIsAuthModalOpen(false);

    if (userData.role === "admin") {
      navigate("/admin");
    } else if (userData.role === "staff") {
      navigate("/staff");
    }
  };

  const openLoginModal = () => {
    setAuthModalMode("login");
    setIsAuthModalOpen(true);
  };

  const openRegisterModal = () => {
    setAuthModalMode("register");
    setIsAuthModalOpen(true);
  };

  const handleBackToNews = () => {
    if (window.history.length > 1) {
      navigate(-1);
      return;
    }
    navigate("/news");
  };

  return (
    <div className="bg-[#FDFBF7] min-h-screen font-sans text-[#2D3436] selection:bg-[#D97853] selection:text-white overflow-x-hidden">
      <Navbar
        onLoginClick={openLoginModal}
        onRegisterClick={openRegisterModal}
        user={user}
        onLogout={() => setUser(null)}
      />
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        initialMode={authModalMode}
        onLoginSuccess={handleLoginSuccess}
      />

      <main className="pt-28 pb-16">
        <section className="container mx-auto px-6 max-w-7xl">
          <div className="mb-5">
            <button
              type="button"
              onClick={handleBackToNews}
              className="group inline-flex items-center gap-2 rounded-2xl border border-[#E8D7CB] bg-linear-to-r from-white to-[#FFF5EE] px-4 py-2.5 text-sm font-semibold text-[#2D3436] shadow-[0_10px_30px_rgba(45,52,54,0.08)] transition-all hover:-translate-y-0.5 hover:border-[#D97853]/35 hover:shadow-[0_14px_36px_rgba(217,120,83,0.18)]"
            >
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-xl bg-[#D97853] text-white shadow-sm transition-transform group-hover:-translate-x-0.5">
                <ChevronLeft size={15} />
              </span>
              Back to News
            </button>
          </div>

          {isLoading && (
            <div className="rounded-3xl border border-[#2D3436]/10 bg-white p-8 text-center text-[#2D3436]/70 font-semibold">
              Loading news detail...
            </div>
          )}

          {!isLoading && !!errorMessage && (
            <div className="rounded-3xl border border-[#D97853]/20 bg-[#FDF3EE] p-8 text-center">
              <p className="text-[#2D3436] font-semibold">{errorMessage}</p>
              <Link
                to="/news"
                className="inline-block mt-4 rounded-full bg-[#D97853] px-5 py-2 text-white text-sm font-bold hover:bg-[#c66846] transition-colors"
              >
                Back To News
              </Link>
            </div>
          )}

          {!isLoading && !errorMessage && newsDetail && (
            <article className="space-y-6">
              <h1 className="text-3xl md:text-4xl font-black tracking-tight text-[#2D3436] mb-6">
                {newsDetail.title}
              </h1>

              <div className="grid lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] gap-8 items-start">
                <div className="rounded-2xl overflow-hidden border border-[#2D3436]/10 bg-[#F8F6F2]">
                  <img
                    src={newsDetail.image}
                    alt={newsDetail.title}
                    className="w-full h-[260px] md:h-[320px] lg:h-[360px] object-cover"
                  />
                </div>

                <div>
                  <div className="flex flex-wrap items-center gap-4 text-sm text-[#2D3436]/65 font-semibold mb-5">
                    <span className="inline-flex items-center gap-1.5">
                      <User size={15} className="text-[#D97853]" />{" "}
                      {newsDetail.author}
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <Calendar size={15} className="text-[#D97853]" />{" "}
                      {newsDetail.dateLabel}
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <Clock size={15} className="text-[#D97853]" />{" "}
                      {newsDetail.readTime}
                    </span>
                  </div>

                  <p className="text-[16px] leading-relaxed text-[#2D3436]/75 whitespace-pre-line">
                    {newsDetail.description}
                  </p>
                </div>
              </div>
            </article>
          )}
        </section>
      </main>

      <footer className="bg-[#FDFBF7] pt-24 pb-12 px-6 relative overflow-hidden font-sans border-t border-gray-200">
        <div className="absolute bottom-0 right-0 opacity-[0.03] pointer-events-none">
          <PawPrint size={400} />
        </div>

        <div className="container mx-auto relative z-10">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-12 mb-16">
            <div className="md:col-span-4">
              <div className="flex items-center gap-3 mb-6 group cursor-pointer">
                <div className="bg-[#2D3436] p-3 rounded-2xl group-hover:bg-[#D97853] transition-colors">
                  <PawPrint size={28} className="text-white" />
                </div>
                <span className="text-2xl font-black tracking-tighter text-[#2D3436]">
                  HAPPY<span className="text-[#D97853]">TAILS</span>
                </span>
              </div>
              <p className="text-[#2D3436]/60 leading-relaxed mb-6 text-sm">
                Your pet wellness sanctuary. Where luxury meets technology for
                the ultimate pet care experience.
              </p>
              <div className="flex gap-3">
                {["facebook", "instagram", "twitter"].map((s) => (
                  <a
                    key={s}
                    href="#"
                    className="w-10 h-10 rounded-full bg-[#2D3436]/5 flex items-center justify-center hover:bg-[#D97853] hover:text-white transition-all text-[#2D3436]/60 shadow-sm border border-gray-100/50"
                  >
                    <span className="text-xs font-bold uppercase">{s[0]}</span>
                  </a>
                ))}
              </div>
            </div>

            <div className="md:col-span-2">
              <h4 className="text-sm font-black uppercase tracking-wider text-[#2D3436] mb-5">
                Services
              </h4>
              <ul className="space-y-3 text-sm">
                <li>
                  <Link
                    to="/service"
                    className="text-[#2D3436]/60 hover:text-[#D97853] transition-colors"
                  >
                    Organic Spa
                  </Link>
                </li>
                <li>
                  <Link
                    to="/service"
                    className="text-[#2D3436]/60 hover:text-[#D97853] transition-colors"
                  >
                    AI Health Scan
                  </Link>
                </li>
                <li>
                  <Link
                    to="/service"
                    className="text-[#2D3436]/60 hover:text-[#D97853] transition-colors"
                  >
                    Luxury Boarding
                  </Link>
                </li>
                <li>
                  <Link
                    to="/service"
                    className="text-[#2D3436]/60 hover:text-[#D97853] transition-colors"
                  >
                    Styling and Groom
                  </Link>
                </li>
              </ul>
            </div>

            <div className="md:col-span-2">
              <h4 className="text-sm font-black uppercase tracking-wider text-[#2D3436] mb-5">
                Company
              </h4>
              <ul className="space-y-3 text-sm">
                <li>
                  <a
                    href="#"
                    className="text-[#2D3436]/60 hover:text-[#D97853] transition-colors"
                  >
                    About Us
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    className="text-[#2D3436]/60 hover:text-[#D97853] transition-colors"
                  >
                    Our Team
                  </a>
                </li>
                <li>
                  <Link
                    to="/news"
                    className="text-[#D97853] hover:text-[#D97853] font-medium transition-colors"
                  >
                    Blog and News
                  </Link>
                </li>
                <li>
                  <a
                    href="#"
                    className="text-[#2D3436]/60 hover:text-[#D97853] transition-colors"
                  >
                    Careers
                  </a>
                </li>
              </ul>
            </div>

            <div className="md:col-span-4">
              <h4 className="text-sm font-black uppercase tracking-wider text-[#2D3436] mb-5">
                Get In Touch
              </h4>
              <ul className="space-y-4 text-sm">
                <li className="flex items-start gap-3">
                  <MapPin
                    size={18}
                    className="text-[#D97853] mt-0.5 flex-shrink-0"
                  />
                  <span className="text-[#2D3436]/60">
                    123 Pet Wellness Ave, Suite 100
                    <br />
                    Saigon, Vietnam
                  </span>
                </li>
                <li className="flex items-center gap-3">
                  <Phone size={18} className="text-[#D97853] flex-shrink-0" />
                  <span className="text-[#2D3436]/60">+84 (28) 1234 5678</span>
                </li>
                <li className="flex items-center gap-3">
                  <Mail size={18} className="text-[#D97853] flex-shrink-0" />
                  <span className="text-[#2D3436]/60">hello@happytails.vn</span>
                </li>
                <li className="flex items-center gap-3">
                  <Clock size={18} className="text-[#D97853] flex-shrink-0" />
                  <span className="text-[#2D3436]/60">
                    Mon - Sat: 8AM - 8PM
                  </span>
                </li>
              </ul>
            </div>
          </div>

          <div className="border-t border-[#2D3436]/10 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-xs text-[#2D3436]/40">
              2024 HappyTails. All rights reserved.
            </p>
            <div className="flex gap-6 text-xs">
              <a href="#" className="text-[#2D3436]/40 hover:text-[#D97853]">
                Privacy Policy
              </a>
              <a href="#" className="text-[#2D3436]/40 hover:text-[#D97853]">
                Terms of Service
              </a>
              <a href="#" className="text-[#2D3436]/40 hover:text-[#D97853]">
                Cookie Settings
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default NewsDetail;
