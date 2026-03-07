const axios = require('axios');
const User = require('../models/User');
const UserPet = require('../models/UserPet');
const Service = require('../models/Service');
const Booking = require('../models/Booking');
const Transaction = require('../models/Transaction');
const Voucher = require('../models/Voucher');
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
  const { message, conversationHistory = [] } = req.body;

  if (!message || message.trim().length === 0) {
    return next(new AppError('Message is required', 400, 'MESSAGE_REQUIRED'));
  }

  // System prompt
  const systemPrompt = {
    role: 'system',
    content: `Bạn là chuyên gia chăm sóc thú cưng của tiệm Happy Tails Pet Care & Spa. 
Nhiệm vụ của bạn:
- Tư vấn về chăm sóc sức khỏe, dinh dưỡng, huấn luyện thú cưng
- Giải đáp thắc mắc về dịch vụ spa, grooming, boarding
- Đưa ra lời khuyên chuyên nghiệp, thân thiện và dễ hiểu
- Luôn đề xuất khách hàng đặt lịch nếu cần dịch vụ chuyên sâu

Hãy trả lời bằng tiếng Việt, giọng điệu ấm áp và chuyên nghiệp.`
  };

  // Build messages array
  const messages = [
    systemPrompt,
    ...conversationHistory.slice(-10), // Last 10 messages for context
    { role: 'user', content: message }
  ];

  const aiResponse = await callAI(messages);

  res.status(200).json({
    status: 'success',
    data: {
      response: aiResponse,
      timestamp: new Date().toISOString()
    }
  });
});

/**
 * AI Image Diagnosis
 * @route POST /api/ai/diagnose
 * @access Private
 */
exports.diagnoseImage = catchAsync(async (req, res, next) => {
  const { imageUrl, petId, symptoms } = req.body;

  if (!imageUrl) {
    return next(new AppError('Image URL is required', 400, 'IMAGE_URL_REQUIRED'));
  }

  // Get pet info if provided
  let petInfo = '';
  if (petId) {
    const pet = await UserPet.findOne({ _id: petId, userID: req.user.id });
    if (pet) {
      petInfo = `Thông tin thú cưng: ${pet.name}, ${pet.species}, ${pet.breed}, ${pet.age} tháng tuổi, ${pet.weight}kg. `;
    }
  }

  const messages = [
    {
      role: 'system',
      content: `Bạn là bác sĩ thú y chuyên nghiệp. Phân tích hình ảnh và đưa ra chẩn đoán sơ bộ.
QUAN TRỌNG: Trả về kết quả dưới dạng JSON với cấu trúc:
{
  "symptoms": "Mô tả các triệu chứng quan sát được",
  "severity": "low/medium/high",
  "possibleConditions": ["Tình trạng 1", "Tình trạng 2"],
  "advice": "Lời khuyên cụ thể",
  "urgency": "Có cần đến phòng khám ngay không? (yes/no)",
  "recommendedServices": ["Tên dịch vụ phù hợp"]
}`
    },
    {
      role: 'user',
      content: [
        {
          type: 'text',
          text: `${petInfo}${symptoms ? 'Triệu chứng bổ sung: ' + symptoms : ''}\n\nHãy phân tích hình ảnh này và đưa ra chẩn đoán.`
        },
        {
          type: 'image_url',
          image_url: { url: imageUrl }
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
      imageUrl,
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