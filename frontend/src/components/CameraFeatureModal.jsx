import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import useScrollLock from '../hooks/useScrollLock';
import { 
  X, Video, Camera, Bell, Shield, Clock, Smartphone, 
  Monitor, Eye, CheckCircle, Play, Image as ImageIcon
} from 'lucide-react';

/**
 * CameraFeatureModal
 * Educational modal explaining the 24/7 Camera Monitoring feature
 */
const CameraFeatureModal = ({ isOpen, onClose }) => {
  useScrollLock(isOpen);
  if (!isOpen) return null;

  const features = [
    {
      icon: <Video className="w-6 h-6" />,
      title: "Live Stream 24/7",
      description: "Watch your pet in real-time from anywhere, anytime"
    },
    {
      icon: <ImageIcon className="w-6 h-6" />,
      title: "Daily Photo Updates",
      description: "Receive 4-6 photos per day sent directly to your email"
    },
    {
      icon: <Camera className="w-6 h-6" />,
      title: "On-Demand Snapshots",
      description: "Request instant photos whenever you want to check on your pet"
    },
    {
      icon: <Bell className="w-6 h-6" />,
      title: "Activity Alerts",
      description: "Get notifications when your pet is eating, playing, or sleeping"
    },
    {
      icon: <Monitor className="w-6 h-6" />,
      title: "Multi-Camera Views",
      description: "VIP rooms feature multiple camera angles for complete visibility"
    },
    {
      icon: <Shield className="w-6 h-6" />,
      title: "Secure & Private",
      description: "Encrypted streams with access limited to booking owners only"
    }
  ];

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-white rounded-3xl max-w-5xl w-full max-h-[90vh] overflow-hidden shadow-2xl"
        >
          {/* Header */}
          <div className="relative bg-gradient-to-r from-[#1F2A37] to-[#2D3748] text-white p-8">
            <button
              onClick={onClose}
              className="absolute top-6 right-6 p-2 hover:bg-white/10 rounded-full transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
            
            <div className="flex items-center gap-4 mb-4">
              <div className="w-16 h-16 bg-[#E07A5F]/20 rounded-2xl flex items-center justify-center">
                <Video className="w-8 h-8 text-[#E07A5F]" />
              </div>
              <div>
                <h2 className="text-3xl font-bold mb-2">24/7 Camera Monitoring</h2>
                <p className="text-white/70">Stay connected with your pet during their stay</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2 mt-6">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              <span className="text-green-400 text-sm font-medium">Available for all boarding bookings</span>
            </div>
          </div>

          {/* Content */}
          <div className="p-8 max-h-[calc(90vh-200px)] overflow-y-auto">
            {/* Demo Video Preview */}
            <div className="mb-8 bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl overflow-hidden aspect-video relative group cursor-pointer">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <div className="w-20 h-20 bg-[#E07A5F] rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                    <Play className="w-10 h-10 text-white ml-1" />
                  </div>
                  <p className="text-white text-lg font-medium">Watch Demo Video</p>
                  <p className="text-white/60 text-sm mt-1">See how it works (2:30)</p>
                </div>
              </div>
              <img 
                src="/api/placeholder/800/450" 
                alt="Camera demo" 
                className="w-full h-full object-cover opacity-30"
              />
            </div>

            {/* Features Grid */}
            <h3 className="text-2xl font-bold text-[#1F2A37] mb-6">Key Features</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              {features.map((feature, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  className="bg-gradient-to-br from-[#F5F1EB] to-white p-6 rounded-2xl border border-[#1F2A37]/5 hover:shadow-lg transition-shadow"
                >
                  <div className="w-12 h-12 bg-[#7FB069]/10 text-[#7FB069] rounded-xl flex items-center justify-center mb-4">
                    {feature.icon}
                  </div>
                  <h4 className="font-bold text-[#1F2A37] mb-2">{feature.title}</h4>
                  <p className="text-[#1F2A37]/60 text-sm leading-relaxed">{feature.description}</p>
                </motion.div>
              ))}
            </div>

            {/* How It Works */}
            <div className="bg-gradient-to-r from-[#7FB069]/5 to-[#E07A5F]/5 rounded-2xl p-8 mb-8">
              <h3 className="text-2xl font-bold text-[#1F2A37] mb-6 flex items-center gap-3">
                <Clock className="w-6 h-6 text-[#E07A5F]" />
                How It Works
              </h3>
              <div className="space-y-4">
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 bg-[#7FB069] text-white rounded-full flex items-center justify-center font-bold flex-shrink-0">
                    1
                  </div>
                  <div>
                    <h4 className="font-bold text-[#1F2A37] mb-1">Book a Boarding Service</h4>
                    <p className="text-[#1F2A37]/60 text-sm">Camera access is automatically enabled when you book boarding services</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 bg-[#7FB069] text-white rounded-full flex items-center justify-center font-bold flex-shrink-0">
                    2
                  </div>
                  <div>
                    <h4 className="font-bold text-[#1F2A37] mb-1">Receive Access Link</h4>
                    <p className="text-[#1F2A37]/60 text-sm">You'll get a secure access link via email once your pet is checked in</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 bg-[#7FB069] text-white rounded-full flex items-center justify-center font-bold flex-shrink-0">
                    3
                  </div>
                  <div>
                    <h4 className="font-bold text-[#1F2A37] mb-1">Watch Anytime</h4>
                    <p className="text-[#1F2A37]/60 text-sm">Access the live stream from your phone, tablet, or computer 24/7</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 bg-[#7FB069] text-white rounded-full flex items-center justify-center font-bold flex-shrink-0">
                    4
                  </div>
                  <div>
                    <h4 className="font-bold text-[#1F2A37] mb-1">Stay Updated</h4>
                    <p className="text-[#1F2A37]/60 text-sm">Receive daily photos and activity alerts throughout your pet's stay</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Compatibility */}
            <div className="bg-white border border-[#1F2A37]/10 rounded-2xl p-6">
              <h3 className="text-lg font-bold text-[#1F2A37] mb-4 flex items-center gap-2">
                <Smartphone className="w-5 h-5" />
                Works on All Devices
              </h3>
              <p className="text-[#1F2A37]/60 text-sm mb-4">
                Access camera feeds seamlessly on desktop, mobile, and tablet devices. 
                No app download required - just use your web browser.
              </p>
              <div className="flex items-center gap-3 text-sm">
                <CheckCircle className="w-5 h-5 text-[#7FB069]" />
                <span className="text-[#1F2A37]/70">iOS & Android</span>
                <span className="text-[#1F2A37]/30">•</span>
                <CheckCircle className="w-5 h-5 text-[#7FB069]" />
                <span className="text-[#1F2A37]/70">Windows & Mac</span>
                <span className="text-[#1F2A37]/30">•</span>
                <CheckCircle className="w-5 h-5 text-[#7FB069]" />
                <span className="text-[#1F2A37]/70">Tablets</span>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="bg-gray-50 px-8 py-6 border-t border-gray-200 flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Shield className="w-4 h-4" />
              <span>Secure & Encrypted • GDPR Compliant</span>
            </div>
            <button
              onClick={onClose}
              className="bg-[#1F2A37] text-white px-8 py-3 rounded-full hover:bg-[#E07A5F] transition-colors font-medium"
            >
              Got it!
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default CameraFeatureModal;
