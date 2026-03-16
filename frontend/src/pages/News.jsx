import React, { useState, useEffect, useMemo } from "react";
import { motion as Motion } from "framer-motion";
import {
  Calendar,
  Clock,
  ArrowRight,
  User,
  PawPrint,
  Heart,
  ChevronRight,
  MapPin,
  Phone,
  Mail,
  Flame,
  Sparkles,
  Newspaper,
} from "lucide-react";
import Navbar from "../components/layout/Navbar";
import AuthModal from "../components/AuthModal";
import { Link, useNavigate } from "react-router-dom";
import { getAllNews } from "../api/newsApi";

const NEWS_FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1548199973-03cce0bbc87b?auto=format&fit=crop&q=80&w=1200";

const SectionHeader = ({
  icon,
  title,
  color = "text-[#2D3436]",
  iconBg = "bg-[#FDF3EE]",
  iconColor = "text-[#D97853]",
  className = "mb-12",
}) => (
  <h2
    className={`text-2xl md:text-3xl font-black ${color} flex items-center gap-4 ${className}`}
  >
    <div
      className={`w-12 h-12 md:w-14 md:h-14 rounded-2xl ${iconBg} ${iconColor} flex items-center justify-center shrink-0 shadow-sm border border-black/5`}
    >
      {icon}
    </div>
    <span className="tracking-tight">{title}</span>
  </h2>
);

const CATEGORY_TAG_MAP = {
  announcement: "COMMUNITY",
  tips: "WELLNESS",
  promotion: "PROMOTION",
  event: "EVENT",
  general: "PET CARE",
};

const toPlainText = (value) =>
  String(value || "")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const formatNewsDate = (value) => {
  if (!value) return "--";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "--";
  return parsed.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const formatRelativeTime = (value) => {
  if (!value) return "Recently";
  const parsed = new Date(value).getTime();
  if (Number.isNaN(parsed)) return "Recently";

  const diffMs = Date.now() - parsed;
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (diffMs < minute) return "Just now";
  if (diffMs < hour) return `${Math.floor(diffMs / minute)} minutes ago`;
  if (diffMs < day) return `${Math.floor(diffMs / hour)} hours ago`;
  if (diffMs < 7 * day) return `${Math.floor(diffMs / day)} days ago`;
  return "1 week ago";
};

const estimateReadTime = (text) => {
  const words = toPlainText(text).split(" ").filter(Boolean).length;
  return `${Math.max(2, Math.ceil(words / 220))} min read`;
};

const isValidImageUrl = (value) =>
  typeof value === "string" && /^https?:\/\//i.test(value.trim());

const mapPublicNewsItem = (item, index) => {
  const publishedAt = item?.publishedAt || item?.createdAt;
  const summary = toPlainText(item?.excerpt || item?.content).slice(0, 180);
  const categoryValue = String(item?.category || "general").toLowerCase();
  const coverCandidate = item?.coverImage;
  const firstImageCandidate = Array.isArray(item?.images) ? item.images[0] : "";

  return {
    id: item?._id || `api-news-${index}`,
    slug: item?.slug || "",
    img: isValidImageUrl(coverCandidate)
      ? coverCandidate
      : isValidImageUrl(firstImageCandidate)
        ? firstImageCandidate
        : NEWS_FALLBACK_IMAGE,
    tag: CATEGORY_TAG_MAP[categoryValue] || "PET CARE",
    title: item?.title || "Untitled article",
    desc: summary || "No summary available for this article yet.",
    author: item?.author?.name || "HappyTails Editorial",
    timeRelative: formatRelativeTime(publishedAt),
    dateLabel: formatNewsDate(publishedAt),
    readTime: estimateReadTime(item?.content || item?.excerpt),
    categoryValue,
    viewsCount: Number(item?.views || 0),
    content: toPlainText(item?.content || ""),
  };
};

const News = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem("user");
    return stored ? JSON.parse(stored) : null;
  });
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState("login");
  const [publicNews, setPublicNews] = useState([]);
  const [isLoadingPublicNews, setIsLoadingPublicNews] = useState(false);
  const [publicNewsError, setPublicNewsError] = useState("");

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    const fetchPublicNews = async () => {
      setIsLoadingPublicNews(true);
      setPublicNewsError("");

      try {
        const response = await getAllNews();
        const items = response?.data?.news || [];
        const mapped = items.map(mapPublicNewsItem);
        setPublicNews(mapped);
      } catch (error) {
        const payload = error?.response?.data;
        const message =
          payload?.error?.message ||
          payload?.message ||
          error?.message ||
          "Unable to load latest news right now.";
        setPublicNewsError(message);
        setPublicNews([]);
      } finally {
        setIsLoadingPublicNews(false);
      }
    };

    fetchPublicNews();
  }, []);

  const mergedNews = useMemo(
    () => (Array.isArray(publicNews) ? publicNews : []),
    [publicNews],
  );

  const heroArticle = mergedNews[0] || null;
  const nonHeroNews = useMemo(() => mergedNews.slice(1), [mergedNews]);

  const latestNews = useMemo(() => nonHeroNews.slice(0, 5), [nonHeroNews]);

  const mostPopularNews = useMemo(
    () =>
      [...nonHeroNews].sort((a, b) => b.viewsCount - a.viewsCount).slice(0, 5),
    [nonHeroNews],
  );

  const trendingArticles = useMemo(
    () =>
      [...nonHeroNews].sort((a, b) => b.viewsCount - a.viewsCount).slice(0, 8),
    [nonHeroNews],
  );

  const healthAndWellnessArticles = useMemo(
    () =>
      nonHeroNews
        .filter((item) =>
          ["tips", "announcement", "general"].includes(item.categoryValue),
        )
        .slice(0, 6),
    [nonHeroNews],
  );

  const promotionArticles = useMemo(
    () =>
      nonHeroNews
        .filter((item) => item.categoryValue === "promotion")
        .slice(0, 3),
    [nonHeroNews],
  );

  const morePetCareArticles = useMemo(
    () =>
      nonHeroNews
        .filter((item) => item.categoryValue === "general")
        .slice(0, 4),
    [nonHeroNews],
  );

  const handleLoginSuccess = (userData) => {
    setUser(userData);
    setIsAuthModalOpen(false);
    // Role-based navigation
    if (userData.role === "admin") {
      navigate("/admin");
    } else if (userData.role === "staff") {
      navigate("/staff");
    }
    // Customer stays on News page
  };

  const openLoginModal = () => {
    setAuthModalMode("login");
    setIsAuthModalOpen(true);
  };

  const openRegisterModal = () => {
    setAuthModalMode("register");
    setIsAuthModalOpen(true);
  };

  const openNewsDetail = (item) => {
    if (!item?.slug) return;
    navigate(`/news/${item.slug}`);
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

      <main className="pt-24 pb-12">
        {isLoadingPublicNews && (
          <div className="container mx-auto px-6 max-w-7xl mt-2 mb-4">
            <div className="rounded-2xl border border-[#5B8C51]/20 bg-[#E8F3D6] px-4 py-3 text-sm font-semibold text-[#2D3436]/80">
              Loading latest news from HappyTails...
            </div>
          </div>
        )}

        {!!publicNewsError && (
          <div className="container mx-auto px-6 max-w-7xl mt-2 mb-4">
            <div className="rounded-2xl border border-[#D97853]/25 bg-[#FDF3EE] px-4 py-3 text-sm font-semibold text-[#2D3436]/80">
              {publicNewsError}
            </div>
          </div>
        )}

        {/* HERO NEWS SECTION - Yêu cầu 1: Làm to bài đầu tiên và bỏ card */}
        <section className="container mx-auto px-6 mb-12 max-w-7xl mt-4">
          {heroArticle ? (
            <div className="flex flex-col md:flex-row items-center gap-8 lg:gap-14">
              {/* Left Content */}
              <div className="w-full md:w-1/2">
                <span className="inline-block bg-[#E8F3D6] text-[#5B8C51] text-[11px] font-bold px-3.5 py-1.5 rounded-full uppercase tracking-widest mb-4 shadow-sm">
                  {heroArticle.tag}
                </span>
                <h1 className="text-4xl md:text-5xl lg:text-[50px] font-black text-[#2D3436] mb-5 leading-[1.1] tracking-tight">
                  {heroArticle.title}
                </h1>
                <p className="text-base md:text-[17px] text-[#2D3436]/70 mb-6 leading-relaxed max-w-xl">
                  {heroArticle.desc}
                </p>

                <div className="flex flex-wrap items-center gap-4 mb-7 text-[14px] text-[#2D3436]/60 font-medium border-l-[3px] border-[#D97853] pl-3.5">
                  <div className="flex items-center gap-1.5">
                    <User size={16} className="text-[#D97853]" />
                    <span>{heroArticle.author}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Calendar size={16} className="text-[#D97853]" />
                    <span>{heroArticle.dateLabel}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Clock size={16} className="text-[#D97853]" />
                    <span>{heroArticle.readTime}</span>
                  </div>
                </div>

                <Motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => openNewsDetail(heroArticle)}
                  className="bg-[#D97853] text-white px-7 py-3.5 rounded-full font-bold shadow-md hover:bg-[#c66846] transition-all flex items-center gap-2 text-[14px] w-max"
                >
                  Read Latest Article <ArrowRight size={18} />
                </Motion.button>
              </div>

              {/* Right Image */}
              <div className="w-full md:w-1/2 relative mt-4 md:mt-0">
                <div className="absolute inset-0 bg-[#D97853] blur-[70px] opacity-20 rounded-full w-[80%] h-[80%] left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2" />
                <img
                  src={heroArticle.img}
                  alt={heroArticle.title}
                  className="relative z-10 w-full h-[280px] md:h-[340px] lg:h-[420px] object-cover rounded-[2rem] shadow-xl border-4 border-white/60"
                />
              </div>
            </div>
          ) : (
            <div className="rounded-3xl border border-[#2D3436]/10 bg-white p-8 text-center">
              <h1 className="text-3xl md:text-4xl font-black text-[#2D3436] tracking-tight">
                News Is Being Updated
              </h1>
              <p className="mt-3 text-[#2D3436]/65 text-base">
                There are no published news articles yet.
              </p>
            </div>
          )}
        </section>

        {/* LATEST NEWS (TechCrunch Style) Moved Below Hero */}
        <section className="container mx-auto px-6 mb-16 max-w-7xl">
          <div className="flex flex-col lg:flex-row gap-10 xl:gap-16">
            {/* Left Column: Latest News */}
            <div className="w-full lg:w-2/3">
              <div className="flex items-center justify-between border-b-[3px] border-[#0F172A]/10 pb-3 mb-6 pt-2">
                <SectionHeader
                  icon={<Newspaper size={24} fill="currentColor" />}
                  title="Latest News"
                  color="text-[#0F172A]"
                  iconBg="bg-[#5B8C51]/20"
                  iconColor="text-[#5B8C51]"
                  className="mb-0"
                />
                <button className="hidden md:flex items-center gap-2 text-xs font-bold text-[#0F172A] border border-[#0F172A]/20 px-3 py-1.5 rounded-full hover:bg-[#0F172A] hover:text-white transition-colors">
                  See More <ArrowRight size={14} className="-rotate-45" />
                </button>
              </div>

              <div className="space-y-3">
                {latestNews.length > 0 ? (
                  latestNews.map((news, idx) => {
                    const isGreen = ["tips", "announcement"].includes(
                      news.categoryValue,
                    );

                    return (
                      <div
                        key={news.id || idx}
                        onClick={() => openNewsDetail(news)}
                        className="flex flex-col sm:flex-row gap-3.5 group cursor-pointer border-b border-[#2D3436]/5 pb-3 last:border-0 hover:bg-black/[0.02] p-1.5 -mx-1.5 rounded-lg transition-all"
                      >
                        <div className="w-full sm:w-[120px] h-[85px] shrink-0 overflow-hidden relative border border-gray-100 bg-[#f4f4f4] rounded-md">
                          <img
                            src={news.img}
                            className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-90 group-hover:opacity-100"
                            alt={news.title}
                          />
                        </div>
                        <div className="flex flex-col justify-center py-0.5">
                          <div className="flex items-center gap-1.5 mb-1">
                            {isGreen && (
                              <div className="bg-[#5B8C51] text-white p-[1px] rounded-sm">
                                <Heart size={8} fill="white" />
                              </div>
                            )}
                            <span
                              className={`text-[9px] font-black uppercase tracking-widest ${isGreen ? "text-[#5B8C51]" : "text-[#D97853]"}`}
                            >
                              {news.tag}
                            </span>
                          </div>
                          <h3 className="text-[13.5px] font-bold text-[#0F172A] leading-snug mb-1 group-hover:text-[#D97853] transition-colors">
                            {news.title}
                          </h3>
                          <div className="text-[11px] text-[#2D3436]/40 font-medium mt-auto">
                            {news.author} <span className="mx-1">•</span>{" "}
                            {news.timeRelative}
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="rounded-xl border border-dashed border-[#2D3436]/20 bg-[#FDFBF7] px-4 py-6 text-sm text-[#2D3436]/60">
                    No latest news yet.
                  </div>
                )}
              </div>
            </div>

            {/* Right Column: Most Popular */}
            <div className="w-full lg:w-1/3">
              <div className="bg-white border border-gray-200 p-4 mb-5 relative hidden lg:block hover:shadow-sm transition-shadow rounded-lg">
                <div className="text-[9px] font-black uppercase text-[#0F172A]/40 tracking-widest mb-2">
                  SPONSORED
                </div>
                <h4 className="font-bold text-[#0F172A] text-[15px] leading-tight mb-2">
                  Premium Wellness Package 2026
                </h4>
                <p className="text-[12px] text-[#2D3436]/60 mb-4">
                  Register by March 13 to save up to $300 on our all-inclusive
                  annual pet healthcare plan.
                </p>
                <button className="bg-[#5B8C51] text-white font-bold text-[10px] uppercase px-3 py-1.5 rounded hover:bg-[#4a7242] transition-colors flex items-center gap-1.5 w-max">
                  REGISTER NOW <ChevronRight size={12} />
                </button>
              </div>

              <div className="bg-[#0F172A] text-white p-5 relative overflow-hidden shadow-xl rounded-xl border border-white/5">
                {/* Decorative background element */}
                <div className="absolute top-0 right-0 w-20 h-20 bg-[#D97853] opacity-20 blur-2xl rounded-full translate-x-1/2 -translate-y-1/2 max-w-none"></div>

                <div className="flex justify-between items-start mb-5 relative z-10">
                  <h3 className="text-xl font-black leading-none tracking-tight">
                    Most
                    <br />
                    Popular
                  </h3>
                  <div className="w-8 h-8 bg-[#E8F3D6] rounded-sm flex items-center justify-center -rotate-6">
                    <ArrowRight
                      size={14}
                      className="text-[#0F172A] -rotate-45"
                    />
                  </div>
                </div>

                <ul className="space-y-3 relative z-10 font-medium">
                  {mostPopularNews.length > 0 ? (
                    mostPopularNews.map((item, idx) => (
                      <li
                        key={idx}
                        onClick={() => openNewsDetail(item)}
                        className="flex gap-2.5 group cursor-pointer border-b border-white/10 pb-3 last:border-0 last:pb-0"
                      >
                        <div className="w-1.5 h-1.5 rounded-sm bg-[#D97853] mt-1.5 shrink-0 group-hover:scale-150 transition-transform" />
                        <span className="text-[12px] leading-snug group-hover:text-[#D97853] transition-colors text-white/90">
                          {item.title}
                        </span>
                      </li>
                    ))
                  ) : (
                    <li className="text-[12px] text-white/60">
                      No popular news yet.
                    </li>
                  )}
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
              {healthAndWellnessArticles.length > 0 ? (
                healthAndWellnessArticles.map((art, i) => (
                  <div
                    key={i}
                    onClick={() => openNewsDetail(art)}
                    className="bg-[#1A1A1A] rounded-[0.8rem] p-1.5 border border-white/5 hover:border-[#5B8C51]/50 transition-all duration-500 group cursor-pointer hover:-translate-y-1 relative shadow-xl flex flex-col h-full"
                  >
                    <div className="relative h-[100px] rounded-[0.6rem] overflow-hidden mb-2 w-full shrink-0">
                      <img
                        src={art.img}
                        className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 opacity-90 group-hover:opacity-100"
                        alt={art.title}
                      />
                      <div className="absolute top-2 left-2 bg-black/70 backdrop-blur-md text-[#5B8C51] text-[7px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-widest border border-white/10">
                        {art.tag}
                      </div>
                    </div>
                    <div className="px-1.5 pb-1 flex flex-col grow">
                      <h3 className="font-extrabold text-white text-[13px] mb-1 leading-tight group-hover:text-[#5B8C51] transition-colors line-clamp-2">
                        {art.title}
                      </h3>
                      <p className="text-[10px] text-white/50 line-clamp-2 leading-tight mb-2">
                        {art.desc}
                      </p>
                      <div className="mt-auto flex items-center gap-1.5 text-[8px] font-bold text-white/30 uppercase tracking-wider">
                        <span>{art.dateLabel}</span>
                        <span className="w-1 h-1 rounded-full bg-white/20" />
                        <span>{art.readTime}</span>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="md:col-span-2 lg:col-span-3 rounded-2xl border border-dashed border-white/20 px-4 py-6 text-sm text-white/60">
                  No health and wellness news yet.
                </div>
              )}
            </div>
          </div>
        </section>

        {/* TRENDING PET ARTICLES */}
        <section className="mb-24">
          <div className="container mx-auto px-6 mb-8 flex justify-between items-end max-w-7xl">
            <SectionHeader
              icon={<Flame size={26} fill="currentColor" />}
              title="Trending Pet Articles"
              iconBg="bg-[#5B8C51]/20"
              iconColor="text-[#5B8C51]"
              className="mb-0"
            />
            <div className="flex gap-2">
              <button className="w-10 h-10 rounded-full bg-white shadow-sm border border-gray-100 flex items-center justify-center hover:bg-[#D97853] hover:text-white transition-colors">
                <ArrowRight size={18} className="rotate-180" />
              </button>
              <button className="w-10 h-10 rounded-full bg-white shadow-sm border border-gray-100 flex items-center justify-center hover:bg-[#D97853] hover:text-white transition-colors">
                <ArrowRight size={18} />
              </button>
            </div>
          </div>

          {/* Scroll container */}
          <div className="w-full overflow-x-auto pb-4 px-6 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            <div className="flex gap-6 w-max mx-auto md:mx-0 pr-6">
              {trendingArticles.length > 0 ? (
                trendingArticles.map((article, idx) => (
                  <div
                    key={article.id || idx}
                    onClick={() => openNewsDetail(article)}
                    className="w-[280px] h-[340px] rounded-[2rem] overflow-hidden relative group cursor-pointer shadow-sm hover:shadow-xl transition-all border border-gray-100 bg-white"
                  >
                    <div className="absolute inset-0 w-full h-full">
                      <img
                        src={article.img}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                        alt={article.title}
                      />
                    </div>
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                    <div className="absolute bottom-0 left-0 p-6 z-10">
                      <span className="bg-[#D97853] text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-widest mb-3 inline-block shadow-sm">
                        {article.tag}
                      </span>
                      <h3 className="text-white font-bold text-lg leading-tight group-hover:text-[#FDF3EE] transition-colors">
                        {article.title}
                      </h3>
                    </div>
                  </div>
                ))
              ) : (
                <div className="w-full rounded-2xl border border-dashed border-[#2D3436]/20 bg-white px-5 py-6 text-sm text-[#2D3436]/60">
                  No trending news yet.
                </div>
              )}
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
              <h2 className="text-2xl md:text-3xl font-black tracking-tight text-[#2D3436]">
                HappyTails Updates
              </h2>
              <div className="bg-[#FFE5D6] text-[#FF8A5B] text-[12px] font-medium px-3.5 py-1.5 rounded-full flex items-center gap-1.5 ml-2">
                🎉 Special Offers
              </div>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              {promotionArticles.length > 0 ? (
                promotionArticles.map((promo, idx) => (
                  <div
                    key={promo.id || idx}
                    onClick={() => openNewsDetail(promo)}
                    className="bg-white rounded-[1.5rem] shadow-sm hover:shadow-2xl transition-all duration-500 border border-gray-100 group cursor-pointer flex flex-col h-full transform hover:-translate-y-1 overflow-hidden relative"
                  >
                    <div className="relative h-[220px] w-full shrink-0">
                      <img
                        src={promo.img}
                        className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                        alt={promo.title}
                      />
                      <div className="absolute top-4 right-4 bg-[#FF8A5B] text-white text-[11px] font-bold px-3 py-1.5 rounded-full flex items-center gap-1.5 shadow-md">
                        <Sparkles size={12} fill="currentColor" />
                        {promo.tag}
                      </div>
                    </div>
                    <div className="p-6 flex flex-col grow relative bg-white">
                      <h3 className="font-bold text-[#2D3436] text-[17px] mb-3 leading-snug group-hover:text-[#FF8A5B] transition-colors">
                        {promo.title}
                      </h3>
                      <p className="text-[14px] text-[#2D3436]/60 leading-relaxed mb-8 relative z-10">
                        {promo.desc}
                      </p>

                      <div className="mt-auto relative z-10 flex items-center gap-1.5 text-[#FF8A5B] font-bold text-[13px] hover:text-[#D97853] transition-colors">
                        Learn More{" "}
                        <ArrowRight
                          className="group-hover:translate-x-1 transition-transform"
                          size={16}
                        />
                      </div>

                      {/* Faint Paw Background inside card */}
                      <PawPrint
                        size={140}
                        className="absolute -bottom-8 -right-8 text-[#2D3436]/[0.03] pointer-events-none -rotate-12 group-hover:scale-110 transition-transform duration-500"
                      />
                    </div>
                  </div>
                ))
              ) : (
                <div className="md:col-span-3 rounded-2xl border border-dashed border-[#D97853]/20 bg-white px-5 py-6 text-sm text-[#2D3436]/60">
                  No promotion updates yet.
                </div>
              )}
            </div>
          </div>
        </section>

        {/* MORE PET CARE SECTION */}
        <section className="bg-[#F5F9F5] py-20">
          <div className="container mx-auto px-6 max-w-7xl">
            <SectionHeader
              icon={<PawPrint size={26} fill="currentColor" />}
              title="More Pet Care"
              color="text-[#5B8C51]"
              iconBg="bg-[#5B8C51]/20"
              iconColor="text-[#5B8C51]"
              className="mb-10"
            />

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {morePetCareArticles.length > 0 ? (
                morePetCareArticles.map((art, i) => (
                  <div
                    key={art.id || i}
                    onClick={() => openNewsDetail(art)}
                    className="bg-white rounded-3xl shadow-sm border border-gray-100 hover:shadow-xl transition-all duration-500 group cursor-pointer flex flex-col hover:-translate-y-1"
                  >
                    <div className="relative h-[200px] w-full rounded-t-3xl overflow-hidden shrink-0">
                      <img
                        src={art.img}
                        className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                        alt={art.title}
                      />
                      <div className="absolute top-4 left-4 bg-[#F2F7F2] border border-[#5B8C51]/20 text-[#5B8C51] text-[11px] font-bold px-4 py-1.5 rounded-full shadow-sm">
                        {art.tag}
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
                          <span>{art.dateLabel}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Clock size={14} />
                          <span>{art.readTime}</span>
                        </div>
                        <ArrowRight
                          size={16}
                          className="ml-auto text-[#5B8C51] opacity-0 group-hover:opacity-100 transition-all -translate-x-2 group-hover:translate-x-0 duration-300"
                        />
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="col-span-1 md:col-span-2 lg:col-span-4 rounded-2xl border border-dashed border-[#5B8C51]/25 bg-white px-5 py-6 text-sm text-[#2D3436]/60">
                  No more pet care articles yet.
                </div>
              )}
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

export default News;
