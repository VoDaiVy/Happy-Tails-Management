import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion'; // eslint-disable-line no-unused-vars
import {
  User, PawPrint, Camera, Save, X, Plus, Edit3, Trash2,
  Phone, Mail, MapPin, Calendar, ChevronLeft, Loader2,
  Dog, Cat, Bird, Fish, Rabbit, Heart, Weight, Palette
} from 'lucide-react';
import Navbar from '../components/layout/Navbar';
import AuthModal from '../components/AuthModal';
import { useAuth } from '../context/AuthContext';
import {
  getMyProfile, updateMyProfile, updateAvatar
} from '../api/profileApi';
import {
  getMyPets, createPet, updatePet, deletePet
} from '../api/profileApi';

const PET_TYPES = [
  { value: 'dog', label: 'Dog', icon: '🐕' },
  { value: 'cat', label: 'Cat', icon: '🐈' },
  { value: 'bird', label: 'Bird', icon: '🐦' },
  { value: 'fish', label: 'Fish', icon: '🐟' },
  { value: 'rabbit', label: 'Rabbit', icon: '🐇' },
  { value: 'hamster', label: 'Hamster', icon: '🐹' },
  { value: 'other', label: 'Other', icon: '🐾' },
];

const GENDERS = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'unknown', label: 'Unknown' },
];

const ProfilePage = () => {
  const navigate = useNavigate();
  const { user, updateUser } = useAuth();

  // Auth modal
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState('login');

  // Tabs
  const [activeTab, setActiveTab] = useState('profile');

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

  // Pets state
  const [pets, setPets] = useState([]);
  const [petsLoading, setPetsLoading] = useState(true);
  const [petModalOpen, setPetModalOpen] = useState(false);
  const [editingPet, setEditingPet] = useState(null);
  const [petForm, setPetForm] = useState({
    petName: '', petType: 'dog', breed: '', gender: 'male',
    weight: '', dateOfBirth: '', color: '', petID: '',
    specialNeeds: '', notes: ''
  });
  const [petSaving, setPetSaving] = useState(false);
  const [petError, setPetError] = useState('');
  const [deletingPetId, setDeletingPetId] = useState(null);

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
    } catch {
      // Profile may not exist yet
    } finally {
      setProfileLoading(false);
    }
  }, [user, updateUser]);

  // Fetch pets
  const fetchPets = useCallback(async () => {
    if (!user) return;
    try {
      setPetsLoading(true);
      const res = await getMyPets();
      setPets(res.data.pets);
    } catch {
      setPets([]);
    } finally {
      setPetsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchProfile();
      fetchPets();
    }
  }, [user, fetchProfile, fetchPets]);

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

  // Pet handlers
  const openAddPet = () => {
    setEditingPet(null);
    setPetForm({
      petName: '', petType: 'dog', breed: '', gender: 'male',
      weight: '', dateOfBirth: '', color: '', petID: '',
      specialNeeds: '', notes: ''
    });
    setPetError('');
    setPetModalOpen(true);
  };

  const openEditPet = (pet) => {
    setEditingPet(pet);
    setPetForm({
      petName: pet.petName || '',
      petType: pet.petType || 'dog',
      breed: pet.breed || '',
      gender: pet.gender || 'male',
      weight: pet.weight || '',
      dateOfBirth: pet.dateOfBirth ? pet.dateOfBirth.slice(0, 10) : '',
      color: pet.color || '',
      petID: pet.petID || '',
      specialNeeds: pet.specialNeeds || '',
      notes: pet.notes || ''
    });
    setPetError('');
    setPetModalOpen(true);
  };

  const handlePetChange = (e) => {
    const { name, value } = e.target;
    setPetForm(prev => ({ ...prev, [name]: value }));
  };

  const handlePetSave = async () => {
    setPetError('');
    setPetSaving(true);
    try {
      const data = { ...petForm, weight: parseFloat(petForm.weight) };
      if (editingPet) {
        await updatePet(editingPet._id, data);
      } else {
        await createPet(data);
      }
      setPetModalOpen(false);
      fetchPets();
    } catch (err) {
      const msg = err.response?.data?.error?.message || err.response?.data?.message || 'Failed to save pet';
      setPetError(msg);
    } finally {
      setPetSaving(false);
    }
  };

  const handleDeletePet = async (petId) => {
    if (!window.confirm('Are you sure you want to remove this pet?')) return;
    setDeletingPetId(petId);
    try {
      await deletePet(petId);
      fetchPets();
    } catch {
      // ignore
    } finally {
      setDeletingPetId(null);
    }
  };

  const getPetIcon = (type) => {
    const found = PET_TYPES.find(p => p.value === type);
    return found ? found.icon : '🐾';
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
      <Navbar
        onLoginClick={() => { setAuthModalMode('login'); setIsAuthModalOpen(true); }}
        onRegisterClick={() => { setAuthModalMode('register'); setIsAuthModalOpen(true); }}
      />
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        initialMode={authModalMode}
        onLoginSuccess={() => { setIsAuthModalOpen(false); }}
      />

      <div className="pt-28 pb-16 px-4 max-w-5xl mx-auto">
        {/* Page header */}
        <div className="flex items-center gap-3 mb-8">
          <button onClick={() => navigate(-1)} className="p-2 rounded-xl hover:bg-white transition-colors">
            <ChevronLeft size={22} />
          </button>
          <h1 className="text-3xl font-black tracking-tight">My Profile</h1>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-white p-1 rounded-2xl shadow-sm mb-8 w-fit">
          <button
            onClick={() => setActiveTab('profile')}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition-all ${activeTab === 'profile' ? 'bg-[#FF8C42] text-white shadow-md' : 'text-slate-600 hover:bg-slate-50'}`}
          >
            <User size={18} /> Personal Info
          </button>
          <button
            onClick={() => setActiveTab('pets')}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition-all ${activeTab === 'pets' ? 'bg-[#FF8C42] text-white shadow-md' : 'text-slate-600 hover:bg-slate-50'}`}
          >
            <PawPrint size={18} /> My Pets
          </button>
        </div>

        {/* ====== PROFILE TAB ====== */}
        {activeTab === 'profile' && (
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
              </div>
            )}
          </motion.div>
        )}

        {/* ====== PETS TAB ====== */}
        {activeTab === 'pets' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            {/* Add button */}
            <div className="flex justify-between items-center mb-6">
              <p className="text-slate-500 font-medium">{pets.length} pet{pets.length !== 1 ? 's' : ''} registered</p>
              <button
                onClick={openAddPet}
                className="flex items-center gap-2 px-5 py-2.5 bg-[#FF8C42] text-white rounded-xl font-bold text-sm hover:bg-[#e07a35] transition-colors shadow-md"
              >
                <Plus size={18} /> Add New Pet
              </button>
            </div>

            {petsLoading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="animate-spin text-[#FF8C42]" size={32} />
              </div>
            ) : pets.length === 0 ? (
              <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-16 text-center">
                <div className="text-6xl mb-4">🐾</div>
                <h3 className="text-xl font-bold text-slate-800 mb-2">No pets yet</h3>
                <p className="text-slate-500 mb-6">Add your furry friends to manage their care</p>
                <button onClick={openAddPet} className="px-6 py-3 bg-[#FF8C42] text-white rounded-xl font-bold hover:bg-[#e07a35] transition-colors">
                  Add Your First Pet
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {pets.map(pet => (
                  <motion.div
                    key={pet._id}
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden hover:shadow-md transition-shadow group"
                  >
                    {/* Pet image */}
                    <div className="h-44 bg-gradient-to-br from-orange-50 to-amber-50 flex items-center justify-center relative">
                      {pet.avatar ? (
                        <img src={pet.avatar} alt={pet.petName} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-7xl">{getPetIcon(pet.petType)}</span>
                      )}
                      {/* Action buttons overlay */}
                      <div className="absolute top-3 right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => openEditPet(pet)}
                          className="p-2 bg-white rounded-lg shadow-md hover:bg-blue-50 transition-colors"
                        >
                          <Edit3 size={14} className="text-blue-600" />
                        </button>
                        <button
                          onClick={() => handleDeletePet(pet._id)}
                          disabled={deletingPetId === pet._id}
                          className="p-2 bg-white rounded-lg shadow-md hover:bg-red-50 transition-colors disabled:opacity-50"
                        >
                          {deletingPetId === pet._id
                            ? <Loader2 size={14} className="animate-spin text-red-500" />
                            : <Trash2 size={14} className="text-red-500" />}
                        </button>
                      </div>
                    </div>

                    {/* Pet info */}
                    <div className="p-5">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-lg font-bold text-slate-800">{pet.petName}</h3>
                        <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-orange-50 text-[#FF8C42] capitalize">{pet.petType}</span>
                      </div>
                      <p className="text-sm text-slate-500 mb-3">{pet.breed}</p>
                      <div className="flex flex-wrap gap-3 text-xs text-slate-500">
                        {pet.age && (
                          <span className="flex items-center gap-1">
                            <Calendar size={12} /> {pet.age}
                          </span>
                        )}
                        <span className="flex items-center gap-1 capitalize">
                          {pet.gender === 'male' ? '♂' : pet.gender === 'female' ? '♀' : '?'} {pet.gender}
                        </span>
                        {pet.weight && (
                          <span className="flex items-center gap-1">
                            ⚖️ {pet.weight} kg
                          </span>
                        )}
                        {pet.color && (
                          <span className="flex items-center gap-1">
                            <Palette size={12} /> {pet.color}
                          </span>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </div>

      {/* ====== PET MODAL ====== */}
      <AnimatePresence>
        {petModalOpen && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
            onClick={() => setPetModalOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
              onClick={e => e.stopPropagation()}
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-black">{editingPet ? 'Edit Pet' : 'Add New Pet'}</h2>
                  <button onClick={() => setPetModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
                    <X size={20} />
                  </button>
                </div>

                {petError && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">{petError}</div>
                )}

                <div className="space-y-4">
                  <Field label="Pet Name *" name="petName" value={petForm.petName} onChange={handlePetChange} placeholder="e.g. Buddy" />
                  <Field label="Pet ID *" name="petID" value={petForm.petID} onChange={handlePetChange} placeholder="e.g. PET001" disabled={!!editingPet} />

                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Pet Type *</label>
                    <div className="grid grid-cols-4 gap-2">
                      {PET_TYPES.map(t => (
                        <button
                          key={t.value}
                          type="button"
                          onClick={() => setPetForm(prev => ({ ...prev, petType: t.value }))}
                          className={`flex flex-col items-center gap-1 p-3 rounded-xl border-2 text-sm font-bold transition-all ${petForm.petType === t.value ? 'border-[#FF8C42] bg-orange-50 text-[#FF8C42]' : 'border-slate-100 hover:border-slate-200'}`}
                        >
                          <span className="text-xl">{t.icon}</span>
                          <span className="text-xs">{t.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <Field label="Breed *" name="breed" value={petForm.breed} onChange={handlePetChange} placeholder="e.g. Golden Retriever" />

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-2">Gender *</label>
                      <select
                        name="gender" value={petForm.gender} onChange={handlePetChange}
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:ring-2 focus:ring-[#FF8C42] focus:border-transparent outline-none"
                      >
                        {GENDERS.map(g => <option key={g.value} value={g.value}>{g.label}</option>)}
                      </select>
                    </div>
                    <Field label="Weight (kg) *" name="weight" type="number" value={petForm.weight} onChange={handlePetChange} placeholder="e.g. 12.5" />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <Field label="Date of Birth" name="dateOfBirth" type="date" value={petForm.dateOfBirth} onChange={handlePetChange} />
                    <Field label="Color" name="color" value={petForm.color} onChange={handlePetChange} placeholder="e.g. Golden" />
                  </div>

                  <Field label="Special Needs" name="specialNeeds" value={petForm.specialNeeds} onChange={handlePetChange} placeholder="Any special care requirements" />
                  <Field label="Notes" name="notes" value={petForm.notes} onChange={handlePetChange} placeholder="Additional notes" />
                </div>

                <div className="flex gap-3 mt-8">
                  <button
                    onClick={() => setPetModalOpen(false)}
                    className="flex-1 px-4 py-3 border border-slate-200 rounded-xl font-bold text-sm hover:bg-slate-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handlePetSave}
                    disabled={petSaving}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-[#FF8C42] text-white rounded-xl font-bold text-sm hover:bg-[#e07a35] transition-colors disabled:opacity-50"
                  >
                    {petSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                    {editingPet ? 'Update Pet' : 'Add Pet'}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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
