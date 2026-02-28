import { Outlet, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth } from "../firebase";
import Navbar from "./Navbar";
import { User, LogOut, UserCircle } from "lucide-react";

const Layout = () => {
  const [user, setUser] = useState(null);
  const [showMenu, setShowMenu] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    // Listen for the PWA install prompt event
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    await signOut(auth);
    setShowMenu(false);
    navigate("/");
  };

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
    }
  };

  return (
    <div className={user ? "madurai-bg" : ""} style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>

      <header style={{ 
        padding: '12px 20px', 
        background: 'rgba(248, 250, 249, 0.8)', 
        backdropFilter: 'blur(10px)',
        position: 'sticky', 
        top: 0, 
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: '1px solid rgba(0,0,0,0.03)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }} onClick={() => navigate("/")}>
          <div style={{ 
            width: '32px', 
            height: '32px', 
            background: 'var(--primary)', 
            borderRadius: '10px', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            boxShadow: '0 4px 10px rgba(45, 106, 79, 0.2)'
          }}>
            <Droplets size={18} color="white" />
          </div>
          <h1 style={{ fontSize: '1.2rem', letterSpacing: '-0.5px', cursor: 'pointer', fontWeight: '800' }}>
            Madurai <span style={{ color: 'var(--primary)' }}>Ezhil</span>
          </h1>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {deferredPrompt && (
            <button 
              onClick={handleInstallClick}
              style={{
                background: 'var(--primary-ultra-light)',
                color: 'var(--primary)',
                border: 'none',
                padding: '6px 12px',
                borderRadius: '12px',
                fontSize: '0.75rem',
                fontWeight: 'bold',
                cursor: 'pointer'
              }}
            >
              Install App
            </button>
          )}

          <div style={{ position: 'relative' }}>
            <motion.div 
            whileTap={{ scale: 0.95 }}
            onClick={() => user ? setShowMenu(!showMenu) : navigate("/auth")}
            style={{ 
              width: '36px', 
              height: '36px', 
              borderRadius: '12px', 
              background: 'white', 
              border: '1px solid rgba(0,0,0,0.05)',
              boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              overflow: 'hidden'
            }}
          >
            {user ? (
              <span style={{ color: 'var(--primary)', fontWeight: 'bold' }}>
                {user.displayName ? user.displayName[0].toUpperCase() : (user.email ? user.email[0].toUpperCase() : (user.phoneNumber ? '📱' : 'U'))}
              </span>
            ) : (
              <UserCircle size={22} color="var(--primary)" />
            )}
          </motion.div>
          
          <AnimatePresence>
            {showMenu && user && (
              <motion.div 
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                style={{ 
                  position: 'absolute', 
                  top: '45px', 
                  right: 0, 
                  background: 'white', 
                  boxShadow: '0 10px 40px rgba(0,0,0,0.1)',
                  borderRadius: '16px',
                  padding: '8px',
                  minWidth: '220px',
                  border: '1px solid rgba(0,0,0,0.05)',
                  zIndex: 1001
                }}
              >
                <div style={{ padding: '12px 8px', borderBottom: '1px solid #f0f0f0', marginBottom: '8px' }}>
                  <p style={{ margin: 0, fontSize: '0.9rem', fontWeight: '800' }}>{user.displayName || 'Eco Warrior'}</p>
                  <p style={{ margin: 0, fontSize: '0.7rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {user.email || user.phoneNumber}
                  </p>
                </div>
                
                <button 
                  onClick={() => { navigate("/profile"); setShowMenu(false); }}
                  style={{ 
                    width: '100%', 
                    background: 'none', 
                    border: 'none', 
                    padding: '10px 8px', 
                    color: 'var(--text-main)', 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '10px',
                    cursor: 'pointer',
                    fontSize: '0.85rem',
                    borderRadius: '8px'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-color)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
                >
                  <User size={18} color="var(--primary)" /> Profile Details
                </button>

                <button 
                  onClick={handleLogout}
                  style={{ 
                    width: '100%', 
                    background: 'none', 
                    border: 'none', 
                    padding: '10px 8px', 
                    color: '#ef4444', 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '10px',
                    cursor: 'pointer',
                    fontSize: '0.85rem',
                    borderRadius: '8px'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = '#FEF2F2'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
                >
                  <LogOut size={18} /> Logout
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        </div>
      </header>

      <main style={{ flex: 1, paddingBottom: '90px' }}>
        <Outlet />
      </main>

      <Navbar />
    </div>
  );
};

export default Layout;
