"use strict";

const express = require("express");
const router = express.Router();
const controller = require("../controllers/translateController");
const { body, getErrorMessage } = require("../controllers/validator");
const userController = require("../controllers/userController");

/**
 * Route dịch văn bản
 * POST /translate
 * Body: {
 *   text: string,          // Văn bản cần dịch
 *   sourceLang: string,    // Ngôn ngữ gốc (optional)
 *   targetLang: string     // Ngôn ngữ đích
 * }
 */
router.post(
  "/translate",
  body("text").trim().notEmpty().withMessage("Text to translate is required!"),
  body("targetLang").trim().notEmpty().withMessage("Target language is required!"),
  (req, res, next) => {
    const message = getErrorMessage(req);
    if (message) {
      return res.status(400).json({ error: message });
    }
    next();
  },
  controller.translateText
);

/**
 * Route lấy danh sách ngôn ngữ được hỗ trợ
 * GET /translate/languages
 */
router.get("/languages", controller.getSupportedLanguages);

/**
 * Route lấy định nghĩa của từ
 * GET /translate/definition
 * Query: {
 *   word: string,      // Từ cần tra
 *   language: string   // Ngôn ngữ (optional, default: en)
 * }
 */
router.get(
  "/definition",
  body("word").trim().notEmpty().withMessage("Word is required!"),
  (req, res, next) => {
    const message = getErrorMessage(req);
    if (message) {
      return res.status(400).json({ error: message });
    }
    next();
  },
  controller.getWordDefinition
);

/**
 * Route lưu từ vào từ điển cá nhân
 * POST /translate/vocabulary
 * Body: {
 *   word: string,          // Từ cần lưu
 *   translation: string,   // Bản dịch
 *   definition: string     // Định nghĩa (optional)
 * }
 */
router.post(
  "/vocabulary",
  userController.isLoggedIn, // Yêu cầu đăng nhập
  body("word").trim().notEmpty().withMessage("Word is required!"),
  body("translation").trim().notEmpty().withMessage("Translation is required!"),
  (req, res, next) => {
    const message = getErrorMessage(req);
    if (message) {
      return res.status(400).json({ error: message });
    }
    next();
  },
  controller.addWordToVocabulary
);

/**
 * Route lấy danh sách từ vựng đã lưu
 * GET /translate/vocabulary
 */
router.get(
  "/vocabulary",
  userController.isLoggedIn,
  controller.getSavedVocabulary
);

/**
 * Route xóa từ khỏi từ điển cá nhân
 * DELETE /translate/vocabulary/:wordId
 */
router.delete(
  "/vocabulary/:wordId",
  userController.isLoggedIn,
  controller.removeWordFromVocabulary
);

/**
 * Route lấy lịch sử dịch
 * GET /translate/history
 * Query: {
 *   limit: number  // Số lượng bản dịch muốn lấy (optional, default: 10)
 * }
 */
router.get(
  "/history",
  userController.isLoggedIn,
  controller.getTranslationHistory
);

/**
 * Route tăng số lần sử dụng của bản dịch
 * POST /translate/:translationId/increment
 */
router.post(
  "/:translationId/increment",
  controller.incrementUsageCount
);

module.exports = router; 