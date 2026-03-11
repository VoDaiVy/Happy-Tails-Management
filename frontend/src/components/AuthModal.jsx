import { useState, useEffect } from "react";
import { Eye, EyeOff, Mail, RefreshCw, X, CheckCircle, XCircle, Loader2 } from "lucide-react";
import { PawPattern } from "./PawPattern";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Progress } from "./ui/progress";
import { registerApi, verifyEmailApi, resendVerificationApi } from "../api/authApi";
import { useAuth } from "../context/AuthContext";

export function AuthModal({ isOpen, onClose, initialMode = "login", onLoginSuccess }) {
  const { login } = useAuth();
  const [mode, setMode] = useState(initialMode); // "login" or "register"
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Login form data
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loginSuccess, setLoginSuccess] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);

  // Register form data
  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  
  // Email verification
  const [verificationCode, setVerificationCode] = useState("");
  const [isCodeSent, setIsCodeSent] = useState(false);
  const [codeError, setCodeError] = useState("");
  const [isResending, setIsResending] = useState(false);

  // Register loading & error/success states
  const [registerLoading, setRegisterLoading] = useState(false);
  const [registerError, setRegisterError] = useState("");
  const [registerSuccess, setRegisterSuccess] = useState("");
  const [verifyLoading, setVerifyLoading] = useState(false);

  const totalSteps = 2;
  const progress = (step / totalSteps) * 100;

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    
    // Cleanup on unmount
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  // Sync mode with initialMode prop
  useEffect(() => {
    if (isOpen) {
      setMode(initialMode);
    }
  }, [isOpen, initialMode]);

  // Reset login form every time modal opens
  useEffect(() => {
    if (isOpen) {
      setLoginEmail("");
      setLoginPassword("");
      setLoginError("");
      setLoginSuccess("");
      setLoginLoading(false);
      setShowPassword(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const getLoginErrorMessage = (err) => {
    const code = err.response?.data?.error?.code;
    const message = err.response?.data?.error?.message;
    switch (code) {
      case "INVALID_CREDENTIALS":
        return "Invalid email or password.";
      case "ACCOUNT_LOCKED":
        return message || "Account is locked. Please try again later.";
      case "ACCOUNT_DISABLED":
        return "Account has been disabled.";
      case "VALIDATION_ERROR":
        return "Please enter both email and password.";
      default:
        if (!err.response) return "Unable to connect to server.";
        return message || "Login failed.";
    }
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setLoginError("");
    setLoginSuccess("");

    if (!loginEmail.trim()) { setLoginError("Please enter your email."); return; }
    if (!loginPassword) { setLoginError("Please enter your password."); return; }

    setLoginLoading(true);
    try {
      const result = await login(loginEmail, loginPassword);

      setLoginSuccess(`Login successful! Welcome ${result.data.user.name || "back"} 🎉`);

      // Notify parent and stay on current page
      setTimeout(() => {
        onLoginSuccess?.(result.data.user);
      }, 1000);
    } catch (err) {
      setLoginError(getLoginErrorMessage(err));
    } finally {
      setLoginLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    console.log("Login with Google");
  };

  const handleAppleLogin = () => {
    console.log("Login with Apple");
  };

  const getRegisterErrorMessage = (err) => {
    const code = err.response?.data?.error?.code;
    const message = err.response?.data?.error?.message;
    const details = err.response?.data?.error?.details;
    switch (code) {
      case "EMAIL_EXISTS":
        return "Email is already registered. Please use a different email.";
      case "VALIDATION_ERROR":
        if (details && details.length > 0) {
          const messages = details.flatMap(d => 
            Array.isArray(d.message) ? d.message : [d.message]
          );
          return messages.join(" | ");
        }
        return message || "Invalid information. Please check and try again.";
      default:
        if (!err.response) return "Unable to connect to server.";
        return message || "Registration failed. Please try again.";
    }
  };

  const handleStep1Submit = async (e) => {
    e.preventDefault();
    if (!name || !email || !password || !confirmPassword) return;
    if (password !== confirmPassword) return;

    setRegisterLoading(true);
    setRegisterError("");
    try {
      await registerApi({ name, email, password });
      setStep(2);
      setIsCodeSent(true);
    } catch (err) {
      setRegisterError(getRegisterErrorMessage(err));
    } finally {
      setRegisterLoading(false);
    }
  };

  const handleResendCode = async () => {
    setIsResending(true);
    setCodeError("");
    try {
      await resendVerificationApi(email);
    } catch {
      // API always returns success to prevent email enumeration
    } finally {
      setIsResending(false);
    }
  };

  const handleStep2Submit = async (e) => {
    e.preventDefault();
    setVerifyLoading(true);
    setCodeError("");
    try {
      await verifyEmailApi(email, verificationCode);
      setRegisterSuccess("Email verified successfully! You can now log in.");
      // Reset form and switch to login after 1.5s
      setTimeout(() => {
        setName("");
        setEmail("");
        setPassword("");
        setConfirmPassword("");
        setVerificationCode("");
        setIsCodeSent(false);
        setRegisterSuccess("");
        setStep(1);
        setMode("login");
      }, 1500);
    } catch (err) {
      const code = err.response?.data?.error?.code;
      if (code === "INVALID_OTP") {
        setCodeError("Invalid or expired OTP code.");
      } else {
        setCodeError(err.response?.data?.error?.message || "Verification failed. Please try again.");
      }
    } finally {
      setVerifyLoading(false);
    }
  };

  const switchToRegister = () => {
    setMode("register");
    setStep(1);
    setVerificationCode("");
    setCodeError("");
    setRegisterError("");
    setRegisterSuccess("");
    setLoginError("");
    setLoginSuccess("");
  };

  const switchToLogin = () => {
    setMode("login");
    setStep(1);
    setVerificationCode("");
    setCodeError("");
    setRegisterError("");
    setRegisterSuccess("");
    setLoginError("");
    setLoginSuccess("");
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className={`relative bg-[#FFFBF5] rounded-[24px] shadow-2xl w-full ${mode === 'login' ? 'max-w-3xl' : 'max-w-lg'} max-h-[85vh] overflow-hidden mx-4 flex`}>
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-20 w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-md hover:bg-gray-100 transition-colors"
        >
          <X className="w-4 h-4 text-gray-600" />
        </button>

        {mode === "login" ? (
          <>
            {/* Left Side - Image */}
            <div className="hidden md:flex md:w-1/2 bg-gradient-to-br from-[#FFE8D9] to-[#FFF4EC] items-center justify-center p-6 relative overflow-hidden">
              <PawPattern />
              <div className="relative z-10 max-w-xs">
                <img
                  src="https://i.pinimg.com/736x/99/40/5b/99405b2e6da428fbc22cebfad6a999e3.jpg"
                  alt="Person hugging golden retriever"
                  className="w-full h-auto rounded-[20px] shadow-lg object-cover"
                />
              </div>
            </div>

            {/* Right Side - Login Form */}
            <div className="w-full md:w-1/2 flex items-center justify-center p-6 relative overflow-hidden overflow-y-auto scrollbar-hide">
              <PawPattern />
              <div className="w-full max-w-xs relative z-10">
                {/* Logo/Brand */}
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
                  <h1 className="text-2xl font-bold text-gray-800 mb-1">Welcome Back!</h1>
                  <p className="text-gray-500 text-xs">Log in to care for your furry friends</p>
                </div>

                {/* Login Form */}
                <form onSubmit={handleLoginSubmit} className="space-y-3" autoComplete="off">
                  {loginSuccess && (
                    <div className="flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 px-3 py-2 rounded-[12px] text-xs">
                      <CheckCircle className="w-4 h-4 flex-shrink-0" />
                      <span>{loginSuccess}</span>
                    </div>
                  )}
                  {loginError && (
                    <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-[12px] text-xs">
                      <XCircle className="w-4 h-4 flex-shrink-0" />
                      <span>{loginError}</span>
                    </div>
                  )}

                  <div className="space-y-1">
                    <Label htmlFor="login-email" className="text-gray-700 text-xs">Email or Phone</Label>
                    <Input
                      id="login-email"
                      type="text"
                      placeholder="Enter your email or phone"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      autoComplete="off"
                      className="h-10 bg-white border-gray-200 rounded-[14px] px-4 text-sm text-gray-800 placeholder:text-gray-400 focus:border-[#FF8C42] focus:ring-[#FF8C42] shadow-sm"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="login-password" className="text-gray-700 text-xs">Password</Label>
                    <div className="relative">
                      <Input
                        id="login-password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Enter your password"
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        autoComplete="new-password"
                        className="h-10 bg-white border-gray-200 rounded-[14px] px-4 pr-10 text-sm text-gray-800 placeholder:text-gray-400 focus:border-[#FF8C42] focus:ring-[#FF8C42] shadow-sm"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-end">
                    <button type="button" className="text-xs text-[#FF8C42] hover:text-[#E67A35] font-medium">
                      Forgot Password?
                    </button>
                  </div>

                  <Button
                    type="submit"
                    disabled={loginLoading}
                    className="w-full h-10 bg-[#FF8C42] hover:bg-[#E67A35] text-white text-sm rounded-[14px] shadow-md hover:shadow-lg transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {loginLoading ? (
                      <span className="flex items-center justify-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Signing in...
                      </span>
                    ) : (
                      "Sign In"
                    )}
                  </Button>

                  <div className="relative my-3">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-gray-200"></div>
                    </div>
                    <div className="relative flex justify-center text-xs">
                      <span className="px-3 bg-[#FFFBF5] text-gray-500">Or continue with</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      type="button"
                      onClick={handleGoogleLogin}
                      variant="outline"
                      className="h-9 border-gray-200 bg-white hover:bg-gray-50 rounded-[12px] shadow-sm text-xs"
                    >
                      <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                      </svg>
                      Google
                    </Button>

                    <Button
                      type="button"
                      onClick={handleAppleLogin}
                      variant="outline"
                      className="h-9 border-gray-200 bg-white hover:bg-gray-50 rounded-[12px] shadow-sm text-xs"
                    >
                      <svg className="w-4 h-4 mr-1" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
                      </svg>
                      Apple
                    </Button>
                  </div>
                </form>

                <p className="mt-4 text-center text-xs text-gray-600">
                  Don't have an account?{" "}
                  <button
                    onClick={switchToRegister}
                    className="text-[#FF8C42] hover:text-[#E67A35] font-medium"
                  >
                    Sign up
                  </button>
                </p>
              </div>
            </div>
          </>
        ) : (
          /* Register Mode */
          <div className="w-full flex items-center justify-center p-6 relative overflow-hidden overflow-y-auto scrollbar-hide">
            <PawPattern />
            <div className="w-full max-w-md relative z-10">
              {/* Logo/Brand */}
              <div className="text-center mb-4">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-[#FF8C42] rounded-[16px] mb-2 shadow-lg">
                  <svg width="24" height="24" viewBox="0 0 32 32" fill="none">
                    <ellipse cx="16" cy="20" rx="8" ry="10" fill="white" />
                    <ellipse cx="7" cy="10" rx="4" ry="5" fill="white" />
                    <ellipse cx="16" cy="8" rx="4" ry="5" fill="white" />
                    <ellipse cx="25" cy="10" rx="4" ry="5" fill="white" />
                    <ellipse cx="22" cy="15" rx="3.5" ry="4.5" fill="white" />
                  </svg>
                </div>
                <h1 className="text-2xl font-bold text-gray-800 mb-1">Join Our Family</h1>
                <p className="text-gray-500 text-xs">Create an account to get started</p>
              </div>

              {/* Progress Bar */}
              <div className="bg-white rounded-[16px] p-3 shadow-sm mb-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-medium text-gray-600">Step {step} of {totalSteps}</span>
                  <span className="text-[10px] font-medium text-gray-600">{Math.round(progress)}%</span>
                </div>
                <div className="relative">
                  <Progress value={progress} className="h-1.5 bg-gray-100" />
                  <div
                    className="absolute top-1/2 -translate-y-1/2 transition-all duration-500 ease-out"
                    style={{ left: `calc(${progress}% - 10px)` }}
                  >
                    <div className="w-5 h-5 bg-[#FF8C42] rounded-full flex items-center justify-center shadow-sm">
                      <svg width="10" height="10" viewBox="0 0 16 16" fill="none">
                        <ellipse cx="8" cy="10" rx="4" ry="5" fill="white" />
                        <ellipse cx="3.5" cy="5" rx="2" ry="2.5" fill="white" />
                        <ellipse cx="8" cy="4" rx="2" ry="2.5" fill="white" />
                        <ellipse cx="12.5" cy="5" rx="2" ry="2.5" fill="white" />
                        <ellipse cx="11" cy="7.5" rx="1.75" ry="2.25" fill="white" />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>

              {/* Form Card */}
              <div className="bg-white rounded-[16px] p-5 shadow-sm">
                {step === 1 && (
                  <form onSubmit={handleStep1Submit} className="space-y-3">
                    <div className="text-center mb-3">
                      <h2 className="text-lg font-bold text-gray-800">Account Details</h2>
                      <p className="text-gray-500 text-xs">Tell us about yourself</p>
                    </div>

                    {registerError && (
                      <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-[12px] text-xs">
                        <XCircle className="w-4 h-4 flex-shrink-0" />
                        <span>{registerError}</span>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label htmlFor="name" className="text-gray-700 text-xs">Full Name</Label>
                        <Input
                          id="name"
                          type="text"
                          placeholder="Enter your full name"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          required
                          className="h-9 bg-gray-50 border-gray-200 rounded-[12px] px-3 text-sm text-gray-800 placeholder:text-gray-400 focus:border-[#FF8C42] focus:ring-[#FF8C42] shadow-sm"
                        />
                      </div>

                      <div className="space-y-1">
                        <Label htmlFor="reg-email" className="text-gray-700 text-xs">Email Address</Label>
                        <Input
                          id="reg-email"
                          type="email"
                          placeholder="Enter your email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          required
                          className="h-9 bg-gray-50 border-gray-200 rounded-[12px] px-3 text-sm text-gray-800 placeholder:text-gray-400 focus:border-[#FF8C42] focus:ring-[#FF8C42] shadow-sm"
                        />
                      </div>

                      <div className="space-y-1">
                        <Label htmlFor="reg-password" className="text-gray-700 text-xs">Password</Label>
                        <div className="relative">
                          <Input
                            id="reg-password"
                            type={showPassword ? "text" : "password"}
                            placeholder="Create a password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            className="h-9 bg-gray-50 border-gray-200 rounded-[12px] px-3 pr-9 text-sm text-gray-800 placeholder:text-gray-400 focus:border-[#FF8C42] focus:ring-[#FF8C42] shadow-sm"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                          >
                            {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <Label htmlFor="confirmPassword" className="text-gray-700 text-xs">Confirm Password</Label>
                        <div className="relative">
                          <Input
                            id="confirmPassword"
                            type={showConfirmPassword ? "text" : "password"}
                            placeholder="Confirm your password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            required
                            className="h-9 bg-gray-50 border-gray-200 rounded-[12px] px-3 pr-9 text-sm text-gray-800 placeholder:text-gray-400 focus:border-[#FF8C42] focus:ring-[#FF8C42] shadow-sm"
                          />
                          <button
                            type="button"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                          >
                            {showConfirmPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                        {password && confirmPassword && password !== confirmPassword && (
                          <p className="text-[10px] text-red-500">Passwords do not match</p>
                        )}
                      </div>
                    </div>

                    <Button
                      type="submit"
                      disabled={registerLoading}
                      className="w-full h-9 bg-[#FF8C42] hover:bg-[#E67A35] text-white text-sm rounded-[12px] shadow-md hover:shadow-lg transition-all duration-200 mt-3 disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {registerLoading ? (
                        <span className="flex items-center justify-center gap-2">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Registering...
                        </span>
                      ) : (
                        "Register"
                      )}
                    </Button>
                  </form>
                )}

                {step === 2 && (
                  <form onSubmit={handleStep2Submit} className="space-y-3">
                    <div className="text-center mb-3">
                      <div className="inline-flex items-center justify-center w-12 h-12 bg-[#FFE8D9] rounded-full mb-2">
                        <Mail className="w-6 h-6 text-[#FF8C42]" />
                      </div>
                      <h2 className="text-lg font-bold text-gray-800">Verify Your Email</h2>
                      <p className="text-gray-500 text-xs">
                        {isCodeSent ? "We've sent a verification code to" : "Sending verification code to"}
                      </p>
                      <p className="text-[#FF8C42] font-medium text-sm">{email}</p>
                    </div>

                    {registerSuccess && (
                      <div className="flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 px-3 py-2 rounded-[12px] text-xs">
                        <CheckCircle className="w-4 h-4 flex-shrink-0" />
                        <span>{registerSuccess}</span>
                      </div>
                    )}

                    <div className="space-y-2">
                      <Label htmlFor="verification-code" className="text-gray-700 text-xs">Verification Code</Label>
                      <Input
                        id="verification-code"
                        type="text"
                        placeholder="Enter 6-digit code"
                        value={verificationCode}
                        onChange={(e) => {
                          setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6));
                          setCodeError("");
                        }}
                        maxLength={6}
                        className="h-10 bg-gray-50 border-gray-200 rounded-[12px] px-4 text-center text-lg tracking-widest font-mono text-gray-800 placeholder:text-gray-400 focus:border-[#FF8C42] focus:ring-[#FF8C42] shadow-sm"
                      />
                      {codeError && (
                        <p className="text-[10px] text-red-500 text-center">{codeError}</p>
                      )}
                    </div>

                    <div className="text-center">
                      <button
                        type="button"
                        onClick={handleResendCode}
                        disabled={isResending}
                        className="text-xs text-[#FF8C42] hover:text-[#E67A35] font-medium inline-flex items-center gap-1 disabled:opacity-50"
                      >
                        <RefreshCw className={`w-3 h-3 ${isResending ? 'animate-spin' : ''}`} />
                        {isResending ? 'Sending...' : 'Resend Code'}
                      </button>
                    </div>

                    <div className="flex gap-2 mt-4">
                      <Button
                        type="button"
                        onClick={() => setStep(1)}
                        variant="outline"
                        className="flex-1 h-9 text-sm border-gray-300 rounded-[12px] hover:bg-gray-50"
                      >
                        Back
                      </Button>
                      <Button
                        type="submit"
                        disabled={verificationCode.length !== 6 || verifyLoading}
                        className="flex-1 h-9 text-sm bg-[#FF8C42] hover:bg-[#E67A35] text-white rounded-[12px] shadow-md hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {verifyLoading ? (
                          <span className="flex items-center justify-center gap-2">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Verifying...
                          </span>
                        ) : (
                          "Verify"
                        )}
                      </Button>
                    </div>
                  </form>
                )}

                <p className="mt-3 text-center text-xs text-gray-600">
                  Already have an account?{" "}
                  <button
                    onClick={switchToLogin}
                    className="text-[#FF8C42] hover:text-[#E67A35] font-medium"
                  >
                    Log in
                  </button>
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default AuthModal;
