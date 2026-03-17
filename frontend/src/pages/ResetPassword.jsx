import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { CheckCircle, Eye, EyeOff, Loader2, XCircle } from "lucide-react";
import { resetPasswordApi } from "../api/authApi";

export default function ResetPassword() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const validate = () => {
    if (!password || !confirmPassword) {
      return "Please fill in all fields.";
    }

    if (password !== confirmPassword) {
      return "Passwords do not match.";
    }

    return "";
  };

  const mapResetError = (err) => {
    const code = err.response?.data?.error?.code;
    const details = err.response?.data?.error?.details;
    const message = err.response?.data?.error?.message;

    if (code === "INVALID_RESET_TOKEN") {
      return "This reset link is invalid or expired. Please request a new one.";
    }

    if (code === "VALIDATION_ERROR" && Array.isArray(details) && details.length > 0) {
      const firstDetail = details[0]?.message;
      if (Array.isArray(firstDetail)) {
        return firstDetail.join(" ");
      }
      return firstDetail || "Password does not meet requirements.";
    }

    return message || "Unable to reset password. Please try again.";
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (!token) {
      setError("Missing reset token. Please use the full link from your email.");
      return;
    }

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await resetPasswordApi(token, password, confirmPassword);
      setSuccess(result?.message || "Password reset successful. Redirecting to home...");
      setPassword("");
      setConfirmPassword("");

      setTimeout(() => {
        navigate("/");
      }, 1400);
    } catch (err) {
      setError(mapResetError(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#FFF6EE] via-[#FFFBF5] to-[#FFEDE1] flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md bg-white/90 backdrop-blur-sm border border-[#FFE2CC] shadow-xl rounded-[24px] p-6 sm:p-7">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-[#FF8C42] rounded-[16px] mb-3 shadow-lg">
            <svg width="24" height="24" viewBox="0 0 32 32" fill="none">
              <ellipse cx="16" cy="20" rx="8" ry="10" fill="white" />
              <ellipse cx="7" cy="10" rx="4" ry="5" fill="white" />
              <ellipse cx="16" cy="8" rx="4" ry="5" fill="white" />
              <ellipse cx="25" cy="10" rx="4" ry="5" fill="white" />
              <ellipse cx="22" cy="15" rx="3.5" ry="4.5" fill="white" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-800">Set New Password</h1>
          <p className="text-sm text-gray-500 mt-1">Create a new password for your account</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {success && (
            <div className="flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 px-3 py-2 rounded-[12px] text-sm">
              <CheckCircle className="w-4 h-4 flex-shrink-0" />
              <span>{success}</span>
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-[12px] text-sm">
              <XCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label htmlFor="new-password" className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
            <div className="relative">
              <input
                id="new-password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your new password"
                className="w-full h-11 bg-white border border-gray-200 rounded-[14px] px-4 pr-11 text-sm text-gray-800 placeholder:text-gray-400 focus:border-[#FF8C42] focus:ring-2 focus:ring-[#FF8C42]/20 outline-none"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label htmlFor="confirm-password" className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
            <div className="relative">
              <input
                id="confirm-password"
                type={showConfirmPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter your new password"
                className="w-full h-11 bg-white border border-gray-200 rounded-[14px] px-4 pr-11 text-sm text-gray-800 placeholder:text-gray-400 focus:border-[#FF8C42] focus:ring-2 focus:ring-[#FF8C42]/20 outline-none"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword((prev) => !prev)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
              >
                {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full h-11 bg-[#FF8C42] hover:bg-[#E67A35] text-white font-semibold rounded-[14px] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Updating...
              </span>
            ) : (
              "Update Password"
            )}
          </button>
        </form>

        <p className="text-center text-sm text-gray-600 mt-5">
          Remembered your password? <Link to="/" className="text-[#FF8C42] hover:text-[#E67A35] font-medium">Back to home</Link>
        </p>
      </div>
    </div>
  );
}
