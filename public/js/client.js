const socket = io(); // Connect to Socket.IO server

const messagesDisplay = document.getElementById("messagesDisplay");
const textInput = document.getElementById("textInput");
const sendTextBtn = document.getElementById("sendTextBtn");
const recordBtn = document.getElementById("recordBtn");
const recordIcon = document.getElementById("recordIcon");
const recordText = document.getElementById("recordText");
const recordTimer = recordBtn.querySelector(".record-timer");
const cancelRecordBtn = document.getElementById("cancelRecordBtn");

let mediaRecorder;
let audioChunks = [];
let recordingStartTime;
let recordingTimerInterval;
let isRecording = false;
let isCancelled = false; // Flag to indicate if recording was explicitly cancelled

// --- Helper Functions ---
function appendMessage(message, type) {
  const messageBubble = document.createElement("div");
  messageBubble.classList.add("message-bubble", type);

  if (message.type === "text") {
    messageBubble.textContent = message.content;
  } else if (message.type === "audio") {
    const audioElement = document.createElement("audio");
    audioElement.controls = true;
    audioElement.src = message.content; // The URL to the audio file
    messageBubble.appendChild(audioElement);
  }
  messagesDisplay.appendChild(messageBubble);
  messagesDisplay.scrollTop = messagesDisplay.scrollHeight; // Scroll to bottom
}

function formatTime(seconds) {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes.toString().padStart(2, "0")}:${remainingSeconds.toString().padStart(2, "0")}`;
}

// --- Text Message Handling ---
sendTextBtn.addEventListener("click", () => {
  const text = textInput.value.trim();
  if (text) {
    const message = { type: "text", content: text };
    socket.emit("chat message", message);
    appendMessage(message, "sent"); // Display immediately as sent
    textInput.value = "";
  }
});

textInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter") {
    sendTextBtn.click();
  }
});

// --- Audio Recording (Tap to Record) ---

// Request microphone access
async function getMicrophoneAccess() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    return stream;
  } catch (err) {
    console.error("Error accessing microphone:", err);
    alert("Microphone access denied. Cannot record audio.");
    return null;
  }
}

// Function to start recording
async function startRecording() {
  const stream = await getMicrophoneAccess();
  if (!stream) return;

  isRecording = true;
  isCancelled = false;
  audioChunks = [];
  mediaRecorder = new MediaRecorder(stream);

  mediaRecorder.ondataavailable = (event) => {
    audioChunks.push(event.data);
  };

  mediaRecorder.onstop = () => {
    if (!isCancelled && audioChunks.length > 0) {
      const audioBlob = new Blob(audioChunks, { type: "audio/webm" });
      uploadAudio(audioBlob);
    } else {
      console.log("Recording cancelled.");
    }
    // Stop all tracks to release microphone
    stream.getTracks().forEach((track) => track.stop());
    resetRecordButtonState();
  };

  mediaRecorder.start();
  recordingStartTime = Date.now();

  // UI Updates for recording active
  recordBtn.classList.add("recording-active");
  recordIcon.style.display = "none"; // Hide microphone icon
  //   recordText.textContent = "Stop"; // Change text to "Stop"
  recordTimer.style.display = "inline"; // Show timer
  cancelRecordBtn.style.display = "inline-flex"; // Show cancel button

  updateRecordTimer();
  recordingTimerInterval = setInterval(updateRecordTimer, 1000);
}

// Function to stop recording (and potentially upload)
function stopRecording(wasCancelledByButton) {
  if (isRecording) {
    isCancelled = wasCancelledByButton; // Set cancellation flag
    mediaRecorder.stop();
    clearInterval(recordingTimerInterval);
    isRecording = false;
  }
}

// Event listener for the main record/stop button
recordBtn.addEventListener("click", () => {
  if (!isRecording) {
    startRecording();
  } else {
    stopRecording(false); // Not cancelled, so upload
  }
});

// Event listener for the new Cancel button
cancelRecordBtn.addEventListener("click", () => {
  stopRecording(true); // Cancelled by button
});

function updateRecordTimer() {
  const elapsedSeconds = Math.floor((Date.now() - recordingStartTime) / 1000);
  recordTimer.textContent = formatTime(elapsedSeconds);
}

function resetRecordButtonState() {
  recordBtn.classList.remove("recording-active");
  recordIcon.style.display = "inline"; // Show microphone icon
  //   recordText.textContent = "Record"; // Reset text to "Record"
  recordTimer.style.display = "none"; // Hide timer
  cancelRecordBtn.style.display = "none"; // Hide cancel button
}

// --- Audio Upload (Same as before) ---
async function uploadAudio(audioBlob) {
  const formData = new FormData();
  formData.append("audio", audioBlob, `audio_${Date.now()}.webm`);

  try {
    const response = await fetch("/upload-audio", {
      method: "POST",
      body: formData,
    });
    const data = await response.json();
    if (response.ok) {
      console.log("Audio uploaded successfully:", data.audioUrl);
      const message = { type: "audio", content: data.audioUrl };
      socket.emit("chat message", message); // Send audio URL via Socket.IO
      appendMessage(message, "sent"); // Display immediately as sent
    } else {
      console.error("Audio upload failed:", data.error);
      alert("Failed to upload audio.");
    }
  } catch (error) {
    console.error("Network error during audio upload:", error);
    alert("Network error. Could not upload audio.");
  }
}

// --- Socket.IO Message Handling (Same as before) ---
socket.on("chat message", (msg) => {
  console.log("Received message:", msg);
  appendMessage(msg, "received");
});

// Initial greeting from server (optional)
socket.on("connect", () => {
  console.log("Connected to chat server!");
});
