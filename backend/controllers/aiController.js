const axios = require('axios');
const User = require('../models/User');
const UserPet = require('../models/UserPet');
const Service = require('../models/Service');
const Booking = require('../models/Booking');
const Transaction = require('../models/Transaction');
const Voucher = require('../models/Voucher');
const AIConversation = require('../models/AIConversation');
const { catchAsync } = require('../utils/catchAsync');
const { AppError } = require('../utils/AppError');

// AI Configuration
const AI_CONFIG = {
  provider: process.env.AI_PROVIDER || 'openai', // 'openai' or 'gemini'
  openaiKey: process.env.OPENAI_API_KEY,
  geminiKey: process.env.GEMINI_API_KEY,
  timeout: 30000, // 30 seconds
  model: process.env.AI_MODEL || (process.env.AI_PROVIDER === 'gemini' ? 'gemini-1.5-flash' : 'gpt-4o')
};

const CHAT_HISTORY_LIMIT = 200;
const CHAT_CONTEXT_WINDOW = 16;
const MESSAGE_MAX_LENGTH = 1000;

const VIETNAMESE_CHAR_REGEX = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i;

const DOMAIN_KEYWORDS = [
  'spa', 'pet', 'dog', 'cat', 'puppy', 'kitten', 'groom', 'grooming', 'boarding', 'bath', 'haircut',
  'trim', 'nail', 'ear cleaning', 'health scan', 'veterinary', 'vet', 'booking', 'appointment',
  'room', 'service', 'voucher', 'wallet', 'camera', 'medical record', 'policy', 'feedback',
  'thu cung', 'thú cưng', 'cho', 'chó', 'meo', 'mèo', 'spa thú cưng', 'tam', 'tắm', 'cat tia',
  'cắt tỉa', 'cat mong', 'cắt móng', 'giu', 'giữ', 'luu tru', 'lưu trú', 'dat lich', 'đặt lịch',
  'lich hen', 'lịch hẹn', 'dich vu', 'dịch vụ', 'phong', 'phòng', 'gia', 'giá', 'voucher',
  'vi', 'ví', 'camera', 'benh an', 'bệnh án', 'suc khoe', 'sức khỏe', 'chinh sach', 'chính sách',
  'happy tails', 'pet care', 'cham soc', 'chăm sóc', 'khuyen mai', 'khuyến mãi', 'thanh toan', 'thanh toán',
  'mo cua', 'mở cửa', 'gio', 'giờ'
];

const GREETING_KEYWORDS = [
  'hi', 'hello', 'hey', 'xin chao', 'xin chào', 'chao', 'chào', 'alo', 'yo'
];

const SERVICE_QUERY_KEYWORDS = [
  'dich vu nao',
  'dịch vụ nào',
  'danh sach dich vu',
  'danh sách dịch vụ',
  'co nhung dich vu nao',
  'có những dịch vụ nào',
  'list service',
  'list services',
  'what services',
  'available services',
  'service list',
  'goi dich vu',
  'gói dịch vụ',
];

const isVietnameseText = (text = '') => {
  const normalized = String(text).toLowerCase();
  return VIETNAMESE_CHAR_REGEX.test(normalized)
    || normalized.includes('xin chao')
    || normalized.includes('thú cưng')
    || normalized.includes('dịch vụ');
};

const isSpaRelatedMessage = (message = '') => {
  const normalized = String(message).toLowerCase().trim();
  if (!normalized) return false;

  const compact = normalized
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  if (GREETING_KEYWORDS.some((keyword) => compact.includes(keyword))) {
    return true;
  }

  return DOMAIN_KEYWORDS.some((keyword) => compact.includes(keyword));
};

const normalizeCompactText = (text = '') => {
  return String(text)
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
};

const isServiceCatalogQuery = (message = '') => {
  const compact = normalizeCompactText(message);
  return SERVICE_QUERY_KEYWORDS.some((keyword) => compact.includes(keyword));
};

const getOutOfScopeReply = (message = '') => {
  if (isVietnameseText(message)) {
    return 'Mình chỉ có thể hỗ trợ các câu hỏi liên quan đến Happy Tails Pet Care & Spa (dịch vụ, đặt lịch, lưu trú, giá, ví/voucher, chăm sóc thú cưng và tính năng trong hệ thống). Bạn vui lòng hỏi đúng chủ đề này nhé.';
  }

  return 'I can only help with Happy Tails Pet Care & Spa topics (services, bookings, boarding, pricing, wallet/voucher, pet care, and in-app features). Please ask something related to those topics.';
};

const formatServiceSummary = (serviceDocs = []) => {
  if (!serviceDocs.length) {
    return '- No active services found in database at the moment.';
  }

  return serviceDocs
    .slice(0, 40)
    .map((service) => {
      const price = Number(service.price || 0).toLocaleString('vi-VN');
      const duration = service.duration ? `${service.duration} minutes` : 'N/A';
      const categoryName = service.category?.name || 'General';
      return `- ${service.name} | Category: ${categoryName} | Duration: ${duration} | Price: ${price} VND`;
    })
    .join('\n');
};

const buildChatSystemPrompt = ({ now, serviceSummary }) => {
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  const currentDay = now.getDate();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();

  return `You are Happy Tails Customer AI Assistant.

CURRENT TIME INFORMATION:
- Current year: ${currentYear}
- Current month: ${currentMonth}
- Current day: ${currentDay}
- Current time: ${currentHour}:${currentMinute.toString().padStart(2, '0')}

PROJECT CONTEXT (HAPPY TAILS PET CARE & SPA):
- Core services: grooming, spa treatment, bathing, pet boarding/stay, AI health scan support.
- Customer features in app: account/login, pet profile management, cart, booking checkout, room/stay selection, wallet payment, voucher usage, booking history, medical record tracking, policy/news viewing, feedback submission, and camera monitoring for eligible stay bookings.
- Active service catalog from database:
${serviceSummary}

STRICT SCOPE RULES:
1) Only answer questions related to Happy Tails services, pet care, and app features above.
2) If the user asks unrelated topics (politics, coding help, general world facts, entertainment, etc.), refuse briefly and ask them to return to Happy Tails topics.
3) Never fabricate unavailable services, prices, or features.
4) If exact data is missing, say that clearly and suggest checking in-app pages or contacting staff.
5) Respond in the same language as the user (Vietnamese/English).
6) Keep answers concise, friendly, and practical for customers.`;
};

const buildServiceCatalogReply = (serviceDocs = [], sourceLabel = 'database', isVietnamese = true) => {
  if (!serviceDocs.length) {
    return isVietnamese
      ? 'Hiện tại hệ thống chưa có dịch vụ nào đang hoạt động. Bạn vui lòng quay lại sau hoặc liên hệ staff để được hỗ trợ.'
      : 'There are currently no active services in the system. Please try again later or contact staff for support.';
  }

  const seen = new Set();
  const deduped = [];
  for (const service of serviceDocs) {
    const key = normalizeCompactText(service.name || '');
    if (!key || seen.has(key)) continue;
    seen.add(key);
    deduped.push(service);
  }

  const grouped = deduped.reduce((acc, service) => {
    const category = service.category?.name || (isVietnamese ? 'Khác' : 'Other');
    if (!acc[category]) acc[category] = [];
    acc[category].push(service);
    return acc;
  }, {});

  const lines = [];
  if (isVietnamese) {
    lines.push(`Mình lấy trực tiếp từ ${sourceLabel}. Hiện có ${deduped.length} dịch vụ đang hoạt động:`);
  } else {
    lines.push(`I fetched this directly from the ${sourceLabel}. There are currently ${deduped.length} active services:`);
  }

  Object.entries(grouped).forEach(([categoryName, services]) => {
    lines.push('');
    lines.push(isVietnamese ? `- Nhóm ${categoryName}:` : `- Category ${categoryName}:`);
    services.forEach((service) => {
      const price = Number(service.price || 0).toLocaleString('vi-VN');
      lines.push(`  * ${service.name} (${price} VND)`);
    });
  });

  return lines.join('\n');
};

const saveConversationMessages = async ({ userId, userMessage, assistantMessage, timestamp = new Date() }) => {
  await AIConversation.findOneAndUpdate(
    { userId },
    {
      $setOnInsert: { userId },
      $set: { lastMessageAt: timestamp },
      $push: {
        messages: {
          $each: [
            { role: 'user', content: userMessage, timestamp },
            { role: 'assistant', content: assistantMessage, timestamp: new Date() },
          ],
          $slice: -CHAT_HISTORY_LIMIT,
        },
      },
    },
    { upsert: true, new: true }
  );
};

/**
 * Call AI API (OpenAI or Gemini)
 */
const callAI = async (messages, useVision = false) => {
  // Check if API key is configured
  if (AI_CONFIG.provider === 'openai' && (!AI_CONFIG.openaiKey || AI_CONFIG.openaiKey === 'your_openai_api_key_here')) {
    throw new AppError(
      'OpenAI API key not configured. Please set OPENAI_API_KEY in .env file or switch to Gemini (AI_PROVIDER=gemini)',
      500,
      'AI_KEY_NOT_CONFIGURED'
    );
  }
  
  if (AI_CONFIG.provider === 'gemini' && (!AI_CONFIG.geminiKey || AI_CONFIG.geminiKey === 'your_gemini_api_key_here')) {
    throw new AppError(
      'Gemini API key not configured. Please set GEMINI_API_KEY in .env file',
      500,
      'AI_KEY_NOT_CONFIGURED'
    );
  }

  try {
    if (AI_CONFIG.provider === 'openai') {
      const response = await axios.post(
        'https://api.openai.com/v1/chat/completions',
        {
          model: useVision ? 'gpt-4o' : AI_CONFIG.model,
          messages,
          max_tokens: 1000,
          temperature: 0.7
        },
        {
          headers: {
            'Authorization': `Bearer ${AI_CONFIG.openaiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: AI_CONFIG.timeout
        }
      );
      return response.data.choices[0].message.content;
    } else if (AI_CONFIG.provider === 'gemini') {
      // Gemini API call
      // Note: Gemini doesn't have 'system' role, we prepend system message to first user message
      const geminiContents = [];
      let systemPrompt = '';
      
      for (let idx = 0; idx < messages.length; idx++) {
        const msg = messages[idx];
        
        if (msg.role === 'system') {
          systemPrompt = msg.content;
        } else if (msg.role === 'user') {
          const parts = [];
          
          // Handle content as string or array (for images)
          if (typeof msg.content === 'string') {
            const text = idx === 1 && systemPrompt 
              ? `${systemPrompt}\n\n${msg.content}` 
              : msg.content;
            parts.push({ text });
          } else if (Array.isArray(msg.content)) {
            // Content is array (OpenAI format with text and images)
            for (const item of msg.content) {
              if (item.type === 'text') {
                const text = idx === 1 && systemPrompt 
                  ? `${systemPrompt}\n\n${item.text}` 
                  : item.text;
                parts.push({ text });
              } else if (item.type === 'image_url') {
                // For Gemini, fetch image and convert to base64
                try {
                  const imageUrl = item.image_url.url;
                  let base64Data;
                  
                  // Check if it's already base64
                  if (imageUrl.startsWith('data:image')) {
                    // Extract base64 from data URL
                    base64Data = imageUrl.split(',')[1];
                  } else {
                    // Fetch image from URL and convert to base64
                    const imageResponse = await axios.get(imageUrl, {
                      responseType: 'arraybuffer',
                      timeout: 10000
                    });
                    base64Data = Buffer.from(imageResponse.data).toString('base64');
                  }
                  
                  parts.push({
                    inline_data: {
                      mime_type: 'image/jpeg',
                      data: base64Data
                    }
                  });
                } catch (imgError) {
                  console.error('Failed to fetch image:', imgError.message);
                  // Skip this image if fetch fails
                  parts.push({ text: '[Image could not be loaded]' });
                }
              }
            }
          }
          
          geminiContents.push({
            role: 'user',
            parts
          });
        } else if (msg.role === 'assistant') {
          geminiContents.push({
            role: 'model',
            parts: [{ text: msg.content }]
          });
        }
      }

      // Try multiple model names for compatibility
      const modelOptions = useVision 
        ? ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-2.5-pro']
        : [AI_CONFIG.model || 'gemini-2.0-flash', 'gemini-2.5-flash', 'gemini-2.0-flash-001', 'gemini-2.5-pro'];
      
      let lastError;
      for (const modelName of modelOptions) {
        try {
          const response = await axios.post(
            `https://generativelanguage.googleapis.com/v1/models/${modelName}:generateContent?key=${AI_CONFIG.geminiKey}`,
            {
              contents: geminiContents
            },
            { timeout: AI_CONFIG.timeout }
          );
          return response.data.candidates[0].content.parts[0].text;
        } catch (err) {
          lastError = err;
          // If it's not a model-not-found error, throw immediately
          if (!err.response?.data?.error?.message?.includes('not found')) {
            throw err;
          }
          // Otherwise try next model
          console.warn(`Model ${modelName} not available, trying next...`);
        }
      }
      
      // If all models failed, throw the last error
      throw lastError;
    }
  } catch (error) {
    // Better error messages
    const errorMsg = error.response?.data?.error?.message || error.message;
    const statusCode = error.response?.status || 503;
    
    console.error('AI API Error:', {
      provider: AI_CONFIG.provider,
      status: statusCode,
      message: errorMsg,
      fullError: error.response?.data || error.message
    });
    
    if (statusCode === 401 || statusCode === 403) {
      throw new AppError(
        `AI API authentication failed. Please check your ${AI_CONFIG.provider.toUpperCase()} API key.`,
        401,
        'AI_AUTH_FAILED'
      );
    }
    
    throw new AppError(
      `AI service error: ${errorMsg}`,
      503,
      'AI_SERVICE_ERROR'
    );
  }
};

/**
 * Chat with AI
 * @route POST /api/ai/chat
 * @access Private
 */
exports.chatWithAI = catchAsync(async (req, res, next) => {
  const { message } = req.body;

  if (req.user.role !== 'customer') {
    return next(new AppError('Only customers can use AI chat', 403, 'FORBIDDEN'));
  }

  if (!message || message.trim().length === 0) {
    return next(new AppError('Message is required', 400, 'MESSAGE_REQUIRED'));
  }

  const cleanedMessage = String(message).trim();
  if (cleanedMessage.length > MESSAGE_MAX_LENGTH) {
    return next(
      new AppError(`Message must be less than ${MESSAGE_MAX_LENGTH} characters`, 400, 'MESSAGE_TOO_LONG')
    );
  }

  const now = new Date();
  if (!isSpaRelatedMessage(cleanedMessage)) {
    const outOfScopeReply = getOutOfScopeReply(cleanedMessage);
    await saveConversationMessages({
      userId: req.user.id,
      userMessage: cleanedMessage,
      assistantMessage: outOfScopeReply,
      timestamp: now,
    });

    return res.status(200).json({
      status: 'success',
      data: {
        response: outOfScopeReply,
        timestamp: new Date().toISOString(),
        outOfScope: true,
      },
    });
  }

  const [conversation, services] = await Promise.all([
    AIConversation.findOne({ userId: req.user.id }).select('messages'),
    Service.find({ isActive: true })
      .populate('category', 'name')
      .select('name price duration category')
      .lean(),
  ]);

  if (isServiceCatalogQuery(cleanedMessage)) {
    const directReply = buildServiceCatalogReply(services, 'database hệ thống', isVietnameseText(cleanedMessage));

    await saveConversationMessages({
      userId: req.user.id,
      userMessage: cleanedMessage,
      assistantMessage: directReply,
      timestamp: now,
    });

    return res.status(200).json({
      status: 'success',
      data: {
        response: directReply,
        timestamp: new Date().toISOString(),
        outOfScope: false,
        source: 'database',
      },
    });
  }

  const serviceSummary = formatServiceSummary(services);

  const systemPrompt = {
    role: 'system',
    content: buildChatSystemPrompt({ now, serviceSummary }),
  };

  const historyMessages = (conversation?.messages || [])
    .slice(-CHAT_CONTEXT_WINDOW)
    .map((msg) => ({ role: msg.role, content: msg.content }));

  const messages = [
    systemPrompt,
    ...historyMessages,
    { role: 'user', content: cleanedMessage },
  ];

  const aiResponse = await callAI(messages);
  await saveConversationMessages({
    userId: req.user.id,
    userMessage: cleanedMessage,
    assistantMessage: aiResponse,
    timestamp: now,
  });

  res.status(200).json({
    status: 'success',
    data: {
      response: aiResponse,
      timestamp: new Date().toISOString(),
      outOfScope: false,
    },
  });
});

/**
 * Get AI chat history
 * @route GET /api/ai/chat/history
 * @access Private (Customer)
 */
exports.getChatHistory = catchAsync(async (req, res, next) => {
  if (req.user.role !== 'customer') {
    return next(new AppError('Only customers can view AI chat history', 403, 'FORBIDDEN'));
  }

  const limitRaw = Number(req.query.limit || 100);
  const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), CHAT_HISTORY_LIMIT) : 100;

  const conversation = await AIConversation.findOne({ userId: req.user.id }).select('messages lastMessageAt');
  const messages = (conversation?.messages || []).slice(-limit);

  res.status(200).json({
    status: 'success',
    data: {
      messages,
      total: conversation?.messages?.length || 0,
      lastMessageAt: conversation?.lastMessageAt || null,
    },
  });
});

/**
 * AI Image Diagnosis
 * @route POST /api/ai/diagnose
 * @access Private
 */
exports.diagnoseImage = catchAsync(async (req, res, next) => {
  const { petId, symptoms } = req.body;

  // Check if file is uploaded
  if (!req.file) {
    return next(new AppError('Image file is required', 400, 'IMAGE_FILE_REQUIRED'));
  }

  // Convert image buffer to base64 data URL
  const base64Image = req.file.buffer.toString('base64');
  const mimeType = req.file.mimetype;
  const imageDataUrl = `data:${mimeType};base64,${base64Image}`;

  // Detect language from symptoms (Vietnamese has diacritics)
  const isVietnamese = symptoms && /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i.test(symptoms);
  
  // Get pet info if provided (only when authenticated)
  let petInfo = '';
  if (petId && req.user?.id) {
    const pet = await UserPet.findOne({ _id: petId, userID: req.user.id });
    if (pet) {
      if (isVietnamese) {
        petInfo = `Thông tin thú cưng: ${pet.name}, ${pet.species}, ${pet.breed}, ${pet.age} tháng tuổi, ${pet.weight}kg. `;
      } else {
        petInfo = `Pet information: ${pet.name}, ${pet.species}, ${pet.breed}, ${pet.age} months old, ${pet.weight}kg. `;
      }
    }
  }

  // Build system prompt based on language
  const systemPrompt = isVietnamese ? 
    `Bạn là bác sĩ thú y chuyên nghiệp. Phân tích hình ảnh và đưa ra chẩn đoán sơ bộ.
QUAN TRỌNG: Trả về kết quả bằng TIẾNG VIỆT dưới dạng JSON với cấu trúc:
{
  "symptoms": "Mô tả các triệu chứng quan sát được",
  "severity": "low/medium/high",
  "possibleConditions": ["Tình trạng 1", "Tình trạng 2"],
  "advice": "Lời khuyên cụ thể",
  "urgency": "Có cần đến phòng khám ngay không? (yes/no)",
  "recommendedServices": ["Tên dịch vụ phù hợp"]
}` :
    `You are a professional veterinarian. Analyze the image and provide a preliminary diagnosis.
IMPORTANT: Return the result in ENGLISH as JSON format with this structure:
{
  "symptoms": "Description of observed symptoms",
  "severity": "low/medium/high",
  "possibleConditions": ["Condition 1", "Condition 2"],
  "advice": "Specific advice",
  "urgency": "Is immediate vet visit needed? (yes/no)",
  "recommendedServices": ["Suitable service names"]
}`;

  const userPrompt = isVietnamese ?
    `${petInfo}${symptoms ? 'Triệu chứng bổ sung: ' + symptoms : ''}\n\nHãy phân tích hình ảnh này và đưa ra chẩn đoán.` :
    `${petInfo}${symptoms ? 'Additional symptoms: ' + symptoms : ''}\n\nPlease analyze this image and provide a diagnosis.`;

  const messages = [
    {
      role: 'system',
      content: systemPrompt
    },
    {
      role: 'user',
      content: [
        {
          type: 'text',
          text: userPrompt
        },
        {
          type: 'image_url',
          image_url: { url: imageDataUrl }
        }
      ]
    }
  ];

  const aiResponse = await callAI(messages, true);

  // Parse JSON response
  let diagnosis;
  try {
    // Extract JSON from response (handle markdown code blocks)
    const jsonMatch = aiResponse.match(/```json\n([\s\S]*?)\n```/) || aiResponse.match(/\{[\s\S]*\}/);
    diagnosis = JSON.parse(jsonMatch ? jsonMatch[1] || jsonMatch[0] : aiResponse);
  } catch (error) {
    // Fallback if JSON parsing fails
    diagnosis = {
      symptoms: 'Không thể phân tích tự động',
      severity: 'medium',
      possibleConditions: [],
      advice: aiResponse,
      urgency: 'no',
      recommendedServices: []
    };
  }

  res.status(200).json({
    status: 'success',
    data: {
      diagnosis,
      fileName: req.file.originalname,
      fileSize: req.file.size,
      analyzedAt: new Date().toISOString()
    }
  });
});

/**
 * AI Recommend Services
 * @route POST /api/ai/recommend
 * @access Private
 */
exports.recommendServices = catchAsync(async (req, res, next) => {
  const { petId } = req.body;

  if (!petId) {
    return next(new AppError('Pet ID is required', 400, 'PET_ID_REQUIRED'));
  }

  // Get pet info
  const pet = await UserPet.findOne({ _id: petId, userID: req.user.id });
  if (!pet) {
    return next(new AppError('Pet not found', 404, 'PET_NOT_FOUND'));
  }

  // Get all active services
  const services = await Service.find({ isActive: true })
    .populate('category', 'name')
    .select('_id name description category price duration petTypes features');

  if (services.length === 0) {
    return next(new AppError('No services available', 404, 'NO_SERVICES'));
  }

  // Build prompt
  const petProfile = `
Thông tin thú cưng:
- Tên: ${pet.name}
- Loài: ${pet.species}
- Giống: ${pet.breed}
- Tuổi: ${pet.age} tháng
- Cân nặng: ${pet.weight}kg
- Tình trạng sức khỏe: ${pet.healthStatus || 'Bình thường'}
${pet.medicalHistory?.length ? '- Lịch sử bệnh: ' + pet.medicalHistory.map(h => h.condition).join(', ') : ''}
`;

  const servicesList = services.map((s, idx) => 
    `${idx + 1}. ${s.name} (${s.category?.name || 'N/A'}) - ${s.price.toLocaleString()}đ - ${s.description.substring(0, 100)}...`
  ).join('\n');

  const messages = [
    {
      role: 'system',
      content: `Bạn là chuyên gia chăm sóc thú cưng. Hãy chọn 3 dịch vụ PHÙ HỢP NHẤT từ danh sách.
QUAN TRỌNG: Trả về JSON array với cấu trúc:
{
  "recommendations": [
    {
      "serviceId": "MongoDB ObjectId",
      "serviceName": "Tên dịch vụ",
      "reason": "Lý do khuyên dùng (ngắn gọn)",
      "priority": 1-3
    }
  ]
}`
    },
    {
      role: 'user',
      content: `${petProfile}\n\nDanh sách dịch vụ hiện có:\n${servicesList}\n\nHãy chọn 3 dịch vụ phù hợp nhất.`
    }
  ];

  const aiResponse = await callAI(messages);

  // Parse JSON
  let recommendations;
  try {
    const jsonMatch = aiResponse.match(/```json\n([\s\S]*?)\n```/) || aiResponse.match(/\{[\s\S]*\}/);
    recommendations = JSON.parse(jsonMatch ? jsonMatch[1] || jsonMatch[0] : aiResponse);
  } catch (error) {
    return next(new AppError('Failed to parse AI recommendations', 500, 'PARSE_ERROR'));
  }

  // Validate and enrich recommendations
  const validRecommendations = await Promise.all(
    recommendations.recommendations.map(async (rec) => {
      const service = services.find(s => s._id.toString() === rec.serviceId || s.name === rec.serviceName);
      if (service) {
        return {
          service: {
            _id: service._id,
            name: service.name,
            description: service.description,
            price: service.price,
            duration: service.duration,
            category: service.category
          },
          reason: rec.reason,
          priority: rec.priority
        };
      }
      return null;
    })
  );

  res.status(200).json({
    status: 'success',
    data: {
      pet: {
        id: pet._id,
        name: pet.name,
        species: pet.species
      },
      recommendations: validRecommendations.filter(r => r !== null).slice(0, 3),
      generatedAt: new Date().toISOString()
    }
  });
});

/**
 * AI Suggest Voucher (Admin only)
 * @route POST /api/ai/suggest-voucher
 * @access Private (Admin)
 */
exports.suggestVoucher = catchAsync(async (req, res, next) => {
  // Get VIP customers (high totalSpent, no booking in 30 days)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  // Aggregate VIP customers
  const vipCustomers = await User.aggregate([
    {
      $match: {
        role: 'customer',
        isActive: true,
        isDeleted: false
      }
    },
    {
      $lookup: {
        from: 'bookings',
        localField: '_id',
        foreignField: 'customer',
        as: 'bookings'
      }
    },
    {
      $lookup: {
        from: 'transactions',
        localField: '_id',
        foreignField: 'user',
        as: 'transactions'
      }
    },
    {
      $addFields: {
        totalSpent: {
          $sum: {
            $map: {
              input: '$transactions',
              as: 'txn',
              in: {
                $cond: [
                  { $and: [
                    { $eq: ['$$txn.type', 'payment'] },
                    { $eq: ['$$txn.status', 'completed'] }
                  ]},
                  '$$txn.amount',
                  0
                ]
              }
            }
          }
        },
        lastBookingDate: { $max: '$bookings.createdAt' }
      }
    },
    {
      $match: {
        $and: [
          { totalSpent: { $gte: 1000000 } }, // At least 1M VND spent
          {
            $or: [
              { lastBookingDate: { $lt: thirtyDaysAgo } },
              { lastBookingDate: { $exists: false } }
            ]
          }
        ]
      }
    },
    {
      $sort: { totalSpent: -1 }
    },
    {
      $limit: 50
    },
    {
      $project: {
        _id: 1,
        name: 1,
        email: 1,
        totalSpent: 1,
        bookingCount: { $size: '$bookings' },
        lastBookingDate: 1
      }
    }
  ]);

  if (vipCustomers.length === 0) {
    return res.status(200).json({
      status: 'success',
      message: 'No eligible VIP customers found',
      data: { voucher: null }
    });
  }

  // Calculate metrics
  const totalVIPs = vipCustomers.length;
  const avgSpent = vipCustomers.reduce((sum, c) => sum + c.totalSpent, 0) / totalVIPs;
  const totalRevenueLost = vipCustomers.reduce((sum, c) => sum + c.totalSpent, 0);

  // AI prompt
  const messages = [
    {
      role: 'system',
      content: `Bạn là chuyên gia Marketing. Hãy tạo voucher ưu đãi để thu hút khách VIP quay lại.
QUAN TRỌNG: Trả về JSON với cấu trúc:
{
  "code": "Mã voucher (6-10 ký tự, viết hoa, không dấu)",
  "description": "Mô tả hấp dẫn (tối đa 200 ký tự)",
  "discountType": "percentage hoặc fixed",
  "discountValue": số (nếu percentage thì 5-30, nếu fixed thì 50000-500000),
  "minSpend": số (tối thiểu để dùng voucher),
  "maxDiscount": số (chỉ cho percentage, giới hạn tiền giảm tối đa),
  "validDays": số ngày hiệu lực (7-30)
}`
    },
    {
      role: 'user',
      content: `Dữ liệu khách hàng VIP:
- Tổng số: ${totalVIPs} khách
- Chi tiêu trung bình: ${avgSpent.toLocaleString()}đ
- Tổng doanh thu có thể mất: ${totalRevenueLost.toLocaleString()}đ
- Đặc điểm: Chưa booking trong 30 ngày, từng chi tiêu cao

Hãy tạo voucher hấp dẫn để kéo họ quay lại!`
    }
  ];

  const aiResponse = await callAI(messages);

  // Parse JSON
  let voucherData;
  try {
    const jsonMatch = aiResponse.match(/```json\n([\s\S]*?)\n```/) || aiResponse.match(/\{[\s\S]*\}/);
    voucherData = JSON.parse(jsonMatch ? jsonMatch[1] || jsonMatch[0] : aiResponse);
  } catch (error) {
    return next(new AppError('Failed to parse AI voucher suggestion', 500, 'PARSE_ERROR'));
  }

  // Calculate valid dates
  const validFrom = new Date();
  const validUntil = new Date();
  validUntil.setDate(validUntil.getDate() + (voucherData.validDays || 14));

  // Create voucher in database
  const voucher = await Voucher.create({
    code: voucherData.code.toUpperCase().replace(/\s/g, ''),
    description: voucherData.description,
    discountType: voucherData.discountType,
    discountValue: voucherData.discountValue,
    minSpend: voucherData.minSpend || 0,
    maxDiscount: voucherData.maxDiscount || null,
    validFrom,
    validUntil,
    isActive: true,
    isAIGenerated: true,
    targetCustomers: vipCustomers.map(c => c._id),
    createdBy: req.user.id,
    usageLimit: totalVIPs * 2 // Each VIP can use twice
  });

  res.status(201).json({
    status: 'success',
    message: 'AI-generated voucher created successfully',
    data: {
      voucher,
      targetCustomers: {
        count: totalVIPs,
        avgSpent,
        potentialRevenue: totalRevenueLost
      }
    }
  });
});

/**
 * Debug AI - List available models
 * @route GET /api/ai/debug
 * @access Private (Admin)
 */
exports.debugAI = catchAsync(async (req, res, next) => {
  if (AI_CONFIG.provider === 'gemini') {
    try {
      const response = await axios.get(
        `https://generativelanguage.googleapis.com/v1/models?key=${AI_CONFIG.geminiKey}`
      );
      
      const models = response.data.models.map(m => ({
        name: m.name,
        displayName: m.displayName,
        supportedMethods: m.supportedGenerationMethods
      }));

      res.json({
        status: 'success',
        data: {
          provider: 'gemini',
          apiKeyValid: true,
          availableModels: models,
          currentModel: AI_CONFIG.model
        }
      });
    } catch (error) {
      res.status(500).json({
        status: 'error',
        message: error.response?.data?.error?.message || error.message,
        apiKeyValid: false
      });
    }
  } else {
    res.json({
      status: 'success',
      data: {
        provider: 'openai',
        currentModel: AI_CONFIG.model,
        note: 'OpenAI does not provide public model listing endpoint'
      }
    });
  }
});