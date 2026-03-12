import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Video, Camera, Volume2, VolumeX, Maximize, Minimize,
  Download, RefreshCw, Image as ImageIcon, Clock, Calendar,
  AlertCircle, CheckCircle, Wifi, WifiOff, Settings, Bell, BellOff
} from 'lucide-react';

/**
 * CameraViewer Component
 * Displays live camera feed and controls for pet monitoring
 */
const CameraViewer = ({ 
  bookingId, 
  accessToken, 
  onClose,
  bookingData = null 
}) => {
  const [selectedCamera, setSelectedCamera] = useState(null);
  const [cameras, setCameras] = useState([]);
  const [snapshots, setSnapshots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [isLive, setIsLive] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [notificationSettings, setNotificationSettings] = useState({
    photoUpdates: true,
    liveAlerts: true,
    emailNotifications: true
  });
  const [snapshotLoading, setSnapshotLoading] = useState(false);
  
  const videoRef = useRef(null);
  const containerRef = useRef(null);

  // Fetch camera access and available cameras
  useEffect(() => {
    const fetchCameraAccess = async () => {
      try {
        setLoading(true);
        const response = await fetch(
          `/api/camera/booking/${bookingId}/access?accessToken=${accessToken}`,
          {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
          }
        );
        
        if (!response.ok) {
          throw new Error('Failed to verify camera access');
        }
        
        const data = await response.json();
        
        if (data.success) {
          setCameras(data.data.cameras);
          setNotificationSettings(data.data.notificationSettings);
          
          // Select first camera by default
          if (data.data.cameras.length > 0) {
            setSelectedCamera(data.data.cameras[0]);
          }
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    
    if (bookingId && accessToken) {
      fetchCameraAccess();
    }
  }, [bookingId, accessToken]);

  // Fetch camera stream when camera is selected
  useEffect(() => {
    const fetchStream = async () => {
      if (!selectedCamera) return;
      
      try {
        const response = await fetch(
          `/api/camera/booking/${bookingId}/stream/${selectedCamera._id}?accessToken=${accessToken}`,
          {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
          }
        );
        
        if (!response.ok) {
          throw new Error('Failed to get stream URL');
        }
        
        const data = await response.json();
        
        if (data.success && videoRef.current) {
          // In production, this would load the actual stream
          // For now, we'll simulate it
          videoRef.current.src = data.data.streamUrl;
          setIsLive(true);
        }
      } catch (err) {
        console.error('Stream error:', err);
        setError('Failed to load camera stream');
      }
    };
    
    fetchStream();
  }, [selectedCamera, bookingId, accessToken]);

  // Request snapshot
  const handleRequestSnapshot = async () => {
    if (!selectedCamera) return;
    
    try {
      setSnapshotLoading(true);
      const response = await fetch(
        `/api/camera/booking/${bookingId}/snapshot/${selectedCamera._id}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify({ accessToken })
        }
      );
      
      if (!response.ok) {
        throw new Error('Failed to request snapshot');
      }
      
      const data = await response.json();
      
      if (data.success) {
        // Show success message
        alert('Snapshot requested! It will be available in the gallery shortly.');
      }
    } catch (err) {
      alert('Failed to request snapshot: ' + err.message);
    } finally {
      setSnapshotLoading(false);
    }
  };

  // Toggle fullscreen
  const handleFullscreen = () => {
    if (!containerRef.current) return;
    
    if (!isFullscreen) {
      if (containerRef.current.requestFullscreen) {
        containerRef.current.requestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
    setIsFullscreen(!isFullscreen);
  };

  // Update notification settings
  const handleUpdateNotifications = async (newSettings) => {
    try {
      const response = await fetch(
        `/api/camera/booking/${bookingId}/notifications`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify(newSettings)
        }
      );
      
      if (!response.ok) {
        throw new Error('Failed to update settings');
      }
      
      const data = await response.json();
      
      if (data.success) {
        setNotificationSettings(data.data);
      }
    } catch (err) {
      console.error('Update notification settings error:', err);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center">
        <div className="text-white text-center">
          <RefreshCw className="w-12 h-12 mx-auto mb-4 animate-spin" />
          <p className="text-lg">Loading camera feed...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 max-w-md text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-gray-900 mb-2">Camera Access Error</h3>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={onClose}
            className="bg-[#1F2A37] text-white px-6 py-3 rounded-full hover:bg-[#E07A5F] transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      className="fixed inset-0 bg-black/95 backdrop-blur-sm z-50 flex flex-col"
    >
      {/* Header */}
      <div className="bg-gradient-to-r from-[#1F2A37] to-[#2D3748] border-b border-white/10 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Video className="w-6 h-6 text-[#E07A5F]" />
            <h2 className="text-xl font-bold text-white">24/7 Camera Monitoring</h2>
          </div>
          {isLive && (
            <div className="flex items-center gap-2 bg-red-500/20 border border-red-500/50 px-3 py-1 rounded-full">
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              <span className="text-red-500 text-sm font-medium">LIVE</span>
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors text-white"
            title="Settings"
          >
            <Settings className="w-5 h-5" />
          </button>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors text-white"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Main Video Area */}
        <div className="flex-1 flex flex-col bg-black">
          {/* Video Player */}
          <div className="flex-1 relative bg-gray-900 flex items-center justify-center">
            {selectedCamera ? (
              <>
                {/* Simulated video player - in production, use actual HLS/WebRTC */}
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900">
                  <div className="text-center">
                    <Video className="w-24 h-24 text-gray-600 mx-auto mb-4" />
                    <p className="text-gray-400 text-lg mb-2">{selectedCamera.cameraName}</p>
                    <p className="text-gray-500 text-sm">Stream: {selectedCamera.resolution}</p>
                    <p className="text-gray-600 text-xs mt-2">
                      Note: In production, live video stream would appear here
                    </p>
                  </div>
                </div>
                
                {/* Video controls overlay */}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => setIsMuted(!isMuted)}
                        className="p-3 bg-white/10 hover:bg-white/20 rounded-full transition-colors text-white"
                      >
                        {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                      </button>
                      
                      <button
                        onClick={handleRequestSnapshot}
                        disabled={snapshotLoading}
                        className="flex items-center gap-2 px-4 py-2 bg-[#E07A5F] hover:bg-[#E07A5F]/90 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-full transition-colors text-white"
                      >
                        <Camera className="w-4 h-4" />
                        <span className="text-sm font-medium">
                          {snapshotLoading ? 'Capturing...' : 'Take Photo'}
                        </span>
                      </button>
                    </div>
                    
                    <button
                      onClick={handleFullscreen}
                      className="p-3 bg-white/10 hover:bg-white/20 rounded-full transition-colors text-white"
                    >
                      {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-gray-400 text-center">
                <Video className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p>No camera selected</p>
              </div>
            )}
          </div>

          {/* Camera Selector */}
          {cameras.length > 1 && (
            <div className="bg-[#1F2A37] border-t border-white/10 p-4">
              <div className="flex gap-3 overflow-x-auto">
                {cameras.map((camera) => (
                  <button
                    key={camera._id}
                    onClick={() => setSelectedCamera(camera)}
                    className={`flex-shrink-0 px-4 py-2 rounded-lg transition-all ${
                      selectedCamera?._id === camera._id
                        ? 'bg-[#E07A5F] text-white'
                        : 'bg-white/10 text-white/70 hover:bg-white/20'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Video className="w-4 h-4" />
                      <span className="text-sm font-medium">{camera.cameraName}</span>
                    </div>
                    <p className="text-xs opacity-70">{camera.position}</p>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="w-80 bg-[#1F2A37] border-l border-white/10 flex flex-col overflow-hidden">
          {/* Booking Info */}
          <div className="p-6 border-b border-white/10">
            <h3 className="text-white font-bold text-lg mb-3">Your Booking</h3>
            {bookingData && (
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2 text-white/70">
                  <Calendar className="w-4 h-4" />
                  <span>Check-in: {new Date(bookingData.checkIn).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center gap-2 text-white/70">
                  <Clock className="w-4 h-4" />
                  <span>Room: {bookingData.room?.roomNumber || 'N/A'}</span>
                </div>
              </div>
            )}
          </div>

          {/* Settings Panel */}
          <AnimatePresence>
            {showSettings && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="border-b border-white/10 overflow-hidden"
              >
                <div className="p-6">
                  <h4 className="text-white font-bold text-sm mb-4">Notifications</h4>
                  <div className="space-y-3">
                    <label className="flex items-center justify-between cursor-pointer">
                      <span className="text-white/70 text-sm">Daily Photo Updates</span>
                      <input
                        type="checkbox"
                        checked={notificationSettings.photoUpdates}
                        onChange={(e) => {
                          const newSettings = { ...notificationSettings, photoUpdates: e.target.checked };
                          setNotificationSettings(newSettings);
                          handleUpdateNotifications(newSettings);
                        }}
                        className="w-10 h-5 bg-white/10 rounded-full appearance-none cursor-pointer checked:bg-[#7FB069] relative
                                   before:content-[''] before:absolute before:w-4 before:h-4 before:bg-white before:rounded-full 
                                   before:top-0.5 before:left-0.5 before:transition-transform checked:before:translate-x-5"
                      />
                    </label>
                    
                    <label className="flex items-center justify-between cursor-pointer">
                      <span className="text-white/70 text-sm">Live Alerts</span>
                      <input
                        type="checkbox"
                        checked={notificationSettings.liveAlerts}
                        onChange={(e) => {
                          const newSettings = { ...notificationSettings, liveAlerts: e.target.checked };
                          setNotificationSettings(newSettings);
                          handleUpdateNotifications(newSettings);
                        }}
                        className="w-10 h-5 bg-white/10 rounded-full appearance-none cursor-pointer checked:bg-[#7FB069] relative
                                   before:content-[''] before:absolute before:w-4 before:h-4 before:bg-white before:rounded-full 
                                   before:top-0.5 before:left-0.5 before:transition-transform checked:before:translate-x-5"
                      />
                    </label>
                    
                    <label className="flex items-center justify-between cursor-pointer">
                      <span className="text-white/70 text-sm">Email Notifications</span>
                      <input
                        type="checkbox"
                        checked={notificationSettings.emailNotifications}
                        onChange={(e) => {
                          const newSettings = { ...notificationSettings, emailNotifications: e.target.checked };
                          setNotificationSettings(newSettings);
                          handleUpdateNotifications(newSettings);
                        }}
                        className="w-10 h-5 bg-white/10 rounded-full appearance-none cursor-pointer checked:bg-[#7FB069] relative
                                   before:content-[''] before:absolute before:w-4 before:h-4 before:bg-white before:rounded-full 
                                   before:top-0.5 before:left-0.5 before:transition-transform checked:before:translate-x-5"
                      />
                    </label>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Snapshots Gallery */}
          <div className="flex-1 overflow-y-auto p-6">
            <h4 className="text-white font-bold text-sm mb-4 flex items-center gap-2">
              <ImageIcon className="w-4 h-4" />
              Recent Photos
            </h4>
            {snapshots.length > 0 ? (
              <div className="grid grid-cols-2 gap-3">
                {snapshots.map((snapshot, idx) => (
                  <div key={idx} className="aspect-square bg-white/5 rounded-lg overflow-hidden hover:ring-2 hover:ring-[#E07A5F] transition-all cursor-pointer">
                    <img src={snapshot.url} alt={`Snapshot ${idx + 1}`} className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <ImageIcon className="w-12 h-12 text-white/20 mx-auto mb-3" />
                <p className="text-white/40 text-sm">No photos yet</p>
                <p className="text-white/30 text-xs mt-1">
                  Take a snapshot to see it here
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CameraViewer;
