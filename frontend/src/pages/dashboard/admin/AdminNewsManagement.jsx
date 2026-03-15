import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import useScrollLock from '../../../hooks/useScrollLock';
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  ChevronDown,
  Eye,
  FileText,
  Megaphone,
  PenSquare,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  UploadCloud,
  X,
} from 'lucide-react';
import { createNews, deleteNews, getAllNews, updateNews } from '../../../api/newsApi';
import { uploadSingleImage } from '../../../api/uploadApi';
import { getErrorMessage } from '../../../utils/apiResponseHandler';

const CATEGORY_OPTIONS = [
  { value: 'general', label: 'General' },
  { value: 'announcement', label: 'Announcement' },
  { value: 'tips', label: 'Tips' },
  { value: 'promotion', label: 'Promotion' },
  { value: 'event', label: 'Event' },
];

const STATUS_OPTIONS = [
  { value: 'all', label: 'All Status' },
  { value: 'published', label: 'Published' },
  { value: 'draft', label: 'Draft' },
];

const emptyForm = {
  title: '',
  excerpt: '',
  content: '',
  coverImage: '',
  category: 'general',
  tags: '',
  isPublished: false,
};

const categoryLabelMap = CATEGORY_OPTIONS.reduce((accumulator, option) => {
  accumulator[option.value] = option.label;
  return accumulator;
}, {});

const formatDate = (value) => {
  if (!value) return '--';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '--';
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
};

const timeAgo = (value) => {
  if (!value) return '--';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '--';

  const diffInHours = Math.floor((Date.now() - date.getTime()) / 3600000);
  if (diffInHours < 1) return 'just now';
  if (diffInHours < 24) return `${diffInHours}h ago`;
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 30) return `${diffInDays}d ago`;
  return formatDate(value);
};

const StatusBadge = ({ published }) => (
  <span
    className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${
      published ? 'bg-[#7FB069]/15 text-[#5B8C51]' : 'bg-[#2D3436]/8 text-[#2D3436]/70'
    }`}
  >
    {published ? 'Published' : 'Draft'}
  </span>
);

const NewsModal = ({ title, children, onClose }) => (
  <AnimatePresence>
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[120] flex items-center justify-center bg-[#2D3436]/40 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, y: 18, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 18, scale: 0.98 }}
        className="h-[90vh] md:h-auto max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-[24px] bg-[#FDFBF7] shadow-2xl flex flex-col"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="sticky top-0 bg-white border-b border-[#2D3436]/10 px-6 py-4 md:px-8 flex items-center justify-between z-30">
          <h3 className="text-xl font-bold text-[#2D3436]">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#2D3436]/5 flex items-center justify-center hover:bg-[#2D3436]/10 transition-colors text-[#2D3436]/50 hover:text-[#2D3436]"
          >
            <X size={16} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-6 md:p-8">
          {children}
        </div>
      </motion.div>
    </motion.div>
  </AnimatePresence>
);

const AdminNewsManagement = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedNews, setSelectedNews] = useState(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [formMode, setFormMode] = useState('create');
  const [formData, setFormData] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);
  const [coverUploading, setCoverUploading] = useState(false);

  useScrollLock(detailOpen || formOpen || deleteOpen);

  useEffect(() => {
    if (!toast) return undefined;
    const timeoutId = window.setTimeout(() => setToast(null), 3000);
    return () => window.clearTimeout(timeoutId);
  }, [toast]);

  const loadNews = useCallback(async (silent = false) => {
    try {
      if (silent) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError('');

      const response = await getAllNews({
        search: searchQuery || undefined,
        category: categoryFilter !== 'all' ? categoryFilter : undefined,
      });

      setItems(Array.isArray(response.data) ? response.data : []);
    } catch (loadError) {
      setError(getErrorMessage(loadError));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [categoryFilter, searchQuery]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      loadNews();
    }, searchQuery ? 300 : 0);

    return () => window.clearTimeout(timeoutId);
  }, [loadNews, searchQuery]);

  const filteredNews = useMemo(() => {
    return items.filter((item) => {
      if (statusFilter === 'published' && !item.isPublished) return false;
      if (statusFilter === 'draft' && item.isPublished) return false;
      return true;
    });
  }, [items, statusFilter]);

  const stats = useMemo(() => {
    const totalViews = items.reduce((sum, item) => sum + (item.views || 0), 0);
    const published = items.filter((item) => item.isPublished).length;
    const promotions = items.filter((item) => item.category === 'promotion' && item.isPublished);
    const mostViewed = [...items].sort((first, second) => (second.views || 0) - (first.views || 0))[0];

    return {
      total: items.length,
      published,
      drafts: items.length - published,
      totalViews,
      promotions: promotions.slice(0, 3),
      mostViewed,
      recentActivity: [...items]
        .sort(
          (first, second) =>
            new Date(second.updatedAt || second.createdAt).getTime() -
            new Date(first.updatedAt || first.createdAt).getTime(),
        )
        .slice(0, 5),
    };
  }, [items]);

  const openCreate = () => {
    setFormMode('create');
    setFormData(emptyForm);
    setSelectedNews(null);
    setIsCategoryOpen(false);
    setFormOpen(true);
  };

  const openEdit = (item) => {
    setFormMode('edit');
    setSelectedNews(item);
    setIsCategoryOpen(false);
    setFormData({
      title: item.title || '',
      excerpt: item.excerpt || '',
      content: item.content || '',
      coverImage: item.coverImage || '',
      category: item.category || 'general',
      tags: Array.isArray(item.tags) ? item.tags.join(', ') : '',
      isPublished: Boolean(item.isPublished),
    });
    setFormOpen(true);
  };

  const openDetail = (item) => {
    setSelectedNews(item);
    setDetailOpen(true);
  };

  const openDelete = (item) => {
    setSelectedNews(item);
    setDeleteOpen(true);
  };

  const handleFormChange = (field, value) => {
    setFormData((current) => ({ ...current, [field]: value }));
  };

  const handleCoverUpload = async (file) => {
    if (!file || !file.type?.startsWith('image/')) return;

    try {
      setCoverUploading(true);
      const url = await uploadSingleImage(file);
      handleFormChange('coverImage', url);
      setToast({ type: 'success', message: 'Cover image uploaded.' });
    } catch (uploadError) {
      setToast({ type: 'error', message: getErrorMessage(uploadError) });
    } finally {
      setCoverUploading(false);
    }
  };

  const handleCoverDrop = async (event) => {
    event.preventDefault();
    const file = event.dataTransfer?.files?.[0];
    await handleCoverUpload(file);
  };

  const handleCoverInputChange = async (event) => {
    const file = event.target.files?.[0];
    await handleCoverUpload(file);
    event.target.value = '';
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const payload = {
      title: formData.title.trim(),
      excerpt: formData.excerpt.trim(),
      content: formData.content.trim(),
      coverImage: formData.coverImage.trim(),
      category: formData.category,
      tags: formData.tags
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean),
      isPublished: formData.isPublished,
    };

    if (!payload.title || !payload.content) {
      setToast({ type: 'error', message: 'Title and content are required.' });
      return;
    }

    try {
      setSaving(true);

      if (formMode === 'create') {
        await createNews(payload);
        setToast({ type: 'success', message: 'News created successfully.' });
      } else if (selectedNews?._id) {
        await updateNews(selectedNews._id, payload);
        setToast({ type: 'success', message: 'News updated successfully.' });
      }

      setFormOpen(false);
      setIsCategoryOpen(false);
      setFormData(emptyForm);
      await loadNews(true);
    } catch (submitError) {
      setToast({ type: 'error', message: getErrorMessage(submitError) });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedNews?._id) return;

    try {
      setSaving(true);
      await deleteNews(selectedNews._id);
      setDeleteOpen(false);
      setSelectedNews(null);
      setToast({ type: 'success', message: 'News deleted successfully.' });
      await loadNews(true);
    } catch (deleteError) {
      setToast({ type: 'error', message: getErrorMessage(deleteError) });
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      className="mx-auto max-w-[1400px] space-y-6 pb-10"
    >
      <AnimatePresence>
        {toast ? (
          <motion.div
            initial={{ opacity: 0, y: -12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12, scale: 0.98 }}
            className={`fixed right-6 top-6 z-[150] flex items-center gap-3 rounded-2xl px-4 py-3 text-white shadow-2xl ${
              toast.type === 'success' ? 'bg-[#7FB069]' : 'bg-red-500'
            }`}
          >
            {toast.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
            <span className="text-sm font-bold">{toast.message}</span>
            <button type="button" onClick={() => setToast(null)} className="opacity-80 transition hover:opacity-100">
              <X size={14} />
            </button>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#D97853] mb-1">News Management</h1>
          <p className="text-sm text-[#2D3436]/60">Backend-connected editor for announcements, tips, events, and promotions.</p>
        </div>
        <motion.button
          onClick={openCreate}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="bg-[#D97853] text-white px-5 py-2.5 rounded-xl font-bold text-sm shadow-[0_5px_15px_rgba(217,120,83,0.3)] hover:bg-[#c66846] transition-all flex items-center gap-2 shrink-0"
        >
          <Plus size={18} /> Create News
        </motion.button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          { label: 'Total Articles', value: stats.total, accent: 'bg-[#2D3436]', icon: FileText },
          { label: 'Published', value: stats.published, accent: 'bg-[#7FB069]', icon: CheckCircle2 },
          { label: 'Drafts', value: stats.drafts, accent: 'bg-[#D97853]', icon: PenSquare },
          { label: 'Views', value: stats.totalViews.toLocaleString('vi-VN'), accent: 'bg-[#5B8C51]', icon: Eye },
        ].map((card) => (
          <div key={card.label} className="rounded-[24px] border border-[#2D3436]/8 bg-white p-5 shadow-[0_10px_30px_rgba(45,52,54,0.05)]">
            <div className={`mb-4 flex h-11 w-11 items-center justify-center rounded-2xl ${card.accent}`}>
              <card.icon size={20} className="text-white" />
            </div>
            <p className="text-sm font-medium text-[#2D3436]/55">{card.label}</p>
            <p className="mt-2 text-3xl font-black text-[#2D3436]">{card.value}</p>
          </div>
        ))}
      </div>

      <div className="rounded-[24px] border border-[#2D3436]/5 bg-white p-4 shadow-sm">
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1.4fr_0.7fr_0.7fr]">
          <label className="flex flex-col gap-2">
            <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#D97853]">Search</span>
            <div className="relative">
              <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#D97853]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search by title, content, or excerpt"
                className="w-full rounded-full border border-[#2D3436]/10 bg-white py-3 pl-11 pr-4 text-sm text-[#2D3436] focus:outline-none focus:border-[#D97853] focus:ring-2 focus:ring-[#D97853]/20 transition-all shadow-sm placeholder:text-[#2D3436]/30"
              />
            </div>
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#D97853]">Category</span>
            <select
              value={categoryFilter}
              onChange={(event) => setCategoryFilter(event.target.value)}
              className="rounded-full border border-[#2D3436]/10 bg-white px-4 py-3 text-sm font-medium text-[#2D3436] focus:outline-none focus:border-[#D97853] focus:ring-2 focus:ring-[#D97853]/20 transition-all shadow-sm"
            >
              <option value="all">All Categories</option>
              {CATEGORY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#D97853]">Status</span>
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="rounded-full border border-[#2D3436]/10 bg-white px-4 py-3 text-sm font-medium text-[#2D3436] focus:outline-none focus:border-[#D97853] focus:ring-2 focus:ring-[#D97853]/20 transition-all shadow-sm"
            >
              {STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {error ? (
        <div className="flex items-start gap-3 rounded-[22px] border border-red-200 bg-red-50 p-4 text-red-700">
          <AlertCircle size={18} className="mt-0.5 shrink-0" />
          <div>
            <p className="font-bold">Unable to load news</p>
            <p className="mt-1 text-sm">{error}</p>
          </div>
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.3fr_0.7fr]">
        <div className="rounded-[24px] border border-[#2D3436]/5 bg-white shadow-[0_2px_10px_rgba(0,0,0,0.02)] overflow-hidden">
          <div className="overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="bg-[#FDFBF7] border-b border-[#2D3436]/5 text-xs font-bold text-[#2D3436]">
                  <th className="px-6 py-4 whitespace-nowrap">Article</th>
                  <th className="px-6 py-4 whitespace-nowrap">Category</th>
                  <th className="px-6 py-4 whitespace-nowrap">Author</th>
                  <th className="px-6 py-4 whitespace-nowrap">Status</th>
                  <th className="px-6 py-4 whitespace-nowrap">Views</th>
                  <th className="px-6 py-4 text-center whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, index) => (
                    <tr key={`loading-${index}`} className="border-b border-[#2D3436]/5">
                      <td className="px-6 py-5" colSpan="6">
                        <div className="h-12 animate-pulse rounded-2xl bg-[#F4EEE7]" />
                      </td>
                    </tr>
                  ))
                ) : filteredNews.length ? (
                  filteredNews.map((item, index) => (
                    <motion.tr key={item._id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.03 }} className="border-b border-[#2D3436]/5 hover:bg-[#FDFBF7] transition-colors">
                      <td className="px-6 py-5">
                        <button type="button" onClick={() => openDetail(item)} className="flex items-center gap-4 text-left">
                          <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl bg-[#F4EEE7]">
                            {item.coverImage ? (
                              <img src={item.coverImage} alt={item.title} className="h-full w-full object-cover" />
                            ) : (
                              <UploadCloud size={18} className="text-[#D97853]" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate font-bold text-[#2D3436]">{item.title}</p>
                            <div className="mt-1 flex items-center gap-2 text-xs text-[#2D3436]/45">
                              <Calendar size={12} />
                              {formatDate(item.publishedAt || item.createdAt)}
                            </div>
                          </div>
                        </button>
                      </td>
                      <td className="px-6 py-5 font-medium text-[#2D3436]/60">{categoryLabelMap[item.category] || item.category}</td>
                      <td className="px-6 py-5 text-[#2D3436]/60">{item.author?.name || item.author?.email || 'Unknown'}</td>
                      <td className="px-6 py-5"><StatusBadge published={item.isPublished} /></td>
                      <td className="px-6 py-5 font-medium text-[#2D3436]/60">{(item.views || 0).toLocaleString('vi-VN')}</td>
                      <td className="px-6 py-5">
                        <div className="flex items-center justify-center gap-3 text-[#2D3436]/45">
                          <button type="button" onClick={() => openEdit(item)} className="transition hover:text-[#D97853]">
                            <PenSquare size={16} />
                          </button>
                          <button type="button" onClick={() => openDelete(item)} className="transition hover:text-red-500">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="6" className="px-6 py-14 text-center text-[#2D3436]/55">
                      No news matched the current filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-[24px] border border-[#2D3436]/5 bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-black text-[#2D3436]">Recent Activity</h2>
                <p className="mt-1 text-sm text-[#2D3436]/50">Latest changed articles from backend data</p>
              </div>
              <RefreshCw size={18} className="text-[#D97853]" />
            </div>
            <div className="space-y-4">
              {stats.recentActivity.length ? (
                stats.recentActivity.map((item) => (
                  <div key={item._id} className="flex gap-3 rounded-[20px] bg-[#FDFBF7] p-4">
                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${item.category === 'promotion' ? 'bg-[#D97853]/15 text-[#D97853]' : 'bg-[#E8F3D6] text-[#5B8C51]'}`}>
                      {item.category === 'promotion' ? <Megaphone size={18} /> : <FileText size={18} />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-[#2D3436]">{item.title}</p>
                      <p className="mt-1 text-xs text-[#2D3436]/50">{item.isPublished ? 'Published' : 'Saved as draft'} • {timeAgo(item.updatedAt || item.createdAt)}</p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-[#2D3436]/55">No recent article activity.</p>
              )}
            </div>
          </div>

          <div className="rounded-[24px] border border-[#2D3436]/5 bg-[#2D3436] p-6 text-white shadow-lg">
            <h2 className="text-lg font-black">Top Performing</h2>
            <p className="mt-1 text-sm text-white/55">Most viewed live content from backend data</p>

            <div className="mt-6 space-y-5">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/45">Most Viewed Article</p>
                <p className="mt-2 text-base font-black">{stats.mostViewed?.title || 'No published article yet'}</p>
                <div className="mt-2 inline-flex items-center gap-2 rounded-full bg-white/8 px-3 py-1 text-xs font-bold text-[#7FB069]">
                  <Eye size={12} />
                  {(stats.mostViewed?.views || 0).toLocaleString('vi-VN')} views
                </div>
              </div>

              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/45">Active Promotions</p>
                <div className="mt-3 space-y-3">
                  {stats.promotions.length ? (
                    stats.promotions.map((item) => (
                      <div key={item._id} className="rounded-[18px] bg-white/8 p-4">
                        <p className="font-bold">{item.title}</p>
                        <p className="mt-1 text-xs text-white/55">{formatDate(item.publishedAt || item.createdAt)}</p>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-[18px] bg-white/8 p-4 text-sm text-white/65">
                      No active promotions found.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {formOpen ? (
        <NewsModal title={formMode === 'create' ? 'Create News' : 'Edit News'} onClose={() => setFormOpen(false)}>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <label className="flex flex-col gap-2 md:col-span-2">
                <span className="text-sm font-bold text-[#2D3436]">Title <span className="text-[#D97853]">*</span></span>
                <input
                  value={formData.title}
                  onChange={(event) => handleFormChange('title', event.target.value)}
                  className="w-full px-4 py-3 bg-white border border-[#2D3436]/10 rounded-2xl text-sm font-medium text-[#2D3436] focus:outline-none focus:border-[#D97853] focus:ring-2 focus:ring-[#D97853]/20 transition-all placeholder:font-normal placeholder:text-[#2D3436]/30 shadow-sm"
                  placeholder="Enter article title"
                />
              </label>

              <div className={`relative ${isCategoryOpen ? 'z-[60]' : 'z-10'}`}>
                <label className="block text-sm font-bold text-[#2D3436] mb-2">Category</label>
                <div
                  className={`flex items-center justify-between px-4 py-3 bg-white border ${isCategoryOpen ? 'border-[#D97853] ring-1 ring-[#D97853]/20' : 'border-[#2D3436]/10'} rounded-2xl cursor-pointer hover:border-[#D97853] transition-all shadow-sm`}
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsCategoryOpen(!isCategoryOpen);
                  }}
                >
                  <span className={`text-sm font-medium ${formData.category ? 'text-[#2D3436]' : 'text-[#2D3436]/30'}`}>
                    {CATEGORY_OPTIONS.find((c) => c.value === formData.category)?.label || 'Select category'}
                  </span>
                  <ChevronDown size={16} className={`text-[#2D3436]/50 transition-transform ${isCategoryOpen ? 'rotate-180' : ''}`} />
                </div>
                <AnimatePresence>
                  {isCategoryOpen && (
                    <>
                      <div
                        className="fixed inset-0 z-40"
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsCategoryOpen(false);
                        }}
                      />
                      <motion.div
                        initial={{ opacity: 0, y: -8, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -8, scale: 0.98 }}
                        transition={{ duration: 0.15 }}
                        className="absolute top-[calc(100%+8px)] left-0 w-full bg-white rounded-[16px] shadow-[0_10px_40px_rgba(0,0,0,0.08)] border border-[#2D3436]/5 overflow-hidden z-50 py-1.5 max-h-60 overflow-y-auto"
                      >
                        {CATEGORY_OPTIONS.map((option) => {
                          const isSelected = formData.category === option.value;
                          return (
                            <div
                              key={option.value}
                              className={`px-4 py-2.5 text-sm cursor-pointer transition-colors ${!isSelected ? 'text-[#2D3436]/70 hover:bg-[#2D3436]/5 font-medium' : 'border-l-[3px] border-[#D97853] bg-[#D97853]/10 text-[#D97853] font-bold'}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleFormChange('category', option.value);
                                setIsCategoryOpen(false);
                              }}
                            >
                              {option.label}
                            </div>
                          );
                        })}
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>

              <label className="flex flex-col gap-2">
                <span className="text-sm font-bold text-[#2D3436]">Cover Image URL</span>
                <label
                  onDrop={handleCoverDrop}
                  onDragOver={(event) => event.preventDefault()}
                  className="mb-1 flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-[#D97853]/35 bg-[#FDFBF7] px-4 py-5 text-center"
                >
                  <UploadCloud size={18} className="text-[#D97853]" />
                  <p className="text-sm font-semibold text-[#2D3436]">Kéo thả ảnh cover hoặc bấm để chọn file</p>
                  <p className="text-xs text-[#2D3436]/50">Ảnh sẽ được upload Cloudinary tự động</p>
                  <input type="file" accept="image/*" onChange={handleCoverInputChange} className="hidden" />
                </label>
                {coverUploading ? (
                  <div className="inline-flex items-center gap-2 text-xs font-semibold text-[#D97853]">
                    <RefreshCw size={12} className="animate-spin" /> Uploading cover image...
                  </div>
                ) : null}
                <input
                  value={formData.coverImage}
                  onChange={(event) => handleFormChange('coverImage', event.target.value)}
                  className="w-full px-4 py-3 bg-white border border-[#2D3436]/10 rounded-2xl text-sm font-medium text-[#2D3436] focus:outline-none focus:border-[#D97853] focus:ring-2 focus:ring-[#D97853]/20 transition-all placeholder:font-normal placeholder:text-[#2D3436]/30 shadow-sm"
                  placeholder="https://..."
                />
              </label>

              <label className="flex flex-col gap-2 md:col-span-2">
                <span className="text-sm font-bold text-[#2D3436]">Excerpt</span>
                <textarea
                  value={formData.excerpt}
                  onChange={(event) => handleFormChange('excerpt', event.target.value)}
                  rows={3}
                  className="w-full px-4 py-3 bg-white border border-[#2D3436]/10 rounded-2xl text-sm font-medium text-[#2D3436] focus:outline-none focus:border-[#D97853] focus:ring-2 focus:ring-[#D97853]/20 transition-all placeholder:font-normal placeholder:text-[#2D3436]/30 shadow-sm resize-none"
                  placeholder="Short summary for listing"
                />
              </label>

              <label className="flex flex-col gap-2 md:col-span-2">
                <span className="text-sm font-bold text-[#2D3436]">Content</span>
                <textarea
                  value={formData.content}
                  onChange={(event) => handleFormChange('content', event.target.value)}
                  rows={8}
                  className="w-full px-4 py-3 bg-white border border-[#2D3436]/10 rounded-2xl text-sm font-medium text-[#2D3436] focus:outline-none focus:border-[#D97853] focus:ring-2 focus:ring-[#D97853]/20 transition-all placeholder:font-normal placeholder:text-[#2D3436]/30 shadow-sm resize-none"
                  placeholder="Write full article content"
                />
              </label>

              <label className="flex flex-col gap-2 md:col-span-2">
                <span className="text-sm font-bold text-[#2D3436]">Tags</span>
                <input
                  value={formData.tags}
                  onChange={(event) => handleFormChange('tags', event.target.value)}
                  className="w-full px-4 py-3 bg-white border border-[#2D3436]/10 rounded-2xl text-sm font-medium text-[#2D3436] focus:outline-none focus:border-[#D97853] focus:ring-2 focus:ring-[#D97853]/20 transition-all placeholder:font-normal placeholder:text-[#2D3436]/30 shadow-sm"
                  placeholder="pet-care, summer, promotion"
                />
              </label>
            </div>

            <label className="flex items-center gap-3 bg-white border border-[#2D3436]/10 rounded-2xl px-4 py-3 text-sm font-medium text-[#2D3436]">
              <input
                type="checkbox"
                checked={formData.isPublished}
                onChange={(event) => handleFormChange('isPublished', event.target.checked)}
                className="h-5 w-5 rounded border-[#2D3436]/20 text-[#D97853] focus:ring-[#D97853]/20 cursor-pointer"
              />
              Publish immediately
            </label>

            <div className="flex flex-wrap justify-end gap-3 pt-2 border-t border-[#2D3436]/10">
              <button
                type="button"
                onClick={() => {
                  setFormOpen(false);
                  setIsCategoryOpen(false);
                }}
                className="px-6 py-2.5 rounded-xl font-bold text-sm text-[#2D3436]/70 hover:bg-[#2D3436]/5 hover:text-[#2D3436] transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-2.5 bg-[#D97853] text-white rounded-xl font-bold text-sm shadow-[0_5px_15px_rgba(217,120,83,0.3)] hover:bg-[#c66846] hover:-translate-y-0.5 transition-all disabled:opacity-50 flex items-center gap-2"
              >
                {saving ? 'Saving...' : formMode === 'create' ? 'Create News' : 'Save Changes'}
              </button>
            </div>
          </form>
        </NewsModal>
      ) : null}

      {detailOpen && selectedNews ? (
        <NewsModal title="News Details" onClose={() => setDetailOpen(false)}>
          <div className="space-y-5">
            {selectedNews.coverImage ? (
              <img src={selectedNews.coverImage} alt={selectedNews.title} className="h-64 w-full rounded-[24px] object-cover" />
            ) : null}

            <div className="flex flex-wrap items-center gap-3">
              <StatusBadge published={selectedNews.isPublished} />
              <span className="rounded-full bg-[#F4EEE7] px-3 py-1 text-xs font-bold text-[#2D3436]/70">
                {categoryLabelMap[selectedNews.category] || selectedNews.category}
              </span>
              <span className="text-xs font-medium text-[#2D3436]/45">
                {(selectedNews.views || 0).toLocaleString('vi-VN')} views
              </span>
            </div>

            <div>
              <h4 className="text-2xl font-black text-[#2D3436]">{selectedNews.title}</h4>
              <p className="mt-2 text-sm text-[#2D3436]/50">
                By {selectedNews.author?.name || selectedNews.author?.email || 'Unknown'} • {formatDate(selectedNews.publishedAt || selectedNews.createdAt)}
              </p>
            </div>

            {selectedNews.excerpt ? <p className="rounded-[20px] bg-[#FDFBF7] p-4 text-sm font-medium text-[#2D3436]/80">{selectedNews.excerpt}</p> : null}

            <div className="whitespace-pre-wrap text-sm leading-7 text-[#2D3436]/75">{selectedNews.content}</div>

            {selectedNews.tags?.length ? (
              <div className="flex flex-wrap gap-2">
                {selectedNews.tags.map((tag) => (
                  <span key={tag} className="rounded-full bg-[#E8F3D6] px-3 py-1 text-xs font-bold text-[#5B8C51]">
                    #{tag}
                  </span>
                ))}
              </div>
            ) : null}
          </div>
        </NewsModal>
      ) : null}

      {deleteOpen && selectedNews ? (
        <NewsModal title="Delete News" onClose={() => setDeleteOpen(false)}>
          <div className="space-y-5">
            <p className="text-sm leading-7 text-[#2D3436]/70">
              Delete <span className="font-bold text-[#2D3436]">{selectedNews.title}</span>? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeleteOpen(false)}
                className="rounded-full bg-[#F4EEE7] px-5 py-2.5 text-sm font-bold text-[#2D3436]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={saving}
                className="rounded-full bg-red-500 px-5 py-2.5 text-sm font-bold text-white disabled:opacity-70"
              >
                {saving ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </NewsModal>
      ) : null}
    </motion.div>
  );
};

export default AdminNewsManagement;
