import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { auth, db } from "../firebase";
import { collection, query, where, orderBy, onSnapshot, doc, getDoc } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { 
  User, 
  Phone, 
  Award, 
  MapPin, 
  Clock, 
  LogOut, 
  ChevronRight, 
  MessageSquare, 
  History,
  ShieldCheck,
  Building2,
  Map,
  Zap,
  Sparkles,
  Target,
  Gem
} from "lucide-react";
import { signOut } from "firebase/auth";

const Profile = () => {
  const [userAuth, setUserAuth] = useState(null);
  const [userData, setUserData] = useState(null);
  const [myReports, setMyReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribeAuth = auth.onAuthStateChanged(async (currentUser) => {
      if (!currentUser) {
        navigate("/auth");
        return;
      }
      setUserAuth(currentUser);

      // Fetch additional user data from Firestore
      try {
        const userDoc = await getDoc(doc(db, "users", currentUser.uid));
        if (userDoc.exists()) {
          setUserData(userDoc.data());
        }
      } catch (err) {
        console.error("Error fetching user data:", err);
      }

      // Fetch user's reports
      const q = query(
        collection(db, "reports"),
        where("userId", "==", currentUser.uid),
        orderBy("createdAt", "desc")
      );

      const unsubscribeReports = onSnapshot(q, (snapshot) => {
        const reportsData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setMyReports(reportsData);
        setLoading(false);
      });

      return () => unsubscribeReports();
    });

    return () => unsubscribeAuth();
  }, [navigate]);

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      navigate("/auth");
    } catch (err) {
      console.error("Sign out error:", err);
    }
  };

  if (!userAuth) return null;

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="page-container"
      style={{ padding: '20px', paddingBottom: '100px' }}
    >
      {/* Header with Sign Out */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1 style={{ fontSize: '1.8rem' }}>My Profile</h1>
        <button 
          onClick={handleSignOut}
          style={{ 
            background: 'rgba(239, 68, 68, 0.1)', 
            border: 'none', 
            color: '#ef4444',
            padding: '8px 12px',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '0.85rem',
            fontWeight: '600',
            cursor: 'pointer'
          }}
        >
          <LogOut size={16} /> Sign Out
        </button>
      </div>

      {/* User Info Card */}
      <div className="premium-card" style={{ marginBottom: '24px', display: 'flex', gap: '20px', alignItems: 'center' }}>
        <div style={{ 
          width: '70px', 
          height: '70px', 
          borderRadius: '20px', 
          background: 'var(--primary-ultra-light)', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          border: '2px solid var(--accent)',
          flexShrink: 0
        }}>
          <User size={36} color="var(--primary)" />
        </div>
        <div>
          <h2 style={{ fontSize: '1.4rem', marginBottom: '2px' }}>{userData?.name || userAuth.displayName || 'Eco Warrior'}</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Phone size={14} /> {userAuth.phoneNumber || userAuth.email}
          </p>
          <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
            <span style={{ fontSize: '0.7rem', background: '#F0FDF4', color: '#16A34A', padding: '2px 8px', borderRadius: '6px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <ShieldCheck size={12} /> Verified
            </span>
            {userData?.area && (
              <span style={{ fontSize: '0.7rem', background: '#FEF3C7', color: '#B45309', padding: '2px 8px', borderRadius: '6px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <MapPin size={12} /> {userData.area}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Location Details Section */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
        <div className="premium-card" style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
           <Building2 size={24} color="var(--primary)" style={{ opacity: 0.7 }} />
           <div>
             <p style={{ margin: 0, fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 'bold' }}>CITY</p>
             <p style={{ margin: 0, fontSize: '0.95rem', fontWeight: '600' }}>{userData?.city || 'Madurai'}</p>
           </div>
        </div>
        <div className="premium-card" style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
           <Map size={24} color="var(--primary)" style={{ opacity: 0.7 }} />
           <div>
             <p style={{ margin: 0, fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 'bold' }}>COMMUNITY</p>
             <p style={{ margin: 0, fontSize: '0.95rem', fontWeight: '600' }}>{userData?.area || 'General'}</p>
           </div>
        </div>
      </div>

      {/* Impact Stats */}
      <div className="premium-card" style={{ 
        background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-light) 100%)', 
        color: 'white',
        marginBottom: '32px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '30px'
      }}>
        <div>
          <p style={{ fontSize: '0.9rem', opacity: 0.9, marginBottom: '4px' }}>Impact Achievement</p>
          <div style={{ fontSize: '2.5rem', fontWeight: 'bold', lineHeight: 1 }}>{myReports.length * 10}</div>
          <p style={{ fontSize: '0.8rem', opacity: 0.8, marginTop: '8px' }}>Total Impact Points</p>
        </div>
        <div style={{ position: 'relative' }}>
          <Award size={64} style={{ opacity: 0.3 }} />
          <div style={{ 
            position: 'absolute', 
            top: '50%', 
            left: '50%', 
            transform: 'translate(-50%, -50%)',
            background: 'white',
            color: 'var(--primary)',
            padding: '4px 8px',
            borderRadius: '8px',
            fontSize: '0.7rem',
            fontWeight: 'bold'
          }}>
            LEVEL {Math.floor(myReports.length / 5) + 1}
          </div>
        </div>
      </div>
      
      {/* Achievements & Badges */}
      <h3 style={{ fontSize: '1.1rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <Target size={20} color="var(--primary)" /> Achievements
      </h3>
      <div style={{ 
        display: 'flex', 
        gap: '12px', 
        overflowX: 'auto', 
        paddingBottom: '12px', 
        marginBottom: '24px',
        scrollbarWidth: 'none',
        msOverflowStyle: 'none'
      }}>
        {[
          { id: 'starter', name: 'Starter', icon: <Zap size={22} />, desc: '1st Report', unlocked: myReports.length >= 1 },
          { id: 'explorer', name: 'Explorer', icon: <Sparkles size={22} />, desc: '5 Reports', unlocked: myReports.length >= 5 },
          { id: 'resolved', name: 'Hero', icon: <ShieldCheck size={22} />, desc: 'Resolved', unlocked: myReports.some(r => r.status === 'resolved') },
          { id: 'top', name: 'Elite', icon: <Gem size={22} />, desc: '100+ Points', unlocked: (myReports.length * 10) >= 100 },
          { id: 'guardian', name: 'Guardian', icon: <Award size={22} />, desc: 'Level 5+', unlocked: (Math.floor(myReports.length / 5) + 1) >= 5 },
        ].map(badge => (
          <motion.div 
            key={badge.id}
            whileHover={{ scale: badge.unlocked ? 1.05 : 1 }}
            style={{ 
              minWidth: '94px', 
              background: badge.unlocked ? 'white' : 'rgba(0,0,0,0.03)',
              border: badge.unlocked ? '1px solid var(--accent)' : '1px dashed #ddd',
              padding: '16px 8px',
              borderRadius: '20px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center',
              opacity: badge.unlocked ? 1 : 0.5,
              position: 'relative'
            }}
          >
            <div style={{ 
              width: '44px', 
              height: '44px', 
              borderRadius: '14px', 
              background: badge.unlocked ? 'var(--primary-ultra-light)' : '#f3f4f6', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              color: badge.unlocked ? 'var(--primary)' : '#999',
              marginBottom: '8px'
            }}>
              {badge.icon}
            </div>
            <p style={{ fontSize: '0.75rem', fontWeight: 'bold', margin: 0, color: badge.unlocked ? 'var(--text-main)' : '#999' }}>{badge.name}</p>
            <p style={{ fontSize: '0.55rem', color: 'var(--text-muted)', margin: 0 }}>{badge.desc}</p>
            
            {badge.unlocked && (
              <div style={{ position: 'absolute', top: -4, right: -4, background: 'var(--primary)', color: 'white', borderRadius: '50%', width: '16px', height: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px' }}>
                ✓
              </div>
            )}
          </motion.div>
        ))}
      </div>

      {/* Action Links */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '32px' }}>
        <div 
          onClick={() => navigate('/assistant')}
          className="premium-card" 
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '16px', 
            padding: '16px', 
            cursor: 'pointer',
            border: '1px solid rgba(0,0,0,0.03)'
          }}
        >
          <div style={{ background: 'var(--primary-ultra-light)', padding: '10px', borderRadius: '12px' }}>
            <MessageSquare size={20} color="var(--primary)" />
          </div>
          <div style={{ flex: 1 }}>
            <h4 style={{ fontSize: '0.95rem' }}>Ezhil AI Assistant</h4>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Get help with waste management</p>
          </div>
          <ChevronRight size={18} color="var(--text-muted)" />
        </div>
      </div>

      {/* Activity Section */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
        <History size={20} color="var(--primary)" />
        <h3 style={{ fontSize: '1.2rem' }}>Recent Activity</h3>
      </div>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {loading ? (
             <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>Fetching your history...</div>
        ) : myReports.length === 0 ? (
          <div className="premium-card" style={{ textAlign: 'center', padding: '40px' }}>
            <div style={{ 
              width: '60px', 
              height: '60px', 
              background: 'var(--bg-color)', 
              borderRadius: '50%', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              margin: '0 auto 16px auto'
            }}>
              <MapPin size={28} color="var(--primary-light)" style={{ opacity: 0.5 }} />
            </div>
            <p style={{ color: 'var(--text-muted)', marginBottom: '20px', fontSize: '0.9rem' }}>You haven't reported any waste yet. Start making an impact today!</p>
            <button className="btn-primary" style={{ margin: '0 auto' }} onClick={() => navigate('/report')}>
              Make First Report
            </button>
          </div>
        ) : (
          <AnimatePresence>
            {myReports.map((report, index) => (
              <motion.div 
                key={report.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="premium-card" 
                style={{ display: 'flex', gap: '16px', padding: '12px', border: '1px solid rgba(0,0,0,0.02)' }}
              >
                <div style={{ width: '64px', height: '64px', borderRadius: '14px', overflow: 'hidden', flexShrink: 0, background: 'var(--bg-color)' }}>
                  {report.imageUrl ? (
                    <img src={report.imageUrl} alt="Report" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <MapPin size={24} color="var(--primary)" style={{ opacity: 0.3 }} />
                    </div>
                  )}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                    <div>
                      <div style={{ fontSize: '0.9rem', fontWeight: 'bold', color: 'var(--text-main)' }}>{report.area || 'Unknown Location'}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                        <Clock size={12} /> {report.createdAt?.toDate ? report.createdAt.toDate().toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : 'Recently'}
                      </div>
                    </div>
                    <span style={{ 
                      fontSize: '0.65rem', 
                      background: report.status === 'classified' ? 'var(--primary-ultra-light)' : (report.status === 'resolved' ? '#DCFCE7' : '#FEF3C7'), 
                      color: report.status === 'classified' ? 'var(--primary)' : (report.status === 'resolved' ? '#16A34A' : '#92400e'), 
                      padding: '4px 10px', 
                      borderRadius: '10px',
                      fontWeight: '800',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px'
                    }}>
                      {report.status === 'classified' ? report.wasteType : (report.status === 'resolved' ? 'Resolved' : 'Analyzing')}
                    </span>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>
    </motion.div>
  );
};

export default Profile;
