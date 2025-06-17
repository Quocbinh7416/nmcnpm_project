const startButton = document.getElementById("startButton");
const stopButton = document.getElementById("stopButton");
const outputTranscript = document.getElementById("outputTranscript");
const aiResponseDiv = document.getElementById("aiResponse"); // New element for AI response
const aiLoadingSpinner = document.getElementById("aiLoading"); // New element for AI loading
const statusMessage = document.getElementById("statusMessage");
const compatibilityWarning = document.getElementById("compatibilityWarning");

// Check for Web Speech API compatibility
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

let voiceRecognition;
let finalTranscript = ""; // Stores the accumulated final transcription for a segment
let interimTranscript = ""; // Stores temporary transcription as user speaks
let isVoiceRecording = false;
let silenceTimer; // Timer for detecting silence
const SILENCE_THRESHOLD_MS = 2000; // 2 seconds

// Function to call the Gemini API for translation/response
async function callGeminiAPI(text) {
  if (!text || text.trim() === "") {
    console.log("No text to send to AI.");
    return;
  }

  aiLoadingSpinner.classList.remove("hidden"); // Show AI loading spinner
  aiResponseDiv.textContent = ""; // Clear previous AI response
  statusMessage.textContent = "Sending to AI...";

  try {
    const payload = { message: text };

    console.log(payload);

    const response = await fetch(`/chat-guest/test`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const result = await response.json();
    console.log(result);
    const aiText = result.reply;
    aiResponseDiv.textContent = aiText;

    // speak(result.reply);
  } catch (error) {
    console.error("Error during AI API call:", error);
    aiResponseDiv.textContent = "Error communicating with AI.";
  } finally {
    aiLoadingSpinner.classList.add("hidden"); // Hide AI loading spinner
    if (isVoiceRecording) {
      statusMessage.textContent = "Listening...";
    } else {
      statusMessage.textContent = "Recording stopped. Click 'Start Recording' to resume.";
    }
  }
}

// Initialize Speech Recognition
if (!SpeechRecognition) {
  compatibilityWarning.classList.remove("hidden");
  startButton.disabled = true;
  statusMessage.textContent = "Web Speech API not supported.";
} else {
  voiceRecognition = new SpeechRecognition();
  voiceRecognition.continuous = true; // Keep listening
  voiceRecognition.interimResults = true; // Show results while speaking
  voiceRecognition.lang = "en-US"; // Set default language

  // Event handler for speech results
  voiceRecognition.onresult = (event) => {
    // Clear any existing silence timer because new speech is detected
    clearTimeout(silenceTimer);

    interimTranscript = ""; // Reset interim for current segment
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const transcript = event.results[i][0].transcript;
      if (event.results[i].isFinal) {
        finalTranscript += transcript + " "; // Append final result
      } else {
        interimTranscript += transcript; // Keep interim separate
      }
    }
    // Display current combined transcript (final + interim)
    outputTranscript.value = finalTranscript + interimTranscript;
    outputTranscript.scrollTop = outputTranscript.scrollHeight; // Scroll to bottom

    // If a final result was just processed, start the silence timer
    // This logic ensures the timer only starts ticking *after* a complete thought.
    const lastResultIsFinal = event.results[event.results.length - 1].isFinal;
    if (lastResultIsFinal) {
      silenceTimer = setTimeout(() => {
        // Silence detected for threshold duration
        if (finalTranscript.trim() !== "") {
          // Ensure there's actual speech
          callGeminiAPI(finalTranscript.trim());
        }
        finalTranscript = ""; // Reset final transcript after sending
        outputTranscript.value = ""; // Clear output after processing a segment
        interimTranscript = "";
      }, SILENCE_THRESHOLD_MS);
    }
  };

  // Event handler for when the speech voiceRecognition service ends
  voiceRecognition.onend = () => {
    // Clear any pending silence timer if voiceRecognition ends prematurely
    clearTimeout(silenceTimer);

    if (isVoiceRecording) {
      // If voiceRecognition stopped but we intend to keep recording (continuous mode)
      statusMessage.textContent = "Listening stopped. Restarting...";
      startButton.classList.remove("pulse-animation");
      voiceRecognition.start(); // Automatically restart voiceRecognition
      statusMessage.textContent = "Listening...";
      startButton.classList.add("pulse-animation");
    } else {
      // If recording was explicitly stopped by user
      statusMessage.textContent = "Recording stopped. Click 'Start Recording' to resume.";
      startButton.disabled = false;
      startButton.classList.remove("pulse-animation");
      stopButton.disabled = true;

      // If there's any pending final transcript when stopped by user, send it
      if (finalTranscript.trim() !== "") {
        callGeminiAPI(finalTranscript.trim());
        finalTranscript = "";
        outputTranscript.value = "";
      }
    }
  };

  // Event handler for errors
  voiceRecognition.onerror = (event) => {
    console.error("Speech voiceRecognition error:", event.error);
    clearTimeout(silenceTimer); // Clear timer on error

    isVoiceRecording = false; // Set recording state to false on error
    startButton.disabled = false;
    stopButton.disabled = true;
    startButton.classList.remove("pulse-animation");

    if (event.error === "no-speech") {
      statusMessage.textContent = "No speech detected. Please speak clearly.";
    } else if (event.error === "not-allowed") {
      statusMessage.textContent = "Microphone access denied. Please allow access in browser settings.";
    } else if (event.error === "network") {
      statusMessage.textContent = "Network error occurred. Check your connection.";
    } else {
      statusMessage.textContent = `Error: ${event.error}. Click 'Start Recording' to retry.`;
    }
    // If there's any pending final transcript on error, send it
    if (finalTranscript.trim() !== "") {
      callGeminiAPI(finalTranscript.trim());
      finalTranscript = "";
      outputTranscript.value = "";
    }
  };

  // Start Button Event Listener
  startButton.addEventListener("click", () => {
    if (!isVoiceRecording) {
      finalTranscript = ""; // Clear all text on fresh start
      interimTranscript = "";
      outputTranscript.value = "";
      aiResponseDiv.textContent = "Waiting for your input..."; // Reset AI response
      aiLoadingSpinner.classList.add("hidden"); // Ensure loading is hidden

      voiceRecognition.start();
      isVoiceRecording = true;
      startButton.disabled = true;
      stopButton.disabled = false;
      statusMessage.textContent = "Listening...";
      startButton.classList.add("pulse-animation");
    }
  });

  // Stop Button Event Listener
  stopButton.addEventListener("click", () => {
    if (isVoiceRecording) {
      voiceRecognition.stop(); // This will trigger onend event
      isVoiceRecording = false; // Mark as not recording before onend fires
    }
  });
}
