import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Camera, Upload, Loader2, AlertCircle, CheckCircle, FileImage, Star } from 'lucide-react';
import Navbar from '../components/layout/Navbar';
import { diagnoseImage } from '../api/aiApi';
import AuthModal from '../components/AuthModal';

const GUEST_SCAN_KEY = 'ht_guest_scans_used';

const AIHealthScan = () => {
  const navigate = useNavigate();
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [symptoms, setSymptoms] = useState('');
  const [diagnosisResult, setDiagnosisResult] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authModalMode, setAuthModalMode] = useState('login');
  const [guestScansDone, setGuestScansDone] = useState(() => parseInt(localStorage.getItem(GUEST_SCAN_KEY) || '0', 10));
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem('user');
    return stored ? JSON.parse(stored) : null;
  });
  const [isAuthenticated, setIsAuthenticated] = useState(() => !!localStorage.getItem('user'));

  const openLoginModal = () => {
    setAuthModalMode('login');
    setShowAuthModal(true);
  };

  const openRegisterModal = () => {
    setAuthModalMode('register');
    setShowAuthModal(true);
  };

  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result);
      reader.readAsDataURL(file);
      setDiagnosisResult(null);
    }
  };

  const handleDiagnose = async () => {
    // Guests who already used their free scan must log in
    if (!isAuthenticated && guestScansDone >= 1) {
      setShowAuthModal(true);
      return;
    }

    if (!imageFile) {
      alert('Please upload a pet image!');
      return;
    }

    setIsLoading(true);
    try {
      const result = await diagnoseImage(imageFile, null, symptoms || '');
      setDiagnosisResult(result.data.diagnosis);

      // Increment guest scan counter
      if (!isAuthenticated) {
        const next = guestScansDone + 1;
        localStorage.setItem(GUEST_SCAN_KEY, String(next));
        setGuestScansDone(next);
      }
    } catch (error) {
      console.error('Diagnosis error:', error);
      alert('An error occurred during analysis. Please try again!');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoginSuccess = (userData) => {
    setUser(userData);
    setIsAuthenticated(true);
    setShowAuthModal(false);

    if (userData?.role === 'admin') {
      navigate('/admin');
      return;
    }
    if (userData?.role === 'staff') {
      navigate('/staff');
    }
  };

  const handleReset = () => {
    setImageFile(null);
    setImagePreview('');
    setSymptoms('');
    setDiagnosisResult(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-amber-50">
      <Navbar
        user={user}
        onLogout={() => setUser(null)}
        onLoginClick={openLoginModal}
        onRegisterClick={openRegisterModal}
      />

      <div className="container mx-auto px-4 py-6 max-w-6xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8 mt-20"
        >
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-orange-500 to-amber-600 rounded-full mb-4">
            <Camera className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-800 mb-3">
            AI Health <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-amber-600">Diagnosis</span>
          </h1>
          <p className="text-base text-gray-600 max-w-2xl mx-auto">
            Upload your pet's image for AI health analysis and professional consultation
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Left: Image Upload */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100"
          >
            <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
              <Upload className="w-5 h-5 mr-2 text-orange-500" />
              Upload Pet Image
            </h2>

            {/* Image Preview */}
            {imagePreview ? (
              <div className="relative mb-4 group">
                <img
                  src={imagePreview}
                  alt="Pet preview"
                  className="w-full h-56 object-cover rounded-xl border-2 border-orange-200"
                />
                <button
                  onClick={handleReset}
                  className="absolute top-2 right-2 bg-red-500 text-white px-3 py-1.5 text-sm rounded-lg hover:bg-red-600 transition-all opacity-0 group-hover:opacity-100"
                >
                  Remove
                </button>
              </div>
            ) : (
              <label className="block mb-4 cursor-pointer">
                <div className="w-full h-56 border-3 border-dashed border-orange-300 rounded-xl flex flex-col items-center justify-center hover:border-orange-500 transition-all bg-orange-50 hover:bg-orange-100">
                  <FileImage className="w-12 h-12 text-orange-400 mb-3" />
                  <p className="text-base font-semibold text-gray-700 mb-1">
                    Click to select image
                  </p>
                  <p className="text-xs text-gray-500">
                    PNG, JPG, JPEG (Max 10MB)
                  </p>
                </div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </label>
            )}

            {/* Symptoms Input */}
            <div className="mb-4">
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                Symptoms (optional)
              </label>
              <textarea
                value={symptoms}
                onChange={(e) => setSymptoms(e.target.value)}
                placeholder="Describe any symptoms or unusual behaviors of your pet..."
                rows="3"
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
              />
            </div>

            {/* Guest scan limit banner */}
            {!isAuthenticated && (
              <div className={`mb-3 px-3 py-2 rounded-lg text-xs flex items-start gap-2 ${guestScansDone >= 1 ? 'bg-orange-50 border border-orange-300 text-orange-800' : 'bg-blue-50 border border-blue-200 text-blue-700'}`}>
                <Star className="w-4 h-4 flex-shrink-0 mt-0.5" />
                {guestScansDone >= 1 ? (
                  <span>You have used your free guest scan. <button className="font-bold underline" onClick={() => setShowAuthModal(true)}>Log in for unlimited scans.</button></span>
                ) : (
                  <span>You have <strong>1 free scan</strong> as a guest. Log in for unlimited access.</span>
                )}
              </div>
            )}

            {/* Diagnose Button */}
            <button
              onClick={handleDiagnose}
              disabled={!imagePreview || isLoading || (!isAuthenticated && guestScansDone >= 1)}
              className="w-full py-3 bg-gradient-to-r from-orange-500 to-amber-600 text-white font-bold text-sm rounded-lg hover:shadow-lg hover:shadow-orange-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Analyzing...</span>
                </>
              ) : (!isAuthenticated && guestScansDone >= 1) ? (
                <>
                  <Star className="w-5 h-5" />
                  <span>Log in for More Scans</span>
                </>
              ) : (
                <>
                  <Camera className="w-5 h-5" />
                  <span>Analyze Now</span>
                </>
              )}
            </button>
          </motion.div>

          {/* Right: Diagnosis Result */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100"
          >
            <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
              <AlertCircle className="w-5 h-5 mr-2 text-orange-500" />
              Diagnosis Result
            </h2>

            {!diagnosisResult && !isLoading && (
              <div className="h-full flex flex-col items-center justify-center text-center py-12">
                <div className="w-20 h-20 bg-gradient-to-r from-orange-100 to-amber-100 rounded-full flex items-center justify-center mb-4">
                  <Camera className="w-10 h-10 text-orange-500" />
                </div>
                <p className="text-gray-500 text-base">
                  Upload a pet image and click "Analyze Now" to get results
                </p>
              </div>
            )}

            {isLoading && (
              <div className="h-full flex flex-col items-center justify-center py-12">
                <Loader2 className="w-12 h-12 text-orange-500 animate-spin mb-4" />
                <p className="text-gray-600 text-base font-semibold">
                  AI is analyzing your image...
                </p>
                <p className="text-gray-400 text-xs mt-1">
                  Please wait a moment
                </p>
              </div>
            )}

            {diagnosisResult && !isLoading && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="space-y-4"
              >
                {/* Success Badge */}
                <div className="flex items-center space-x-2 bg-green-50 border border-green-200 rounded-lg p-3">
                  <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                  <p className="text-green-700 text-xs font-semibold">
                    Analysis complete! Here are the AI results:
                  </p>
                </div>

                {/* Diagnosis Content */}
                <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-xl p-4 border border-orange-100 space-y-3">
                  {/* Symptoms */}
                  {diagnosisResult.symptoms && (
                    <div>
                      <h3 className="text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wide">Observed Symptoms</h3>
                      <p className="text-gray-800 text-sm leading-relaxed">{diagnosisResult.symptoms}</p>
                    </div>
                  )}

                  {/* Severity */}
                  {diagnosisResult.severity && (
                    <div>
                      <h3 className="text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wide">Severity Level</h3>
                      <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                        diagnosisResult.severity === 'high' ? 'bg-red-100 text-red-700' :
                        diagnosisResult.severity === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-green-100 text-green-700'
                      }`}>
                        {diagnosisResult.severity === 'high' ? 'High' : diagnosisResult.severity === 'medium' ? 'Medium' : 'Low'}
                      </span>
                    </div>
                  )}

                  {/* Possible Conditions */}
                  {diagnosisResult.possibleConditions && diagnosisResult.possibleConditions.length > 0 && (
                    <div>
                      <h3 className="text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wide">Possible Conditions</h3>
                      <ul className="list-disc list-inside space-y-0.5">
                        {diagnosisResult.possibleConditions.map((condition, index) => (
                          <li key={index} className="text-gray-800 text-sm">{condition}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Advice */}
                  {diagnosisResult.advice && (
                    <div>
                      <h3 className="text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wide">Advice</h3>
                      <p className="text-gray-800 text-sm leading-relaxed">{diagnosisResult.advice}</p>
                    </div>
                  )}

                  {/* Urgency */}
                  {diagnosisResult.urgency && (
                    <div>
                      <h3 className="text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wide">Immediate Vet Visit Needed?</h3>
                      <p className={`font-semibold text-sm ${diagnosisResult.urgency === 'yes' ? 'text-red-600' : 'text-green-600'}`}>
                        {diagnosisResult.urgency === 'yes' ? '⚠️ Yes, visit immediately' : '✅ Not immediately necessary'}
                      </p>
                    </div>
                  )}

                  {/* Recommended Services */}
                  {diagnosisResult.recommendedServices && diagnosisResult.recommendedServices.length > 0 && (
                    <div>
                      <h3 className="text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wide">Recommended Services</h3>
                      <div className="flex flex-wrap gap-1.5">
                        {diagnosisResult.recommendedServices.map((service, index) => (
                          <span key={index} className="px-2.5 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs">
                            {service}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex space-x-2">
                  <button
                    onClick={handleReset}
                    className="flex-1 py-2.5 text-sm border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-all"
                  >
                    Analyze Another Image
                  </button>
                  <button
                    onClick={() => window.print()}
                    className="flex-1 py-2.5 text-sm bg-gradient-to-r from-orange-500 to-amber-600 text-white font-semibold rounded-lg hover:shadow-lg transition-all"
                  >
                    Print Results
                  </button>
                </div>

                {/* Disclaimer */}
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                  <p className="text-[10px] text-yellow-800">
                    <strong>Note:</strong> This result is for reference only. Please visit a veterinary clinic for accurate diagnosis and treatment.
                  </p>
                </div>
              </motion.div>
            )}
          </motion.div>
        </div>

        {/* Info Cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="grid md:grid-cols-3 gap-6 mt-12"
        >
          <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-lg">
            <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center mb-4">
              <Camera className="w-6 h-6 text-orange-600" />
            </div>
            <h3 className="text-lg font-bold text-gray-800 mb-2">Chụp Rõ Ràng</h3>
            <p className="text-sm text-gray-600">
              Chụp ảnh thú cưng ở nơi có ánh sáng tốt, tập trung vào vùng cần kiểm tra
            </p>
          </div>

          <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-lg">
            <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center mb-4">
              <AlertCircle className="w-6 h-6 text-amber-600" />
            </div>
            <h3 className="text-lg font-bold text-gray-800 mb-2">Mô Tả Chi Tiết</h3>
            <p className="text-sm text-gray-600">
              Cung cấp thông tin về triệu chứng để AI phân tích chính xác hơn
            </p>
          </div>

          <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-lg">
            <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="w-6 h-6 text-orange-600" />
            </div>
            <h3 className="text-lg font-bold text-gray-800 mb-2">Kết Quả Nhanh</h3>
            <p className="text-sm text-gray-600">
              Nhận kết quả phân tích chỉ trong vài giây từ AI chuyên nghiệp
            </p>
          </div>
        </motion.div>
      </div>

      {/* Auth Modal */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        initialMode={authModalMode}
        onLoginSuccess={handleLoginSuccess}
      />
    </div>
  );
};

export default AIHealthScan;
