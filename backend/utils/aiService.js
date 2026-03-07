/**
 * AI Service - Gemini Integration
 * Placed in utils/ following project convention (see emailService.js)
 */

const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/**
 * Moderate feedback comment using Gemini AI (Multilingual)
 * Fail-open: if AI is unavailable, allow the comment through
 * @param {string} comment
 * @returns {Promise<{isToxic: boolean, reason: string}>}
 */
const moderateFeedback = async (comment) => {
  try {
    if (!comment || comment.trim().length === 0) {
      return { isToxic: false, reason: '' };
    }

    const model = genAI.getGenerativeModel({
      model: process.env.AI_MODEL || 'gemini-2.0-flash'
    });

    const prompt = `Bạn là chuyên gia kiểm duyệt nội dung đa ngôn ngữ (Multilingual Content Moderator) cho một ứng dụng Spa thú cưng. Input có thể là Tiếng Việt, Tiếng Anh, hoặc bất kỳ ngôn ngữ nào. Hãy phân tích ngữ nghĩa để xác định xem nội dung có chứa ngôn từ thô tục, xúc phạm, đe dọa hay thù ghét không. BẮT BUỘC chỉ trả về 1 object JSON duy nhất định dạng: { "isToxic": boolean, "reason": "Giải thích lý do bằng Tiếng Việt" }

Nội dung cần kiểm duyệt: "${comment}"`;

    const result = await model.generateContent(prompt);
    const text   = result.response.text();

    // Extract JSON — handle markdown code fences or raw JSON
    const jsonMatch =
      text.match(/```json\s*([\s\S]*?)\s*```/) ||
      text.match(/```\s*([\s\S]*?)\s*```/)     ||
      text.match(/(\{[\s\S]*?\})/);

    if (!jsonMatch) {
      console.warn('[aiService] Could not find JSON in Gemini response, defaulting to safe.');
      return { isToxic: false, reason: '' };
    }

    const raw = (jsonMatch[1] || jsonMatch[0]).trim();

    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch (parseErr) {
      console.warn('[aiService] JSON.parse failed:', parseErr.message);
      return { isToxic: false, reason: '' };
    }

    return {
      isToxic: Boolean(parsed.isToxic),
      reason:  parsed.reason || ''
    };

  } catch (err) {
    // Fail-open: AI unavailable shouldn't block users from submitting feedback
    console.error('[aiService] moderateFeedback error (fail-open):', err.message);
    return { isToxic: false, reason: '' };
  }
};

module.exports = { moderateFeedback };
