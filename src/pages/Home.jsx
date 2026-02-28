import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { collection, onSnapshot, query, limit, where, orderBy } from "firebase/firestore";
import { db, auth } from "../firebase";
import { useNavigate } from "react-router-dom";
import { 
  ArrowRight, 
  Zap, 
  Award, 
  Users, 
  Star, 
  Map as MapIcon, 
  MessageSquare, 
  ShieldCheck,
  ChevronRight,
  Droplets,
  ShieldAlert
} from "lucide-react";

const Home = () => {
  const [reportCount, setReportCount] = useState(0);
  const [userImpact, setUserImpact] = useState(0);
  const [activeUser, setActiveUser] = useState(null);
  const [focusArea, setFocusArea] = useState(null);
  const [recentReports, setRecentReports] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    // Global stats & Focus Area
    const qAll = query(collection(db, "reports"), orderBy("createdAt", "desc"), limit(50));
    const unsubscribeAll = onSnapshot(qAll, (snapshot) => {
      setReportCount(snapshot.size);
      
      const reports = snapshot.docs.map(doc => doc.data());
      setRecentReports(reports.slice(0, 3));

      // Calculate Focus Area
      const areaMap = {};
      reports.forEach(curr => {
        if (curr.area) {
          if (!areaMap[curr.area]) areaMap[curr.area] = { name: curr.area, penalty: 0 };
          const severityPenalty = curr.severity ? curr.severity : 2; 
          areaMap[curr.area].penalty += (10 + severityPenalty);
        }
      });

      let worstArea = null;
      let maxPenalty = 0;
      Object.values(areaMap).forEach(area => {
        if (area.penalty > maxPenalty) {
          maxPenalty = area.penalty;
          worstArea = { ...area, score: Math.max(0, 100 - area.penalty) };
        }
      });

      if (worstArea && worstArea.score < 85) {
        setFocusArea(worstArea);
      }
    });

    // User-specific stats
    const unsubscribeAuth = auth.onAuthStateChanged((user) => {
      setActiveUser(user);
      if (user) {
        const qUser = query(collection(db, "reports"), where("userId", "==", user.uid));
        const unsubscribeUser = onSnapshot(qUser, (snapshot) => {
          setUserImpact(snapshot.size * 10);
        });
        return () => unsubscribeUser();
      }
    });

    return () => {
      unsubscribeAll();
      unsubscribeAuth();
    };
  }, []);

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="page-container"
      style={{ paddingBottom: '40px' }}
    >
      {/* Hero Section */}
      <section style={{ 
        padding: '30px 20px', 
        background: 'linear-gradient(180deg, var(--primary-ultra-light) 0%, var(--bg-color) 100%)',
        marginBottom: '10px'
      }}>
        <motion.div
           initial={{ opacity: 0, y: 10 }}
           animate={{ opacity: 1, y: 0 }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <span style={{ background: 'var(--madurai-orange)', color: 'white', padding: '4px 10px', borderRadius: '20px', fontSize: '0.7rem', fontWeight: 'bold', letterSpacing: '0.5px' }}>
              MADURAI SMART CITY
            </span>
            {activeUser && (
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', color: 'var(--primary)', fontWeight: 'bold' }}>
                <ShieldCheck size={14} /> Eco Warrior
              </span>
            )}
          </div>
          
          <h1 style={{ fontSize: '2.4rem', lineHeight: '1.1', marginBottom: '8px', fontWeight: '800' }}>
            Making Madurai <br />
            <span style={{ color: 'var(--primary)' }}>Ezhil</span> Again.
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '1rem', maxWidth: '85%', marginBottom: '24px', lineHeight: '1.5' }}>
            Empowering citizens to report, clean, and monitor waste across our temple city using AI.
          </p>
        </motion.div>

        <div style={{ display: 'flex', gap: '12px', overflowX: 'auto', scrollbarWidth: 'none', padding: '4px 0' }}>
           <div className="premium-card" style={{ minWidth: '140px', padding: '16px', borderRadius: '20px' }}>
              <Users size={20} color="var(--primary)" style={{ marginBottom: '8px' }} />
              <div style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>2.4k+</div>
              <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 'bold' }}>CITIZENS</div>
           </div>
           <div className="premium-card" style={{ minWidth: '140px', padding: '16px', borderRadius: '20px' }}>
              <Droplets size={20} color="var(--primary)" style={{ marginBottom: '8px' }} />
              <div style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>{reportCount}</div>
              <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 'bold' }}>REPORTS</div>
           </div>
           <div className="premium-card" style={{ minWidth: '140px', padding: '16px', borderRadius: '20px' }}>
              <Award size={20} color="var(--primary)" style={{ marginBottom: '8px' }} />
              <div style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>92%</div>
              <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 'bold' }}>RESOLUTION</div>
           </div>
        </div>
      </section>

      <div style={{ padding: '0 20px' }}>
        {/* User Stats Snapshot */}
        {activeUser ? (
          <motion.div 
            whileHover={{ scale: 1.01 }}
            onClick={() => navigate("/profile")}
            className="premium-card" 
            style={{ 
              marginBottom: '24px', 
              background: 'white', 
              border: '1px solid rgba(0,0,0,0.03)',
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
              padding: '16px',
              cursor: 'pointer'
            }}
          >
            <div style={{ background: 'var(--primary-ultra-light)', width: '50px', height: '50px', borderRadius: '15px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Star color="var(--primary)" fill="var(--primary)" size={24} />
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: '700' }}>YOUR IMPACT POINTS</p>
              <div style={{ fontSize: '1.4rem', fontWeight: 'bold', color: 'var(--primary)' }}>{userImpact} Points</div>
            </div>
            <ChevronRight color="var(--primary)" style={{ opacity: 0.5 }} />
          </motion.div>
        ) : (
          <div 
            className="premium-card" 
            style={{ marginBottom: '24px', background: 'var(--primary-ultra-light)', textAlign: 'center', cursor: 'pointer' }}
            onClick={() => navigate("/auth")}
          >
            <p style={{ margin: 0, fontWeight: 'bold', color: 'var(--primary)' }}>Join the community to track your impact! 🚀</p>
          </div>
        )}

        {/* Action Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
          <motion.div 
            whileTap={{ scale: 0.97 }}
            onClick={() => navigate('/report')}
            className="premium-card" 
            style={{ 
              background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-light) 100%)', 
              color: 'white',
              cursor: 'pointer',
              height: '180px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between'
            }}
          >
            <Zap size={32} />
            <div>
              <h3 style={{ color: 'white', fontSize: '1.1rem' }}>Report Waste</h3>
              <p style={{ opacity: 0.8, fontSize: '0.7rem' }}>Snap & Classify via AI</p>
            </div>
          </motion.div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <motion.div 
              whileTap={{ scale: 0.97 }}
              onClick={() => navigate('/dashboard')}
              className="premium-card" 
              style={{ flex: 1, padding: '16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px' }}
            >
              <MapIcon size={20} color="var(--primary)" />
              <span style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>City Map</span>
            </motion.div>
            <motion.div 
              whileTap={{ scale: 0.97 }}
              onClick={() => navigate('/assistant')}
              className="premium-card" 
              style={{ flex: 1, padding: '16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px' }}
            >
              <MessageSquare size={20} color="var(--primary)" />
              <span style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>AI Help</span>
            </motion.div>
          </div>
        </div>

        {/* Focus Area Alert */}
        {focusArea && (
          <div className="premium-card" style={{ marginBottom: '32px', border: '1px solid #FCA5A5', background: '#FEF2F2' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h3 style={{ fontSize: '1rem', color: '#991B1B', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ShieldAlert size={18} /> Focus Area
              </h3>
              <span style={{ fontSize: '0.65rem', background: '#EF4444', color: 'white', padding: '2px 8px', borderRadius: '10px', fontWeight: 'bold' }}>
                URGENT
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
               <div>
                 <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#991B1B' }}>{focusArea.name}</div>
                 <p style={{ margin: 0, fontSize: '0.75rem', color: '#B91C1C' }}>Current Score: {focusArea.score}/100</p>
               </div>
               <button 
                onClick={() => navigate('/report')}
                style={{ background: '#EF4444', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '10px', fontSize: '0.75rem', fontWeight: 'bold', cursor: 'pointer' }}
               >
                 Report Now
               </button>
            </div>
          </div>
        )}

        {/* Recent Community Feed */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
           <h3 style={{ fontSize: '1.1rem' }}>Community Feed</h3>
           <button 
            onClick={() => navigate('/dashboard')}
            style={{ background: 'none', border: 'none', color: 'var(--primary)', fontWeight: 'bold', fontSize: '0.8rem', cursor: 'pointer' }}
           >
             View All
           </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {recentReports.map((report, idx) => (
            <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '8px 0', borderBottom: '1px solid #f0f0f0' }}>
               <div style={{ width: '44px', height: '44px', borderRadius: '10px', overflow: 'hidden', flexShrink: 0, background: '#eee' }}>
                  {report.imageUrl ? (
                    <img src={report.imageUrl} alt="Recent" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <div style={{ width: '100%', height: '100%', background: 'var(--primary-ultra-light)' }} />
                  )}
               </div>
               <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 'bold' }}>{report.area}</div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{report.wasteType || 'Waste Report'} • {report.createdAt?.seconds ? new Date(report.createdAt.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Recently'}</div>
               </div>
               <div style={{ fontSize: '0.8rem', fontWeight: 'bold', color: 'var(--primary)' }}>+{ (report.severity || 2) * 5} pts</div>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
};

export default Home;
