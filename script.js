const promptForm = document.querySelector(".prompt-form");
const promptInput = document.querySelector(".prompt-input");
const chatsContainer = document.getElementById("chat-box");
const fileInput = document.getElementById("file-input");
const filePreview = document.getElementById("file-preview");
const cancelFileBtn = document.getElementById("cancel-file-btn");
const addFileBtn = document.getElementById("add-file-btn");
const fileUploadWrapper = document.getElementById("file-upload-wrapper");

const API_KEY = 'AIzaSyC51SeqblsFjgDlur7zrPYM2cQ_uQmnhPk'; // Ensure this is your correct API key
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`;

let chatHistory = [];
let userFile = null;
let controller;
let typingInterval;

// Helper function to create message elements
const createMsgElement = (content, className) => {
  const wrapper = document.createElement("div");
  wrapper.className = `message-wrapper ${className}`;
  const message = document.createElement("p");
  message.className = "message-text";
  message.innerHTML = content;
  const deleteBtn = document.createElement("span");
  deleteBtn.className = "material-symbols-outlined delete-btn";
  deleteBtn.textContent = "delete";
  deleteBtn.onclick = () => {
    const index = Array.from(chatsContainer.children).indexOf(wrapper);
    if (index >= 0) {
      chatsContainer.removeChild(wrapper);
      const next = chatsContainer.children[index];
      if (next?.classList.contains("message-wrapper")) chatsContainer.removeChild(next);
      chatHistory.splice(index, 2);
    }
  };
  wrapper.appendChild(deleteBtn);
  wrapper.appendChild(message);
  return wrapper;
};

// Function to scroll the chat box to the bottom
const scrollToBottom = () => {
  chatsContainer.scrollTop = chatsContainer.scrollHeight;
};

// Typing effect for the bot's response
const typingEffect = (text, wrapper) => {
  const message = wrapper.querySelector(".message-text");
  message.textContent = "";
  const words = text.split(" ");
  let i = 0;
  typingInterval = setInterval(() => {
    if (i < words.length) {
      message.textContent += (i > 0 ? " " : "") + words[i++];
      scrollToBottom();
    } else clearInterval(typingInterval);
  }, 40);
};

// Function to generate the response from the API
const generateResponse = async (userText, botWrapper) => {
  controller = new AbortController();
  const parts = [{ text: userText }];
  if (userFile?.data) {
    parts.push({ inline_data: { mime_type: userFile.mime_type, data: userFile.data } });
  }
  chatHistory.push({ role: "user", parts });

  try {
    // Make the API request with proper error handling
    const res = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ contents: chatHistory }),
      signal: controller.signal,
    });

    // Log the full URL and response for debugging
    console.log("Request sent to API URL:", API_URL);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error.message);

    const botText = data?.candidates?.[0]?.content?.parts?.[0]?.text || "No response.";
    chatHistory.push({ role: "model", parts: [{ text: botText }] });
    typingEffect(botText, botWrapper);
  } catch (err) {
    console.error("API Error:", err.message); // Log the error message for debugging
    const message = botWrapper.querySelector(".message-text");
    message.textContent = "Error: " + err.message;
    message.classList.add("error-text");
  }
};

// Form submission to send user input and get bot response
promptForm.onsubmit = async (e) => {
  e.preventDefault();
  const msg = promptInput.value.trim();
  if (!msg) return;
  const userDiv = createMsgElement(msg, "user-message");
  const botDiv = createMsgElement("Just a sec...", "bot-message");
  chatsContainer.append(userDiv, botDiv);
  scrollToBottom();
  promptInput.value = "";
  await generateResponse(msg, botDiv);

  // Reset file preview after response
  fileUploadWrapper.classList.remove("active");
  filePreview.src = "";
  userFile = null;
};

// Handle file input change to preview and store file data
fileInput.onchange = () => {
  const file = fileInput.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    const base64 = e.target.result.split(",")[1];
    userFile = { data: base64, mime_type: file.type };
    filePreview.src = file.type.startsWith("image/") ? e.target.result : "https://cdn-icons-png.flaticon.com/512/337/337946.png";
    fileUploadWrapper.classList.add("active");
    cancelFileBtn.style.display = "inline";
  };
  reader.readAsDataURL(file);
};

// Trigger file input click when add file button is clicked
addFileBtn.onclick = () => fileInput.click();

// Cancel the file upload
cancelFileBtn.onclick = () => {
  filePreview.src = "";
  userFile = null;
  fileUploadWrapper.classList.remove("active");
  cancelFileBtn.style.display = "none";
};

// Stop the ongoing response generation
document.getElementById("stop-response-btn").onclick = () => {
  controller?.abort();
  clearInterval(typingInterval);
};
