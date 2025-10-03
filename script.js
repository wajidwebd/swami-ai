 const promptForm = document.querySelector(".prompt-form");
    const promptInput = document.querySelector(".prompt-input");
    const chatsContainer = document.getElementById("chat-box");
    const fileInput = document.getElementById("file-input");
    const filePreview = document.getElementById("file-preview");
    const cancelFileBtn = document.getElementById("cancel-file-btn");
    const addFileBtn = document.getElementById("add-file-btn");
    const fileUploadWrapper = document.getElementById("file-upload-wrapper");

  const API_KEY = 'AIzaSyCui-ux9WhUMLcL8VgAIRoMXB5pJ2nfe6Y';
  const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${API_KEY}`;

    let chatHistory = [];
    let userFile = null;
    let controller;
    let typingInterval;

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

    const scrollToBottom = () => {
      chatsContainer.scrollTop = chatsContainer.scrollHeight;
    };

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

    const generateResponse = async (userText, botWrapper) => {
      controller = new AbortController();
      const parts = [{ text: userText }];
      if (userFile?.data) {
        parts.push({ inline_data: { mime_type: userFile.mime_type, data: userFile.data } });
      }
      chatHistory.push({ role: "user", parts });

      try {
        const res = await fetch(API_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ contents: chatHistory }),
          signal: controller.signal,
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error.message);
        const botText = data?.candidates?.[0]?.content?.parts?.[0]?.text || "No response.";
        chatHistory.push({ role: "model", parts: [{ text: botText }] });
        typingEffect(botText, botWrapper);
      } catch (err) {
        const message = botWrapper.querySelector(".message-text");
        message.textContent = "Error: " + err.message;
        message.classList.add("error-text");
      }
    };

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
      fileUploadWrapper.classList.remove("active");
      filePreview.src = "";
      userFile = null;
    };

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

    addFileBtn.onclick = () => fileInput.click();
    cancelFileBtn.onclick = () => {
      filePreview.src = "";
      userFile = null;
      fileUploadWrapper.classList.remove("active");
      cancelFileBtn.style.display = "none";
    };

    document.getElementById("stop-response-btn").onclick = () => {
      controller?.abort();
      clearInterval(typingInterval);

    };

