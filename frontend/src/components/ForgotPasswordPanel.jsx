import { useState } from "react";
import { ArrowLeft, CheckCircle, Loader2, XCircle } from "lucide-react";
import { forgotPasswordApi } from "../api/authApi";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";

export function ForgotPasswordPanel({ initialEmail = "", onBackToLogin }) {
  const [email, setEmail] = useState(initialEmail);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const validateEmail = (value) => /\S+@\S+\.\S+/.test(value);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (!email.trim()) {
      setError("Please enter your email address.");
      return;
    }

    if (!validateEmail(email.trim())) {
      setError("Please enter a valid email address.");
      return;
    }

    setIsSubmitting(true);
    try {
      await forgotPasswordApi(email.trim());
      setSuccess("If this email exists, a reset link has been sent. Please check your inbox.");
    } catch (err) {
      const message = err.response?.data?.error?.message;
      setError(message || "Unable to process your request right now. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-xs relative z-10">
      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center w-12 h-12 bg-[#FF8C42] rounded-[16px] mb-2 shadow-lg">
          <svg width="24" height="24" viewBox="0 0 32 32" fill="none">
            <ellipse cx="16" cy="20" rx="8" ry="10" fill="white" />
            <ellipse cx="7" cy="10" rx="4" ry="5" fill="white" />
            <ellipse cx="16" cy="8" rx="4" ry="5" fill="white" />
            <ellipse cx="25" cy="10" rx="4" ry="5" fill="white" />
            <ellipse cx="22" cy="15" rx="3.5" ry="4.5" fill="white" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-gray-800 mb-1">Forgot Password?</h1>
        <p className="text-gray-500 text-xs">Enter your email to receive a reset link</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3" autoComplete="off">
        {success && (
          <div className="flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 px-3 py-2 rounded-[12px] text-xs">
            <CheckCircle className="w-4 h-4 flex-shrink-0" />
            <span>{success}</span>
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-[12px] text-xs">
            <XCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="space-y-1">
          <Label htmlFor="forgot-email" className="text-gray-700 text-xs">Email</Label>
          <Input
            id="forgot-email"
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="h-10 bg-white border-gray-200 rounded-[14px] px-4 text-sm text-gray-800 placeholder:text-gray-400 focus:border-[#FF8C42] focus:ring-[#FF8C42] shadow-sm"
          />
        </div>

        <Button
          type="submit"
          disabled={isSubmitting}
          className="w-full h-10 bg-[#FF8C42] hover:bg-[#E67A35] text-white text-sm rounded-[14px] shadow-md hover:shadow-lg transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {isSubmitting ? (
            <span className="flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              Sending...
            </span>
          ) : (
            "Send Reset Link"
          )}
        </Button>

        <button
          type="button"
          onClick={onBackToLogin}
          className="w-full text-xs text-gray-600 hover:text-gray-800 font-medium flex items-center justify-center gap-1"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to login
        </button>
      </form>
    </div>
  );
}
