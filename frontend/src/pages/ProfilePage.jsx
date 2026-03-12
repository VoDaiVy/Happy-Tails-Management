import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion'; // eslint-disable-line no-unused-vars
import {
  User, Camera, Save, X, Edit3,
  Phone, Mail, MapPin, Calendar, ChevronLeft, Loader2,
  Heart, Trash2, AlertTriangle, CheckCircle2, Circle
} from 'lucide-react';
import Navbar from '../components/layout/Navbar';
import { useAuth } from '../context/AuthContext';
import {
  getMyProfile, updateMyProfile, updateAvatar,
  getProfileCompletion, deleteMyProfile
} from '../api/profileApi';

const ProfilePage = () => {
  const navigate = useNavigate();
  const { user, updateUser } = useAuth();

  // Profile state
  const [profile, setProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({
    firstName: '', lastName: '', tel: '', dob: '', gender: '',
    bio: '', avatar: '',
    address: { street: '', district: '', city: '', province: '' }
  });
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileError, setProfileError] = useState('');
  const [profileSuccess, setProfileSuccess] = useState('');
  const [avatarModalOpen, setAvatarModalOpen] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState('');
  const [avatarSaving, setAvatarSaving] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState('');
  const [completionInfo, setCompletionInfo] = useState(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Fetch profile
  const fetchProfile = useCallback(async () => {
    if (!user) return;
    try {
      setProfileLoading(true);
      const res = await getMyProfile();
      const p = res.data.profile;
      setProfile(res.data);
      setProfileForm({
        firstName: p.firstName || '',
        lastName: p.lastName || '',
        tel: p.tel || '',
        dob: p.dob ? p.dob.slice(0, 10) : '',
        gender: p.gender || '',
        bio: p.bio || '',
        avatar: p.avatar || '',
        address: {
          street: p.address?.street || '',
          district: p.address?.district || '',
          city: p.address?.city || '',
          province: p.address?.province || '',
        }
      });
      // Sync avatar so Navbar reflects it
      if (p.avatar && user.avatar !== p.avatar) {
        updateUser({ ...user, avatar: p.avatar });
      }
      // Fetch completion details
      try {
        const completionRes = await getProfileCompletion();
        setCompletionInfo(completionRes.data);
      } catch {
        // ignore
      }
    } catch {
      // Profile may not exist yet
    } finally {
      setProfileLoading(false);
    }
  }, [user, updateUser]);

  useEffect(() => {
    if (user) {
      fetchProfile();
    }
  }, [user, fetchProfile]);

  // Profile handlers
  const handleProfileChange = (e) => {
    const { name, value } = e.target;
    if (name.startsWith('address.')) {
      const field = name.split('.')[1];
      setProfileForm(prev => ({ ...prev, address: { ...prev.address, [field]: value } }));
    } else {
      setProfileForm(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleProfileSave = async () => {
    setProfileError('');
    setProfileSuccess('');
    setProfileSaving(true);
    try {
      await updateMyProfile(profileForm);
      setProfileSuccess('Profile updated successfully!');
      setIsEditingProfile(false);
      fetchProfile();
      setTimeout(() => setProfileSuccess(''), 3000);
    } catch (err) {
      const msg = err.response?.data?.error?.message || err.response?.data?.message || 'Failed to update profile';
      setProfileError(msg);
    } finally {
      setProfileSaving(false);
    }
  };

  // Avatar handlers
  const openAvatarModal = () => {
    setAvatarUrl(profileForm.avatar || '');
    setAvatarPreview(profileForm.avatar || '');
    setAvatarModalOpen(true);
  };

  const handleAvatarUrlChange = (e) => {
    const url = e.target.value;
    setAvatarUrl(url);
    setAvatarPreview(url);
  };

  const handleAvatarSave = async () => {
    if (!avatarUrl.trim()) return;
    setAvatarSaving(true);
    try {
      await updateAvatar(avatarUrl);
      setProfileForm(prev => ({ ...prev, avatar: avatarUrl }));
      // Update user in context so Navbar avatar updates
      const updatedUser = { ...user, avatar: avatarUrl };
      updateUser(updatedUser);
      setAvatarModalOpen(false);
      setProfileSuccess('Avatar updated successfully!');
      setTimeout(() => setProfileSuccess(''), 3000);
    } catch (err) {
      const msg = err.response?.data?.error?.message || 'Failed to update avatar';
      setProfileError(msg);
    } finally {
      setAvatarSaving(false);
    }
  };

  // Delete profile handler
  const handleDeleteProfile = async () => {
    setDeleting(true);
    try {
      await deleteMyProfile();
      setDeleteModalOpen(false);
      setProfile(null);
      setProfileForm({
        firstName: '', lastName: '', tel: '', dob: '', gender: '',
        bio: '', avatar: '',
        address: { street: '', district: '', city: '', province: '' }
      });
      setCompletionInfo(null);
      setProfileSuccess('Profile deleted successfully. You can create a new one.');
      setTimeout(() => setProfileSuccess(''), 5000);
    } catch (err) {
      const msg = err.response?.data?.error?.message || 'Failed to delete profile';
      setProfileError(msg);
    } finally {
      setDeleting(false);
    }
  };

  // ProtectedRoute already handles redirect; just show nothing briefly during transitions
  if (!user) {
    return (
      <div className="bg-[#FDFBF7] min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin text-[#FF8C42]" size={32} />
      </div>
    );
  }

  return (
    <div className="bg-[#FDFBF7] min-h-screen font-sans text-[#2D3436]">
      <Navbar user={user} />

      <div className="pt-28 pb-16 px-4 max-w-5xl mx-auto">
        {/* Page header */}
        <div className="flex items-center gap-3 mb-8">
          <button onClick={() => navigate(-1)} className="p-2 rounded-xl hover:bg-white transition-colors">
            <ChevronLeft size={22} />
          </button>
          <h1 className="text-3xl font-black tracking-tight">My Profile</h1>
        </div>

        {/* ====== PROFILE ====== */}
        {(
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
            {profileLoading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="animate-spin text-[#FF8C42]" size={32} />
              </div>
            ) : (
              <div className="p-8">
                {/* Avatar + name header */}
                <div className="flex flex-col sm:flex-row items-center gap-6 mb-8 pb-8 border-b border-slate-100">
                  <div className="relative group cursor-pointer" onClick={openAvatarModal}>
                    <div className="w-28 h-28 rounded-full bg-gradient-to-br from-[#FF8C42] to-[#FF6B1A] flex items-center justify-center text-white text-3xl font-black shadow-lg overflow-hidden">
                      {profileForm.avatar ? (
                        <img src={profileForm.avatar} alt="Avatar" className="w-28 h-28 rounded-full object-cover" />
                      ) : (
                        (profileForm.firstName?.[0] || user.name?.[0] || '?').toUpperCase()
                      )}
                    </div>
                    <div className="absolute inset-0 w-28 h-28 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <Camera size={22} className="text-white" />
                    </div>
                    <div className="absolute -bottom-1 -right-1 bg-white p-1.5 rounded-full shadow-md border">
                      <Camera size={16} className="text-[#FF8C42]" />
                    </div>
                  </div>
                  <div className="text-center sm:text-left">
                    <h2 className="text-2xl font-black">
                      {profileForm.firstName && profileForm.lastName
                        ? `${profileForm.firstName} ${profileForm.lastName}`
                        : user.name || 'Set up your profile'}
                    </h2>
                    <p className="text-slate-500 flex items-center gap-2 justify-center sm:justify-start mt-1">
                      <Mail size={14} /> {user.email}
                    </p>
                    {profile?.completionPercentage !== undefined && (
                      <div className="mt-3 flex items-center gap-3">
                        <div className="w-40 h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full bg-[#FF8C42] rounded-full transition-all" style={{ width: `${profile.completionPercentage}%` }} />
                        </div>
                        <span className="text-xs font-bold text-slate-500">{profile.completionPercentage}% complete</span>
                      </div>
                    )}
                  </div>
                  <div className="sm:ml-auto">
                    {!isEditingProfile ? (
                      <button
                        onClick={() => setIsEditingProfile(true)}
                        className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 text-white rounded-xl font-bold text-sm hover:bg-[#FF8C42] transition-colors"
                      >
                        <Edit3 size={16} /> Edit
                      </button>
                    ) : (
                      <div className="flex gap-2">
                        <button
                          onClick={() => { setIsEditingProfile(false); setProfileError(''); fetchProfile(); }}
                          className="flex items-center gap-2 px-4 py-2.5 border border-slate-200 rounded-xl font-bold text-sm hover:bg-slate-50 transition-colors"
                        >
                          <X size={16} /> Cancel
                        </button>
                        <button
                          onClick={handleProfileSave}
                          disabled={profileSaving}
                          className="flex items-center gap-2 px-5 py-2.5 bg-[#FF8C42] text-white rounded-xl font-bold text-sm hover:bg-[#e07a35] transition-colors disabled:opacity-50"
                        >
                          {profileSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                          Save
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Messages */}
                {profileError && (
                  <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm font-medium">{profileError}</div>
                )}
                {profileSuccess && (
                  <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl text-green-600 text-sm font-medium">{profileSuccess}</div>
                )}

                {/* Form fields */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Field label="First Name" icon={<User size={16} />} name="firstName" value={profileForm.firstName} onChange={handleProfileChange} disabled={!isEditingProfile} placeholder="Your first name" />
                  <Field label="Last Name" icon={<User size={16} />} name="lastName" value={profileForm.lastName} onChange={handleProfileChange} disabled={!isEditingProfile} placeholder="Your last name" />
                  <Field label="Phone" icon={<Phone size={16} />} name="tel" value={profileForm.tel} onChange={handleProfileChange} disabled={!isEditingProfile} placeholder="0912345678" />
                  <Field label="Date of Birth" icon={<Calendar size={16} />} name="dob" type="date" value={profileForm.dob} onChange={handleProfileChange} disabled={!isEditingProfile} />
                  <div>
                    <label className="flex items-center gap-2 text-sm font-bold text-slate-700 mb-2">
                      <Heart size={16} className="text-[#FF8C42]" /> Gender
                    </label>
                    <select
                      name="gender" value={profileForm.gender} onChange={handleProfileChange} disabled={!isEditingProfile}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:ring-2 focus:ring-[#FF8C42] focus:border-transparent outline-none disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      <option value="">Select gender</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <Field label="Bio" icon={<Edit3 size={16} />} name="bio" value={profileForm.bio} onChange={handleProfileChange} disabled={!isEditingProfile} placeholder="A short bio about you" />
                </div>

                {/* Address section */}
                <h3 className="text-lg font-bold mt-8 mb-4 flex items-center gap-2">
                  <MapPin size={18} className="text-[#FF8C42]" /> Address
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Field label="Street" name="address.street" value={profileForm.address.street} onChange={handleProfileChange} disabled={!isEditingProfile} placeholder="Street address" />
                  <Field label="District" name="address.district" value={profileForm.address.district} onChange={handleProfileChange} disabled={!isEditingProfile} placeholder="District" />
                  <Field label="City" name="address.city" value={profileForm.address.city} onChange={handleProfileChange} disabled={!isEditingProfile} placeholder="City" />
                  <Field label="Province" name="address.province" value={profileForm.address.province} onChange={handleProfileChange} disabled={!isEditingProfile} placeholder="Province" />
                </div>

                {/* Profile Completion Details */}
                {completionInfo && completionInfo.missingFields && completionInfo.missingFields.length > 0 && (
                  <div className="mt-8 p-5 bg-amber-50 border border-amber-200 rounded-2xl">
                    <h3 className="text-sm font-bold text-amber-800 mb-3 flex items-center gap-2">
                      <AlertTriangle size={16} /> Complete your profile ({completionInfo.completionPercentage}%)
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {completionInfo.missingFields.map(field => (
                        <span key={field} className="flex items-center gap-1.5 text-xs font-medium text-amber-700 bg-amber-100 px-3 py-1.5 rounded-full">
                          <Circle size={8} /> {field}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {completionInfo && completionInfo.isProfileComplete && (
                  <div className="mt-8 p-5 bg-green-50 border border-green-200 rounded-2xl">
                    <h3 className="text-sm font-bold text-green-700 flex items-center gap-2">
                      <CheckCircle2 size={16} /> Your profile is 100% complete!
                    </h3>
                  </div>
                )}

                {/* Delete Profile */}
                {profile && (
                  <div className="mt-8 pt-6 border-t border-red-100">
                    <button
                      onClick={() => setDeleteModalOpen(true)}
                      className="flex items-center gap-2 px-5 py-2.5 text-red-500 border border-red-200 rounded-xl font-bold text-sm hover:bg-red-50 transition-colors"
                    >
                      <Trash2 size={16} /> Delete Profile
                    </button>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        )}
      </div>

      {/* ====== AVATAR MODAL ====== */}
      <AnimatePresence>
        {avatarModalOpen && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
            onClick={() => setAvatarModalOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-md"
              onClick={e => e.stopPropagation()}
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-black">Change Avatar</h2>
                  <button onClick={() => setAvatarModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
                    <X size={20} />
                  </button>
                </div>

                {/* Preview */}
                <div className="flex justify-center mb-6">
                  <div className="w-32 h-32 rounded-full bg-gradient-to-br from-[#FF8C42] to-[#FF6B1A] flex items-center justify-center text-white text-4xl font-black shadow-lg overflow-hidden">
                    {avatarPreview ? (
                      <img src={avatarPreview} alt="Preview" className="w-32 h-32 rounded-full object-cover" onError={() => setAvatarPreview('')} />
                    ) : (
                      (profileForm.firstName?.[0] || user.name?.[0] || '?').toUpperCase()
                    )}
                  </div>
                </div>

                {/* URL input */}
                <div className="space-y-3">
                  <label className="block text-sm font-bold text-slate-700">Image URL</label>
                  <input
                    type="url"
                    value={avatarUrl}
                    onChange={handleAvatarUrlChange}
                    placeholder="https://example.com/photo.jpg"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:ring-2 focus:ring-[#FF8C42] focus:border-transparent outline-none"
                  />
                  <p className="text-xs text-slate-400">Paste a direct link to your profile photo</p>
                </div>

                <div className="flex gap-3 mt-6">
                  <button
                    onClick={() => setAvatarModalOpen(false)}
                    className="flex-1 px-4 py-3 border border-slate-200 rounded-xl font-bold text-sm hover:bg-slate-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAvatarSave}
                    disabled={avatarSaving || !avatarUrl.trim()}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-[#FF8C42] text-white rounded-xl font-bold text-sm hover:bg-[#e07a35] transition-colors disabled:opacity-50"
                  >
                    {avatarSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                    Save Avatar
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ====== DELETE CONFIRMATION MODAL ====== */}
      <AnimatePresence>
        {deleteModalOpen && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
            onClick={() => setDeleteModalOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-sm"
              onClick={e => e.stopPropagation()}
            >
              <div className="p-6 text-center">
                <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <AlertTriangle size={28} className="text-red-500" />
                </div>
                <h2 className="text-xl font-black mb-2">Delete Profile?</h2>
                <p className="text-sm text-slate-500 mb-6">
                  This will permanently remove your profile information. Your account will remain active and you can create a new profile later.
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setDeleteModalOpen(false)}
                    className="flex-1 px-4 py-3 border border-slate-200 rounded-xl font-bold text-sm hover:bg-slate-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDeleteProfile}
                    disabled={deleting}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-red-500 text-white rounded-xl font-bold text-sm hover:bg-red-600 transition-colors disabled:opacity-50"
                  >
                    {deleting ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                    Delete
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// Reusable field component
const Field = ({ label, icon, name, value, onChange, disabled, placeholder, type = 'text' }) => (
  <div>
    <label className="flex items-center gap-2 text-sm font-bold text-slate-700 mb-2">
      {icon && <span className="text-[#FF8C42]">{icon}</span>}
      {label}
    </label>
    <input
      type={type}
      name={name}
      value={value}
      onChange={onChange}
      disabled={disabled}
      placeholder={placeholder}
      className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:ring-2 focus:ring-[#FF8C42] focus:border-transparent outline-none disabled:opacity-60 disabled:cursor-not-allowed transition-all"
    />
  </div>
);

export default ProfilePage;
