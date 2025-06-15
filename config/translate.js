// Google Translate API Configuration
require('dotenv').config(); // Load environment variables from .env file

// Get API key and URL from environment variables
const GOOGLE_TRANSLATE_API_KEY = process.env.GOOGLE_TRANSLATE_API_KEY;
const GOOGLE_TRANSLATE_API_URL = 'https://translation.googleapis.com/language/translate/v2';

// Validate required environment variables
if (!GOOGLE_TRANSLATE_API_KEY) {
    console.error('Error: GOOGLE_TRANSLATE_API_KEY is not set in environment variables');
    process.exit(1);
}

module.exports = {
    GOOGLE_TRANSLATE_API_KEY,
    GOOGLE_TRANSLATE_API_URL
}; 