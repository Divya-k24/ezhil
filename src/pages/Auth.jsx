import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { auth, db } from "../firebase";
import { 
  RecaptchaVerifier,
  signInWithPhoneNumber,
  updateProfile 
} from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { Phone, Lock, User, ArrowLeft, Loader2, Leaf, CheckCircle2, MapPin, Navigation } from "lucide-react";

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [step, setStep] = useState(1); // 1 = Phone Input, 2 = OTP Input
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [name, setName] = useState("");
  const [city, setCity] = useState("Madurai");
  const [area, setArea] = useState("");
  const [locationEnabled, setLocationEnabled] = useState(false);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showNotification, setShowNotification] = useState(false);
  const [confirmationResult, setConfirmationResult] = useState(null);
  
  const navigate = useNavigate();

  const setupRecaptcha = () => {
    if (!window.recaptchaVerifier) {
      window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
        'size': 'invisible',
      });
    }
  };

  const requestOTP = async (e) => {
    e.preventDefault();
    setError("");

    if (!phone || phone.length < 10) {
      setError("Please enter a valid phone number.");
      return;
    }

    if (!isLogin && (!name || !city || !area)) {
      setError("Please provide all required details.");
      return;
    }

    if (!isLogin && !locationEnabled) {
      setError("Location must be ON to join the community.");
      return;
    }

    setLoading(true);

    let formattedPhone = phone;
    // Auto-add +91 if not present for Indian numbers
    if (!formattedPhone.startsWith("+")) {
      formattedPhone = "+91" + phone;
    }

    try {
      setupRecaptcha();
      const appVerifier = window.recaptchaVerifier;
      const confirmation = await signInWithPhoneNumber(auth, formattedPhone, appVerifier);
      setConfirmationResult(confirmation);
      setStep(2); // Move to OTP step
      setLoading(false);
    } catch (err) {
      console.error("OTP Request Error:", err);
      // reset recaptcha if it fails
      if (window.recaptchaVerifier) {
         window.recaptchaVerifier.clear();
         window.recaptchaVerifier = null;
      }
      setError("Failed to send OTP. Try adding country code (e.g., +91).");
      setLoading(false);
    }
  };

  const verifyOTP = async (e) => {
    e.preventDefault();
    setError("");

    if (!otp || otp.length < 6) {
      setError("Please enter the 6-digit OTP.");
      return;
    }

    setLoading(true);

    try {
      const result = await confirmationResult.confirm(otp);
      const user = result.user;

      if (!isLogin) {
        // Update basic profile
        await updateProfile(user, { displayName: name });

        // Save custom data to Firestore, merge to not overwrite if they already exist from a past login
        await setDoc(doc(db, "users", user.uid), {
          name,
          phone: user.phoneNumber,
          city,
          area,
          createdAt: new Date(),
          impactPoints: 0
        }, { merge: true });

        // Show notification and then redirect
        setShowNotification(true);
        setTimeout(() => {
          setShowNotification(false);
          navigate("/");
        }, 3000);
      } else {
        // Direct login
        navigate("/");
      }
    } catch (err) {
      console.error("OTP Verification Error:", err);
      setError("Invalid OTP. Please try again.");
      setLoading(false);
    }
  };

  const requestLocation = () => {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser.");
      return;
    }

    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      () => {
        setLocationEnabled(true);
        setLoading(false);
      },
      () => {
        setError("Please enable location permissions in your browser.");
        setLoading(false);
      }
    );
  };

  const resetForm = () => {
    setIsLogin(!isLogin);
    setStep(1);
    setOtp("");
    setError("");
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="page-container"
      style={{ 
        padding: '20px', 
        minHeight: '100vh', 
        display: 'flex', 
        flexDirection: 'column',
        justifyContent: 'center',
        background: 'var(--bg-color)',
        position: 'relative'
      }}
    >
      <div id="recaptcha-container"></div>

      {/* Notification Overlay */}
      <AnimatePresence>
        {showNotification && (
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            style={{
              position: 'fixed',
              top: '20px',
              left: '50%',
              transform: 'translateX(-50%)',
              zIndex: 1000,
              background: 'var(--primary)',
              color: 'white',
              padding: '16px 24px',
              borderRadius: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
              width: '90%',
              maxWidth: '400px'
            }}
          >
            <CheckCircle2 color="white" />
            <div>
              <p style={{ margin: 0, fontWeight: 'bold' }}>Registration Successful!</p>
              <p style={{ margin: 0, fontSize: '0.8rem', opacity: 0.9 }}>Welcome to the Madurai Ezhil community.</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <button 
        onClick={() => {
            if (step === 2) {
                setStep(1);
                setOtp("");
                setError("");
            } else {
                navigate("/");
            }
        }} 
        style={{ 
          position: 'absolute', 
          top: '30px', 
          left: '20px', 
          background: 'var(--primary)', 
          border: 'none', 
          color: 'white',
          padding: '10px 16px',
          borderRadius: '12px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          cursor: 'pointer',
          boxShadow: 'var(--shadow)',
          fontWeight: 'bold'
        }}
      >
        <ArrowLeft size={18} /> {step === 2 ? "Back" : "Exit"}
      </button>

      <div style={{ textAlign: 'center', marginBottom: '40px' }}>
        <div style={{ 
          width: '70px', 
          height: '70px', 
          background: 'var(--primary)', 
          borderRadius: '24px',
          margin: '0 auto 16px auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 10px 20px rgba(45, 106, 79, 0.2)'
        }}>
          <Leaf size={35} color="white" />
        </div>
        <h1 style={{ fontSize: '2.2rem', marginBottom: '8px', color: 'var(--primary)', fontWeight: 'bold' }}>
          {isLogin ? "Madurai Ezhil" : "Navagaragam"}
        </h1>
        <p style={{ color: 'var(--text-muted)', fontWeight: '500' }}>
          {step === 1 
            ? (isLogin ? "Vanakkam! Login with Phone" : "Sernthu! Create new account") 
            : "Enter Verification Code"
          }
        </p>
      </div>

      <div className="premium-card" style={{ 
        border: '2px solid var(--primary-ultra-light)', 
        borderRadius: '24px',
        padding: '30px',
        background: 'white',
        boxShadow: 'var(--shadow)'
      }}>
        {step === 1 ? (
            <form onSubmit={requestOTP} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <AnimatePresence mode="wait">
                {!isLogin && (
                <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'var(--bg-color)', padding: '14px', borderRadius: '16px' }}>
                    <User size={20} color="var(--primary)" />
                    <input 
                        required
                        placeholder="Full Name" 
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        style={{ border: 'none', width: '100%', outline: 'none', background: 'transparent', fontSize: '1rem' }}
                    />
                    </div>

                    <div style={{ display: 'flex', gap: '12px' }}>
                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '12px', background: 'var(--bg-color)', padding: '14px', borderRadius: '16px' }}>
                        <MapPin size={20} color="var(--primary)" />
                        <input 
                        required
                        placeholder="City" 
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        style={{ border: 'none', width: '100%', outline: 'none', background: 'transparent', fontSize: '1rem' }}
                        />
                    </div>
                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '12px', background: 'var(--bg-color)', padding: '14px', borderRadius: '16px' }}>
                        <Navigation size={20} color="var(--primary)" />
                        <input 
                        required
                        placeholder="Area" 
                        value={area}
                        onChange={(e) => setArea(e.target.value)}
                        style={{ border: 'none', width: '100%', outline: 'none', background: 'transparent', fontSize: '1rem' }}
                        />
                    </div>
                    </div>

                    <button 
                    type="button"
                    onClick={requestLocation}
                    style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center', 
                        gap: '10px', 
                        padding: '12px', 
                        borderRadius: '16px', 
                        border: locationEnabled ? '2px solid var(--primary)' : '2px dashed var(--accent)',
                        background: locationEnabled ? 'var(--primary-ultra-light)' : 'transparent',
                        color: 'var(--primary)',
                        fontWeight: '600',
                        cursor: 'pointer'
                    }}
                    >
                    <MapPin size={18} />
                    {locationEnabled ? "Location Verified ✅" : "Click to Verify Location"}
                    </button>
                </motion.div>
                )}
            </AnimatePresence>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'var(--bg-color)', padding: '14px', borderRadius: '16px' }}>
                <Phone size={20} color="var(--primary)" />
                <input 
                required
                type="tel"
                placeholder="Phone Number (e.g. 9876543210)" 
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                style={{ border: 'none', width: '100%', outline: 'none', background: 'transparent', fontSize: '1rem' }}
                />
            </div>

            {error && (
                <p style={{ color: '#ef4444', fontSize: '0.85rem', textAlign: 'center', fontWeight: 'bold' }}>
                ⚠️ {error}
                </p>
            )}

            <button 
                className="btn-primary" 
                disabled={loading || showNotification} 
                style={{ 
                width: '100%', 
                padding: '16px', 
                background: 'var(--primary)', 
                borderRadius: '16px',
                fontSize: '1.1rem',
                fontWeight: '700',
                marginTop: '10px'
                }}
            >
                {loading ? <Loader2 className="spinner" size={24} /> : "Send OTP"}
            </button>
            </form>
        ) : (
            <form onSubmit={verifyOTP} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'var(--bg-color)', padding: '14px', borderRadius: '16px' }}>
                    <Lock size={20} color="var(--primary)" />
                    <input 
                        required
                        type="text"
                        placeholder="Enter 6-digit OTP" 
                        value={otp}
                        onChange={(e) => setOtp(e.target.value)}
                        style={{ border: 'none', width: '100%', outline: 'none', background: 'transparent', fontSize: '1rem', letterSpacing: '4px', textAlign: 'center' }}
                        maxLength={6}
                    />
                </div>

                {error && (
                    <p style={{ color: '#ef4444', fontSize: '0.85rem', textAlign: 'center', fontWeight: 'bold' }}>
                    ⚠️ {error}
                    </p>
                )}

                <button 
                    className="btn-primary" 
                    disabled={loading || showNotification} 
                    style={{ 
                    width: '100%', 
                    padding: '16px', 
                    background: 'var(--primary)', 
                    borderRadius: '16px',
                    fontSize: '1.1rem',
                    fontWeight: '700',
                    marginTop: '10px'
                    }}
                >
                    {loading ? <Loader2 className="spinner" size={24} /> : "Verify & Login"}
                </button>
            </form>
        )}
      </div>

      {step === 1 && (
        <div style={{ textAlign: 'center', marginTop: '32px' }}>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>
            {isLogin ? "New to Madurai Ezhil?" : "Already an Eco Warrior?"}
            <button 
                onClick={resetForm}
                style={{ 
                background: 'none', 
                border: 'none', 
                color: 'var(--primary)', 
                fontWeight: 'bold', 
                marginLeft: '8px', 
                cursor: 'pointer'
                }}
            >
                {isLogin ? "Register Now" : "Login Instead"}
            </button>
            </p>
        </div>
      )}
    </motion.div>
  );
};

export default Auth;
