"use strict";

const controller = {};
const indexController = require("./indexController");
const models = require("../models");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { log } = require("console");
const ffmpegPath = require("ffmpeg-static");
const ffmpeg = require("fluent-ffmpeg");
ffmpeg.setFfmpegPath(ffmpegPath);

const googleClient = require("../index").default; // Import the Google Speech-to-Text client

const uploadsDir = path.join(__dirname, "uploads");
// Ensure the uploads directory exists
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const convertWebmToFlac = async function (inputWebmPath, outputFlacPath) {
  return new Promise((resolve, reject) => {
    ffmpeg(inputWebmPath)
      .audioCodec("flac") // Use FLAC for high quality, or 'libmp3lame' for MP3
      .audioChannels(1) // Mono is generally preferred for STT
      .audioFrequency(16000) // Optimal sample rate for speech
      .save(outputFlacPath)
      .on("end", () => {
        console.log(`Audio converted to ${outputFlacPath}`);
        resolve(outputFlacPath);
      })
      .on("error", (err) => {
        console.error(`Error converting audio: ${err.message}`);
        reject(err);
      });
  });
};

// --- Multer for file uploads ---
// Configure storage for audio files
const audioStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir); // Store files in the 'uploads' directory
  },
  filename: function (req, file, cb) {
    // Generate a unique filename
    cb(null, file.fieldname + "-" + Date.now() + path.extname(file.originalname));
  },
});
const uploadAudio = multer({ storage: audioStorage });

controller.recordAudio = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No audio file uploaded." });
  }

  const webmFilePath = req.file.path; // This is the path to the original .webm file
  const audioFileName = `converted_audio_${Date.now()}.flac`; // New name for the converted file
  const convertedAudioPath = path.join(__dirname, "uploads", audioFileName); // Save converted file

  let transcription = "";
  try {
    // Step 2: Convert .webm to FLAC
    await convertWebmToFlac(webmFilePath, convertedAudioPath);

    // Step 3: Transcribe the converted audio
    const audioBytes = fs.readFileSync(convertedAudioPath).toString("base64");

    const config = {
      encoding: "FLAC", // Match the converted format
      sampleRateHertz: 16000,
      languageCode: "en-US", // Adjust language as needed (e.g., 'vi-VN' for Vietnamese)
      alternativeLanguageCodes: ["vi-VN"],
      enableAutomaticPunctuation: true, // Recommended for better readability
      // enableSpeakerDiarization: true, // Uncomment if you need to identify speakers
      // diarizationSpeakerCount: 2, // If using diarization, specify max speakers
    };

    const audio = {
      content: audioBytes,
    };

    const request = {
      config: config,
      audio: audio,
    };

    console.log("Sending audio to Google Speech-to-Text...");
    const [response] = await googleClient.recognize(request);
    transcription = response.results.map((result) => result.alternatives[0].transcript).join("\n");

    console.log("Transcription:", transcription);

    // Continue with the original logic to send audio URL via Socket.IO
    const audioUrl = `/uploads/${req.file.filename}`; // URL for the original .webm
    res.json({
      message: "Audio uploaded and transcribed successfully!",
      audioUrl: audioUrl,
      transcription: transcription, // Send transcription back to client
    });

    // --- Important: Clean up temporary files ---
    fs.unlinkSync(webmFilePath); // Remove the original .webm file
    fs.unlinkSync(convertedAudioPath); // Remove the converted .flac file
  } catch (error) {
    console.error("Error during audio processing or transcription:", error);
    // Clean up files even if transcription fails
    if (fs.existsSync(webmFilePath)) fs.unlinkSync(webmFilePath);
    if (fs.existsSync(convertedAudioPath)) fs.unlinkSync(convertedAudioPath);

    res.status(500).json({ error: "Failed to process audio or transcribe." });
  }
};

// Export the multer middleware for use in routes
controller.uploadAudio = uploadAudio.single("audio");

module.exports = controller;
