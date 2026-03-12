import { Link } from 'react-router-dom';
import { ShieldX } from 'lucide-react';

const Unauthorized = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FFFBF5]">
      <div className="text-center max-w-md px-6">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-red-100 rounded-full mb-6">
          <ShieldX className="w-10 h-10 text-red-500" />
        </div>
        <h1 className="text-3xl font-bold text-gray-800 mb-3">Không có quyền truy cập</h1>
        <p className="text-gray-600 mb-8">
          Bạn không có quyền truy cập trang này. Vui lòng liên hệ quản trị viên nếu bạn cho rằng đây là lỗi.
        </p>
        <Link
          to="/"
          className="inline-flex items-center gap-2 px-6 py-3 bg-[#FF8C42] text-white rounded-full font-semibold hover:bg-[#e07a35] transition-colors shadow-lg"
        >
          Về trang chủ
        </Link>
      </div>
    </div>
  );
};

export default Unauthorized;
