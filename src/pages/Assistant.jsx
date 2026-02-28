import { useState, useRef, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Send, Loader2, User, Bot, ImagePlus, X } from "lucide-react";
import { collection, addDoc, query, orderBy, getDocs, serverTimestamp, where } from "firebase/firestore";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { db, storage, auth } from "../firebase";

const GEMINI_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_KEY}`;

const SYSTEM_PROMPT =
  "You are Ezhil AI, a helpful civic-tech assistant. You specialise in waste management — garbage disposal, recycling, overflowing bins, and citizen reporting in Madurai, India. You can also answer general questions on science, math, health, coding, and more. Be friendly, clear, and concise.";

// ─── helpers ───────────────────────────────────────────────────────────────

/** Persist a message to Firestore `chat` collection */
async function saveMessage(userId, role, text, imageUrl = null) {
  const payload = {
    userId,
    role,
    text,
    timestamp: serverTimestamp(),
  };
  if (imageUrl) payload.imageUrl = imageUrl;
  await addDoc(collection(db, "chat"), payload);
}

/** Persist upload metadata to Firestore `uploads` collection */
async function saveUpload(url, fileName) {
  await addDoc(collection(db, "uploads"), {
    url,
    fileName,
    uploadedAt: serverTimestamp(),
  });
}

// ─── component ─────────────────────────────────────────────────────────────

/** Sleep helper */
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Call Gemini with up to `maxRetries` retries on 429. 
 *  Calls onRetry(waitSec, attempt) before each retry wait. */
async function fetchGemini(body, maxRetries = 3, onRetry) {
  const delays = [3000, 6000, 10000];
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const res = await fetch(GEMINI_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!data.error) return data; // success
    if (data.error.code === 429 && attempt < maxRetries) {
      const waitMs = delays[attempt] ?? 10000;
      onRetry?.(Math.round(waitMs / 1000), attempt + 1);
      await sleep(waitMs);
      continue;
    }
    // non-429 or exhausted retries — surface the error
    throw data.error;
  }
}

const Assistant = () => {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [retryStatus, setRetryStatus] = useState(null); // e.g. "Retrying in 3s…"
  const [isHistoryLoading, setIsHistoryLoading] = useState(true);

  // Photo-upload state
  const [uploadProgress, setUploadProgress] = useState(null); // 0-100 or null
  const [previewSrc, setPreviewSrc] = useState(null); // local object URL for preview
  const [pendingFile, setPendingFile] = useState(null); // File object

  const scrollRef = useRef(null);
  const fileInputRef = useRef(null);

  // ── load Firestore history on mount ──────────────────────────────────────
  useEffect(() => {
    const loadHistory = async () => {
      if (!auth.currentUser) {
        setIsHistoryLoading(false);
        return;
      }

      try {
        const q = query(
          collection(db, "chat"), 
          where("userId", "==", auth.currentUser.uid),
          orderBy("timestamp", "asc")
        );
        const snap = await getDocs(q);
        const loaded = snap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        }));
        if (loaded.length === 0) {
          setMessages([
            {
              role: "assistant",
              text: "Vanakkam! I'm Ezhil AI 🌿 Ask me about waste management, recycling, or anything else!",
            },
          ]);
        } else {
          setMessages(loaded);
        }
      } catch (err) {
        console.error("Failed to load chat history:", err);
        setMessages([
          {
            role: "assistant",
            text: "Vanakkam! I'm Ezhil AI 🌿 Ask me about waste management, recycling, or anything else!",
          },
        ]);
      } finally {
        setIsHistoryLoading(false);
      }
    };
    loadHistory();
  }, []);

  // ── auto-scroll ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  // ── file picker handler ──────────────────────────────────────────────────
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setPendingFile(file);
    setPreviewSrc(URL.createObjectURL(file));
    // reset value so same file can be picked again
    e.target.value = "";
  };

  const clearPendingFile = () => {
    if (previewSrc) URL.revokeObjectURL(previewSrc);
    setPendingFile(null);
    setPreviewSrc(null);
  };

  // ── upload photo to Firebase Storage ─────────────────────────────────────
  const uploadPhoto = () => {
    return new Promise((resolve, reject) => {
      if (!pendingFile) return resolve(null);

      const uniqueName = `${Date.now()}_${pendingFile.name}`;
      const storageRef = ref(storage, `uploads/${uniqueName}`);
      const uploadTask = uploadBytesResumable(storageRef, pendingFile);

      uploadTask.on(
        "state_changed",
        (snap) => {
          const pct = Math.round((snap.bytesTransferred / snap.totalBytes) * 100);
          setUploadProgress(pct);
        },
        (err) => {
          console.error("Upload error:", err);
          setUploadProgress(null);
          reject(err);
        },
        async () => {
          const url = await getDownloadURL(uploadTask.snapshot.ref);
          await saveUpload(url, pendingFile.name);
          setUploadProgress(null);
          resolve(url);
        }
      );
    });
  };

  // ── send message ─────────────────────────────────────────────────────────
  const handleSend = async () => {
    if ((!input.trim() && !pendingFile) || isLoading) return;

    const userText = input.trim();
    setInput("");
    setIsLoading(true);

    let imageUrl = null;

    // 1. Upload pending photo first (if any)
    if (pendingFile) {
      try {
        imageUrl = await uploadPhoto();
      } catch {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", text: "⚠️ Failed to upload image. Please try again." },
        ]);
        setIsLoading(false);
        clearPendingFile();
        return;
      }
      clearPendingFile();
    }

    // 2. Build user message object and show it immediately
    const userMsg = { role: "user", text: userText, imageUrl };
    setMessages((prev) => [...prev, userMsg]);

    // 4. Persist to Firestore
    try {
      await saveMessage(auth.currentUser.uid, "user", userText, imageUrl);
    } catch (err) {
      console.warn("Could not save user message to Firestore:", err);
    }

    // 5. If there's no text (pure image upload) just acknowledge
    if (!userText && imageUrl) {
      const ack = "Got your image! 📷 Let me know what you'd like to do with it.";
      setMessages((prev) => [...prev, { role: "assistant", text: ack }]);
      try {
        await saveMessage(auth.currentUser.uid, "bot", ack);
      } catch (err) {
        console.warn("Could not save bot ack to Firestore:", err);
      }
      setIsLoading(false);
      return;
    }

      // 5. Call Gemini API with retry
      try {
        // Only send the last 10 messages to keep the request small and fast
        const chatHistory = messages
          .slice(-10) 
          .filter((m) => m.text && !m.text.startsWith("⚠️"))
          .map((msg) => ({
            role: msg.role === "user" ? "user" : "model",
            parts: [{ text: msg.text }],
          }));

        const body = {
          system_instruction: {
            parts: [{ text: SYSTEM_PROMPT }]
          },
          contents: [
            ...chatHistory,
            { role: "user", parts: [{ text: userText }] },
          ],
          generationConfig: {
            temperature: 0.7,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 1024,
          }
        };

        const data = await fetchGemini(body, 3, (waitSec, attempt) => {
          setRetryStatus(`Rate limited — retrying in ${waitSec}s… (attempt ${attempt}/3)`);
        });
        setRetryStatus(null);

        const reply =
          data.candidates?.[0]?.content?.parts?.[0]?.text ||
          "Sorry, I couldn't generate a response.";

      setMessages((prev) => [...prev, { role: "assistant", text: reply }]);

      // 7. Persist bot reply to Firestore
      try {
        await saveMessage(auth.currentUser.uid, "bot", reply);
      } catch (err) {
        console.warn("Could not save bot reply to Firestore:", err);
      }
    } catch (err) {
      setRetryStatus(null);
      console.error("Assistant error:", err);
      const code = err?.code;
      const errMsg =
        code === 429
          ? "⚠️ Still rate limited after 3 retries. Please wait ~1 minute and try again."
          : `⚠️ Error: ${err?.message || "Couldn't connect. Please try again."}`;
      setMessages((prev) => [...prev, { role: "assistant", text: errMsg }]);
    } finally {
      setIsLoading(false);
      setRetryStatus(null);
    }
  };

  // ─── render ──────────────────────────────────────────────────────────────
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="page-container"
      style={{
        padding: "20px",
        display: "flex",
        flexDirection: "column",
        height: "calc(100vh - 150px)",
      }}
    >
      {/* Header */}
      <div style={{ marginBottom: "16px", display: "flex", alignItems: "center", gap: "10px" }}>
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: "50%",
            background: "linear-gradient(135deg, var(--primary), var(--primary-light))",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Bot size={22} color="white" />
        </div>
        <div>
          <h1 style={{ fontSize: "1.3rem", lineHeight: 1 }}>Ezhil AI</h1>
          <p style={{ color: "var(--text-muted)", fontSize: "0.8rem", margin: 0 }}>
            Waste management &amp; general assistant
          </p>
        </div>
      </div>

      {/* Chat messages */}
      <div
        ref={scrollRef}
        style={{
          flex: 1,
          overflowY: "auto",
          marginBottom: "12px",
          display: "flex",
          flexDirection: "column",
          gap: "14px",
          paddingRight: "4px",
        }}
      >
        {isHistoryLoading ? (
          <div style={{ textAlign: "center", color: "var(--text-muted)", marginTop: 40 }}>
            <Loader2 size={24} style={{ animation: "spin 1s linear infinite", color: "var(--primary)" }} />
            <p style={{ marginTop: 8, fontSize: "0.9rem" }}>Loading chat history…</p>
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {messages.map((msg, idx) => (
              <motion.div
                key={msg.id || idx}
                initial={{ opacity: 0, y: 12, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ type: "spring", stiffness: 300, damping: 28 }}
                style={{
                  alignSelf: msg.role === "user" ? "flex-end" : "flex-start",
                  maxWidth: "85%",
                  display: "flex",
                  gap: "8px",
                  flexDirection: msg.role === "user" ? "row-reverse" : "row",
                }}
              >
                {/* Avatar */}
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: "50%",
                    background:
                      msg.role === "user"
                        ? "var(--primary)"
                        : "var(--primary-ultra-light)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                    marginTop: 4,
                  }}
                >
                  {msg.role === "user" ? (
                    <User size={16} color="white" />
                  ) : (
                    <Bot size={16} color="var(--primary)" />
                  )}
                </div>

                {/* Bubble */}
                <div
                  className="premium-card"
                  style={{
                    padding: "12px 16px",
                    borderRadius:
                      msg.role === "user"
                        ? "16px 4px 16px 16px"
                        : "4px 16px 16px 16px",
                    background:
                      msg.role === "user" ? "var(--primary)" : "white",
                    color:
                      msg.role === "user" ? "white" : "var(--text-main)",
                    fontSize: "0.95rem",
                    lineHeight: "1.55",
                    border:
                      msg.role === "user"
                        ? "none"
                        : "1px solid rgba(0,0,0,0.05)",
                    whiteSpace: "pre-wrap",
                  }}
                >
                  {/* Inline image (if any) */}
                  {msg.imageUrl && (
                    <img
                      src={msg.imageUrl}
                      alt="uploaded"
                      style={{
                        maxWidth: "100%",
                        borderRadius: 10,
                        marginBottom: msg.text ? 8 : 0,
                        display: "block",
                      }}
                    />
                  )}
                  {msg.text && <span>{msg.text}</span>}
                </div>
              </motion.div>
            ))}

            {/* Typing indicator */}
            {isLoading && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                style={{ alignSelf: "flex-start", marginLeft: 40 }}
              >
                <div
                  style={{
                    display: "flex",
                    gap: 5,
                    padding: "10px 14px",
                    background: "white",
                    borderRadius: "4px 16px 16px 16px",
                    border: "1px solid rgba(0,0,0,0.05)",
                    boxShadow: "var(--shadow)",
                  }}
                >
                  {[0, 1, 2].map((i) => (
                    <span
                      key={i}
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        background: "var(--primary)",
                        display: "inline-block",
                        animation: `bounce 1.2s ease-in-out ${i * 0.2}s infinite`,
                      }}
                    />
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </div>

      {/* Retry status banner */}
      <AnimatePresence>
        {retryStatus && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            style={{
              marginBottom: 8,
              padding: "8px 14px",
              background: "#FEF3C7",
              border: "1px solid #F59E0B",
              borderRadius: 10,
              fontSize: "0.82rem",
              color: "#92400E",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <Loader2 size={13} style={{ animation: "spin 1s linear infinite", flexShrink: 0 }} />
            {retryStatus}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Image preview strip (pending upload) */}
      <AnimatePresence>
        {previewSrc && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            style={{ marginBottom: 8 }}
          >
            <div
              style={{
                position: "relative",
                display: "inline-block",
                background: "white",
                borderRadius: 12,
                padding: 6,
                border: "2px solid var(--primary-ultra-light)",
                boxShadow: "var(--shadow)",
              }}
            >
              <img
                src={previewSrc}
                alt="preview"
                style={{ maxHeight: 100, maxWidth: 160, borderRadius: 8, display: "block" }}
              />
              <button
                onClick={clearPendingFile}
                style={{
                  position: "absolute",
                  top: -8,
                  right: -8,
                  width: 22,
                  height: 22,
                  borderRadius: "50%",
                  background: "#ef4444",
                  border: "none",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "white",
                }}
              >
                <X size={12} />
              </button>
              {/* Upload progress bar */}
              {uploadProgress !== null && (
                <div
                  style={{
                    position: "absolute",
                    bottom: 6,
                    left: 6,
                    right: 6,
                    height: 4,
                    background: "rgba(255,255,255,0.5)",
                    borderRadius: 4,
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      height: "100%",
                      width: `${uploadProgress}%`,
                      background: "var(--primary)",
                      transition: "width 0.2s",
                    }}
                  />
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input bar */}
      <div
        className="premium-card"
        style={{
          padding: "8px 8px 8px 12px",
          display: "flex",
          alignItems: "center",
          gap: "8px",
        }}
      >
        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          style={{ display: "none" }}
          onChange={handleFileChange}
          id="assistantFileInput"
        />

        {/* Photo attach button */}
        <button
          onClick={() => fileInputRef.current?.click()}
          title="Attach photo"
          style={{
            background: previewSrc ? "var(--primary-ultra-light)" : "transparent",
            border: "none",
            cursor: "pointer",
            borderRadius: 10,
            padding: "8px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "var(--primary)",
            transition: "background 0.2s",
            flexShrink: 0,
          }}
        >
          <ImagePlus size={20} />
        </button>

        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
          placeholder={pendingFile ? "Add a caption… (optional)" : "Ask me anything…"}
          style={{
            border: "none",
            flex: 1,
            outline: "none",
            background: "transparent",
            fontSize: "1rem",
            color: "var(--text-main)",
          }}
        />

        {/* Send button */}
        <button
          onClick={handleSend}
          disabled={(!input.trim() && !pendingFile) || isLoading}
          style={{
            background: "var(--primary)",
            color: "white",
            border: "none",
            borderRadius: "12px",
            width: 44,
            height: 44,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            opacity: (!input.trim() && !pendingFile) || isLoading ? 0.45 : 1,
            transition: "all 0.2s",
            flexShrink: 0,
          }}
        >
          {isLoading && uploadProgress === null ? (
            <Loader2 size={20} style={{ animation: "spin 1s linear infinite" }} />
          ) : (
            <Send size={20} />
          )}
        </button>
      </div>

      {/* Keyframe animations */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        @keyframes bounce {
          0%, 80%, 100% { transform: translateY(0); }
          40%           { transform: translateY(-6px); }
        }
      `}</style>
    </motion.div>
  );
};

export default Assistant;
