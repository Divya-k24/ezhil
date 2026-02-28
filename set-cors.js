// Script to set CORS on Firebase Storage bucket using @google-cloud/storage
// Run: node set-cors.js

import { Storage } from "@google-cloud/storage";

const storage = new Storage({ projectId: "ezhil-c7dbc" });

const corsConfig = [
  {
    origin: ["*"],
    method: ["GET", "POST", "PUT", "DELETE", "HEAD"],
    responseHeader: ["Content-Type", "Content-Disposition", "Content-Length"],
    maxAgeSeconds: 3600,
  },
];

async function setCors() {
  try {
    const bucket = storage.bucket("ezhil-c7dbc.firebasestorage.app");
    await bucket.setCorsConfiguration(corsConfig);
    console.log("✅ CORS set successfully on Firebase Storage bucket!");
  } catch (err) {
    console.error("❌ Error:", err.message);
  }
}

setCors();
