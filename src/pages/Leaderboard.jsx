import { useState, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { collection, query, orderBy, limit, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";
import { 
  Trophy, 
  Medal, 
  Crown, 
  Star, 
  TrendingUp, 
  Users,
  Award,
  ChevronRight,
  ArrowLeft
} from "lucide-react";
import { useNavigate } from "react-router-dom";

const Leaderboard = () => {
  const [topUsers, setTopUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // In a real app, you'd probably have a 'users' collection with aggregate points.
    // For this demo, we'll fetch users and order by impactPoints.
    const q = query(collection(db, "users"), orderBy("impactPoints", "desc"), limit(20));
    
    // Fallback: If no 'users' docs have points yet, we might want to calculate them from 'reports'.
    // But let's assume 'impactPoints' field exists on user doc as updated by a background process or on upload.
    
    const unsubscribe = onSnapshot(q, async (snapshot) => {
      let usersData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // If no users have points, let's mock some for the "wow" factor if it's an empty DB
      if (usersData.length === 0) {
        usersData = [
          { id: '1', name: 'Arun Kumar', area: 'Anna Nagar', impactPoints: 1250, level: 5 },
          { id: '2', name: 'Sneha R.', area: 'KK Nagar', impactPoints: 940, level: 4 },
          { id: '3', name: 'Meena S.', area: 'Simmakkal', impactPoints: 820, level: 3 },
          { id: '4', name: 'Rajesh M.', area: 'Goripalayam', impactPoints: 650, level: 2 },
          { id: '5', name: 'Priya D.', area: 'Tallakulam', impactPoints: 420, level: 2 },
        ];
      }
      
      setTopUsers(usersData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const getRankIcon = (index) => {
    switch(index) {
      case 0: return <Crown size={24} color="#FFD700" />;
      case 1: return <Medal size={24} color="#C0C0C0" />;
      case 2: return <Medal size={24} color="#CD7F32" />;
      default: return null;
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="page-container"
      style={{ padding: '20px', paddingBottom: '100px' }}
    >
      <header style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '16px' }}>
         <button 
           onClick={() => navigate(-1)}
           style={{ background: 'white', border: 'none', padding: '10px', borderRadius: '12px', boxShadow: 'var(--shadow)', cursor: 'pointer' }}
         >
           <ArrowLeft size={20} color="var(--primary)" />
         </button>
         <div>
            <h1 style={{ fontSize: '1.8rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Trophy size={28} color="var(--madurai-orange)" />
                Citizen Heroes
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Top contributors making Madurai beautiful</p>
         </div>
      </header>

      {/* Podium / Top 3 Highlight */}
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'flex-end', gap: '12px', marginBottom: '32px', padding: '20px 0' }}>
        {/* 2nd Place */}
        {topUsers[1] && (
           <motion.div 
             initial={{ opacity: 0, y: 20 }}
             animate={{ opacity: 1, y: 0 }}
             transition={{ delay: 0.2 }}
             style={{ textAlign: 'center', flex: 1 }}
           >
             <div style={{ position: 'relative', marginBottom: '8px' }}>
                <div style={{ width: '60px', height: '60px', borderRadius: '20px', background: '#E5E7EB', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '3px solid white', boxShadow: 'var(--shadow)' }}>
                   <span style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#6B7280' }}>{topUsers[1].name[0]}</span>
                </div>
                <div style={{ position: 'absolute', top: -10, right: 0 }}>{getRankIcon(1)}</div>
             </div>
             <p style={{ fontSize: '0.8rem', fontWeight: 'bold', margin: '4px 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{topUsers[1].name.split(' ')[0]}</p>
             <div style={{ background: 'white', padding: '4px 8px', borderRadius: '10px', fontSize: '0.7rem', fontWeight: 'bold', color: 'var(--primary)', boxShadow: 'var(--shadow)' }}>
                {topUsers[1].impactPoints}
             </div>
           </motion.div>
        )}

        {/* 1st Place */}
        {topUsers[0] && (
           <motion.div 
             initial={{ opacity: 0, scale: 0.9 }}
             animate={{ opacity: 1, scale: 1 }}
             style={{ textAlign: 'center', flex: 1.2, zIndex: 10 }}
           >
             <div style={{ position: 'relative', marginBottom: '12px' }}>
                <div style={{ width: '80px', height: '80px', borderRadius: '28px', background: 'var(--madurai-orange)', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '4px solid white', boxShadow: '0 10px 25px rgba(245, 158, 11, 0.3)' }}>
                   <span style={{ fontSize: '2rem', fontWeight: 'bold', color: 'white' }}>{topUsers[0].name[0]}</span>
                </div>
                <div style={{ position: 'absolute', top: -15, left: '50%', transform: 'translateX(-50%)' }}>{getRankIcon(0)}</div>
             </div>
             <p style={{ fontSize: '1rem', fontWeight: 'bold', margin: '4px 0' }}>{topUsers[0].name.split(' ')[0]}</p>
             <div style={{ background: 'var(--primary)', color: 'white', padding: '6px 12px', borderRadius: '12px', fontSize: '0.8rem', fontWeight: 'bold', boxShadow: '0 4px 12px rgba(45, 106, 79, 0.2)' }}>
                {topUsers[0].impactPoints} pts
             </div>
           </motion.div>
        )}

        {/* 3rd Place */}
        {topUsers[2] && (
           <motion.div 
             initial={{ opacity: 0, y: 20 }}
             animate={{ opacity: 1, y: 0 }}
             transition={{ delay: 0.3 }}
             style={{ textAlign: 'center', flex: 1 }}
           >
             <div style={{ position: 'relative', marginBottom: '8px' }}>
                <div style={{ width: '60px', height: '60px', borderRadius: '20px', background: '#FFEDD5', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '3px solid white', boxShadow: 'var(--shadow)' }}>
                   <span style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#D97706' }}>{topUsers[2].name[0]}</span>
                </div>
                <div style={{ position: 'absolute', top: -10, left: 0 }}>{getRankIcon(2)}</div>
             </div>
             <p style={{ fontSize: '0.8rem', fontWeight: 'bold', margin: '4px 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{topUsers[2].name.split(' ')[0]}</p>
             <div style={{ background: 'white', padding: '4px 8px', borderRadius: '10px', fontSize: '0.7rem', fontWeight: 'bold', color: 'var(--primary)', boxShadow: 'var(--shadow)' }}>
                {topUsers[2].impactPoints}
             </div>
           </motion.div>
        )}
      </div>

      {/* Stats Summary Area */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '32px' }}>
          <div className="premium-card" style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Users size={20} color="var(--primary)" />
            <div>
              <p style={{ margin: 0, fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 'bold' }}>CONTRIBUTORS</p>
              <p style={{ margin: 0, fontSize: '1.1rem', fontWeight: 'bold' }}>{topUsers.length || 0}+</p>
            </div>
          </div>
          <div className="premium-card" style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <TrendingUp size={20} color="var(--primary)" />
            <div>
              <p style={{ margin: 0, fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 'bold' }}>AVG. IMPACT</p>
              <p style={{ margin: 0, fontSize: '1.1rem', fontWeight: 'bold' }}>
                {topUsers.length > 0 ? Math.round(topUsers.reduce((a, b) => a + b.impactPoints, 0) / topUsers.length) : 0}
              </p>
            </div>
          </div>
      </div>

      {/* List View */}
      <div className="premium-card" style={{ padding: '8px' }}>
        {loading ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>Calculating ranks...</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {topUsers.map((user, index) => (
              <motion.div 
                key={user.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '16px', 
                  padding: '12px 16px',
                  background: index < 3 ? 'var(--bg-color)' : 'transparent',
                  borderRadius: '16px',
                  marginBottom: '4px'
                }}
              >
                <div style={{ width: '28px', fontSize: '0.9rem', fontWeight: '900', color: index < 3 ? 'var(--primary)' : 'var(--text-muted)' }}>
                  {index + 1}
                </div>
                <div style={{ 
                  width: '44px', 
                  height: '44px', 
                  borderRadius: '14px', 
                  background: index === 0 ? 'var(--madurai-orange)' : (index < 3 ? 'var(--primary-ultra-light)' : '#f3f4f6'), 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  color: index === 0 ? 'white' : 'var(--primary)',
                  fontWeight: 'bold',
                  fontSize: '1.1rem'
                }}>
                  {user.name[0]}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '0.95rem', fontWeight: 'bold' }}>{user.name}</div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <MapPin size={10} /> {user.area || 'Madurai'}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '1rem', fontWeight: 'bold', color: 'var(--primary)' }}>{user.impactPoints}</div>
                  <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', fontWeight: 'bold' }}>POINTS</div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      <div style={{ textAlign: 'center', marginTop: '32px', padding: '20px', background: 'var(--primary-ultra-light)', borderRadius: '24px' }}>
         <Award size={32} color="var(--primary)" style={{ marginBottom: '12px' }} />
         <h3 style={{ fontSize: '1rem', color: 'var(--primary)' }}>Want to climb the ranks?</h3>
         <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
            Earn 10 points for every report, 20 points for AI analysis, and 50 points when specialized teams resolve your report!
         </p>
         <button className="btn-primary" style={{ margin: '0 auto' }} onClick={() => navigate('/report')}>
            Start Reporting
         </button>
      </div>
    </motion.div>
  );
};

export default Leaderboard;
