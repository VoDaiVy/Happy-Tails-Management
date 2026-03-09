import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Brain, Upload, Camera, MessageCircle, Sparkles, Heart, AlertCircle,
  CheckCircle, XCircle, Loader2, Send, Image as ImageIcon, Stethoscope,
  Activity, TrendingUp, Clock, User, Bot, ArrowRight, Star, Shield
} from 'lucide-react';
import Navbar from '../components/layout/Navbar';
import AuthModal from '../components/AuthModal';
import { chatWithAI, diagnoseImage, getAIRecommendations } from '../api/aiApi';

const AIHealthScan = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const chatEndRef = useRef(null);

  // Auth state
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem('user');
    return stored ? JSON.parse(stored) : null;
  });
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState('login');

  // Tab state
  const [activeTab, setActiveTab] = useState('diagnosis'); // 'diagnosis', 'chat', 'recommend'

  // Diagnosis state
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [symptoms, setSymptoms] = useState('');
  const [diagnosisLoading, setDiagnosisLoading] = useState(false);
  const [diagnosisResult, setDiagnosisResult] = useState(null);
  const [diagnosisError, setDiagnosisError] = useState(null);

  // Chat state
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: 'Xin chào! Tôi là trợ lý AI của Happy Tails. Tôi có thể giúp bạn tư vấn về chăm sóc thú cưng, dinh dưỡng, sức khỏe và dịch vụ của chúng tôi. Bạn cần tôi tư vấn về vấn đề gì? 🐾',
      timestamp: new Date().toISOString()
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [chatLoading, setChatLoading] = useState(false);

  // Recommendations state
  const [recommendations, setRecommendations] = useState(null);
  const [recommendLoading, setRecommendLoading] = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleLoginSuccess = (userData) => {
    setUser(userData);
    setIsAuthModalOpen(false);
  };

  const openLoginModal = () => {
    setAuthModalMode('login');
    setIsAuthModalOpen(true);
  };

  const openRegisterModal = () => {
    setAuthModalMode('register');
    setIsAuthModalOpen(true);
  };

  // Check if user is logged in
  const requireAuth = () => {
    const token = localStorage.getItem('accessToken');
    const storedUser = localStorage.getItem('user');
    
    console.log('🔐 Auth Check:', {
      hasUser: !!user,
      hasToken: !!token,
      hasStoredUser: !!storedUser,
      tokenPreview: token ? token.substring(0, 20) + '...' : 'null'
    });
    
    if (!user) {
      console.warn('⚠️ User not logged in, opening auth modal');
      openLoginModal();
      return false;
    }
    
    if (!token) {
      console.warn('⚠️ No access token found, opening auth modal');
      openLoginModal();
      return false;
    }
    
    console.log('✅ Auth check passed');
    return true;
  };

  // ========== DIAGNOSIS HANDLERS ==========
  const handleImageSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setDiagnosisError('Vui lòng chọn file hình ảnh');
      return;
    }

    setSelectedImage(file);
    setDiagnosisError(null);
    setDiagnosisResult(null);

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleDiagnose = async () => {
    if (!requireAuth()) return;
    if (!selectedImage) {
      setDiagnosisError('Vui lòng chọn hình ảnh');
      return;
    }

    setDiagnosisLoading(true);
    setDiagnosisError(null);

    try {
      // Upload image (in real app, upload to cloud storage first)
      // For demo, using base64 from preview
      const result = await diagnoseImage(imagePreview, null, symptoms);
      setDiagnosisResult(result.data.diagnosis);
    } catch (error) {
      setDiagnosisError(
        error.response?.data?.error?.message || 'Không thể phân tích hình ảnh. Vui lòng thử lại.'
      );
    } finally {
      setDiagnosisLoading(false);
    }
  };

  // ========== CHAT HANDLERS ==========
  const handleSendMessage = async () => {
    if (!requireAuth()) return;
    if (!inputMessage.trim()) return;

    const userMessage = {
      role: 'user',
      content: inputMessage,
      timestamp: new Date().toISOString()
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputMessage('');
    setChatLoading(true);

    try {
      console.log('💬 Sending message to AI...', { message: inputMessage });
      const conversationHistory = messages.map((msg) => ({
        role: msg.role,
        content: msg.content
      }));

      const result = await chatWithAI(inputMessage, conversationHistory);

      const aiMessage = {
        role: 'assistant',
        content: result.data.response,
        timestamp: result.data.timestamp
      };

      setMessages((prev) => [...prev, aiMessage]);
      console.log('✅ AI response received');
    } catch (error) {
      console.error('❌ Chat error:', error);
      
      let errorContent = 'Xin lỗi, tôi đang gặp sự cố. Vui lòng thử lại sau.';
      
      // Handle specific errors
      if (error.response?.status === 401) {
        errorContent = 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.';
      } else if (error.response?.status === 500) {
        errorContent = error.response?.data?.message || 'Lỗi máy chủ. Vui lòng thử lại sau.';
      } else if (error.message === 'Network Error') {
        errorContent = 'Không thể kết nối đến máy chủ. Vui lòng kiểm tra kết nối mạng.';
      }
      
      const errorMessage = {
        role: 'assistant',
        content: errorContent,
        timestamp: new Date().toISOString(),
        isError: true
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setChatLoading(false);
    }
  };

  // ========== RECOMMENDATION HANDLERS ==========
  const handleGetRecommendations = async () => {
    if (!requireAuth()) return;
    
    // For demo, using mock pet ID (in real app, let user select their pet)
    setRecommendLoading(true);

    try {
      const result = await getAIRecommendations('mock-pet-id');
      setRecommendations(result.data);
    } catch (err) {
      console.error('Failed to get recommendations:', err);
    } finally {
      setRecommendLoading(false);
    }
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'low': return 'text-green-600 bg-green-50 border-green-200';
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'high': return 'text-red-600 bg-red-50 border-red-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const tabs = [
    { id: 'diagnosis', label: 'Health Analysis', icon: Stethoscope },
    { id: 'chat', label: 'Ask AI Expert', icon: MessageCircle },
    { id: 'recommend', label: 'Smart Recommendations', icon: Sparkles }
  ];

  return (
    <div className="bg-[#FDFBF7] min-h-screen font-sans">
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

      {/* Hero Section */}
      <section className="pt-32 pb-16 px-6 bg-gradient-to-br from-orange-50 via-amber-50/30 to-[#FDFBF7]">
        <div className="container mx-auto max-w-7xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center max-w-3xl mx-auto"
          >
            <div className="inline-flex items-center gap-2 bg-gradient-to-r from-orange-500 to-amber-500 text-white px-4 py-2 rounded-full text-sm font-bold mb-6">
              <Brain className="w-4 h-4" />
              AI-POWERED HEALTH DIAGNOSTICS
            </div>
            
            <h1 className="text-5xl md:text-6xl font-black text-[#2D3436] mb-6 leading-tight">
              AI Health Scan
            </h1>
            <p className="text-xl text-slate-600 mb-8">
              Công nghệ AI tiên tiến giúp phân tích sức khỏe thú cưng của bạn trong vài giây.
              Nhận tư vấn chuyên nghiệp và gợi ý dịch vụ phù hợp.
            </p>

            <div className="flex flex-wrap gap-6 justify-center text-sm">
              {[
                { icon: Shield, text: 'Chính xác 95%+' },
                { icon: Clock, text: 'Kết quả tức thì' },
                { icon: Brain, text: 'AI Gemini/GPT-4' }
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-2 text-slate-700">
                  <div className="w-8 h-8 rounded-lg bg-orange-100 flex items-center justify-center">
                    <item.icon size={16} className="text-orange-600" />
                  </div>
                  <span className="font-semibold">{item.text}</span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Main Content */}
      <section className="py-12 px-6">
        <div className="container mx-auto max-w-6xl">
          {/* Tabs */}
          <div className="flex gap-2 mb-8 overflow-x-auto pb-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition-all whitespace-nowrap
                  ${activeTab === tab.id
                    ? 'bg-gradient-to-r from-[#FF8C42] to-[#e86b1f] text-white shadow-lg'
                    : 'bg-white text-slate-600 hover:bg-orange-50 hover:text-[#FF8C42] border border-slate-200'
                  }`}
              >
                <tab.icon size={18} />
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <AnimatePresence mode="wait">
            {/* DIAGNOSIS TAB */}
            {activeTab === 'diagnosis' && (
              <motion.div
                key="diagnosis"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="bg-white rounded-3xl shadow-xl p-8 border border-slate-100"
              >
                <div className="grid md:grid-cols-2 gap-8">
                  {/* Left: Upload */}
                  <div>
                    <h3 className="text-2xl font-black text-slate-800 mb-4">Upload Pet Image</h3>
                    <p className="text-slate-600 mb-6">
                      Tải lên hình ảnh thú cưng của bạn để AI phân tích sức khỏe
                    </p>

                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="relative border-2 border-dashed border-slate-300 rounded-2xl p-8 text-center cursor-pointer hover:border-[#FF8C42] hover:bg-orange-50/50 transition-all group"
                    >
                      {imagePreview ? (
                        <div className="relative">
                          <img
                            src={imagePreview}
                            alt="Preview"
                            className="w-full h-64 object-cover rounded-xl"
                          />
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedImage(null);
                              setImagePreview(null);
                              setDiagnosisResult(null);
                            }}
                            className="absolute top-2 right-2 w-8 h-8 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600"
                          >
                            <XCircle size={20} />
                          </button>
                        </div>
                      ) : (
                        <>
                          <Upload size={48} className="mx-auto text-slate-400 group-hover:text-[#FF8C42] mb-4" />
                          <p className="font-bold text-slate-700 mb-2">Click to upload</p>
                          <p className="text-sm text-slate-500">PNG, JPG up to 10MB</p>
                        </>
                      )}
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleImageSelect}
                      />
                    </div>

                    {/* Symptoms Input */}
                    <div className="mt-6">
                      <label className="block text-sm font-bold text-slate-700 mb-2">
                        Additional Symptoms (Optional)
                      </label>
                      <textarea
                        value={symptoms}
                        onChange={(e) => setSymptoms(e.target.value)}
                        placeholder="Mô tả thêm các triệu chứng bạn quan sát được..."
                        className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#FF8C42] focus:border-transparent resize-none"
                        rows={3}
                      />
                    </div>

                    <button
                      onClick={handleDiagnose}
                      disabled={!selectedImage || diagnosisLoading}
                      className="w-full mt-6 flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-r from-[#FF8C42] to-[#e86b1f] text-white font-bold rounded-xl shadow-lg hover:shadow-xl hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 transition-all"
                    >
                      {diagnosisLoading ? (
                        <>
                          <Loader2 className="animate-spin" size={20} />
                          Analyzing...
                        </>
                      ) : (
                        <>
                          <Brain size={20} />
                          Analyze with AI
                        </>
                      )}
                    </button>

                    {diagnosisError && (
                      <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
                        <XCircle size={20} className="text-red-600 flex-shrink-0 mt-0.5" />
                        <p className="text-sm text-red-800">{diagnosisError}</p>
                      </div>
                    )}
                  </div>

                  {/* Right: Results */}
                  <div>
                    <h3 className="text-2xl font-black text-slate-800 mb-4">AI Diagnosis Result</h3>

                    {!diagnosisResult && !diagnosisLoading && (
                      <div className="h-full flex items-center justify-center text-center p-8">
                        <div>
                          <Stethoscope size={64} className="mx-auto text-slate-300 mb-4" />
                          <p className="text-slate-500">
                            Upload an image to get AI diagnosis
                          </p>
                        </div>
                      </div>
                    )}

                    {diagnosisResult && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="space-y-4"
                      >
                        {/* Severity Badge */}
                        <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl border font-bold text-sm ${getSeverityColor(diagnosisResult.severity)}`}>
                          <AlertCircle size={16} />
                          Severity: {diagnosisResult.severity?.toUpperCase()}
                        </div>

                        {/* Symptoms */}
                        <div className="p-4 bg-blue-50 rounded-xl border border-blue-200">
                          <h4 className="font-bold text-blue-900 mb-2 flex items-center gap-2">
                            <Activity size={18} />
                            Observed Symptoms
                          </h4>
                          <p className="text-sm text-blue-800">{diagnosisResult.symptoms}</p>
                        </div>

                        {/* Possible Conditions */}
                        {diagnosisResult.possibleConditions?.length > 0 && (
                          <div className="p-4 bg-purple-50 rounded-xl border border-purple-200">
                            <h4 className="font-bold text-purple-900 mb-2">Possible Conditions</h4>
                            <ul className="space-y-1">
                              {diagnosisResult.possibleConditions.map((condition, i) => (
                                <li key={i} className="text-sm text-purple-800 flex items-start gap-2">
                                  <span className="text-purple-600 font-bold">•</span>
                                  {condition}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* Advice */}
                        <div className="p-4 bg-green-50 rounded-xl border border-green-200">
                          <h4 className="font-bold text-green-900 mb-2 flex items-center gap-2">
                            <Heart size={18} />
                            Medical Advice
                          </h4>
                          <p className="text-sm text-green-800">{diagnosisResult.advice}</p>
                        </div>

                        {/* Urgency */}
                        {diagnosisResult.urgency === 'yes' && (
                          <div className="p-4 bg-red-50 rounded-xl border-2 border-red-300">
                            <h4 className="font-bold text-red-900 mb-2 flex items-center gap-2">
                              <AlertCircle size={18} />
                              Immediate Action Required
                            </h4>
                            <p className="text-sm text-red-800 mb-3">
                              Please visit a veterinary clinic as soon as possible.
                            </p>
                            <button className="px-4 py-2 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 transition-colors">
                              Book Emergency Appointment
                            </button>
                          </div>
                        )}

                        {/* Recommended Services */}
                        {diagnosisResult.recommendedServices?.length > 0 && (
                          <div className="p-4 bg-orange-50 rounded-xl border border-orange-200">
                            <h4 className="font-bold text-orange-900 mb-2 flex items-center gap-2">
                              <Sparkles size={18} />
                              Recommended Services
                            </h4>
                            <div className="space-y-2">
                              {diagnosisResult.recommendedServices.map((service, i) => (
                                <div key={i} className="flex items-center gap-2 text-sm text-orange-800">
                                  <CheckCircle size={16} className="text-orange-600" />
                                  {service}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </motion.div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {/* CHAT TAB */}
            {activeTab === 'chat' && (
              <motion.div
                key="chat"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden"
              >
                {/* Chat Header */}
                <div className="bg-gradient-to-r from-orange-500 to-amber-500 p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center">
                        <Bot size={24} className="text-white" />
                      </div>
                      <div>
                        <h3 className="text-xl font-black text-white">AI Pet Care Expert</h3>
                        <p className="text-sm text-white/80">Always here to help you 24/7</p>
                      </div>
                    </div>
                    <button
                      onClick={async () => {
                        const token = localStorage.getItem('accessToken');
                        const user = localStorage.getItem('user');
                        console.log('🔍 Debug Info:', {
                          hasToken: !!token,
                          hasUser: !!user,
                          tokenLength: token?.length,
                          tokenPreview: token?.substring(0, 30) + '...'
                        });
                        alert(`Debug Info:\n✅ Token: ${token ? 'Yes' : 'No'}\n✅ User: ${user ? 'Yes' : 'No'}\n\nCheck console for details`);
                      }}
                      className="px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white text-xs font-bold rounded-lg transition-colors"
                      title="Debug token status"
                    >
                      🔍 Debug
                    </button>
                  </div>
                </div>

                {/* Messages */}
                <div className="h-[500px] overflow-y-auto p-6 space-y-4">
                  {messages.map((msg, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
                    >
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                        msg.role === 'user' ? 'bg-[#FF8C42]' : 'bg-slate-200'
                      }`}>
                        {msg.role === 'user' ? (
                          <User size={20} className="text-white" />
                        ) : (
                          <Bot size={20} className="text-slate-600" />
                        )}
                      </div>
                      <div className={`max-w-[70%] ${msg.role === 'user' ? 'text-right' : ''}`}>
                        <div className={`inline-block p-4 rounded-2xl ${
                          msg.role === 'user'
                            ? 'bg-gradient-to-r from-[#FF8C42] to-[#e86b1f] text-white'
                            : msg.isError
                            ? 'bg-red-50 text-red-800 border border-red-200'
                            : 'bg-slate-100 text-slate-800'
                        }`}>
                          <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                        </div>
                        <p className="text-xs text-slate-400 mt-1">
                          {new Date(msg.timestamp).toLocaleTimeString('vi-VN')}
                        </p>
                      </div>
                    </motion.div>
                  ))}
                  {chatLoading && (
                    <div className="flex gap-3">
                      <div className="w-10 h-10 rounded-xl bg-slate-200 flex items-center justify-center">
                        <Bot size={20} className="text-slate-600" />
                      </div>
                      <div className="bg-slate-100 px-4 py-3 rounded-2xl">
                        <Loader2 className="animate-spin text-slate-400" size={20} />
                      </div>
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>

                {/* Input */}
                <div className="p-6 border-t border-slate-200">
                  <div className="flex gap-3">
                    <input
                      type="text"
                      value={inputMessage}
                      onChange={(e) => setInputMessage(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                      placeholder="Type your question..."
                      className="flex-1 px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#FF8C42] focus:border-transparent"
                    />
                    <button
                      onClick={handleSendMessage}
                      disabled={!inputMessage.trim() || chatLoading}
                      className="px-6 py-3 bg-gradient-to-r from-[#FF8C42] to-[#e86b1f] text-white font-bold rounded-xl hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                      <Send size={20} />
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            {/* RECOMMENDATIONS TAB */}
            {activeTab === 'recommend' && (
              <motion.div
                key="recommend"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="bg-white rounded-3xl shadow-xl p-8 border border-slate-100 text-center"
              >
                <Sparkles size={64} className="mx-auto text-orange-500 mb-4" />
                <h3 className="text-2xl font-black text-slate-800 mb-4">
                  Smart Service Recommendations
                </h3>
                <p className="text-slate-600 mb-8 max-w-2xl mx-auto">
                  Get personalized service recommendations based on your pet's profile and AI analysis.
                </p>
                <button
                  onClick={handleGetRecommendations}
                  disabled={recommendLoading}
                  className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-[#FF8C42] to-[#e86b1f] text-white font-bold rounded-xl shadow-lg hover:shadow-xl hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  {recommendLoading ? (
                    <>
                      <Loader2 className="animate-spin" size={20} />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <Brain size={20} />
                      Get AI Recommendations
                    </>
                  )}
                </button>

                {recommendations && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-8 text-left"
                  >
                    <div className="p-6 bg-gradient-to-br from-orange-50 to-amber-50 rounded-2xl">
                      <h4 className="font-black text-lg text-slate-800 mb-4">
                        Recommended for your pet
                      </h4>
                      {/* Display recommendations here */}
                      <p className="text-slate-600">Recommendations will appear here...</p>
                    </div>
                  </motion.div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 px-6 bg-gradient-to-r from-orange-500 to-amber-500">
        <div className="container mx-auto max-w-4xl text-center">
          <h2 className="text-4xl font-black text-white mb-6">
            Ready to Try AI Health Scan?
          </h2>
          <p className="text-xl text-white/90 mb-8">
            Join thousands of pet owners using AI to keep their pets healthy
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <button
              onClick={() => setActiveTab('diagnosis')}
              className="flex items-center gap-2 px-8 py-4 bg-white text-orange-600 font-bold rounded-xl shadow-lg hover:shadow-xl hover:scale-105 transition-all"
            >
              <Upload size={20} />
              Upload Pet Photo
            </button>
            <button
              onClick={() => setActiveTab('chat')}
              className="flex items-center gap-2 px-8 py-4 bg-white/10 backdrop-blur border-2 border-white text-white font-bold rounded-xl hover:bg-white/20 transition-all"
            >
              <MessageCircle size={20} />
              Chat with AI
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default AIHealthScan;
