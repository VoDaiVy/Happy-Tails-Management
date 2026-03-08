import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Eye, EyeOff, CheckCircle, XCircle, AlertTriangle, Loader2 } from "lucide-react";
import { PawPattern } from "../components/PawPattern";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { useAuth } from "../context/AuthContext";

export function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  // Auto-dismiss success message after 3s
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(""), 3000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  // Auto-dismiss error message after 5s
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(""), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  // Map backend error codes to user-friendly messages
  const getErrorMessage = (err) => {
    const code = err.response?.data?.error?.code;
    const message = err.response?.data?.error?.message;

    switch (code) {
      case "INVALID_CREDENTIALS":
        return "Email hoặc mật khẩu không đúng. Vui lòng thử lại.";
      case "ACCOUNT_LOCKED":
        return message || "Tài khoản đã bị khóa do đăng nhập sai quá nhiều lần. Vui lòng thử lại sau.";
      case "ACCOUNT_DISABLED":
        return "Tài khoản đã bị vô hiệu hóa. Vui lòng liên hệ quản trị viên.";
      case "VALIDATION_ERROR":
        return "Vui lòng nhập đầy đủ email và mật khẩu.";
      case "RATE_LIMIT":
        return "Bạn đã thử quá nhiều lần. Vui lòng đợi một lát rồi thử lại.";
      default:
        if (!err.response) {
          return "Không thể kết nối đến server. Vui lòng kiểm tra kết nối mạng.";
        }
        return message || "Đăng nhập thất bại. Vui lòng thử lại.";
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    // Client-side validation
    if (!email.trim()) {
      setError("Vui lòng nhập email.");
      return;
    }
    if (!password) {
      setError("Vui lòng nhập mật khẩu.");
      return;
    }

    setLoading(true);

    try {
      const result = await login(email, password);

      // Show success message
      setSuccess(`Đăng nhập thành công! Chào mừng ${result.data.user.name || "bạn"} 🎉`);

      // Redirect based on role or to intended destination
      const role = result.data.user.role;
      const from = location.state?.from?.pathname;
      setTimeout(() => {
        if (from) {
          navigate(from, { replace: true });
        } else if (role === "admin") {
          navigate("/admin");
        } else if (role === "staff") {
          navigate("/staff");
        } else {
          navigate("/");
        }
      }, 1000);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    console.log("Login with Google");
  };

  const handleAppleLogin = () => {
    console.log("Login with Apple");
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Side - Image */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-[#FFE8D9] to-[#FFF4EC] items-center justify-center p-12 relative overflow-hidden">
        <PawPattern />
        <div className="relative z-10 max-w-lg">
          <img
            src="https://images.unsplash.com/photo-1702337446616-b48157bfc165?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwZXJzb24lMjBodWdnaW5nJTIwZ29sZGVuJTIwcmV0cmlldmVyJTIwZG9nJTIwaGFwcHl8ZW58MXx8fHwxNzcyMDY3MjU0fDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral"
            alt="Person hugging golden retriever"
            className="w-full h-auto rounded-[32px] shadow-2xl object-cover"
          />
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-[#FFFBF5] relative overflow-hidden">
        <PawPattern />
        <div className="w-full max-w-md relative z-10">
          {/* Logo/Brand */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-[#FF8C42] rounded-[24px] mb-4 shadow-lg">
              <svg
                width="32"
                height="32"
                viewBox="0 0 32 32"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <ellipse cx="16" cy="20" rx="8" ry="10" fill="white" />
                <ellipse cx="7" cy="10" rx="4" ry="5" fill="white" />
                <ellipse cx="16" cy="8" rx="4" ry="5" fill="white" />
                <ellipse cx="25" cy="10" rx="4" ry="5" fill="white" />
                <ellipse cx="22" cy="15" rx="3.5" ry="4.5" fill="white" />
              </svg>
            </div>
            <h1 className="text-4xl font-bold text-gray-800 mb-2">Welcome Back!</h1>
            <p className="text-gray-600">Log in to care for your furry friends</p>
          </div>

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Success Notification */}
            {success && (
              <div className="flex items-center gap-3 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-[16px] text-sm animate-in fade-in">
                <CheckCircle className="w-5 h-5 flex-shrink-0" />
                <span>{success}</span>
              </div>
            )}

            {/* Error Notification */}
            {error && (
              <div className="flex items-center gap-3 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-[16px] text-sm animate-in fade-in">
                <XCircle className="w-5 h-5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email" className="text-gray-700">
                Email or Phone
              </Label>
              <Input
                id="email"
                type="text"
                placeholder="Enter your email or phone"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-14 bg-white border-gray-200 rounded-[24px] px-6 text-gray-800 placeholder:text-gray-400 focus:border-[#FF8C42] focus:ring-[#FF8C42] shadow-sm"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-gray-700">
                Password
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-14 bg-white border-gray-200 rounded-[24px] px-6 pr-14 text-gray-800 placeholder:text-gray-400 focus:border-[#FF8C42] focus:ring-[#FF8C42] shadow-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-end">
              <Link
                to="/forgot-password"
                className="text-sm text-[#FF8C42] hover:text-[#E67A35] font-medium"
              >
                Forgot Password?
              </Link>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-14 bg-[#FF8C42] hover:bg-[#E67A35] text-white rounded-[24px] shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Đang đăng nhập...
                </span>
              ) : (
                "Đăng nhập"
              )}
            </Button>

            <div className="relative my-8">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-[#FFFBF5] text-gray-500">Or continue with</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Button
                type="button"
                onClick={handleGoogleLogin}
                variant="outline"
                className="h-14 border-gray-200 bg-white hover:bg-gray-50 rounded-[24px] shadow-sm"
              >
                <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                Google
              </Button>

              <Button
                type="button"
                onClick={handleAppleLogin}
                variant="outline"
                className="h-14 border-gray-200 bg-white hover:bg-gray-50 rounded-[24px] shadow-sm"
              >
                <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
                </svg>
                Apple
              </Button>
            </div>
          </form>

          <p className="mt-8 text-center text-sm text-gray-600">
            Don't have an account?{" "}
            <Link
              to="/register"
              className="text-[#FF8C42] hover:text-[#E67A35] font-medium"
            >
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default Login;
