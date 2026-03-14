import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";

const ServiceBreadcrumb = ({ serviceTitle }) => (
  <nav className="flex items-center gap-1.5 text-[12px] font-semibold text-[#1F2A37]/50 mb-4">
    <Link to="/" className="hover:text-[#E07A5F] transition-colors">
      Home
    </Link>
    <ChevronRight size={12} className="text-gray-300" />
    <Link to="/service" className="hover:text-[#E07A5F] transition-colors">
      Services
    </Link>
    <ChevronRight size={12} className="text-gray-300" />
    <span className="text-[#1F2A37] font-bold">{serviceTitle}</span>
  </nav>
);

export default ServiceBreadcrumb;
