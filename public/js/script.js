const chatMessages = document.getElementById("chat-messages");
const userInput = document.getElementById("user-input");
const sendBtn = document.getElementById("send-btn");
const micBtn = document.getElementById("mic-btn");
const newChatBtn = document.getElementById("new-chat-btn");
const chatHistoryList = document.getElementById("chat-history-list");
const welcomeMessage = document.getElementById("welcome-message");
const suggestions = document.getElementById("suggestions");
const chatContent = document.getElementById("chat-content");
const attachBtn = document.getElementById("attach-btn");
const toggleSidebarBtn = document.getElementById("toggle-sidebar-btn");
const sidebar = document.getElementById("sidebar");
const suggestionsFixed = document.getElementById("suggestions-fixed");
const userId = document.getElementById("userId") && document.getElementById("userId").innerText ? document.getElementById("userId").innerText : 0;

const GUEST_MESSEGE_LIMIT = 15; // Giới hạn số lượng tin nhắn cho khách
const GUEST_CONVERSATION_LIMIT = 3; // Giới hạn số lượng cuộc trò chuyện cho khách

let recognition = null;
let conversations = JSON.parse(localStorage.getItem("conversations") || "{}");
let currentChatId = null;
let lastBotSuggestions = null;

let mediaRecorder;
let audioChunks = [];
let recordingStartTime;
let recordingTimerInterval;
let isRecording = false;
let isCancelled = false;

// Danh sách gợi ý mẫu (có thể mở rộng hoặc sinh động hơn)
const SUGGESTION_LIST = [
  ["Can you explain more details?", "Give me an example.", "What are the pros and cons?", "How does it compare to alternatives?"],
  ["Summarize the main points.", "What should I pay attention to?", "Can you provide a step-by-step guide?", "What are common mistakes?"],
  ["How can I apply this in real life?", "What are the next steps?", "Can you suggest further reading?", "What is the latest update on this topic?"],
];

const DEFAULT_SUGGESTIONS = ["What can you do?", "Give me some learning tips.", "How to improve my English speaking?", "Tell me a fun fact!", "What is AI?"];

function generateId() {
  return "chat_" + Date.now();
}

function saveConversations() {
  localStorage.setItem("conversations", JSON.stringify(conversations));
}

function renderChatHistory() {
  if (!chatHistoryList) {
    return;
  }

  if (userId !== 0) {
    return; // Không hiển thị lịch sử trò chuyện cho khách
  }

  chatHistoryList.innerHTML = "";
  Object.entries(conversations).forEach(([id, conv]) => {
    const li = document.createElement("li");
    li.className = "list-group-item d-flex align-items-center justify-content-between" + (id === currentChatId ? " active" : "");
    const titleSpan = document.createElement("span");
    titleSpan.className = "flex-grow-1";
    titleSpan.textContent = conv.title || "Cuộc trò chuyện " + id.slice(-4);
    titleSpan.onclick = () => selectConversation(id);
    // Nút xóa
    const delBtn = document.createElement("button");
    delBtn.className = "delete-btn";
    delBtn.title = "Xóa cuộc trò chuyện";
    delBtn.innerHTML = '<i class="fa fa-trash"></i>';
    delBtn.onclick = (e) => {
      e.stopPropagation();
      if (confirm("Bạn có chắc muốn xóa cuộc trò chuyện này?")) {
        delete conversations[id];
        if (currentChatId === id) {
          // Nếu đang xem cuộc trò chuyện này thì chuyển sang cuộc khác
          const keys = Object.keys(conversations);
          currentChatId = keys.length > 0 ? keys[0] : null;
        }
        saveConversations();
        renderChatHistory();
        renderMessages();
      }
    };
    li.appendChild(titleSpan);
    li.appendChild(delBtn);
    chatHistoryList.appendChild(li);
  });
}

function selectConversation(id) {
  currentChatId = id;
  renderChatHistory();
  renderMessages();
}

function renderMessages() {
  if (!chatMessages) {
    return;
  }

  if (userId !== 0) {
    return; // Không hiển thị lịch sử trò chuyện cho khách
  }
  chatMessages.innerHTML = "";
  if (!currentChatId || !conversations[currentChatId]) {
    showWelcome(true);
    return;
  }
  const msgs = conversations[currentChatId].messages;
  if (!msgs || msgs.length === 0) {
    showWelcome(true);
    return;
  }
  showWelcome(false);
  msgs.forEach((msg) => {
    addMessage(msg.text, msg.sender, false);
  });
}

function showWelcome(show) {
  if (show) {
    welcomeMessage.classList.remove("d-none");
    chatMessages.classList.add("d-none");
  } else {
    welcomeMessage.classList.add("d-none");
    chatMessages.classList.remove("d-none");
  }
}

function startNewChat() {
  if (userId === 0) {
    if (Object.keys(conversations).length >= GUEST_CONVERSATION_LIMIT) {
      alert("Bạn chỉ có thể lưu tối đa 5 cuộc trò chuyện. Vui lòng xóa một cuộc trò chuyện trước khi tạo mới.");
      return;
    }
    const id = generateId();
    conversations[id] = { title: "Cuộc trò chuyện mới", messages: [] };
    currentChatId = id;
    saveConversations();
    renderChatHistory();
    renderMessages();
  }
}

if (Object.keys(conversations).length === 0) {
  startNewChat();
} else {
  currentChatId = Object.keys(conversations)[0];
  renderChatHistory();
  renderMessages();
}

let isListening = false; // Flag to track recognition state

if (micBtn) {
  micBtn.addEventListener("click", async () => {
    if (userId === 0 && conversations[currentChatId].messages.length > GUEST_MESSEGE_LIMIT) {
      alert("Bạn đã gửi quá nhiều tin nhắn. Vui lòng bắt đầu cuộc trò chuyện mới.");
      return;
    }
    if (!isListening) {
      isListening = true;
      micBtn.classList.add("active");
      startRecording();
      console.log("Speech recognition started for both languages.");
    } else {
      await stopRecording(false);
      isListening = false;
      micBtn.classList.remove("active");
      console.log("Speech recognition stopped.");
    }
  });
}

if (sendBtn) {
  sendBtn.addEventListener("click", () => {
    if (userId === 0 && conversations[currentChatId].messages.length > GUEST_MESSEGE_LIMIT) {
      alert("Bạn đã gửi quá nhiều tin nhắn. Vui lòng bắt đầu cuộc trò chuyện mới.");
      return;
    }
    sendMessage();
  });
}

if (userInput) {
  userInput.addEventListener("keypress", async (e) => {
    if (e.key === "Enter") {
      sendMessage();
    }
  });
}

if (newChatBtn) {
  newChatBtn.addEventListener("click", startNewChat);
}

// Suggestion click
if (suggestions) {
  suggestions.querySelectorAll(".btn-suggestion").forEach((btn) => {
    btn.addEventListener("click", () => {
      userInput.value = btn.textContent;
      sendMessage();
    });
  });
}

function formatBotMessage(text) {
  // 1. Tách các dòng theo \n hoặc dấu chấm + khoảng trắng
  let lines = text.split(/\n|(?<=\.)\s+/);
  lines = lines.map((line) => line.trim()).filter((line) => line.length > 0);

  // 2. Xử lý từng dòng
  lines = lines.map((line) => {
    // In đậm tiêu đề: dòng bắt đầu bằng số, dấu gạch đầu dòng, hoặc có dấu hai chấm
    if (/^(\d+\.|\-|\*)\s/.test(line)) {
      // Gạch đầu dòng
      line = `<span class="bullet">${line.replace(/^(\d+\.|\-|\*)\s/, "")}</span>`;
    } else if (/^([A-Z][^:]{2,20}:)/.test(line)) {
      // Tiêu đề kiểu Note:, Lưu ý:, Important:
      line = `<span class="title">${line}</span>`;
    } else if (/^([A-Z][^:]{2,20}:)/i.test(line)) {
      // Tiêu đề kiểu Note:, Lưu ý:, Important:
      line = `<span class="title">${line}</span>`;
    }
    // In đậm các cụm từ giữa **...** hoặc __...__
    line = line.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
    line = line.replace(/__(.+?)__/g, "<strong>$1</strong>");
    // In nghiêng các cụm từ giữa *...* hoặc _..._
    line = line.replace(/\*(?!\*)([^*]+)\*/g, "<em>$1</em>");
    line = line.replace(/_(?!_)([^_]+)_/g, "<em>$1</em>");
    // In đậm các từ như Important, Lưu ý, Note
    line = line.replace(/\b(Important|Lưu ý|Note)\b:/gi, "<strong>$1:</strong>");
    return line;
  });
  // 3. Ghép lại, mỗi dòng là 1 <div>
  return lines.map((l) => `<div>${l}</div>`).join("");
}

function getRandomSuggestions() {
  // Lấy ngẫu nhiên 1 nhóm suggestion
  const group = SUGGESTION_LIST[Math.floor(Math.random() * SUGGESTION_LIST.length)];
  // Lấy 2-3 suggestion ngẫu nhiên trong nhóm
  return group.sort(() => 0.5 - Math.random()).slice(0, 3);
}

async function renderFixedSuggestions(suggestions) {
  if (!suggestionsFixed) return;
  suggestionsFixed.innerHTML = "";
  if (!suggestions || !suggestions.length) {
    suggestionsFixed.style.display = "none";
    return;
  }
  suggestionsFixed.style.display = "flex";
  suggestions.forEach((sug) => {
    const btn = document.createElement("button");
    btn.className = "suggestion-btn";
    btn.textContent = sug;
    btn.onclick = () => {
      userInput.value = sug;
      sendMessage();
    };
    suggestionsFixed.appendChild(btn);
  });
  // Thêm hiệu ứng rung nhẹ khi suggestions mới xuất hiện
  suggestionsFixed.classList.remove("shake-anim");
  void suggestionsFixed.offsetWidth; // force reflow
  suggestionsFixed.classList.add("shake-anim");
}

// Không hiển thị gợi ý mặc định khi load trang nữa
renderFixedSuggestions([]);

function addMessage(message, sender, save = false, typing = false, suggestions = null) {
  const row = document.createElement("div");
  row.className = "message-row " + sender;

  // Avatar/icon
  const avatar = document.createElement("div");
  avatar.className = "message-avatar";
  if (sender === "user") {
    avatar.innerHTML = '<i class="fa fa-user"></i>';
  } else {
    avatar.innerHTML = '<i class="fa fa-robot"></i>';
  }

  // Message bubble
  const messageElement = document.createElement("div");
  messageElement.className = "message " + sender;

  if (sender === "bot") {
    // Định dạng nội dung bot
    if (typing) {
      let i = 0;
      const formatted = formatBotMessage(message);
      function typeChar() {
        let html = formatted.slice(0, i);
        messageElement.innerHTML = html;
        i++;
        if (i <= formatted.length) {
          setTimeout(typeChar, 8 + Math.random() * 18);
        } else {
          // Hiển thị lại suggestions liên quan khi typing xong

          if (suggestions && suggestions.length) {
            console.log("Suggestions for rendering:", suggestions);
            renderFixedSuggestions(suggestions);
          } else {
            renderFixedSuggestions([]);
          }
        }
      }
      typeChar();
    } else {
      messageElement.innerHTML = formatBotMessage(message);
      if (suggestions && suggestions.length) {
        renderFixedSuggestions(suggestions);
      } else {
        renderFixedSuggestions([]);
      }
    }
  } else {
    messageElement.textContent = message;
  }

  if (sender === "user") {
    row.appendChild(messageElement);
    row.appendChild(avatar);
  } else {
    row.appendChild(avatar);
    row.appendChild(messageElement);
  }
  chatMessages.appendChild(row);
  chatMessages.scrollTop = chatMessages.scrollHeight;

  if (save && currentChatId) {
    conversations[currentChatId].messages.push({ text: message, sender });
    if (sender === "user" && conversations[currentChatId].messages.length === 1) {
      conversations[currentChatId].title = message.slice(0, 30) + (message.length > 30 ? "..." : "");
      renderChatHistory();
    }
    saveConversations();
  }
  showWelcome(false);
}

function addThinkingMessage() {
  if (suggestionsFixed) suggestionsFixed.style.display = "none"; // Ẩn gợi ý khi bot đang trả lời
  const row = document.createElement("div");
  row.className = "message-row bot thinking-row";
  const avatar = document.createElement("div");
  avatar.className = "message-avatar";
  avatar.innerHTML = '<i class="fa fa-robot"></i>';
  const messageElement = document.createElement("div");
  messageElement.className = "message bot";
  messageElement.innerHTML = 'Hmm <span class="thinking-dots"><span>.</span><span>.</span><span>.</span></span>';
  row.appendChild(avatar);
  row.appendChild(messageElement);
  chatMessages.appendChild(row);
  chatMessages.scrollTop = chatMessages.scrollHeight;
  return { row, messageElement };
}

async function sendMessage() {
  const message = userInput.value.trim();
  const url = userId !== 0 ? `/chat` : "/chat-guest"; // Dùng endpoint khác cho khách

  console.log("Sending message...", message);
  if (message && currentChatId) {
    addMessage(message, "user", true);
    userInput.value = "";
    // Thêm hiệu ứng suy nghĩ
    const thinking = addThinkingMessage();
    const suggestionPrompt = `Dựa trên nội dung sau, hãy gợi ý đúng 3 câu hỏi tiếp theo mà người dùng có thể hỏi để tiếp tục cuộc trò chuyện. 
Chỉ trả lời bằng một mảng JSON, không thêm bất kỳ giải thích nào, ví dụ: ["Câu hỏi 1", "Câu hỏi 2", "Câu hỏi 3"].
Nội dung: "${message}"`;
    await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ message }),
    })
      .then((response) => response.json())
      .then((data) => {
        console.log("OpenAI trả về:", data.reply);
        console.log("Suggestions parse được:", data.suggestions);
        // Thay thế nội dung message bot "suy nghĩ" bằng câu trả lời thật
        if (thinking && thinking.row && thinking.messageElement) {
          // Xóa row cũ và thêm message mới để giữ hiệu ứng typing
          thinking.row.remove();
          addMessage(data.reply, "bot", true, true, data.suggestions);
        } else {
          addMessage(data.reply, "bot", true, true, data.suggestions);
        }
        speak(data.reply);
      })
      .catch((error) => {
        console.error("Error:", error);
        if (thinking && thinking.row) thinking.row.remove();
        addMessage("Sorry, there was an error processing your request.", "bot", true);
      });
  }
}

function cleanTextForSpeech(text) {
  // Loại bỏ markdown, hashtag, emoji, ký hiệu đặc biệt
  return text
    .replace(/[#*_`~\[\]{}|>\-=]/g, "") // markdown ký hiệu
    .replace(/https?:\/\/\S+/g, "") // link
    .replace(/:[^\s:]+:/g, "") // emoji dạng :smile:
    .replace(/[\u{1F600}-\u{1F6FF}]/gu, "") // emoji unicode
    .replace(/\s{2,}/g, " ") // nhiều khoảng trắng
    .trim();
}

function speak(text) {
  const clean = cleanTextForSpeech(text);
  const utterance = new SpeechSynthesisUtterance(clean);
  window.speechSynthesis.speak(utterance);
}

// Đính kèm: chỉ demo, chưa xử lý file
if (attachBtn) {
  attachBtn.addEventListener("click", () => {
    alert("Tính năng đính kèm chưa được hỗ trợ!");
  });
}

if (toggleSidebarBtn && sidebar) {
  toggleSidebarBtn.addEventListener("click", () => {
    sidebar.classList.toggle("collapsed");
    // Đổi icon mũi tên
    const icon = toggleSidebarBtn.querySelector("i");
    if (sidebar.classList.contains("collapsed")) {
      icon.classList.remove("fa-angle-left");
      icon.classList.add("fa-angle-right");
    } else {
      icon.classList.remove("fa-angle-right");
      icon.classList.add("fa-angle-left");
    }
  });
}

// Function to start recording
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

async function startRecording() {
  const stream = await getMicrophoneAccess();
  if (!stream) return;

  isRecording = true;
  isCancelled = false;
  audioChunks = [];
  mediaRecorder = new MediaRecorder(stream);

  mediaRecorder.ondataavailable = async (event) => {
    audioChunks.push(event.data);
  };

  mediaRecorder.onstop = async () => {
    if (!isCancelled && audioChunks.length > 0) {
      const audioBlob = new Blob(audioChunks, { type: "audio/webm" });
      await uploadAudio(audioBlob);
    } else {
      console.log("Recording cancelled.");
    }
    // Stop all tracks to release microphone
    stream.getTracks().forEach((track) => track.stop());
    // resetRecordButtonState();
  };

  mediaRecorder.start();
  // recordingStartTime = Date.now();
  // updateRecordTimer();
  // recordingTimerInterval = setInterval(updateRecordTimer, 1000);
}

// Function to stop recording (and potentially upload)
async function stopRecording(wasCancelledByButton) {
  if (isRecording) {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    isCancelled = wasCancelledByButton; // Set cancellation flag
    mediaRecorder.stop();
    // clearInterval(recordingTimerInterval);
    isRecording = false;
  }
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

    const data = await response.json(); // Parse JSON response

    if (data && data.transcription) {
      const message = {
        type: "text",
        content: data.transcription,
        userId: userId,
        conversationId: "",
        role: "user",
      };
      console.log("Audio uploaded successfully:", message, data.transcription);
      userInput.value = data.transcription;
      sendMessage(); // Send transcription as a text message
    } else {
      console.error("Audio upload failed:", data.error || "Unknown error");
      alert("You speak too fast. Please try again.");
    }
  } catch (error) {
    console.error("Network error during audio upload:", error);
    alert("Network error. Could not upload audio.");
  }
}
