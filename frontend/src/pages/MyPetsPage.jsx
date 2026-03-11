import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion'; // eslint-disable-line no-unused-vars
import {
  PawPrint, Save, X, Plus, Edit3, Trash2,
  Calendar, ChevronLeft, Loader2, Palette,
  Stethoscope, Syringe, Activity, Eye, ClipboardList, Bell,
  Weight, Image, Camera, Search, SlidersHorizontal, Heart, Sparkles, MoreVertical
} from 'lucide-react';
import Navbar from '../components/layout/Navbar';
import { useAuth } from '../context/AuthContext';
import {
  getMyPets, createPet, updatePet, deletePet,
  getPetById, addMedicalRecord, addVaccination,
  getVaccinationReminders, getPetStatistics
} from '../api/profileApi';

const PET_TYPES = [
  { value: 'dog', label: 'Dog' },
  { value: 'cat', label: 'Cat' },
  { value: 'rabbit', label: 'Rabbit' },
  { value: 'other', label: 'Other' },
];

const GENDERS = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'unknown', label: 'Unknown' },
];

const MyPetsPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  // Pets state
  const [pets, setPets] = useState([]);
  const [petsLoading, setPetsLoading] = useState(true);
  const [petModalOpen, setPetModalOpen] = useState(false);
  const [editingPet, setEditingPet] = useState(null);
  const [petForm, setPetForm] = useState({
    petName: '', petType: 'dog', breed: '', gender: 'male',
    weight: '', dateOfBirth: '', color: '', petID: '',
    specialNeeds: '', notes: '', avatar: ''
  });
  const [petSaving, setPetSaving] = useState(false);
  const [petError, setPetError] = useState('');
  const [deletingPetId, setDeletingPetId] = useState(null);

  // Pet Detail state
  const [selectedPet, setSelectedPet] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);

  // Medical Record state
  const [medRecordModalOpen, setMedRecordModalOpen] = useState(false);
  const [medRecordForm, setMedRecordForm] = useState({
    diagnosis: '', treatment: '', veterinarian: '', date: '', type: 'checkup', clinic: '', notes: ''
  });
  const [medRecordSaving, setMedRecordSaving] = useState(false);
  const [medRecordError, setMedRecordError] = useState('');

  // Vaccination state
  const [vaccModalOpen, setVaccModalOpen] = useState(false);
  const [vaccForm, setVaccForm] = useState({ name: '', date: '', nextDueDate: '', veterinarian: '' });
  const [vaccSaving, setVaccSaving] = useState(false);
  const [vaccError, setVaccError] = useState('');

  // Statistics & reminders
  const [, setStats] = useState(null);
  const [reminders, setReminders] = useState([]);

  // Search & filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');

  // Dropdown menu state
  const [openMenuId, setOpenMenuId] = useState(null);

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
    if (user) fetchPets();
  }, [user, fetchPets]);

  // Fetch statistics & vaccination reminders
  useEffect(() => {
    if (!user) return;
    const fetchExtra = async () => {
      try {
        const [statsRes, remindersRes] = await Promise.all([
          getPetStatistics().catch(() => null),
          getVaccinationReminders(30).catch(() => null)
        ]);
        if (statsRes) setStats(statsRes.data?.statistics || statsRes.data);
        if (remindersRes) setReminders(remindersRes.data?.reminders || []);
      } catch { /* ignore */ }
    };
    fetchExtra();
  }, [user, pets.length]); // re-fetch when pets change



  // Filtered pets based on search & type filter
  const filteredPets = useMemo(() => {
    return pets.filter(pet => {
      const matchesSearch = !searchQuery.trim() ||
        pet.petName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        pet.breed?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        pet.color?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesType = filterType === 'all' || pet.petType === filterType;
      return matchesSearch && matchesType;
    });
  }, [pets, searchQuery, filterType]);

  const openAddPet = () => {
    setEditingPet(null);
    setPetForm({
      petName: '', petType: 'dog', breed: '', gender: 'male',
      weight: '', dateOfBirth: '', color: '', petID: '',
      specialNeeds: '', notes: '', avatar: ''
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
      notes: pet.notes || '',
      avatar: pet.avatar || ''
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
      if (!data.avatar || !data.avatar.trim()) delete data.avatar;
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

  // View pet detail
  const openPetDetail = async (pet) => {
    setDetailLoading(true);
    setDetailModalOpen(true);
    try {
      const res = await getPetById(pet._id);
      setSelectedPet(res.data);
    } catch {
      setSelectedPet({ pet });
    } finally {
      setDetailLoading(false);
    }
  };



  const handleMedRecordSave = async () => {
    if (!medRecordForm.diagnosis.trim()) {
      setMedRecordError('Diagnosis is required');
      return;
    }
    setMedRecordSaving(true);
    setMedRecordError('');
    try {
      const petId = selectedPet?.pet?._id;
      await addMedicalRecord(petId, medRecordForm);
      setMedRecordModalOpen(false);
      // Refresh pet detail if detail modal is open
      if (detailModalOpen && petId) {
        const res = await getPetById(petId);
        setSelectedPet(res.data);
      }
    } catch (err) {
      const msg = err.response?.data?.error?.message || err.response?.data?.message || 'Failed to add medical record';
      setMedRecordError(msg);
    } finally {
      setMedRecordSaving(false);
    }
  };



  const handleVaccSave = async () => {
    if (!vaccForm.name.trim() || !vaccForm.date) {
      setVaccError('Vaccine name and date are required');
      return;
    }
    setVaccSaving(true);
    setVaccError('');
    try {
      const petId = selectedPet?.pet?._id;
      await addVaccination(petId, vaccForm);
      setVaccModalOpen(false);
      if (detailModalOpen && petId) {
        const res = await getPetById(petId);
        setSelectedPet(res.data);
      }
    } catch (err) {
      const msg = err.response?.data?.error?.message || err.response?.data?.message || 'Failed to add vaccination';
      setVaccError(msg);
    } finally {
      setVaccSaving(false);
    }
  };



  // Calculate age from dateOfBirth
  const getAge = (dob) => {
    if (!dob) return null;
    const birth = new Date(dob);
    const now = new Date();
    const years = now.getFullYear() - birth.getFullYear();
    const months = now.getMonth() - birth.getMonth();
    if (years > 0) return `${years} year${years > 1 ? 's' : ''}`;
    if (months > 0) return `${months} month${months > 1 ? 's' : ''}`;
    return 'Newborn';
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = () => setOpenMenuId(null);
    if (openMenuId) document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [openMenuId]);

  // Lock body scroll when any modal is open
  useEffect(() => {
    const anyModalOpen = petModalOpen || detailModalOpen || medRecordModalOpen || vaccModalOpen;
    if (anyModalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [petModalOpen, detailModalOpen, medRecordModalOpen, vaccModalOpen]);

  if (!user) {
    return (
      <div className="bg-[#FDFBF7] min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin text-[#D97853]" size={32} />
      </div>
    );
  }

  return (
    <div className="bg-[#FDFBF7] min-h-screen font-sans text-[#2D3436]">
      <Navbar user={user} />

      <div className="pt-28 pb-16 px-4 max-w-6xl mx-auto">
        {/* ===== Hero Header ===== */}
        <div className="relative mb-10">
          <div className="absolute -top-4 -left-4 w-72 h-72 bg-[#D97853]/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-8 -right-8 w-56 h-56 bg-[#D97853]/10 rounded-full blur-3xl pointer-events-none" />
          <div className="relative flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div className="flex items-center gap-4">
              <button onClick={() => navigate(-1)} className="p-2.5 rounded-2xl bg-white/60 backdrop-blur-sm border border-white/80 shadow-sm hover:bg-white transition-all">
                <ChevronLeft size={20} className="text-slate-600" />
              </button>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Sparkles size={14} className="text-[#D97853]" />
                  <span className="text-xs font-semibold text-[#D97853] uppercase tracking-widest">Pet Manager</span>
                </div>
                <h1 className="text-4xl font-black tracking-tight bg-gradient-to-r from-[#D97853] to-[#c46a47] bg-clip-text text-transparent">
                  My Pets
                </h1>
              </div>
            </div>
            <button
              onClick={openAddPet}
              className="flex items-center gap-2 px-6 py-3 bg-[#D97853] hover:bg-[#c46a47] text-white rounded-2xl font-bold text-sm shadow-lg shadow-orange-200/50 hover:shadow-xl hover:shadow-orange-300/50 hover:-translate-y-0.5 transition-all duration-300"
            >
              <Plus size={18} /> Add New Pet
            </button>
          </div>
        </div>

        {/* ===== Vaccination Reminders ===== */}
        {reminders.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-8 p-4 bg-amber-50/80 backdrop-blur-sm border border-amber-200/60 rounded-2xl">
            <h3 className="text-sm font-bold text-amber-800 mb-2 flex items-center gap-2">
              <Bell size={16} /> Upcoming Vaccinations
            </h3>
            <div className="space-y-2">
              {reminders.map((r, i) => (
                <div key={i} className="flex items-center gap-3 text-sm text-amber-700">
                  <span className="font-bold">{r.pet.name}</span>
                  <span>–</span>
                  {r.upcomingVaccinations.map((v, vi) => (
                    <span key={vi} className="bg-amber-100 px-2 py-0.5 rounded-full text-xs font-medium">
                      {v.name} (due {new Date(v.nextDueDate).toLocaleDateString()})
                    </span>
                  ))}
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* ===== Search & Filter Bar ===== */}
        <div className="mb-6">
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Search input */}
            <div className="relative flex-1">
              <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name, breed, or color..."
                className="w-full pl-11 pr-4 py-3.5 bg-white/70 backdrop-blur-sm border border-white/80 rounded-2xl text-sm shadow-sm focus:ring-2 focus:ring-[#D97853]/40 focus:border-transparent outline-none transition-all placeholder:text-slate-400"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-slate-100 rounded-full transition-colors">
                  <X size={14} className="text-slate-400" />
                </button>
              )}
            </div>
            {/* Type filter pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
              <button
                onClick={() => setFilterType('all')}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all duration-200 ${
                  filterType === 'all'
                    ? 'bg-[#D97853] text-white shadow-md shadow-orange-200/50'
                    : 'bg-white/60 backdrop-blur-sm border border-white/80 text-slate-600 hover:bg-white'
                }`}
              >
                All
              </button>
              {PET_TYPES.map(t => (
                <button
                  key={t.value}
                  onClick={() => setFilterType(filterType === t.value ? 'all' : t.value)}
                  className={`px-3 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all duration-200 flex items-center gap-1.5 ${
                    filterType === t.value
                      ? 'bg-[#D97853] text-white shadow-md shadow-orange-200/50'
                      : 'bg-white/60 backdrop-blur-sm border border-white/80 text-slate-600 hover:bg-white'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
          {/* Results info */}
          <div className="mt-3 flex items-center justify-between">
            <p className="text-xs text-slate-400 font-medium">
              {searchQuery || filterType !== 'all'
                ? `${filteredPets.length} of ${pets.length} pet${pets.length !== 1 ? 's' : ''} shown`
                : `${pets.length} pet${pets.length !== 1 ? 's' : ''} registered`}
            </p>
            {(searchQuery || filterType !== 'all') && (
              <button
                onClick={() => { setSearchQuery(''); setFilterType('all'); }}
                className="text-xs text-[#D97853] font-semibold hover:text-[#c46a47] transition-colors"
              >
                Clear filters
              </button>
            )}
          </div>
        </div>

        {/* ===== Pet Grid ===== */}
        {petsLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="animate-spin text-[#D97853]" size={32} />
          </div>
        ) : pets.length === 0 ? (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white/60 backdrop-blur-sm rounded-3xl border border-white/80 p-16 text-center shadow-sm">
            <div className="w-24 h-24 mx-auto mb-6 rounded-3xl bg-gradient-to-br from-orange-100 to-amber-100 flex items-center justify-center">
              <PawPrint size={40} className="text-[#D97853]" />
            </div>
            <h3 className="text-2xl font-black text-[#2D3436] mb-2">No pets yet</h3>
            <p className="text-sm text-slate-400 mb-8 max-w-sm mx-auto">Start by adding your furry, feathery, or scaly friends to manage their health and care</p>
            <button onClick={openAddPet} className="px-8 py-3.5 bg-[#D97853] hover:bg-[#c46a47] text-white rounded-2xl font-bold shadow-lg shadow-orange-200/50 hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300">
              Add Your First Pet
            </button>
          </motion.div>
        ) : filteredPets.length === 0 ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-white/60 backdrop-blur-sm rounded-3xl border border-white/80 p-12 text-center shadow-sm">
            <Search size={36} className="mx-auto mb-4 text-slate-300" />
            <h3 className="text-lg font-bold text-slate-600 mb-1">No pets found</h3>
            <p className="text-sm text-slate-400">Try adjusting your search or filter</p>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredPets.map((pet, index) => {
              const petAge = getAge(pet.dateOfBirth) || pet.age;

              return (
                <motion.div
                  key={pet._id}
                  layout
                  initial={{ opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05, duration: 0.4 }}
                  className="relative bg-white rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-blue-100/40 hover:-translate-y-1 transition-all duration-400"
                  style={{ overflow: 'visible' }}
                >
                  {/* Pet image area */}
                  <div className="h-52 relative overflow-hidden rounded-t-3xl">
                    {pet.avatar ? (
                      <img src={pet.avatar} alt={pet.petName} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50 flex items-center justify-center">
                        <span className="text-2xl font-bold text-[#D97853] capitalize">{pet.petType}</span>
                      </div>
                    )}

                    {/* Type badge - top left */}
                    <div className="absolute top-3 left-3">
                      <span className="text-xs font-bold px-3 py-1.5 rounded-full bg-[#D97853] text-white shadow-md capitalize">
                        {pet.petType}
                      </span>
                    </div>
                  </div>

                  {/* Three-dot menu - at card level, above overflow-hidden */}
                  <div className="absolute top-3 right-3 z-10">
                    <button
                      onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === pet._id ? null : pet._id); }}
                      className="w-8 h-8 flex items-center justify-center bg-white/80 backdrop-blur-md rounded-full shadow-md hover:bg-white transition-all"
                    >
                      <MoreVertical size={16} className="text-slate-600" />
                    </button>

                    {/* Dropdown menu */}
                    <AnimatePresence>
                      {openMenuId === pet._id && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.9, y: -4 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.9, y: -4 }}
                          transition={{ duration: 0.15 }}
                          className="absolute right-0 top-10 w-44 bg-white rounded-2xl shadow-xl border border-slate-100 py-1.5 z-30"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button onClick={() => { setOpenMenuId(null); openEditPet(pet); }}
                            className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors">
                            <Edit3 size={13} className="text-blue-500" /> Edit Pet
                          </button>
                          <div className="mx-3 my-1 border-t border-slate-100" />
                          <button onClick={() => { setOpenMenuId(null); handleDeletePet(pet._id); }}
                            disabled={deletingPetId === pet._id}
                            className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs font-semibold text-red-500 hover:bg-red-50 transition-colors disabled:opacity-50">
                            {deletingPetId === pet._id
                              ? <Loader2 size={13} className="animate-spin" />
                              : <Trash2 size={13} />} Delete
                          </button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Pet info section */}
                  <div className="px-5 pt-4 pb-5">
                    {/* Name + Gender badge */}
                    <div className="flex items-center gap-2 mb-1 pr-16">
                      <h3 className="text-xl font-black text-slate-800 leading-tight truncate">{pet.petName}</h3>
                      <span className={`text-[11px] font-bold px-3 py-1 rounded-full capitalize flex-shrink-0 ${
                        pet.gender === 'male' ? 'bg-blue-500 text-white' :
                        pet.gender === 'female' ? 'bg-pink-400 text-white' :
                        'bg-slate-400 text-white'
                      }`}>
                        {pet.gender === 'male' ? 'Male' : pet.gender === 'female' ? 'Female' : 'Unknown'}
                      </span>
                    </div>

                    {/* Breed */}
                    {pet.breed && <p className="text-sm text-slate-400 mb-4">{pet.breed}</p>}

                    {/* Stats row - Weight / Age / Color */}
                    <div className="grid grid-cols-3 gap-2 mb-5">
                      <div className="flex flex-col items-center p-3 bg-slate-50 rounded-2xl">
                        <Weight size={18} className="text-slate-400 mb-1.5" />
                        <span className="text-[10px] text-slate-400 font-semibold">Weight</span>
                        <span className="text-sm font-black text-slate-700 mt-0.5">
                          {pet.weight ? `${pet.weight}` : '–'}
                          {pet.weight && <span className="text-[10px] font-semibold text-slate-400 ml-0.5">kg</span>}
                        </span>
                      </div>
                      <div className="flex flex-col items-center p-3 bg-slate-50 rounded-2xl">
                        <Calendar size={18} className="text-slate-400 mb-1.5" />
                        <span className="text-[10px] text-slate-400 font-semibold">Age</span>
                        <span className="text-sm font-black text-slate-700 mt-0.5 truncate max-w-full">
                          {petAge || '–'}
                        </span>
                      </div>
                      <div className="flex flex-col items-center p-3 bg-slate-50 rounded-2xl">
                        <Palette size={18} className="text-slate-400 mb-1.5" />
                        <span className="text-[10px] text-slate-400 font-semibold">Color</span>
                        <span className="text-sm font-black text-slate-700 mt-0.5 truncate max-w-full">
                          {pet.color || '–'}
                        </span>
                      </div>
                    </div>

                    {/* View Details button */}
                    <button
                      onClick={() => openPetDetail(pet)}
                      className="w-full py-3 bg-[#D97853] hover:bg-[#c46a47] text-white rounded-2xl font-bold text-sm shadow-md shadow-orange-200/50 hover:shadow-lg hover:shadow-orange-300/50 hover:-translate-y-0.5 transition-all duration-300"
                    >
                      View Details
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* Pet Modal */}
      <AnimatePresence>
        {petModalOpen && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
            onClick={() => setPetModalOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto scrollbar-hide"
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
                  {/* Avatar preview & URL input */}
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Pet Photo</label>
                    <div className="flex items-center gap-4">
                      <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#FFE8D9] to-[#FFF4EC] border-2 border-dashed border-orange-200 flex items-center justify-center overflow-hidden flex-shrink-0">
                        {petForm.avatar ? (
                          <img src={petForm.avatar} alt="Pet preview" className="w-full h-full object-cover rounded-2xl" onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }} />
                        ) : (
                          <Camera size={24} className="text-slate-300" />
                        )}
                        {petForm.avatar && <div className="w-full h-full items-center justify-center hidden"><Camera size={24} className="text-slate-300" /></div>}
                      </div>
                      <div className="flex-1">
                        <input
                          type="text"
                          name="avatar"
                          value={petForm.avatar}
                          onChange={handlePetChange}
                          placeholder="Paste image URL (https://...)"
                          className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:ring-2 focus:ring-[#D97853]/40 focus:border-transparent outline-none transition-all"
                        />
                        <p className="text-[10px] text-slate-400 mt-1">Paste a direct link to your pet's photo</p>
                      </div>
                    </div>
                  </div>

                  <Field label="Pet Name *" name="petName" value={petForm.petName} onChange={handlePetChange} placeholder="e.g. Buddy" />

                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Pet Type *</label>
                    <div className="grid grid-cols-4 gap-2">
                      {PET_TYPES.map(t => (
                        <button
                          key={t.value}
                          type="button"
                          onClick={() => setPetForm(prev => ({ ...prev, petType: t.value }))}
                          className={`flex flex-col items-center gap-1 p-3 rounded-xl border-2 text-sm font-bold transition-all ${petForm.petType === t.value ? 'border-[#D97853] bg-orange-50 text-[#D97853]' : 'border-slate-100 hover:border-slate-200'}`}
                        >
                          <span className="text-xs font-semibold">{t.label}</span>
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
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:ring-2 focus:ring-[#D97853]/40 focus:border-transparent outline-none"
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
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-[#D97853] hover:bg-[#c46a47] text-white rounded-xl font-bold text-sm transition-colors disabled:opacity-50"
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

      {/* ====== PET DETAIL MODAL ====== */}
      <AnimatePresence>
        {detailModalOpen && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
            onClick={() => setDetailModalOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto scrollbar-hide"
              onClick={e => e.stopPropagation()}
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-black flex items-center gap-2">
                    <ClipboardList size={20} className="text-[#D97853]" /> Pet Details
                  </h2>
                  <button onClick={() => setDetailModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
                    <X size={20} />
                  </button>
                </div>

                {detailLoading ? (
                  <div className="flex items-center justify-center py-16">
                    <Loader2 className="animate-spin text-[#D97853]" size={32} />
                  </div>
                ) : selectedPet?.pet && (
                  <div className="space-y-6">
                    {/* Pet avatar banner */}
                    {selectedPet.pet.avatar && (
                      <div className="w-full h-48 rounded-2xl overflow-hidden bg-slate-100">
                        <img src={selectedPet.pet.avatar} alt={selectedPet.pet.petName} className="w-full h-full object-cover" />
                      </div>
                    )}
                    {/* Pet info header */}
                    <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-[#FFE8D9] to-[#FFF4EC] rounded-2xl">
                      <div className="w-14 h-14 rounded-2xl bg-white flex items-center justify-center text-3xl shadow-sm overflow-hidden flex-shrink-0">
                        {selectedPet.pet.avatar ? (
                          <img src={selectedPet.pet.avatar} alt={selectedPet.pet.petName} className="w-14 h-14 rounded-2xl object-cover" />
                        ) : (
                          <span className="text-sm font-bold text-[#D97853] capitalize">{selectedPet.pet.petType}</span>
                        )}
                      </div>
                      <div>
                        <h3 className="text-lg font-black">{selectedPet.pet.petName}</h3>
                        <p className="text-sm text-slate-500">{selectedPet.pet.breed} · {selectedPet.pet.gender} · {selectedPet.pet.weight}kg</p>
                        {selectedPet.pet.age && <p className="text-xs text-slate-400 mt-0.5">{selectedPet.pet.age}</p>}
                      </div>

                    </div>

                    {/* Health Summary */}
                    {selectedPet.healthSummary && (
                      <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl">
                        <h4 className="text-sm font-bold text-emerald-800 mb-2 flex items-center gap-2">
                          <Activity size={16} /> Health Summary
                        </h4>
                        <div className="grid grid-cols-3 gap-3 text-center">
                          <div><div className="text-lg font-black text-emerald-700">{selectedPet.healthSummary.totalMedicalRecords ?? 0}</div><div className="text-xs text-emerald-600">Records</div></div>
                          <div><div className="text-lg font-black text-emerald-700">{selectedPet.healthSummary.totalVaccinations ?? 0}</div><div className="text-xs text-emerald-600">Vaccines</div></div>
                          <div><div className="text-lg font-black text-emerald-700">{selectedPet.healthSummary.upcomingVaccinations ?? 0}</div><div className="text-xs text-emerald-600">Upcoming</div></div>
                        </div>
                      </div>
                    )}

                    {/* Medical Records */}
                    <div>
                      <h4 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
                        <Stethoscope size={16} className="text-blue-500" /> Medical Records
                      </h4>
                      {selectedPet.pet.medicalRecords && selectedPet.pet.medicalRecords.length > 0 ? (
                        <div className="space-y-2 max-h-48 overflow-y-auto">
                          {selectedPet.pet.medicalRecords.map((rec, i) => (
                            <div key={i} className="p-3 bg-slate-50 rounded-xl text-sm">
                              <div className="flex items-center justify-between mb-1">
                                <span className="font-bold text-slate-700">{rec.diagnosis}</span>
                                <span className="text-xs text-slate-400 bg-white px-2 py-0.5 rounded-full capitalize">{rec.type}</span>
                              </div>
                              {rec.treatment && <p className="text-xs text-slate-500">Treatment: {rec.treatment}</p>}
                              <div className="flex gap-4 mt-1 text-xs text-slate-400">
                                {rec.veterinarian && <span>Dr. {rec.veterinarian}</span>}
                                {rec.clinic && <span>{rec.clinic}</span>}
                                <span>{new Date(rec.date).toLocaleDateString()}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-slate-400 italic">No medical records yet</p>
                      )}
                    </div>

                    {/* Vaccinations */}
                    <div>
                      <h4 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
                        <Syringe size={16} className="text-green-500" /> Vaccinations
                      </h4>
                      {selectedPet.pet.vaccinations && selectedPet.pet.vaccinations.length > 0 ? (
                        <div className="space-y-2 max-h-48 overflow-y-auto">
                          {selectedPet.pet.vaccinations.map((vacc, i) => (
                            <div key={i} className="p-3 bg-slate-50 rounded-xl text-sm flex items-center justify-between">
                              <div>
                                <span className="font-bold text-slate-700">{vacc.name}</span>
                                <div className="text-xs text-slate-400 mt-0.5">
                                  {new Date(vacc.date).toLocaleDateString()}
                                  {vacc.veterinarian && <span> · Dr. {vacc.veterinarian}</span>}
                                </div>
                              </div>
                              {vacc.nextDueDate && (
                                <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${new Date(vacc.nextDueDate) < new Date() ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-600'}`}>
                                  Next: {new Date(vacc.nextDueDate).toLocaleDateString()}
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-slate-400 italic">No vaccination records yet</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ====== ADD MEDICAL RECORD MODAL ====== */}
      <AnimatePresence>
        {medRecordModalOpen && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
            onClick={() => setMedRecordModalOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto"
              onClick={e => e.stopPropagation()}
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-black flex items-center gap-2">
                    <Stethoscope size={20} className="text-blue-500" /> Add Medical Record
                  </h2>
                  <button onClick={() => setMedRecordModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
                    <X size={20} />
                  </button>
                </div>
                {selectedPet?.pet && (
                  <p className="text-sm text-slate-500 mb-4">For: <span className="font-bold text-slate-700">{selectedPet.pet.petName}</span></p>
                )}

                {medRecordError && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">{medRecordError}</div>
                )}

                <div className="space-y-4">
                  <Field label="Diagnosis *" name="diagnosis" value={medRecordForm.diagnosis} onChange={e => setMedRecordForm(prev => ({ ...prev, diagnosis: e.target.value }))} placeholder="e.g. Ear infection" />
                  <Field label="Treatment" name="treatment" value={medRecordForm.treatment} onChange={e => setMedRecordForm(prev => ({ ...prev, treatment: e.target.value }))} placeholder="Treatment provided" />
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Type</label>
                    <select
                      value={medRecordForm.type} onChange={e => setMedRecordForm(prev => ({ ...prev, type: e.target.value }))}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:ring-2 focus:ring-[#D97853]/40 focus:border-transparent outline-none"
                    >
                      <option value="checkup">Checkup</option>
                      <option value="vaccination">Vaccination</option>
                      <option value="treatment">Treatment</option>
                      <option value="surgery">Surgery</option>
                      <option value="emergency">Emergency</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <Field label="Veterinarian" name="veterinarian" value={medRecordForm.veterinarian} onChange={e => setMedRecordForm(prev => ({ ...prev, veterinarian: e.target.value }))} placeholder="Dr. name" />
                    <Field label="Date" name="date" type="date" value={medRecordForm.date} onChange={e => setMedRecordForm(prev => ({ ...prev, date: e.target.value }))} />
                  </div>
                  <Field label="Clinic" name="clinic" value={medRecordForm.clinic} onChange={e => setMedRecordForm(prev => ({ ...prev, clinic: e.target.value }))} placeholder="Clinic name" />
                  <Field label="Notes" name="notes" value={medRecordForm.notes} onChange={e => setMedRecordForm(prev => ({ ...prev, notes: e.target.value }))} placeholder="Additional notes" />
                </div>

                <div className="flex gap-3 mt-6">
                  <button onClick={() => setMedRecordModalOpen(false)} className="flex-1 px-4 py-3 border border-slate-200 rounded-xl font-bold text-sm hover:bg-slate-50 transition-colors">Cancel</button>
                  <button onClick={handleMedRecordSave} disabled={medRecordSaving}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-blue-500 text-white rounded-xl font-bold text-sm hover:bg-blue-600 transition-colors disabled:opacity-50">
                    {medRecordSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Save Record
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ====== ADD VACCINATION MODAL ====== */}
      <AnimatePresence>
        {vaccModalOpen && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
            onClick={() => setVaccModalOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-md"
              onClick={e => e.stopPropagation()}
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-black flex items-center gap-2">
                    <Syringe size={20} className="text-green-500" /> Add Vaccination
                  </h2>
                  <button onClick={() => setVaccModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
                    <X size={20} />
                  </button>
                </div>
                {selectedPet?.pet && (
                  <p className="text-sm text-slate-500 mb-4">For: <span className="font-bold text-slate-700">{selectedPet.pet.petName}</span></p>
                )}

                {vaccError && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">{vaccError}</div>
                )}

                <div className="space-y-4">
                  <Field label="Vaccine Name *" name="name" value={vaccForm.name} onChange={e => setVaccForm(prev => ({ ...prev, name: e.target.value }))} placeholder="e.g. Rabies" />
                  <div className="grid grid-cols-2 gap-4">
                    <Field label="Date *" name="date" type="date" value={vaccForm.date} onChange={e => setVaccForm(prev => ({ ...prev, date: e.target.value }))} />
                    <Field label="Next Due Date" name="nextDueDate" type="date" value={vaccForm.nextDueDate} onChange={e => setVaccForm(prev => ({ ...prev, nextDueDate: e.target.value }))} />
                  </div>
                  <Field label="Veterinarian" name="veterinarian" value={vaccForm.veterinarian} onChange={e => setVaccForm(prev => ({ ...prev, veterinarian: e.target.value }))} placeholder="Dr. name" />
                </div>

                <div className="flex gap-3 mt-6">
                  <button onClick={() => setVaccModalOpen(false)} className="flex-1 px-4 py-3 border border-slate-200 rounded-xl font-bold text-sm hover:bg-slate-50 transition-colors">Cancel</button>
                  <button onClick={handleVaccSave} disabled={vaccSaving}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-green-500 text-white rounded-xl font-bold text-sm hover:bg-green-600 transition-colors disabled:opacity-50">
                    {vaccSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Save Vaccine
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

const Field = ({ label, icon, name, value, onChange, disabled, placeholder, type = 'text' }) => (
  <div>
    <label className="flex items-center gap-2 text-sm font-bold text-slate-700 mb-2">
      {icon && <span className="text-[#D97853]">{icon}</span>}
      {label}
    </label>
    <input
      type={type}
      name={name}
      value={value}
      onChange={onChange}
      disabled={disabled}
      placeholder={placeholder}
      className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:ring-2 focus:ring-[#D97853]/40 focus:border-transparent outline-none disabled:opacity-60 disabled:cursor-not-allowed transition-all"
    />
  </div>
);

export default MyPetsPage;
