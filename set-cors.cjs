const { Storage } = require("@google-cloud/storage");

const storage = new Storage({ projectId: "ezhil-c7dbc" });

const corsConfig = [
  {
    origin: ["*"],
    method: ["GET", "POST", "PUT", "DELETE", "HEAD"],
    responseHeader: ["Content-Type", "Content-Disposition", "Content-Length", "x-goog-resumable"],
    maxAgeSeconds: 3600,
  },
];

async function setCors() {
  const buckets = ["ezhil-c7dbc.firebasestorage.app", "ezhil-c7dbc.appspot.com"];
  
  for (const bucketName of buckets) {
    try {
      console.log(`Trying bucket: ${bucketName}...`);
      const bucket = storage.bucket(bucketName);
      await bucket.setCorsConfiguration(corsConfig);
      console.log(`✅ CORS set successfully on ${bucketName}`);
      return; 
    } catch (err) {
      console.error(`❌ Error on ${bucketName}:`, err.message);
    }
  }
}

setCors();
