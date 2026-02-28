import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { collection, query, orderBy, onSnapshot, limit } from "firebase/firestore";
import { db } from "../firebase";
import { 
  BarChart3, 
  ShieldAlert, 
  Clock, 
  MapPin, 
  CheckCircle2, 
  AlertCircle,
  TrendingUp,
  Filter
} from "lucide-react";

const Dashboard = () => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [areaScores, setAreaScores] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    resolved: 0,
    pending: 0,
    severitySum: 0,
    types: { Wet: 0, Dry: 0, Hazardous: 0, Mixed: 0 }
  });

  useEffect(() => {
    const q = query(collection(db, "reports"), orderBy("createdAt", "desc"), limit(100));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const reportsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      setReports(reportsData);

      const areaMap = {};
      const calculated = reportsData.reduce((acc, curr) => {
        acc.total += 1;
        if (curr.status === "resolved") acc.resolved += 1;
        else acc.pending += 1;

        if (curr.severity) acc.severitySum += curr.severity;
        if (curr.wasteType && acc.types[curr.wasteType] !== undefined) {
          acc.types[curr.wasteType] += 1;
        }

        if (curr.area) {
          if (!areaMap[curr.area]) {
            areaMap[curr.area] = { name: curr.area, reportCount: 0, penalty: 0, resolved: 0 };
          }
          areaMap[curr.area].reportCount += 1;
          if (curr.status === "resolved") areaMap[curr.area].resolved += 1;
          
          const severityPenalty = curr.severity ? curr.severity : 2; 
          // Resolved reports reduce penalty
          if (curr.status !== "resolved") {
            areaMap[curr.area].penalty += (10 + severityPenalty);
          }
        }

        return acc;
      }, { total: 0, resolved: 0, pending: 0, severitySum: 0, types: { Wet: 0, Dry: 0, Hazardous: 0, Mixed: 0 } });

      const sortedAreas = Object.values(areaMap).map(area => {
        const score = Math.max(0, 100 - area.penalty);
        return { ...area, score };
      }).sort((a, b) => a.score - b.score);

      setAreaScores(sortedAreas);
      setStats(calculated);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const getSeverityColor = (sev) => {
    if (sev >= 4) return "#ef4444";
    if (sev >= 3) return "#f59e0b";
    return "var(--primary)";
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="page-container"
      style={{ padding: '20px', paddingBottom: '100px' }}
    >
      <header style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '1.8rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <BarChart3 size={28} color="var(--primary)" />
            Madurai Pulse
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Real-time cleanliness monitoring</p>
        </div>
        <div style={{ background: 'white', padding: '8px', borderRadius: '12px', boxShadow: 'var(--shadow)' }}>
          <Filter size={20} color="var(--text-muted)" />
        </div>
      </header>

      {/* Primary Analytics Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
        <div className="premium-card" style={{ 
          background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-light) 100%)', 
          color: 'white',
          position: 'relative',
          overflow: 'hidden',
          padding: '20px'
        }}>
          <p style={{ fontSize: '0.75rem', opacity: 0.8, fontWeight: '600' }}>ACTIVE ISSUES</p>
          <div style={{ fontSize: '2rem', fontWeight: 'bold', margin: '4px 0' }}>{stats.pending}</div>
          <TrendingUp size={40} style={{ position: 'absolute', right: '-10px', bottom: '-10px', opacity: 0.2 }} />
        </div>
        
        <div className="premium-card" style={{ border: '2px solid var(--primary-ultra-light)', padding: '20px' }}>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: '600' }}>RESOLVED</p>
          <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--primary)', margin: '4px 0' }}>{stats.resolved}</div>
          <div style={{ fontSize: '0.7rem', color: 'var(--primary)', fontWeight: 'bold' }}>
            {stats.total > 0 ? Math.round((stats.resolved / stats.total) * 100) : 0}% Success Rate
          </div>
        </div>
      </div>

      {/* Score Summary */}
      <div className="premium-card" style={{ marginBottom: '32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h3 style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Avg. Severity Level</h3>
          <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: getSeverityColor(stats.severitySum / stats.total) }}>
            {stats.total > 0 ? (stats.severitySum / stats.total).toFixed(1) : '0.0'}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <h3 style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Total Reports</h3>
          <div style={{ fontSize: '1.8rem', fontWeight: 'bold' }}>{stats.total}</div>
        </div>
      </div>

      {/* Priority Areas Section */}
      <section style={{ marginBottom: '32px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ShieldAlert size={20} color="#ef4444" />
            Area Health Score
          </h3>
          <span style={{ fontSize: '0.7rem', background: '#FEE2E2', color: '#EF4444', padding: '2px 8px', borderRadius: '12px', fontWeight: 'bold' }}>
            ACTION REQUIRED
          </span>
        </div>
        
        <div style={{ 
          display: 'flex', 
          gap: '12px', 
          overflowX: 'auto', 
          paddingBottom: '16px',
          scrollSnapType: 'x mandatory',
          scrollbarWidth: 'none'
        }}>
          {areaScores.map((area, idx) => (
            <motion.div 
              whileTap={{ scale: 0.95 }}
              key={area.name} 
              className="premium-card" 
              style={{ 
                minWidth: '200px', 
                scrollSnapAlign: 'start',
                border: area.score < 60 ? '2px solid #FEF2F2' : '1px solid rgba(0,0,0,0.03)',
                position: 'relative'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                 <div style={{ fontSize: '0.9rem', fontWeight: 'bold' }}>{area.name}</div>
                 <div style={{ 
                    width: '36px', 
                    height: '36px', 
                    borderRadius: '50%', 
                    border: `3px solid ${area.score < 50 ? '#ef4444' : area.score < 80 ? '#f59e0b' : 'var(--primary)'}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.75rem',
                    fontWeight: 'bold'
                 }}>
                   {area.score}
                 </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem' }}>
                   <span style={{ color: 'var(--text-muted)' }}>Reports:</span>
                   <span style={{ fontWeight: 'bold' }}>{area.reportCount}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem' }}>
                   <span style={{ color: 'var(--text-muted)' }}>Resolved:</span>
                   <span style={{ fontWeight: 'bold', color: 'var(--primary)' }}>{area.resolved}</span>
                </div>
                <div style={{ height: '4px', background: '#eee', borderRadius: '2px', marginTop: '4px', overflow: 'hidden' }}>
                   <div style={{ 
                     height: '100%', 
                     width: `${Math.min(100, (area.resolved / area.reportCount) * 100)}%`, 
                     background: 'var(--primary)' 
                   }} />
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Waste Type Analysis */}
      <div className="premium-card" style={{ marginBottom: '32px' }}>
        <h3 style={{ marginBottom: '20px', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <AlertCircle size={18} color="var(--primary)" />
          Waste Type Analysis
        </h3>
        <div style={{ display: 'flex', height: '24px', borderRadius: '12px', overflow: 'hidden', background: '#eee', marginBottom: '20px', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.05)' }}>
          {Object.entries(stats.types).map(([type, count]) => (
            count > 0 && (
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${(count / stats.total) * 100}%` }}
                key={type} 
                style={{ 
                  background: type === 'Wet' ? '#40916C' : type === 'Dry' ? '#95D5B2' : type === 'Hazardous' ? '#ef4444' : '#1B4332',
                }} 
              />
            )
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          {Object.entries(stats.types).map(([type, count]) => (
            <div key={type} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: 'var(--bg-color)', borderRadius: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: type === 'Wet' ? '#40916C' : type === 'Dry' ? '#95D5B2' : type === 'Hazardous' ? '#ef4444' : '#1B4332' }} />
                <span style={{ fontSize: '0.8rem', fontWeight: '600' }}>{type}</span>
              </div>
              <span style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>{stats.total > 0 ? Math.round((count / stats.total) * 100) : 0}%</span>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Feed */}
      <h3 style={{ marginBottom: '16px', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
        <Clock size={20} color="var(--primary)" />
        Live Feed
      </h3>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {loading ? (
             <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>Synchonizing data...</div>
        ) : (
          <AnimatePresence>
            {reports.map((report) => (
              <motion.div 
                layout
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                key={report.id} 
                className="premium-card" 
                style={{ display: 'flex', gap: '16px', padding: '12px', border: '1px solid rgba(0,0,0,0.02)' }}
              >
                <div style={{ width: '64px', height: '64px', borderRadius: '14px', overflow: 'hidden', flexShrink: 0, background: '#f0f0f0' }}>
                  {report.imageUrl ? (
                    <img 
                      src={report.imageUrl} 
                      alt="Waste" 
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                    />
                  ) : (
                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Trash2 size={24} color="var(--primary)" style={{ opacity: 0.2 }} />
                    </div>
                  )}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
                    <div style={{ fontSize: '0.9rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <MapPin size={14} color="var(--primary)" />
                      {report.area || 'Unknown'}
                    </div>
                    {report.status === "resolved" ? (
                      <CheckCircle2 size={18} color="var(--primary)" />
                    ) : (
                      <div style={{ 
                        fontSize: '0.65rem', 
                        background: `${getSeverityColor(report.severity)}15`, 
                        color: getSeverityColor(report.severity), 
                        padding: '2px 8px', 
                        borderRadius: '6px',
                        fontWeight: 'bold'
                      }}>
                        LVL {report.severity || 1}
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: '500' }}>
                      {report.wasteType || 'General Waste'}
                    </span>
                    <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Clock size={10} />
                      {report.createdAt?.toDate ? report.createdAt.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Recently'}
                    </span>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>

      <p style={{ textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '40px', padding: '0 20px', lineHeight: '1.4' }}>
        Scores are calculated using citizen-reported data within this application. Madurai Ezhil is committed to a cleaner community.
      </p>
    </motion.div>
  );
};

export default Dashboard;
