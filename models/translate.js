"use strict";

// Import các thư viện cần thiết
const axios = require('axios');
const { GOOGLE_TRANSLATE_API_KEY, GOOGLE_TRANSLATE_API_URL } = require('../config/translate');

module.exports = (sequelize, DataTypes) => {
  /**
   * Model Translate - Quản lý các bản dịch và từ vựng
   * @class Translate
   * @extends Model
   */
  const Translate = sequelize.define('Translate', {
    // Từ/Cụm từ gốc cần dịch
    sourceText: {
      type: DataTypes.TEXT,
      allowNull: false,
      validate: {
        notEmpty: true // Không cho phép chuỗi rỗng
      }
    },
    // Ngôn ngữ gốc của văn bản
    sourceLanguage: {
      type: DataTypes.STRING(10),
      allowNull: false,
      validate: {
        notEmpty: true,
        // Chỉ cho phép các ngôn ngữ được hỗ trợ
        isIn: [['en', 'vi', 'fr', 'de', 'ja', 'ko', 'zh']]
      }
    },
    // Ngôn ngữ đích muốn dịch sang
    targetLanguage: {
      type: DataTypes.STRING(10),
      allowNull: false,
      validate: {
        notEmpty: true,
        // Chỉ cho phép các ngôn ngữ được hỗ trợ
        isIn: [['en', 'vi', 'fr', 'de', 'ja', 'ko', 'zh']]
      }
    },
    // Kết quả dịch
    translatedText: {
      type: DataTypes.TEXT,
      allowNull: false,
      validate: {
        notEmpty: true
      }
    },
    // Số lần bản dịch được sử dụng
    usageCount: {
      type: DataTypes.INTEGER,
      defaultValue: 1 // Mặc định là 1 lần
    },
    // ID người dùng (nếu đã đăng nhập)
    userId: {
      type: DataTypes.INTEGER,
      allowNull: true, // Cho phép null vì có thể là người dùng chưa đăng nhập
      references: {
        model: 'user', // Liên kết với bảng user
        key: 'id'
      }
    }
  }, {
    // Các options cho model
    timestamps: true, // Tự động thêm createdAt và updatedAt
    indexes: [
      // Index cho tìm kiếm nhanh theo văn bản và ngôn ngữ
      {
        fields: ['sourceText', 'sourceLanguage', 'targetLanguage']
      },
      // Index cho tìm kiếm lịch sử theo userId
      {
        fields: ['userId']
      }
    ]
  });

  /**
   * Định nghĩa các mối quan hệ với các model khác
   * @param {Object} models - Các model đã được định nghĩa
   */
  Translate.associate = function(models) {
    // Mỗi bản dịch thuộc về một user
    Translate.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'user'
    });
  };

  /**
   * Tăng số lần sử dụng của bản dịch
   * @returns {Promise<Translate>} Bản dịch sau khi cập nhật
   */
  Translate.prototype.incrementUsage = async function() {
    this.usageCount += 1;
    return this.save();
  };

  /**
   * Lấy định nghĩa của từ từ API từ điển - sử dụng từ điển thì lấy phiên âm - từ loại các thứ
   * @returns {Promise<Object|null>} Định nghĩa của từ hoặc null nếu có lỗi
   */
  Translate.prototype.getWordDefinition = async function() {
    try {
      const response = await axios.get(`https://api.dictionaryapi.dev/api/v2/entries/en/${this.sourceText}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching word definition:', error);
      return null;
    }
  };

  /**
   * Dịch văn bản sử dụng Google Translate API
   * @param {string} sourceText - Văn bản cần dịch
   * @param {string} sourceLanguage - Ngôn ngữ gốc
   * @param {string} targetLanguage - Ngôn ngữ đích
   * @returns {Promise<Translate>} Bản dịch đã lưu
   * @throws {Error} Nếu dịch thất bại
   */
  Translate.translate = async function(sourceText, sourceLanguage, targetLanguage) {
    try {
      // Xử lý văn bản đầu vào
      const processedText = Translate.preprocessText(sourceText);

      // Gọi API dịch
      const response = await axios.post(
        GOOGLE_TRANSLATE_API_URL,
        {
          q: processedText,
          target: targetLanguage,
          source: sourceLanguage,
          format: 'text'
        },
        {
          params: {
            key: GOOGLE_TRANSLATE_API_KEY
          }
        }
      );

      // Lưu bản dịch vào database
      const translation = await Translate.create({
        sourceText: processedText,
        sourceLanguage,
        targetLanguage,
        translatedText: response.data.data.translations[0].translatedText
      });

      return translation;
    } catch (error) {
      console.error('Translation error:', error);
      throw new Error('Translation failed');
    }
  };

  /**
   * Xử lý văn bản đầu vào
   * @param {string} text - Văn bản cần xử lý
   * @returns {string} Văn bản đã được xử lý
   */
  Translate.preprocessText = function(text) {
    return text
      .trim() // Loại bỏ khoảng trắng thừa
      .toLowerCase() // Chuyển về chữ thường
      .replace(/\s+/g, ' '); // Thay thế nhiều khoảng trắng bằng một khoảng trắng
  };

  /**
   * Tách văn bản thành các từ riêng lẻ
   * @param {string} text - Văn bản cần tách
   * @returns {string[]} Mảng các từ đã được tách
   */
  Translate.tokenizeText = function(text) {
    return text
      .toLowerCase()
      .split(/\s+/)
      .filter(word => word.length > 0);
  };

  /**
   * Lấy danh sách các ngôn ngữ được hỗ trợ
   * @returns {Array<{code: string, name: string}>} Danh sách ngôn ngữ
   */
  Translate.getSupportedLanguages = function() {
    return [
      { code: 'en', name: 'English' },
      { code: 'vi', name: 'Vietnamese' },
      { code: 'fr', name: 'French' },
      { code: 'de', name: 'German' },
      { code: 'ja', name: 'Japanese' },
      { code: 'ko', name: 'Korean' },
      { code: 'zh', name: 'Chinese' }
    ];
  };

  /**
   * Thêm từ vào từ điển cá nhân
   * @param {number} userId - ID người dùng
   * @param {string} word - Từ cần thêm
   * @param {string} translation - Bản dịch
   * @param {string} definition - Định nghĩa
   * @returns {Promise<Vocabulary>} Từ vựng đã thêm
   * @throws {Error} Nếu thêm thất bại
   */
  Translate.addWordToVocabulary = async function(userId, word, translation, definition) {
    try {
      const vocabulary = await models.Vocabulary.create({
        userId,
        word,
        translation,
        definition,
        sourceLanguage: 'en', // Mặc định là tiếng Anh
        targetLanguage: 'vi'  // Mặc định là tiếng Việt
      });
      return vocabulary;
    } catch (error) {
      console.error('Error adding word to vocabulary:', error);
      throw new Error('Failed to add word to vocabulary');
    }
  };

  /**
   * Lấy danh sách từ vựng đã lưu của người dùng
   * @param {number} userId - ID người dùng
   * @returns {Promise<Vocabulary[]>} Danh sách từ vựng
   * @throws {Error} Nếu lấy thất bại
   */
  Translate.getSavedVocabulary = async function(userId) {
    try {
      return await models.Vocabulary.findAll({
        where: { userId },
        order: [['createdAt', 'DESC']]
      });
    } catch (error) {
      console.error('Error getting saved vocabulary:', error);
      throw new Error('Failed to get saved vocabulary');
    }
  };

  /**
   * Lấy lịch sử dịch của người dùng
   * @param {number} userId - ID người dùng
   * @param {number} limit - Số lượng bản dịch muốn lấy
   * @returns {Promise<Translate[]>} Danh sách bản dịch
   * @throws {Error} Nếu lấy thất bại
   */
  Translate.getTranslationHistory = async function(userId, limit = 10) {
    try {
      return await Translate.findAll({
        where: { userId },
        order: [['createdAt', 'DESC']],
        limit: parseInt(limit)
      });
    } catch (error) {
      console.error('Error getting translation history:', error);
      throw new Error('Failed to get translation history');
    }
  };

  /**
   * Xóa từ khỏi từ điển cá nhân
   * @param {number} userId - ID người dùng
   * @param {number} wordId - ID của từ cần xóa
   * @returns {Promise<boolean>} true nếu xóa thành công
   * @throws {Error} Nếu xóa thất bại
   */
  Translate.removeWordFromVocabulary = async function(userId, wordId) {
    try {
      const result = await models.Vocabulary.destroy({
        where: {
          id: wordId,
          userId
        }
      });
      return result > 0;
    } catch (error) {
      console.error('Error removing word from vocabulary:', error);
      throw new Error('Failed to remove word from vocabulary');
    }
  };

  /**
   * Tìm bản dịch theo văn bản và ngôn ngữ
   * @param {string} sourceText - Văn bản gốc
   * @param {string} sourceLang - Ngôn ngữ gốc
   * @param {string} targetLang - Ngôn ngữ đích
   * @returns {Promise<Translate|null>} Bản dịch tìm được hoặc null
   */
  Translate.findByTextAndLanguages = async function(sourceText, sourceLang, targetLang) {
    return this.findOne({
      where: {
        sourceText,
        sourceLanguage: sourceLang,
        targetLanguage: targetLang
      }
    });
  };

  return Translate;
}; 