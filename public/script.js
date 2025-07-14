const USERS = {
  "Nirup": "nila2234",
  "Sharmila": "nila2234"
};


let currentUser = localStorage.getItem("currentUser") || "";
let inactivityTimer;
let lastMessageDate = "";
let typingTimeout;
const chatWindow = document.getElementById("chatWindow");

window.addEventListener("DOMContentLoaded", () => {
  if (currentUser) {
    document.getElementById("loginPage").style.display = "none";
    document.getElementById("gallery").style.display = "none";
    document.getElementById("chatApp").style.display = "block";
    document.getElementById("messageInput").value = localStorage.getItem("draftMessage") || "";
    adjustTextarea(document.getElementById("messageInput"));
    const topLoader = document.getElementById("topLoader");
    topLoader.style.display = "block";
    listenForMessages(() => setTimeout(scrollToBottom, 300));
    listenToTyping();
    listenToPresence();
    setPresence(currentUser, true);
    startInactivityTimer();
    imguploadbtn();
  }
});

function goToGallery() {
  document.getElementById("chatApp").style.display = "none";
  document.getElementById("gallery").style.display = "block";
  loadGallery(); 
}


function goToChat() {
  document.getElementById("gallery").style.display = "none";
  document.getElementById("chatApp").style.display = "flex";
  const topLoader = document.getElementById("topLoader");
  topLoader.style.display = "block";
  listenForMessages(); // Re-attach listener // <- add this// Ensure listener re-attaches properly
}



function startInactivityTimer() {
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      inactivityTimer = setTimeout(() => {
        logout();
      }, 3 * 60 * 1000); // 3 minutes
    } else {
      clearTimeout(inactivityTimer);
      goToChat();
    }
  });
}

window.addEventListener("beforeunload", () => {
  localStorage.removeItem("currentUser");
  localStorage.removeItem("draftMessage");
  setPresence(currentUser, false);
});
//login
function login() {
  const user = document.getElementById("username").value;
  const pass = document.getElementById("password").value;
  //const user = "Nirup"
  //const pass = "nila2234"
  if (USERS[user] === pass) {
    currentUser = user;
    localStorage.setItem("currentUser", currentUser);
    document.getElementById("loginPage").style.display = "none";
    document.getElementById("gallery").style.display = "none"; // Show gallery
    document.getElementById("chatApp").style.display = "flex"; // Hide chat
    document.getElementById("messageInput").value = "";
    localStorage.removeItem("draftMessage");
    const topLoader = document.getElementById("topLoader");
    topLoader.style.display = "block";
    listenForMessages(() => setTimeout(scrollToBottom, 300));
    listenToTyping();
    scrollToBottom();
    listenToPresence();
    setPresence(currentUser, true);
    startInactivityTimer();
    imguploadbtn();
  } else {
    document.getElementById("loginError").innerText = "Invalid user Credentials";
  }
}


function logout() {
  const user = localStorage.getItem("currentUser"); // Save before clearing
  localStorage.removeItem("currentUser");
  localStorage.removeItem("draftMessage");
  setPresence(user, false); // Now this has a valid value
  location.reload();
}

window.addEventListener("beforeunload", () => {
  const user = localStorage.getItem("currentUser");
  if (user) {
    setPresence(user, false);
  }
});


function setPresence(user, isOnline) {
  const ref = db.ref(`presence/${user}`);
  if (isOnline) {
    ref.set({ online: true, lastSeen: Date.now() });
    ref.onDisconnect().set({ online: false, lastSeen: Date.now() });
  } else {
    ref.set({ online: false, lastSeen: Date.now() });
  }
}

function listenToPresence() {
  const otherUser = getOtherUser();
  const ref = db.ref(`presence/${otherUser}`);
  const status = document.getElementById("onlineStatus");

  ref.on("value", (snapshot) => {
    const data = snapshot.val();
    if (!data) {
      status.innerText = `${otherUser} is Offline`;
      status.style.color = "gray";
      return;
    }

    const isOnline = data.online;
    const lastSeen = data.lastSeen;

    if (isOnline) {
      status.innerText = `${otherUser} is Online`;
      status.style.color = "lightgreen";
    } else {
      const formatted = formatLastSeen(lastSeen);
      status.innerText = `last seen at ${formatted}`;
      status.style.color = "gray";
    }
  });
}

function sendMessage() {
  const msgText = document.getElementById("messageInput").value;
  const files = Array.from(document.getElementById("fileInput").files);
  const replyInfo = window.replyToMessage || null;
  if (files.length > 0) {
    files.forEach((file) => {
      const msgId = db.ref().child('messages').push().key;
      const ref = storage.ref('uploads/' + msgId + "_" + file.name);
      const uploadTask = ref.put(file);

      const progressWrapper = document.createElement("div");
      progressWrapper.className = "message you";
      progressWrapper.setAttribute("data-id", msgId);
      const fileLabel = document.createElement("div");
      fileLabel.innerText = `Uploading ${file.name}`;
      const progressBar = document.createElement("div");
      progressBar.className = "progress mt-1";
      const progressInner = document.createElement("div");
      progressInner.className = "progress-bar";
      progressInner.style.width = "0%";
      progressInner.innerText = "0%";
      progressBar.appendChild(progressInner);
      progressWrapper.appendChild(fileLabel);
      progressWrapper.appendChild(progressBar);
      document.getElementById("chatWindow").appendChild(progressWrapper);
      scrollToBottom();

      uploadTask.on('state_changed', snapshot => {
        const percent = ((snapshot.bytesTransferred / snapshot.totalBytes) * 100).toFixed(0);
        progressInner.style.width = percent + "%";
        progressInner.innerText = percent + "%";
      }, console.error, () => {
        ref.getDownloadURL().then(url => {
          db.ref('messages/' + msgId).set({
            sender: currentUser,
            fileURL: url,
            fileName: file.name,
            type: file.type,
            timestamp: Date.now()
          });
          progressWrapper.remove(); // Remove local-only preview
        });
      });
    });
  } 
  else if(msgText.trim()===USERS[currentUser]){
     goToGallery();
    }
    else if (msgText.trim()) {
    const msgId = db.ref().child('messages').push().key;
    db.ref('messages/' + msgId).set({
      sender: currentUser,
      text: msgText.trim(),
      timestamp: Date.now(),
      replyTo: replyInfo
    });
  }
 
  // Don't manually render the message, just reset input
  db.ref(`typing/${currentUser}`).remove();
  cancelReply();
  document.getElementById("messageInput").value = "";
  document.getElementById("fileInput").value = "";
  localStorage.removeItem("draftMessage");
  adjustTextarea(document.getElementById("messageInput"));
  document.getElementById("filePreview").style.display = "none";
  document.getElementById("filePreview").innerHTML = "";
  setTimeout(() => {
    document.getElementById("messageInput").focus();
  }, 100);
}


function cancelReply() {
  document.getElementById("replyPreview").style.display = "none";
  document.getElementById("replyText").innerText = "";
  window.replyToMessage = null;
}

function handleFileSelection() {
  const fileInput = document.getElementById("fileInput");
  const files = Array.from(fileInput.files);
  const preview = document.getElementById("filePreview");

  if (files.length > 0) {
    preview.innerHTML = files.map(file => `📎 ${file.name}`).join("<br>");
    preview.style.display = "block";
  } else {
    preview.innerHTML = "";
    preview.style.display = "none";
  }
}



document.getElementById("messageInput").addEventListener("input", () => {
  localStorage.setItem("draftMessage", document.getElementById("messageInput").value);
  sendTyping();
  adjustTextarea(document.getElementById("messageInput"));
});

function adjustTextarea(el) {
  el.style.height = 'auto';
  el.style.height = Math.min(el.scrollHeight, 130) + 'px';
}

let earliestTimestamp = Infinity;
const messageMap = {};
const batch_size = 25;
let lastKnownDate = "";
let isLoadingPrevious = false;
let isFirstLoad = true;
const topLoader = document.getElementById("topLoader");
topLoader.style.display = "block";
chatWindow.addEventListener("scroll", () => {
  if (chatWindow.scrollTop < 950 && !isLoadingPrevious) {
    isLoadingPrevious = true;
    topLoader.style.display = "block";

    const prevScrollHeight = chatWindow.scrollHeight;

    loadPreviousMessages(earliestTimestamp, () => {
      const newScrollHeight = chatWindow.scrollHeight;
      chatWindow.scrollTop = newScrollHeight - prevScrollHeight;
      isLoadingPrevious = false;
      topLoader.style.display = "none";
    });
  }
});

function loadInitialMessages(callback = () => {}) {
  chatWindow.innerHTML = "";
  const topLoader = document.getElementById("topLoader");
  topLoader.style.display = "block";
  const ref = db.ref("messages").orderByChild("timestamp").limitToLast(batch_size);
  ref.off();

  let count = 0;
  let lastDate = "";

  ref.on("child_added", snapshot => {
    const id = snapshot.key;
    const msg = snapshot.val();
    const dateStr = formatChatDate(msg.timestamp);

    if (msg.timestamp < earliestTimestamp) {
      earliestTimestamp = msg.timestamp;
      lastKnownDate = dateStr;
      lastDate = lastKnownDate;
    }

    if (dateStr !== lastDate && count > 0) {
      lastDate = dateStr;
      const separator = document.createElement("div");
      separator.className = "date-separator text-center my-2 text-muted";
      separator.innerText = dateStr;
      chatWindow.appendChild(separator);
    }

    const div = createMessageElement(msg, id);
    messageMap[id] = div;
    chatWindow.appendChild(div);

    if (msg.sender !== currentUser) {
      markAsSeen(id);
    }

    count++;
      scrollToBottom();

    callback();
  });

  ref.on("child_changed", snapshot => {
    const id = snapshot.key;
    const msg = snapshot.val();

    const oldDiv = messageMap[id];
    if (oldDiv) {
      const newDiv = createMessageElement(msg, id);
      chatWindow.replaceChild(newDiv, oldDiv);
      messageMap[id] = newDiv;
    }
  });

  isFirstLoad = false;
  topLoader.style.display = "none";
}

function listenForMessages(callback = () => {}) {
  loadInitialMessages(callback);
}

function loadPreviousMessages(earliestTimeStamp, callback = () => {}) {
  const ref = db
    .ref("messages")
    .orderByChild("timestamp")
    .endAt(earliestTimeStamp - 1)
    .limitToLast(batch_size);

  ref.once("value", snapshot => {
    const messages = [];
    let newEarliest = earliestTimestamp;

    snapshot.forEach(child => {
      const id = child.key;
      const msg = child.val();
      messages.push({ id, ...msg });

      if (msg.timestamp < newEarliest) {
        newEarliest = msg.timestamp;
      }
    });

    earliestTimestamp = newEarliest;

    let lastDate = lastKnownDate;
    let count = 0;

    messages.reverse().forEach(({ id, ...msg }) => {
      const dateStr = formatChatDate(msg.timestamp);
      count++;

      if (dateStr !== lastDate && count > 1) {
        const separator = document.createElement("div");
        separator.className = "date-separator text-center my-2 text-muted";
        separator.innerText = dateStr;
        chatWindow.insertBefore(separator, chatWindow.firstChild);
        lastDate = dateStr;
      }

      const div = createMessageElement(msg, id);
      chatWindow.insertBefore(div, chatWindow.firstChild);
      messageMap[id] = div;
    });

    lastKnownDate = lastDate;
    callback();
  });
}


function truncateWithEllipsis(str, maxLength) {
  if (str.length > maxLength) {
    return str.slice(0, maxLength) + "...";
  }
  return str;
}

function isOnlyEmoji(text) {
  const emojiRegex = /^(?:\s*(?:\p{Emoji}(?:\p{Emoji_Modifier}|[\uFE0F])*)\s*)+$/u;
  return emojiRegex.test(text.trim());
}

function escapeHTML(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

function linkify(text) {
  const urlRegex = /(\bhttps?:\/\/[^\s<]+)/gi;
  return escapeHTML(text).replace(urlRegex, (url) => {
    const cleanUrl = url.replace(/[\u200B-\u200D\uFEFF]/g, '');
    return `<a href="${cleanUrl}" target="_blank" rel="noopener noreferrer">${cleanUrl}</a>`;
  });
}


function createMessageElement(msg, id) {
  const div = document.createElement("div");
  div.className = `message ${msg.sender === currentUser ? 'you' : 'them'}`;
  div.setAttribute("data-id", id);

  if (msg.replyTo) {
  const replyDiv = document.createElement("div");
  replyDiv.className = "reply-preview";
  replyDiv.style.fontSize = "0.70 rem";
  replyDiv.style.padding = "4px 8px";
  if(msg.sender === currentUser){
  replyDiv.style.background = "#001c78";
  }
  else{
    replyDiv.style.background = "#550080";
  }
  replyDiv.style.borderLeft = "3px solid #aaa";
  replyDiv.style.marginBottom = "4px";
  replyDiv.style.borderRadius = "5px";
  replyDiv.style.cursor = "pointer";

  const replyRef = db.ref('messages/' + msg.replyTo);
  replyRef.once("value").then(snapshot => {
    const original = snapshot.val();
    if (original) {
      let previewContent = `${original.sender}: `;

      if (original.text) {
        previewContent += truncateWithEllipsis(original.text, 60);
      } else if (original.type?.startsWith("image/")) {
        previewContent += "Image";
      } else if (original.type?.startsWith("video/")) {
        previewContent += "Video";
      } else if (original.type?.startsWith("audio/")) {
        previewContent += "Audio";
      } else if (original.fileName) {
        previewContent += `📎 ${original.fileName}`;
      }

      replyDiv.innerText = previewContent;

      // Tap to scroll to original message
      replyDiv.onclick = () => {
        const target = document.querySelector(`[data-id="${msg.replyTo}"]`);
        if (target) {
          target.scrollIntoView({ behavior: 'smooth', block: 'center' });
          target.classList.add("highlight");
          setTimeout(() => target.classList.remove("highlight"), 2000);
        }
      };
    } else {
      replyDiv.innerText = "Message not found";
    }
  });

  div.appendChild(replyDiv);
}


if (msg.text) {
  const textP = document.createElement("p");
  textP.style.whiteSpace = "pre-wrap"; // preserves spaces and line breaks
  textP.innerHTML = linkify(msg.text);

  if (isOnlyEmoji(msg.text)) {
    div.classList.add("emoji-only");
  }

  div.appendChild(textP);
}

  if (msg.fileURL && msg.type?.startsWith("image/")) {
    const img = new Image();
    img.src = msg.fileURL;
    img.style.maxWidth = "250px";
    img.style.borderRadius = "10px";
    img.onclick = () => viewImage(msg.fileURL);
    div.appendChild(img);
  } else if (msg.fileURL && msg.type?.startsWith("audio/")) {
    const audio = document.createElement("audio");
    audio.controls = true;
    audio.src = msg.fileURL;
    div.appendChild(audio);
  } else if (msg.fileURL && msg.type?.startsWith("video/")) {
    const wrapper = document.createElement("div");
    wrapper.style.position = "relative";
    wrapper.style.display = "inline-block";
    
    const video = document.createElement("video");
    video.src = msg.fileURL;
    video.controls = true;
    video.style.maxWidth = "250px";
    video.style.borderRadius = "10px";
    video.style.background = "#000";
    wrapper.appendChild(video);

    div.appendChild(wrapper);
  } else if (msg.fileURL) {
    const link = document.createElement("a");
    link.href = msg.fileURL;
    link.download = msg.fileName;
    link.innerText = "Download " + msg.fileName;
    div.appendChild(link);
  }

  const time = formatTimestamp(msg.timestamp || Date.now());
  const seen = msg.seenBy && msg.sender === currentUser && getOtherUser() in msg.seenBy;

  const status = document.createElement("div");
  status.className = "seen-status";
  status.innerText = msg.sender === currentUser ? `${time} • ${seen ? 'Seen' : 'Delivered'}` : time;
  div.addEventListener("touchstart", handleTouchStart, false);
div.addEventListener("touchend", (e) => handleTouchEnd(e, msg, id), false);

let xDown = null;

function handleTouchStart(evt) {
  xDown = evt.touches[0].clientX;
}

function handleTouchEnd(evt, msg, id) {
  if (!xDown) return;

  let xUp = evt.changedTouches[0].clientX;
  let xDiff = xUp - xDown;

  if (xDiff > 120 || xDiff < -120) {
    showReplyPreview(msg, id);
  }

  xDown = null;
}
  div.appendChild(status);
  return div;
}


function showReplyPreview(msg, id) {
  document.getElementById("replyPreview").style.display = "block";
  document.getElementById("replyText").innerText = `${msg.sender}: ${truncateWithEllipsis(msg.text, 60) || msg.fileName || "[media]"}`;
  window.replyToMessage = id;
  document.getElementById("messageInput").focus();
}


function markAsSeen(messageId) {
  const path = `messages/${messageId}/seenBy/${currentUser}`;
  db.ref(path).once("value").then(snapshot => {
    if (!snapshot.exists()) {
      db.ref(path).set(true);
    }
  });
}


function getOtherUser() {
  return Object.keys(USERS).find(user => user !== currentUser);
}

function showContextMenu(x, y, msg, id) {
  let menu = document.getElementById("contextMenu");
  if (menu) menu.remove();

  menu = document.createElement("div");
  menu.id = "contextMenu";
  menu.className = "context-menu";
  menu.style.top = y + 'px';
  menu.style.left = x + 'px';
  menu.innerHTML = `
    <div onclick="copyMessage('${msg.text || msg.fileName || ""}')">Copy</div>
    <div onclick="cutMessage('${id}')">Cut</div>
  `;
  if (msg.sender === currentUser) {
    menu.innerHTML += `<div onclick="deleteMessage('${id}')">Delete</div>`;
  }
  document.body.appendChild(menu);
  document.addEventListener("click", () => menu.remove(), { once: true });
}

function copyMessage(text) {
  navigator.clipboard.writeText(text);
}

function cutMessage(id) {
  db.ref("messages/" + id).remove();
}

function deleteMessage(id) {
  db.ref("messages/" + id).remove();
}

function sendTyping() {
  db.ref(`typing/${currentUser}`).set(true);
  clearTimeout(typingTimeout);
  typingTimeout = setTimeout(() => {
    db.ref(`typing/${currentUser}`).remove();
  }, 5000);
}

function listenToTyping() {
  const typingRef = db.ref("typing");
  typingRef.on("value", snapshot => {
    const typingUsers = snapshot.val() || {};
    const indicator = document.getElementById("typingIndicator");
    const othersTyping = Object.entries(typingUsers)
      .filter(([user, isTyping]) => user !== currentUser && isTyping)
      .map(([user]) => `${user} is typing...`);
    indicator.innerText = othersTyping.join(" & ");
    indicator.style.display = othersTyping.length ? "block" : "none";
  });
}

function formatTimestamp(ts) {
  const date = new Date(ts);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatLastSeen(ts) {
  const date = new Date(ts);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  if (isToday) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } else {
    return date.toLocaleString([], { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  }
}


const scrollBtn = document.getElementById("scrollToBottomBtn");

function scrollToBottom() {
  const chatWindow = document.getElementById("chatWindow");
  if (!chatWindow) return;
  chatWindow.scrollTo({ top: chatWindow.scrollHeight, behavior: "smooth" });
  scrollBtn.style.display = "none"; // hide button when at bottom
}

function isAtBottom(elem, threshold = 300) {
  return elem.scrollHeight - elem.scrollTop - elem.clientHeight < threshold;
}

// Show/hide on scroll
chatWindow.addEventListener("scroll", () => {
  if (isAtBottom(chatWindow)) {
    scrollBtn.style.display = "none";
  } else {
    scrollBtn.style.display = "block";
  }
});

// Scroll to bottom when clicked
scrollBtn.addEventListener("click", () => {
  chatWindow.scrollTo({ top: chatWindow.scrollHeight, behavior: "smooth" });
});


function formatChatDate(timestamp) {
  const date = new Date(timestamp);
  const today = new Date();
  const yesterday = new Date(Date.now() - 86400000);

  if (date.toDateString() === today.toDateString()) return "Today";
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday";

  return date.toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
}

function loadGallery() {
  const gallery = document.getElementById("images");
  gallery.innerHTML = "";

  const mediaItems = [];

  db.ref("messages").orderByChild("timestamp").once("value", snapshot => {
    snapshot.forEach(child => {
      const msg = child.val();
      if (msg.fileURL && (msg.type.startsWith("image/") || msg.type.startsWith("video/"))) {
        mediaItems.push({
          url: msg.fileURL,
          type: msg.type,
          name: msg.fileName || "",
          timestamp: msg.timestamp || 0
        });
      }
    });

    let lastDate = "";

mediaItems.reverse().forEach((item, index) => {
  const mediaDate = formatChatDate(item.timestamp); // use same format function

  if (mediaDate !== lastDate) {
    lastDate = mediaDate;
    const separator = document.createElement("div");
    separator.className = "date-separator-gallery";
    separator.innerText = mediaDate;
    gallery.appendChild(separator);
  }

  const media = document.createElement("div");
  media.className = "media-thumb";
  media.innerHTML = item.type.startsWith("image/")
    ? `<img src="${item.url}" onclick="openLightbox(${index})">`
    : `<div class="video-wrapper" onclick="openLightbox(${index})">
         <video src="${item.url}" muted playsinline></video>
         <div class="play-overlay">▶</div>
       </div>`;

  gallery.appendChild(media);
});


    window.mediaItems = mediaItems; // Store globally for swiping
  });
}

function openLightbox(startIndex) {
  let current = startIndex;

  const lb = document.createElement("div");
  lb.className = "lightbox";
  lb.innerHTML = `<div class="lightbox-content"></div>`;
  document.body.appendChild(lb);

  const content = lb.querySelector(".lightbox-content");

  function render() {
    const item = mediaItems[current];
    if (!item) return;
    content.innerHTML = item.type.startsWith("image/")
      ? `<img src="${item.url}" class="lightbox-img">`
      : `<video src="${item.url}" class="lightbox-img" controls autoplay></video>`;
  }

  render();

  // 👇 Push state so that back button works
  history.pushState({ lightbox: true }, "");

  // 👇 Handle back button to close lightbox
  window.addEventListener("popstate", handleBackClose);

  function handleBackClose(event) {
    if (event.state && event.state.lightbox) return; // don't close on forward
    lb.remove();
    window.removeEventListener("popstate", handleBackClose);
  }

  // 👇 Close if touch/click outside content
  lb.addEventListener("click", (e) => {
    if (e.target === lb) {
      lb.remove();
      window.removeEventListener("popstate", handleBackClose);
      history.back(); // trigger popstate to remove lightbox state
    }
  });

  // Swipe gesture (optional)
  lb.addEventListener("touchstart", handleTouchStart, false);
  lb.addEventListener("touchmove", handleTouchMove, false);

  let xStart = null;

  function handleTouchStart(evt) {
    const firstTouch = evt.touches[0];
    xStart = firstTouch.clientX;
  }

  function handleTouchMove(evt) {
    if (!xStart) return;
    const xEnd = evt.touches[0].clientX;
    const diffX = xStart - xEnd;

    if (Math.abs(diffX) > 50) {
      if (diffX > 0) current = Math.min(mediaItems.length - 1, current + 1); // Left swipe
      else current = Math.max(0, current - 1); // Right swipe
      render();
      xStart = null;
    }
  }
}


function imguploadbtn() {
  const uploadBtn = document.getElementById("galleryUploadBtn");
  const fileInput = document.getElementById("galleryFileInput");

  uploadBtn.addEventListener("click", () => {
    fileInput.click();
  });

  fileInput.addEventListener("change", previewBeforeUpload);
}

function previewBeforeUpload() {
  const files = Array.from(this.files);
  const preview = document.getElementById("galleryUploadPreview");
  const previewDiv = document.getElementById("galleryUpload");
  previewDiv.style.display = "grid";
preview.style.display = "flex";
preview.style.overflowX = "auto";
preview.style.whiteSpace = "nowrap";
preview.style.padding = "10px";
preview.innerHTML = "";

  // Preview thumbnails
  files.forEach(file => {
    if (file.type.startsWith("image/")) {
      const img = document.createElement("img");
      img.src = URL.createObjectURL(file);
      img.style.maxWidth = "100px";
      img.style.margin = "10px";

      preview.appendChild(img);
    } else if (file.type.startsWith("video/")) {
      const video = document.createElement("video");
      video.src = URL.createObjectURL(file);
      video.controls = true;
video.style.maxWidth = "100px";
video.style.margin = "10px";

      preview.appendChild(video);
    }
  });

  // Add Confirm and Cancel buttons
  const buttonWrapper = document.createElement("div");
  buttonWrapper.style.marginTop = "10px";

  const confirmBtn = document.createElement("button");
  confirmBtn.textContent = "Upload";
  confirmBtn.className = "btn btn-success btn-sm me-2";
  confirmBtn.onclick = () => {
    uploadFiles(files);
  };

  const cancelBtn = document.createElement("button");
  cancelBtn.textContent = "Cancel";
  cancelBtn.className = "btn btn-danger btn-sm";
  cancelBtn.onclick = () => {
    document.getElementById("galleryFileInput").value = "";
    preview.innerHTML = "";
    preview.style.display = "none";
    previewDiv.style.display="none";
    previewDiv.innerHTML = `<div id="galleryUploadPreview" style="padding: 10px; display: none;"></div>`
  };

  buttonWrapper.appendChild(confirmBtn);
  buttonWrapper.appendChild(cancelBtn);
  previewDiv.appendChild(buttonWrapper);
}

function uploadFiles(files) {
  const preview = document.getElementById("galleryUploadPreview");
  const previewDiv = document.getElementById("galleryUpload");
  const progressContainer = document.getElementById("galleryUploadProgress");
  const progressBar = progressContainer.querySelector(".progress-bar");

  progressContainer.style.display = "block";
  progressBar.style.width = "0%";
  progressBar.style.height = "10px";

  let uploaded = 0;

  files.forEach(file => {
    const msgId = db.ref().child('messages').push().key;
    const ref = storage.ref('uploads/' + msgId + "_" + file.name);
    const uploadTask = ref.put(file);

    uploadTask.on('state_changed', snapshot => {
      const percent = ((snapshot.bytesTransferred / snapshot.totalBytes) * 100).toFixed(0);
      progressBar.style.width = percent + "%";
    }, console.error, () => {
      ref.getDownloadURL().then(url => {
        db.ref('messages/' + msgId).set({
          sender: currentUser,
          fileURL: url,
          fileName: file.name,
          type: file.type,
          timestamp: Date.now()
        }).then(() => {
          uploaded++;
          if (uploaded === files.length) {
            document.getElementById("galleryFileInput").value = "";
            progressBar.style.width = "100%";
            setTimeout(() => {
              progressContainer.style.display = "none";
              preview.style.display = "none";
              preview.innerHTML = "";
              previewDiv.style.display="none";
              previewDiv.innerHTML = `<div id="galleryUploadPreview" style="padding: 10px; display: none;"></div>`
              loadGallery();
            }, 1000);
          }
        });
      });
    });
  });
}


window.addEventListener('resize', () => setTimeout(scrollToBottom, 100));