import { useState, useRef, useEffect } from "react";
import { Camera, MapPin, Upload, Loader2, CheckCircle2, Brain } from "lucide-react";
import { db, storage, auth } from "../firebase";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { collection, addDoc, serverTimestamp, updateDoc, doc } from "firebase/firestore";

const GEMINI_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_KEY}`;

const Report = () => {
  const [selectedImage, setSelectedImage] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [area, setArea] = useState("");
  const [details, setDetails] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isCompressing, setIsCompressing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [aiResult, setAiResult] = useState(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  
  // Camera specific state and refs
  const [cameraActive, setCameraActive] = useState(false);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  // Pre-defined list of common areas in Madurai
  const maduraiAreas = [
    "Anna Nagar", "KK Nagar", "Simmakkal", "Goripalayam", "Tallakulam", 
    "Mattuthavani", "Aarapalayam", "Periyar Bus Stand", "Thirunagar", 
    "Tirupparankunram", "Villapuram", "South Gate", "Sellur", "Narimedu",
    "Bibikulam", "Reserve Line", "Iyer Bungalow", "Othakadai", "Teppakulam",
    "Mahaboob Palayam", "Kalavasal", "Bypass Road", "Palanganatham"
  ].sort();

  const filteredAreas = area.trim() === '' 
    ? [] 
    : maduraiAreas.filter(a => a.toLowerCase().includes(area.toLowerCase()));


  // Helper function to compress images using Canvas
  const compressImage = (file) => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.src = URL.createObjectURL(file);
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        
        // Max width for uploaded images
        const MAX_WIDTH = 1024;
        let width = img.width;
        let height = img.height;

        if (width > MAX_WIDTH) {
          height = Math.round((height * MAX_WIDTH) / width);
          width = MAX_WIDTH;
        }

        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(img, 0, 0, width, height);
        
        // Export highly compressed JPEG
        canvas.toBlob((blob) => {
          if (!blob) {
            reject(new Error("Canvas is empty"));
            return;
          }
          // Preserve the original name if possible, or give a new one
          const compressedFile = new File([blob], file.name || `compressed_${Date.now()}.jpg`, {
            type: "image/jpeg",
            lastModified: Date.now(),
          });
          resolve(compressedFile);
        }, "image/jpeg", 0.7); // 0.7 Quality 
      };
      img.onerror = (error) => reject(error);
    });
  };

  const handleImageChange = async (e) => {
    const file = e.target.files[0];
    if (file) {
      // Show the original image immediately as background behind the spinner
      const originalUrl = URL.createObjectURL(file);
      setPreviewUrl(originalUrl);
      setIsCompressing(true);
      try {
        const compressedFile = await compressImage(file);
        setSelectedImage(compressedFile);
        // Swap original preview with the compressed version
        setPreviewUrl(URL.createObjectURL(compressedFile));
      } catch (err) {
        console.error("Compression failed, using original:", err);
        setSelectedImage(file);
        // Already showing original, so keep it
      } finally {
        setIsCompressing(false);
      }
      setAiResult(null);
      stopCamera();
    }
  };

  const startCamera = async () => {
    try {
      setPreviewUrl(null);
      setSelectedImage(null);
      setAiResult(null);
      
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" }
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      streamRef.current = stream;
      setCameraActive(true);
    } catch (err) {
      console.error("Error accessing camera:", err);
      alert("Could not access camera. Please check your browser permissions or use the file upload fallback.");
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      setIsCompressing(true); // Start Compression Loader
      const video = videoRef.current;
      const canvas = canvasRef.current;
      
      const MAX_WIDTH = 1024;
      let width = video.videoWidth;
      let height = video.videoHeight;
      
      if (width > MAX_WIDTH) {
        height = Math.round((height * MAX_WIDTH) / width);
        width = MAX_WIDTH;
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0, width, height);
      
      canvas.toBlob((blob) => {
        const file = new File([blob], `capture_${Date.now()}.jpg`, { type: "image/jpeg" });
        setSelectedImage(file);
        setPreviewUrl(URL.createObjectURL(file));
        setAiResult(null);
        setIsCompressing(false); // Stop Loader
        stopCamera();
      }, "image/jpeg", 0.7); // Apply same 0.7 compression ratio
    }
  };

  useEffect(() => {
    return () => {
      // Ensure camera turns off if user navigates away
      stopCamera();
    };
  }, []);

  // Classify waste image directly via Gemini API (no Cloud Functions needed)
  const classifyWithGemini = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = async () => {
        try {
          const base64Data = reader.result.split(',')[1];
          const mimeType = file.type || 'image/jpeg';
          const prompt = `Classify this waste image into one of: Wet, Dry, Hazardous, Mixed.
Return ONLY valid JSON, no markdown:
{"type": "Wet | Dry | Hazardous | Mixed", "confidence": 0-100, "severity": 1-5, "reasoning": "brief explanation"}`;
          const body = {
            contents: [{ parts: [
              { text: prompt },
              { inline_data: { mime_type: mimeType, data: base64Data } }
            ]}],
            generationConfig: { response_mime_type: "application/json" }
          };
          const res = await fetch(GEMINI_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body)
          });
          const data = await res.json();
          const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
          resolve(JSON.parse(text));
        } catch (e) {
          reject(e);
        }
      };
      reader.onerror = reject;
    });
  };

  const handleSubmit = async () => {
    if (!selectedImage || !area) {
      alert("Please select an image and enter an area.");
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      const user = auth.currentUser;

      // 1. Upload Image to Firebase Storage with progress tracking
      const storageRef = ref(storage, `reports/${Date.now()}_${selectedImage.name}`);
      const uploadTask = uploadBytesResumable(storageRef, selectedImage);

      const imageUrl = await new Promise((resolve, reject) => {
        uploadTask.on(
          'state_changed',
          (snapshot) => {
            const progress = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
            setUploadProgress(progress);
          },
          (error) => reject(error),
          async () => {
            // Explicitly set to 100% so user sees the full bar
            setUploadProgress(100);
            // Brief pause so the UI has time to render "100%" before transitioning
            await new Promise(r => setTimeout(r, 500));
            const url = await getDownloadURL(uploadTask.snapshot.ref);
            resolve(url);
          }
        );
      });

      // 2. Add Document to Firestore
      const docRef = await addDoc(collection(db, "reports"), {
        imageUrl,
        area,
        details,
        status: "pending_ai",
        createdAt: serverTimestamp(),
        userId: user ? user.uid : "anonymous",
        userName: user ? (user.displayName || (user.email ? user.email.split('@')[0] : user.phoneNumber || "Citizen")) : "Anonymous Citizen",
      });

      // Document successfully added, show success screen immediately!
      setIsSuccess(true);
      setIsUploading(false);

      // 3. Classify image directly via Gemini (free, no Cloud Functions)
      if (selectedImage) {
        setIsAnalyzing(true);
        try {
          const classification = await classifyWithGemini(selectedImage);
          setAiResult(classification);
          // Update Firestore with AI results
          await updateDoc(doc(db, 'reports', docRef.id), {
            status: 'classified',
            wasteType: classification.type,
            confidence: classification.confidence,
            severity: classification.severity,
            aiReason: classification.reasoning,
          });
        } catch (err) {
          console.error("AI Analysis failed:", err);
        } finally {
          setIsAnalyzing(false);
        }
      }

      // Reset form variables for the next one, but keep success state
      setSelectedImage(null);
      setPreviewUrl(null);
      setArea("");
      setDetails("");
    } catch (error) {
      console.error("Upload Error:", error);
      alert("Something went wrong during upload. Please try again.");
      setIsUploading(false);
    }
  };

  if (isSuccess) {
    return (
      <div style={{ padding: '40px 20px', textAlign: 'center' }}>
        <div style={{ background: 'var(--primary-ultra-light)', padding: '40px', borderRadius: '32px', display: 'inline-block', marginBottom: '24px' }}>
          {isAnalyzing ? (
            <div style={{ position: 'relative' }}>
              <Brain size={64} color="var(--primary)" />
              <div style={{ position: 'absolute', inset: -10, border: '4px solid var(--primary)', borderRadius: '50%', borderTopColor: 'transparent', animation: 'spin 1s linear infinite' }} />
            </div>
          ) : (
            <CheckCircle2 size={64} color="var(--primary)" />
          )}
        </div>
        
        <h1 style={{ marginBottom: '12px' }}>{isAnalyzing ? "AI Analyzing..." : "Report Submitted!"}</h1>
        
        {aiResult ? (
          <div className="premium-card" style={{ marginBottom: '32px', background: 'var(--primary-ultra-light)', border: 'none' }}>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginBottom: '8px' }}>
               <span style={{ background: 'var(--primary)', color: 'white', padding: '4px 12px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 'bold' }}>
                 {aiResult.type}
               </span>
               <span style={{ background: 'white', border: '1px solid var(--primary)', color: 'var(--primary)', padding: '4px 12px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 'bold' }}>
                 {aiResult.confidence}% match
               </span>
            </div>
            <p style={{ fontSize: '0.9rem', fontStyle: 'italic' }}>"{aiResult.reasoning}"</p>
          </div>
        ) : (
          <p style={{ color: 'var(--text-muted)', marginBottom: '32px' }}>
            {isAnalyzing ? "Our AI is classifying your waste report to route it to the right team..." : "Thank you for contributing to Ezhil. Your report has been recorded."}
          </p>
        )}

        {!isAnalyzing && (
          <button className="btn-primary" style={{ width: '100%' }} onClick={() => { setIsSuccess(false); setAiResult(null); }}>
            Submit Another Report
          </button>
        )}

        <style>{`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="page-container" style={{ padding: '20px' }}>
      <h1 style={{ marginBottom: '24px' }}>New Report</h1>
      
      <div>
        <div className="premium-card" style={{ 
          textAlign: 'center', 
          border: '2px dashed var(--accent)', 
          background: previewUrl ? `url(${previewUrl})` : (cameraActive ? '#000' : 'var(--primary-ultra-light)'),
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          minHeight: '280px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: cameraActive ? 'flex-end' : 'center',
          marginBottom: '24px',
          position: 'relative',
          overflow: 'hidden',
          padding: cameraActive ? '0' : '20px'
        }}>
        
          {/* Live Camera Stream */}
          {cameraActive && !previewUrl && (
            <>
              <video 
                ref={videoRef} 
                autoPlay 
                playsInline 
                muted 
                style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'absolute', top: 0, left: 0, opacity: isCompressing ? 0.3 : 1 }}
              />
              <canvas ref={canvasRef} style={{ display: 'none' }} />
              
              {isCompressing ? (
                <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 20 }}>
                  <Loader2 className="spinner" size={40} color="white" style={{ animation: 'spin 1s linear infinite', marginBottom: '12px' }} />
                  <p style={{ color: 'white', fontWeight: 'bold' }}>Processing Image...</p>
                </div>
              ) : (
                <div style={{ position: 'relative', zIndex: 10, width: '100%', display: 'flex', justifyContent: 'center', paddingBottom: '24px', background: 'linear-gradient(to top, rgba(0,0,0,0.8), transparent)' }}>
                  <button 
                    onClick={(e) => { e.preventDefault(); capturePhoto(); }}
                    style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'white', border: '4px solid var(--primary)', cursor: 'pointer', boxShadow: '0 4px 12px rgba(0,0,0,0.3)' }}
                  />
                </div>
              )}
              <button 
                onClick={(e) => { e.preventDefault(); stopCamera(); }}
                style={{ position: 'absolute', top: '16px', right: '16px', background: 'rgba(0,0,0,0.5)', color: 'white', border: 'none', borderRadius: '20px', padding: '6px 12px', fontSize: '0.8rem', cursor: 'pointer', zIndex: 10 }}
              >
                Close Camera
              </button>
            </>
          )}

          {/* Prompt State (No Camera, No Preview) */}
          {!previewUrl && !cameraActive && (
            <div style={{ width: '100%' }}>
              {isCompressing ? (
                 <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '40px 0' }}>
                   <Loader2 className="spinner" size={40} color="var(--primary)" style={{ animation: 'spin 1s linear infinite', marginBottom: '12px' }} />
                   <p style={{ color: 'var(--primary)', fontWeight: 'bold' }}>Processing Image...</p>
                 </div>
              ) : (
                <>
                  <button 
                    onClick={(e) => { e.preventDefault(); startCamera(); }}
                    className="btn-primary"
                    style={{ margin: '0 auto 16px auto', display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 24px', borderRadius: '30px' }}
                  >
                    <Camera size={20} /> Open Camera
                  </button>
                  
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '16px' }}>OR</p>
                  
                  <label style={{ display: 'inline-block', cursor: 'pointer', color: 'var(--primary)', fontWeight: 'bold', fontSize: '0.9rem', border: '1px solid var(--primary)', padding: '8px 16px', borderRadius: '20px' }}>
                    <Upload size={16} style={{ verticalAlign: 'middle', marginRight: '6px' }} />
                    Upload from Gallery
                    <input 
                      type="file" 
                      accept="image/*" 
                      onChange={handleImageChange} 
                      style={{ display: 'none' }}
                    />
                  </label>
                </>
              )}
            </div>
          )}

          {/* Image Preview State */}
          {previewUrl && (
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'rgba(0,0,0,0.6)', color: 'white', padding: '12px', display: 'flex', justifyContent: 'space-around' }}>
              <button 
                onClick={(e) => { e.preventDefault(); setPreviewUrl(null); setSelectedImage(null); startCamera(); }}
                style={{ background: 'none', border: 'none', color: 'white', fontWeight: 'bold', fontSize: '0.9rem', cursor: 'pointer' }}
              >
                Retake
              </button>
              <label style={{ cursor: 'pointer', color: 'white', fontWeight: 'bold', fontSize: '0.9rem' }}>
                Change
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={handleImageChange} 
                  style={{ display: 'none' }}
                />
              </label>
            </div>
          )}
        </div>
      </div>

      <div className="premium-card" style={{ marginBottom: '24px' }}>
        <div style={{ position: 'relative' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
            <MapPin size={20} color="var(--primary)" />
            <input 
              placeholder="Search Area (e.g. Anna Nagar, Simmakkal)" 
              value={area}
              onChange={(e) => {
                setArea(e.target.value);
                setShowSuggestions(true);
              }}
              onFocus={() => setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 200)} // Delay so click registers
              style={{ border: 'none', width: '100%', outline: 'none', fontSize: '1rem', fontWeight: '500' }}
            />
          </div>

          {showSuggestions && filteredAreas.length > 0 && (
            <div style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              right: 0,
              background: 'white',
              border: '1px solid var(--primary-ultra-light)',
              borderRadius: '12px',
              boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
              maxHeight: '200px',
              overflowY: 'auto',
              zIndex: 10,
              marginTop: '-12px'
            }}>
              {filteredAreas.map((suggestedArea, index) => (
                <div 
                  key={index}
                  onClick={() => {
                    setArea(suggestedArea);
                    setShowSuggestions(false);
                  }}
                  style={{
                    padding: '12px 16px',
                    cursor: 'pointer',
                    borderBottom: index === filteredAreas.length - 1 ? 'none' : '1px solid #f0f0f0',
                    fontSize: '0.95rem',
                    color: 'var(--text-main)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'var(--primary-ultra-light)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'white'}
                >
                  <MapPin size={14} color="var(--text-muted)" /> {suggestedArea}
                </div>
              ))}
            </div>
          )}
        </div>
        <hr style={{ border: 'none', borderTop: '1px solid #eee', margin: '0 0 16px 0' }} />
        <textarea 
          placeholder="Add details (optional)"
          value={details}
          onChange={(e) => setDetails(e.target.value)}
          style={{ border: 'none', width: '100%', outline: 'none', resize: 'none', minHeight: '80px', fontSize: '1rem' }}
        />
      </div>

      <button 
        className="btn-primary" 
        style={{ width: '100%', opacity: isUploading || isCompressing ? 0.9 : 1, position: 'relative', overflow: 'hidden' }} 
        disabled={isUploading || isCompressing}
        onClick={handleSubmit}
      >
        {/* Animated background fill for upload progress */}
        {isUploading && (
          <div style={{
            position: 'absolute',
            top: 0, left: 0,
            height: '100%',
            width: `${uploadProgress}%`,
            background: 'rgba(255,255,255,0.25)',
            transition: 'width 0.3s ease',
            borderRadius: 'inherit',
          }} />
        )}
        <span style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
          {isUploading ? (
            <>
              <Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} />
              Uploading... {uploadProgress}%
            </>
          ) : (
            <>
              <Upload size={20} />
              Submit Report
            </>
          )}
        </span>
      </button>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default Report;
