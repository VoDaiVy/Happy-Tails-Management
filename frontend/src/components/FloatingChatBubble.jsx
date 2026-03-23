import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, X, Send, Loader2, User, Bot, Sparkles } from 'lucide-react';
import { chatWithAI, getAIChatHistory } from '../api/aiApi';

const FloatingChatBubble = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [hasLoadedHistory, setHasLoadedHistory] = useState(false);
  const [hiddenByModal, setHiddenByModal] = useState(false);

  // Only show for logged-in customers
  const isCustomer = (() => {
    try {
      const u = JSON.parse(localStorage.getItem('user') || '{}');
      return u.role === 'customer';
    } catch {
      return false;
    }
  })();
  
  const messagesEndRef = useRef(null);

  const createWelcomeMessage = () => ({
    role: 'assistant',
    content: 'Xin chào! 👋 Tôi là trợ lý AI của Happy Tails. Bạn cần tư vấn gì về thú cưng và dịch vụ spa?',
    timestamp: new Date().toISOString(),
  });

  // Hide when another modal is open anywhere in the app
  useEffect(() => {
    const handler = (e) => {
      setHiddenByModal(e.detail.open);
      if (e.detail.open) setIsOpen(false);
    };
    window.addEventListener('app-modal-change', handler);
    return () => window.removeEventListener('app-modal-change', handler);
  }, []);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Load persisted chat history on first open
  useEffect(() => {
    if (!isOpen || hasLoadedHistory) return;

    let cancelled = false;
    const loadHistory = async () => {
      setIsHistoryLoading(true);
      try {
        const result = await getAIChatHistory(120);
        if (cancelled) return;

        const history = Array.isArray(result?.data?.messages) ? result.data.messages : [];
        if (history.length > 0) {
          setMessages(history);
        } else {
          setMessages([createWelcomeMessage()]);
        }
      } catch (error) {
        if (cancelled) return;
        setMessages([createWelcomeMessage()]);
      } finally {
        if (!cancelled) {
          setIsHistoryLoading(false);
          setHasLoadedHistory(true);
        }
      }
    };

    loadHistory();

    return () => {
      cancelled = true;
    };
  }, [isOpen, hasLoadedHistory]);

  // Only render for logged-in customers
  if (!isCustomer || hiddenByModal) return null;

  const handleToggleChat = () => setIsOpen(!isOpen);

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading || isHistoryLoading) return;

    const userMessage = {
      role: 'user',
      content: inputMessage,
      timestamp: new Date().toISOString()
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {
      const result = await chatWithAI(inputMessage);

      const aiMessage = {
        role: 'assistant',
        content: result.data.response,
        timestamp: result.data.timestamp
      };

      setMessages((prev) => [...prev, aiMessage]);
    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage = {
        role: 'assistant',
        content: '❌ Xin lỗi, đã có lỗi xảy ra. Vui lòng thử lại sau.',
        timestamp: new Date().toISOString()
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <>
      {/* Floating Chat Bubble */}
      <AnimatePresence>
        {!isOpen && (
          <motion.div 
            className="fixed bottom-6 right-6 z-50"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 20 }}
          >
            {/* Main Button */}
            <motion.button
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleToggleChat}
              className="relative w-16 h-16 bg-linear-to-br from-cyan-500 via-blue-500 to-blue-600 text-white rounded-full shadow-xl flex items-center justify-center hover:shadow-2xl hover:shadow-cyan-500/40 transition-all duration-300 z-10"
            >
              {/* Subtle Shine Effect */}
              <motion.div
                className="absolute inset-0 rounded-full bg-linear-to-tr from-white/0 via-white/20 to-white/0"
                animate={{
                  rotate: [0, 360],
                }}
                transition={{
                  duration: 8,
                  repeat: Infinity,
                  ease: "linear",
                }}
              />
              
              <MessageCircle className="w-7 h-7 relative z-20 drop-shadow-lg" strokeWidth={2.5} />
              
              {/* AI Badge with Animation */}
              <motion.div
                animate={{
                  scale: [1, 1.15, 1],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
                className="absolute -top-1 -right-1 w-7 h-7 bg-linear-to-br from-emerald-400 to-green-500 text-white rounded-full flex items-center justify-center shadow-lg border-2 border-white z-20"
              >
                <Sparkles className="w-3.5 h-3.5 drop-shadow" />
              </motion.div>
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 100, scale: 0.9 }}
            animate={{ 
              opacity: 1, 
              y: 0, 
              scale: 1,
            }}
            exit={{ 
              opacity: 0, 
              y: 50, 
              scale: 0.95,
            }}
            transition={{ 
              type: 'spring', 
              damping: 25, 
              stiffness: 300,
            }}
            className="fixed bottom-6 right-6 z-50 w-90 h-130 rounded-3xl shadow-2xl flex flex-col overflow-hidden"
            style={{
              background: 'linear-gradient(to bottom, #ffffff, #fafbfc)',
              border: '2px solid rgba(6, 182, 212, 0.2)',
            }}
          >
            {/* Header */}
            <div className="relative bg-linear-to-r from-cyan-500 via-blue-500 to-blue-600 text-white p-4">
              {/* Subtle Animated Background */}
              <div className="absolute inset-0 opacity-10">
                <motion.div
                  className="absolute inset-0"
                  style={{
                    backgroundImage: 'radial-gradient(circle at 25% 25%, white 2px, transparent 2px)',
                    backgroundSize: '50px 50px',
                  }}
                  animate={{
                    backgroundPosition: ['0px 0px', '50px 50px'],
                  }}
                  transition={{
                    duration: 20,
                    repeat: Infinity,
                    ease: 'linear',
                  }}
                />
              </div>
              
              <div className="relative flex items-center justify-between z-10">
                <div className="flex items-center space-x-3">
                  <motion.div
                    whileHover={{ rotate: 360 }}
                    transition={{ duration: 0.6 }}
                    className="w-11 h-11 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm shadow-lg border border-white/30"
                  >
                    <Bot className="w-6 h-6" strokeWidth={2.5} />
                  </motion.div>
                  <div>
                    <h3 className="font-bold text-base flex items-center gap-1.5">
                      AI Pet Assistant
                      <Sparkles className="w-4 h-4" />
                    </h3>
                    <div className="flex items-center space-x-1.5">
                      <motion.div
                        animate={{
                          scale: [1, 1.2, 1],
                        }}
                        transition={{
                          duration: 2,
                          repeat: Infinity,
                        }}
                        className="w-2 h-2 bg-emerald-300 rounded-full shadow-lg"
                      />
                      <p className="text-xs text-white/90 font-medium">Đang hoạt động</p>
                    </div>
                  </div>
                </div>
                <motion.button
                  whileHover={{ scale: 1.1, rotate: 90 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setIsOpen(false)}
                  className="hover:bg-white/20 p-2 rounded-xl transition-colors duration-200 backdrop-blur-sm"
                >
                  <X className="w-5 h-5" strokeWidth={2.5} />
                </motion.button>
              </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3" style={{
              background: 'linear-gradient(to bottom, rgba(6, 182, 212, 0.03), rgba(255, 255, 255, 0.8), white)',
            }}>
              {messages.map((msg, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 15, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ 
                    delay: index * 0.05,
                    type: 'spring',
                    stiffness: 300,
                    damping: 25,
                  }}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`flex items-start space-x-2.5 max-w-[85%] ${
                      msg.role === 'user' ? 'flex-row-reverse space-x-reverse' : ''
                    }`}
                  >
                    {/* Avatar */}
                    <div
                      className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 shadow-md ${
                        msg.role === 'user'
                          ? 'bg-linear-to-br from-cyan-500 to-blue-600'
                          : 'bg-linear-to-br from-blue-400 via-cyan-400 to-teal-400'
                      }`}
                    >
                      {msg.role === 'user' ? (
                        <User className="w-4 h-4 text-white" strokeWidth={2.5} />
                      ) : (
                        <Bot className="w-4 h-4 text-white" strokeWidth={2.5} />
                      )}
                    </div>

                    {/* Message Bubble */}
                    <div
                      className={`px-4 py-2.5 rounded-2xl shadow-sm ${
                        msg.role === 'user'
                          ? 'bg-linear-to-br from-cyan-500 to-blue-600 text-white'
                          : 'bg-white text-gray-800 border border-cyan-100/80'
                      }`}
                      style={{
                        boxShadow: msg.role === 'user' 
                          ? '0 4px 12px rgba(6, 182, 212, 0.3)'
                          : '0 2px 8px rgba(0, 0, 0, 0.08)',
                      }}
                    >
                      <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                      <p
                        className={`text-xs mt-1 ${
                          msg.role === 'user' ? 'text-white/70' : 'text-gray-400'
                        }`}
                      >
                        {new Date(msg.timestamp).toLocaleTimeString('vi-VN', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                  </div>
                </motion.div>
              ))}

              {/* Loading Indicator */}
              {isLoading && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex justify-start"
                >
                  <div className="flex items-center space-x-2.5 bg-white px-4 py-3 rounded-2xl border border-cyan-200 shadow-md">
                    <Loader2 className="w-4 h-4 text-cyan-500 animate-spin" strokeWidth={2.5} />
                    <span className="text-sm text-cyan-600 font-medium">Đang suy nghĩ...</span>
                  </div>
                </motion.div>
              )}

              {isHistoryLoading && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex justify-start"
                >
                  <div className="flex items-center space-x-2.5 bg-white px-4 py-3 rounded-2xl border border-cyan-200 shadow-md">
                    <Loader2 className="w-4 h-4 text-cyan-500 animate-spin" strokeWidth={2.5} />
                    <span className="text-sm text-cyan-600 font-medium">Đang tải lịch sử chat...</span>
                  </div>
                </motion.div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-4 border-t border-cyan-100" style={{
              background: 'linear-gradient(to top, rgba(6, 182, 212, 0.03), white)',
            }}>
              <div className="flex items-center space-x-2">
                <textarea
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Nhập câu hỏi của bạn..."
                  rows="1"
                  disabled={isLoading || isHistoryLoading}
                  className="flex-1 px-4 py-3 border-2 border-cyan-200 rounded-2xl focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20 resize-none text-sm disabled:bg-gray-50 disabled:text-gray-400 transition-all duration-200 placeholder:text-gray-400 bg-white max-h-20 overflow-y-auto"
                  style={{
                    boxShadow: '0 2px 8px rgba(6, 182, 212, 0.08)',
                    minHeight: '44px',
                  }}
                />
                <motion.button
                  onClick={handleSendMessage}
                  disabled={!inputMessage.trim() || isLoading || isHistoryLoading}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  className="px-4 py-3 bg-linear-to-br from-cyan-500 via-blue-500 to-blue-600 text-white rounded-2xl hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed h-11 w-11 flex items-center justify-center shrink-0 group"
                  style={{
                    boxShadow: '0 4px 16px rgba(6, 182, 212, 0.3)',
                  }}
                >
                  <Send className="w-5 h-5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" strokeWidth={2.5} />
                </motion.button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </>
  );
};

export default FloatingChatBubble;
