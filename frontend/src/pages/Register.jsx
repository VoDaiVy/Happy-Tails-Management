import { useState } from "react";
import { Link } from "react-router-dom";
import { Eye, EyeOff, Check, Dog, Cat, Bird, HelpCircle } from "lucide-react";
import { PawPattern } from "../components/PawPattern";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Progress } from "../components/ui/progress";

export function Register() {
  const [step, setStep] = useState(1);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Step 1 form data
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Step 2 form data
  const [selectedPet, setSelectedPet] = useState(null);

  const totalSteps = 2;
  const progress = (step / totalSteps) * 100;

  const handleStep1Submit = (e) => {
    e.preventDefault();
    if (name && email && password && confirmPassword && password === confirmPassword) {
      setStep(2);
    }
  };

  const handleStep2Submit = (e) => {
    e.preventDefault();
    if (selectedPet) {
      console.log("Registration complete:", {
        name,
        email,
        password,
        petType: selectedPet,
      });
      // Handle registration logic here
    }
  };

  const petTypes = [
    {
      id: "dog",
      label: "Dog",
      icon: Dog,
      color: "bg-[#FF8C42]",
      hoverColor: "hover:bg-[#FF8C42]",
      borderColor: "border-[#FF8C42]",
    },
    {
      id: "cat",
      label: "Cat",
      icon: Cat,
      color: "bg-[#A8D5BA]",
      hoverColor: "hover:bg-[#A8D5BA]",
      borderColor: "border-[#A8D5BA]",
    },
    {
      id: "bird",
      label: "Bird",
      icon: Bird,
      color: "bg-[#FFD166]",
      hoverColor: "hover:bg-[#FFD166]",
      borderColor: "border-[#FFD166]",
    },
    {
      id: "other",
      label: "Other",
      icon: HelpCircle,
      color: "bg-[#B8A4C9]",
      hoverColor: "hover:bg-[#B8A4C9]",
      borderColor: "border-[#B8A4C9]",
    },
  ];

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#FFFBF5] relative overflow-hidden">
      <PawPattern />

      <div className="w-full max-w-2xl relative z-10">
        {/* Logo/Brand */}
        <div className="text-center mb-8">
          <Link to="/login">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-[#FF8C42] rounded-[24px] mb-4 shadow-lg hover:scale-105 transition-transform">
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
          </Link>
          <h1 className="text-4xl font-bold text-gray-800 mb-2">Join Our Family</h1>
          <p className="text-gray-600">Create an account to get started</p>
        </div>

        {/* Progress Bar with Paw Icon */}
        <div className="bg-white rounded-[32px] p-8 shadow-xl mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600">
              Step {step} of {totalSteps}
            </span>
            <span className="text-sm font-medium text-gray-600">{Math.round(progress)}%</span>
          </div>
          <div className="relative">
            <Progress value={progress} className="h-3 bg-gray-100" />
            {/* Paw icon that moves with progress */}
            <div
              className="absolute top-1/2 -translate-y-1/2 transition-all duration-500 ease-out"
              style={{ left: `calc(${progress}% - 16px)` }}
            >
              <div className="w-8 h-8 bg-[#FF8C42] rounded-full flex items-center justify-center shadow-lg">
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 16 16"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
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
        <div className="bg-white rounded-[32px] p-8 md:p-12 shadow-xl">
          {step === 1 && (
            <form onSubmit={handleStep1Submit} className="space-y-6">
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold text-gray-800">Account Details</h2>
                <p className="text-gray-600 mt-2">Tell us about yourself</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="name" className="text-gray-700">
                  Full Name
                </Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="Enter your full name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="h-14 bg-gray-50 border-gray-200 rounded-[24px] px-6 text-gray-800 placeholder:text-gray-400 focus:border-[#FF8C42] focus:ring-[#FF8C42] shadow-sm"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="text-gray-700">
                  Email Address
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="h-14 bg-gray-50 border-gray-200 rounded-[24px] px-6 text-gray-800 placeholder:text-gray-400 focus:border-[#FF8C42] focus:ring-[#FF8C42] shadow-sm"
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
                    placeholder="Create a password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="h-14 bg-gray-50 border-gray-200 rounded-[24px] px-6 pr-14 text-gray-800 placeholder:text-gray-400 focus:border-[#FF8C42] focus:ring-[#FF8C42] shadow-sm"
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

              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-gray-700">
                  Confirm Password
                </Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Confirm your password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    className="h-14 bg-gray-50 border-gray-200 rounded-[24px] px-6 pr-14 text-gray-800 placeholder:text-gray-400 focus:border-[#FF8C42] focus:ring-[#FF8C42] shadow-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </button>
                </div>
                {password && confirmPassword && password !== confirmPassword && (
                  <p className="text-sm text-red-500">Passwords do not match</p>
                )}
              </div>

              <Button
                type="submit"
                className="w-full h-14 bg-[#FF8C42] hover:bg-[#E67A35] text-white rounded-[24px] shadow-lg hover:shadow-xl transition-all duration-200 mt-8"
              >
                Continue
              </Button>
            </form>
          )}

          {step === 2 && (
            <form onSubmit={handleStep2Submit} className="space-y-8">
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold text-gray-800">Tell Us About Your Pet</h2>
                <p className="text-gray-600 mt-2">What kind of pet do you have?</p>
              </div>

              <div className="grid grid-cols-2 gap-6">
                {petTypes.map((pet) => {
                  const Icon = pet.icon;
                  const isSelected = selectedPet === pet.id;

                  return (
                    <button
                      key={pet.id}
                      type="button"
                      onClick={() => setSelectedPet(pet.id)}
                      className={`
                        relative flex flex-col items-center justify-center p-8 rounded-[32px] border-4 transition-all duration-300 transform hover:scale-105
                        ${
                          isSelected
                            ? `${pet.color} ${pet.borderColor} shadow-xl scale-105`
                            : `bg-gray-50 border-gray-200 hover:border-gray-300 shadow-md`
                        }
                      `}
                    >
                      {isSelected && (
                        <div className="absolute top-4 right-4 w-8 h-8 bg-white rounded-full flex items-center justify-center">
                          <Check className="w-5 h-5 text-gray-800" />
                        </div>
                      )}
                      <Icon
                        className={`w-16 h-16 mb-4 ${
                          isSelected ? "text-white" : "text-gray-600"
                        }`}
                      />
                      <span
                        className={`text-lg font-bold ${
                          isSelected ? "text-white" : "text-gray-800"
                        }`}
                      >
                        {pet.label}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="flex gap-4 mt-12">
                <Button
                  type="button"
                  onClick={() => setStep(1)}
                  variant="outline"
                  className="flex-1 h-14 border-gray-300 rounded-[24px] hover:bg-gray-50"
                >
                  Back
                </Button>
                <Button
                  type="submit"
                  disabled={!selectedPet}
                  className="flex-1 h-14 bg-[#FF8C42] hover:bg-[#E67A35] text-white rounded-[24px] shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Complete Registration
                </Button>
              </div>
            </form>
          )}

          <p className="mt-8 text-center text-sm text-gray-600">
            Already have an account?{" "}
            <Link
              to="/login"
              className="text-[#FF8C42] hover:text-[#E67A35] font-medium"
            >
              Log in
            </Link>
          </p>
        </div>

        {/* Decorative Pet Images - Hidden on mobile */}
        <div className="hidden lg:block">
          <div className="absolute -left-32 top-1/4 w-48 h-48 rounded-[32px] overflow-hidden shadow-xl rotate-[-12deg] opacity-80">
            <img
              src="https://images.unsplash.com/photo-1760814574025-71d126c09118?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjdXRlJTIwY2F0JTIwcG9ydHJhaXQlMjBmcmllbmRseXxlbnwxfHx8fDE3NzIwNjcyNTV8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral"
              alt="Cute cat"
              className="w-full h-full object-cover"
            />
          </div>
          <div className="absolute -right-32 top-1/3 w-48 h-48 rounded-[32px] overflow-hidden shadow-xl rotate-[12deg] opacity-80">
            <img
              src="https://images.unsplash.com/photo-1759530967604-6fb695837ae0?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwbGF5ZnVsJTIwcHVwcHklMjBkb2clMjBzbWlsaW5nfGVufDF8fHx8MTc3MjA2NzI1NXww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral"
              alt="Playful puppy"
              className="w-full h-full object-cover"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default Register;
