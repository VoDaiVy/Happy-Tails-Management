import axiosInstance from "./axiosInstance";

/**
 * Chat with AI Assistant
 * @param {string} message - User message
 * @param {Array} conversationHistory - Previous messages
 * @returns {Promise} AI response
 */
export const chatWithAI = async (message, conversationHistory = []) => {
  try {
    console.log('🤖 Calling AI Chat API...', { message, historyLength: conversationHistory.length });
    const response = await axiosInstance.post("/ai/chat", {
      message,
      conversationHistory,
    });
    console.log('✅ AI Chat API Success:', response.data);
    return response.data;
  } catch (error) {
    console.error('❌ AI Chat API Error:', {
      status: error.response?.status,
      message: error.response?.data?.message,
      code: error.response?.data?.code,
      error: error.message
    });
    throw error;
  }
};

/**
 * AI Image Diagnosis
 * @param {File} imageFile - Image file to analyze
 * @param {string} petId - Pet ID (optional)
 * @param {string} symptoms - Additional symptoms description (optional)
 * @returns {Promise} Diagnosis result
 */
export const diagnoseImage = async (imageFile, petId = null, symptoms = "") => {
  const formData = new FormData();
  formData.append('image', imageFile);
  
  if (petId) {
    formData.append('petId', petId);
  }
  
  if (symptoms) {
    formData.append('symptoms', symptoms);
  }

  const response = await axiosInstance.post("/ai/diagnose", formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

/**
 * Get AI Service Recommendations
 * @param {string} petId - Pet ID
 * @returns {Promise} Recommended services
 */
export const getAIRecommendations = async (petId) => {
  const response = await axiosInstance.post("/ai/recommend", {
    petId,
  });
  return response.data;
};

/**
 * Debug AI Configuration (no auth required)
 * @returns {Promise} AI config status
 */
export const debugAI = async () => {
  const response = await axiosInstance.get("/ai/debug");
  return response.data;
};
