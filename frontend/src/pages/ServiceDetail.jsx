import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Clock, Star, CheckCircle } from "lucide-react";
import { getServiceById } from "../api/serviceApi";
import Navbar from "../components/layout/Navbar";
import Footer from "../components/layout/Footer";
import AuthModal from "../components/AuthModal";

const ServiceDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [service, setService] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState("login");
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem("user");
    return stored ? JSON.parse(stored) : null;
  });

  useEffect(() => {
    window.scrollTo(0, 0);
    const fetchService = async () => {
      try {
        setLoading(true);
        const result = await getServiceById(id);
        setService(result?.data || result);
      } catch (err) {
        console.error("Failed to fetch service:", err);
        setError("Service not found");
      } finally {
        setLoading(false);
      }
    };
    fetchService();
  }, [id]);

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
  };

  if (loading) {
    return (
      <div className="bg-[#F5F1EB] min-h-screen font-sans text-[#1F2A37]">
        <Navbar
          onLoginClick={openLoginModal}
          onRegisterClick={openRegisterModal}
          user={user}
          onLogout={() => setUser(null)}
        />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="w-10 h-10 border-4 border-[#E07A5F]/30 border-t-[#E07A5F] rounded-full animate-spin"></div>
        </div>
        <Footer />
      </div>
    );
  }

  if (error || !service) {
    return (
      <div className="bg-[#F5F1EB] min-h-screen font-sans text-[#1F2A37]">
        <Navbar
          onLoginClick={openLoginModal}
          onRegisterClick={openRegisterModal}
          user={user}
          onLogout={() => setUser(null)}
        />
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
          <p className="text-[#1F2A37]/60 text-lg">
            {error || "Service not found"}
          </p>
          <button
            onClick={() => navigate("/service")}
            className="text-[#E07A5F] font-bold hover:underline"
          >
            Back to Services
          </button>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="bg-[#F5F1EB] min-h-screen font-sans text-[#1F2A37] selection:bg-[#E07A5F] selection:text-white">
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

      <main className="w-full max-w-[1100px] mx-auto px-6 xl:px-4 pt-28 pb-20">
        {/* Back Button */}
        <button
          onClick={() => navigate("/service")}
          className="flex items-center gap-2 text-[#1F2A37]/60 hover:text-[#1F2A37] font-medium text-sm mb-8 transition-colors"
        >
          <ArrowLeft size={18} /> Back to Services
        </button>

        <div className="grid lg:grid-cols-2 gap-10 lg:gap-16">
          {/* Image */}
          <div className="rounded-[24px] overflow-hidden bg-white shadow-[0_8px_30px_rgba(0,0,0,0.06)] border border-[#1F2A37]/5">
            <img
              src={service.images?.[0] || "/placeholder-service.jpg"}
              alt={service.name}
              className="w-full h-[400px] object-cover"
            />
          </div>

          {/* Details */}
          <div className="flex flex-col justify-center">
            {service.category?.name && (
              <span className="inline-flex items-center gap-2 bg-[#7FB069]/10 text-[#7FB069] px-3 py-1.5 rounded-full font-bold text-[11px] uppercase tracking-widest mb-4 w-fit">
                {service.category.name}
              </span>
            )}

            <h1 className="text-3xl md:text-4xl font-serif font-black text-[#1F2A37] mb-4">
              {service.name}
            </h1>

            <p className="text-[#1F2A37]/70 text-[15px] leading-relaxed mb-6">
              {service.description}
            </p>

            <div className="flex items-center gap-6 mb-6">
              <div className="flex items-center gap-2 text-[#1F2A37]/60 text-sm">
                <Clock size={16} /> {service.duration} minutes
              </div>
              {service.rating > 0 && (
                <div className="flex items-center gap-1.5 text-[#E07A5F] text-sm font-bold">
                  <Star size={16} fill="currentColor" />{" "}
                  {service.rating.toFixed(1)} ({service.totalReviews} reviews)
                </div>
              )}
            </div>

            {service.features?.length > 0 && (
              <div className="mb-6">
                <h3 className="font-bold text-[#1F2A37] text-sm mb-3">
                  Features
                </h3>
                <ul className="space-y-2">
                  {service.features.map((feat, i) => (
                    <li
                      key={i}
                      className="flex items-center gap-2 text-sm text-[#1F2A37]/70"
                    >
                      <CheckCircle size={16} className="text-[#7FB069]" />{" "}
                      {feat}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex items-center gap-4 mt-auto pt-6 border-t border-[#1F2A37]/10">
              <span className="text-[#E07A5F] font-black text-3xl">
                ${service.price}
              </span>
              <button className="bg-[#E07A5F] text-white px-8 py-3.5 rounded-full font-bold text-[14px] hover:bg-[#c56a52] transition-colors shadow-lg ml-auto">
                Book Now
              </button>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default ServiceDetail;
