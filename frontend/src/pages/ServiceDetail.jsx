import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

const ServiceDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  return (
    <div className="bg-[#F5F1EB] min-h-screen font-sans text-[#1F2A37] flex flex-col items-center justify-center px-6">
      <div className="text-center max-w-md">
        <h1 className="text-3xl font-serif font-black mb-3">Service Detail</h1>
        <p className="text-[#1F2A37]/60 text-sm mb-6">
          Service ID: <span className="font-bold text-[#E07A5F]">{id}</span>
        </p>
        <p className="text-[#1F2A37]/50 text-sm mb-8">
          This page is under construction.
        </p>
        <button
          onClick={() => navigate("/service")}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#E07A5F] text-white rounded-full text-sm font-bold hover:bg-[#c56a52] transition-colors"
        >
          <ArrowLeft size={16} /> Back to Services
        </button>
      </div>
    </div>
  );
};

export default ServiceDetail;
