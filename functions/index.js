const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { logger } = require("firebase-functions");
const admin = require("firebase-admin");
const fetch = require("node-fetch");

admin.initializeApp();

exports.classifyWaste = onCall({ 
  secrets: ["GEMINI_API_KEY"],
  memory: "1GiB"
}, async (request) => {
  const { imageUrl, reportId } = request.data;
  const apiKey = process.env.GEMINI_API_KEY;

  if (!imageUrl || !reportId) {
    throw new HttpsError("invalid-argument", "imageUrl and reportId are required.");
  }

  if (!apiKey) {
    logger.error("GEMINI_API_KEY secret is not set.");
    throw new HttpsError("failed-precondition", "AI Service not configured.");
  }

  try {
    // 1. Download the image
    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) {
      throw new Error(`Failed to fetch image: ${imageResponse.statusText}`);
    }
    const buffer = await imageResponse.buffer();
    const base64Image = buffer.toString("base64");
    const contentType = imageResponse.headers.get("content-type") || "image/jpeg";

    // 2. Call Gemini API
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
    
    const prompt = `Classify this waste image into one of: Wet, Dry, Hazardous, Mixed. 
    Return strictly JSON only, no markdown formatting wrap:
    {
      "type": "Wet | Dry | Hazardous | Mixed",
      "confidence": 0-100,
      "severity": 1-5,
      "reasoning": "brief explanation"
    }`;

    const body = {
      contents: [{
        parts: [
          { text: prompt },
          { inline_data: { mime_type: contentType, data: base64Image } }
        ]
      }],
      generationConfig: {
        response_mime_type: "application/json"
      }
    };

    const response = await fetch(geminiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
        const errText = await response.text();
        logger.error("Gemini API Error:", errText);
        throw new Error("Gemini API request failed.");
    }

    const result = await response.json();
    const candidate = result.candidates[0].content.parts[0].text;
    const classification = JSON.parse(candidate);

    // 3. Update Firestore
    const reportRef = admin.firestore().collection("reports").doc(reportId);
    await reportRef.update({
      status: "classified",
      wasteType: classification.type,
      confidence: classification.confidence,
      severity: classification.severity,
      aiReason: classification.reasoning,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    return { 
      success: true, 
      classification 
    };

  } catch (error) {
    logger.error("classification error:", error);
    // Even if AI fails, we don't want to crash the frontend, 
    // but the status remains pending_ai or we can set it to failed
    try {
        await admin.firestore().collection("reports").doc(reportId).update({
            status: "ai_failed",
            error: error.message
        });
    } catch (e) {
        logger.error("Failed to update error status in firestore", e);
    }
    
    throw new HttpsError("internal", "Classification failed: " + error.message);
  }
});

exports.askAssistant = onCall({ 
  secrets: ["GEMINI_API_KEY"],
  memory: "1GiB"
}, async (request) => {
  const { message, chatHistory } = request.data;
  const apiKey = process.env.GEMINI_API_KEY;

  if (!message) {
    throw new HttpsError("invalid-argument", "Message is required.");
  }

  if (!apiKey) {
    throw new HttpsError("failed-precondition", "AI Service not configured.");
  }

  try {
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
    
    const systemPrompt = "You are Ezhil AI, a powerful and helpful assistant. You can answer any question on any topic — science, math, history, coding, health, general knowledge, and more. Be clear, friendly, and thorough. When relevant, you can also help users with civic topics like waste management and city cleanliness in Madurai, India, and explain that Ezhil is an app for reporting garbage to help keep cities clean.";

    const body = {
      contents: [
          { role: "user", parts: [{ text: systemPrompt }] },
          ...(chatHistory || []).map(msg => ({
              role: msg.role === "user" ? "user" : "model",
              parts: [{ text: msg.text }]
          })),
          { role: "user", parts: [{ text: message }] }
      ]
    };

    const response = await fetch(geminiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
        throw new Error("Assistant API request failed.");
    }

    const result = await response.json();
    const reply = result.candidates[0].content.parts[0].text;

    return { reply };

  } catch (error) {
    logger.error("Assistant error:", error);
    throw new HttpsError("internal", "Assistant failed to respond.");
  }
});

