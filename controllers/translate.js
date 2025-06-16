"use strict";

const controller = {};
const models = require("../models");
const axios = require("axios");

// Cấu hình API key cho Google Translate
const GOOGLE_TRANSLATE_API_KEY = process.env.GOOGLE_TRANSLATE_API_KEY;
const GOOGLE_TRANSLATE_API_URL = "https://translation.googleapis.com/language/translate/v2";

/**
 * Dịch văn bản sử dụng Google Translate API
 * @param {string} text - Văn bản cần dịch
 * @param {string} targetLang - Ngôn ngữ đích (ví dụ: 'vi', 'en')
 * @param {string} sourceLang - Ngôn ngữ nguồn (tùy chọn)
 * @returns {Promise<Object>} Kết quả dịch
 */
controller.translateText = async (req, res) => {
  try {
    const { text, targetLang, sourceLang } = req.body;

    if (!text || !targetLang) {
      return res.status(400).json({ error: "Missing required parameters" });
    }

    const response = await axios.post(
      GOOGLE_TRANSLATE_API_URL,
      {
        q: text,
        target: targetLang,
        source: sourceLang,
        format: "text"
      },
      {
        params: {
          key: GOOGLE_TRANSLATE_API_KEY
        }
      }
    );

    return res.json({
      success: true,
      translation: response.data.data.translations[0].translatedText,
      sourceLanguage: response.data.data.translations[0].detectedSourceLanguage
    });
  } catch (error) {
    console.error("Translation error:", error);
    return res.status(500).json({ error: "Translation failed" });
  }
};

/**
 * Lưu từ mới vào database
 * @param {string} originalText - Văn bản gốc
 * @param {string} translatedText - Văn bản đã dịch
 * @param {string} sourceLang - Ngôn ngữ nguồn
 * @param {string} targetLang - Ngôn ngữ đích
 * @param {number} userId - ID người dùng (nếu đã đăng nhập)
 */
controller.saveTranslation = async (req, res) => {
  try {
    const { originalText, translatedText, sourceLang, targetLang, userId } = req.body;

    // Kiểm tra xem bản dịch đã tồn tại chưa
    const existingTranslation = await models.Translation.findOne({
      where: {
        originalText,
        sourceLang,
        targetLang
      }
    });

    if (existingTranslation) {
      return res.json({
        success: true,
        message: "Translation already exists",
        translation: existingTranslation
      });
    }

    // Tạo bản dịch mới
    const newTranslation = await models.Translation.create({
      originalText,
      translatedText,
      sourceLang,
      targetLang,
      userId: userId || null,
      usageCount: 1
    });

    return res.json({
      success: true,
      message: "Translation saved successfully",
      translation: newTranslation
    });
  } catch (error) {
    console.error("Save translation error:", error);
    return res.status(500).json({ error: "Failed to save translation" });
  }
};

/**
 * Lấy lịch sử dịch của người dùng
 * @param {number} userId - ID người dùng
 * @param {number} limit - Số lượng bản dịch muốn lấy
 */
controller.getTranslationHistory = async (req, res) => {
  try {
    const { userId, limit = 10 } = req.query;

    const translations = await models.Translation.findAll({
      where: { userId },
      order: [["createdAt", "DESC"]],
      limit: parseInt(limit)
    });

    return res.json({
      success: true,
      translations
    });
  } catch (error) {
    console.error("Get translation history error:", error);
    return res.status(500).json({ error: "Failed to get translation history" });
  }
};

/**
 * Tăng số lần sử dụng của một bản dịch
 * @param {number} translationId - ID của bản dịch
 */
controller.incrementUsageCount = async (req, res) => {
  try {
    const { translationId } = req.params;

    const translation = await models.Translation.findByPk(translationId);
    if (!translation) {
      return res.status(404).json({ error: "Translation not found" });
    }

    await translation.increment("usageCount");

    return res.json({
      success: true,
      message: "Usage count incremented",
      translation
    });
  } catch (error) {
    console.error("Increment usage count error:", error);
    return res.status(500).json({ error: "Failed to increment usage count" });
  }
};

module.exports = controller; 