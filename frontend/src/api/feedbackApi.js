import axiosInstance from './axiosInstance';

// Get feedback list (public/staff scope depends on auth + query)
export const getAllFeedback = async (params = {}) => {
  const response = await axiosInstance.get('/feedback', { params });
  return response.data;
};

// Get feedback created by current customer
export const getMyFeedback = async () => {
  const response = await axiosInstance.get('/feedback/my');
  return response.data;
};

// Create booking feedback (attached to assigned staff on backend)
export const createFeedback = async (payload) => {
  const response = await axiosInstance.post('/feedback', payload);
  return response.data;
};

// Staff/admin inbox: feedback received by staff
export const getStaffReceivedFeedback = async () => {
  const response = await axiosInstance.get('/feedback/staff/received');
  return response.data;
};
