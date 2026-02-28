import { NavLink } from "react-router-dom";
import { motion } from "framer-motion";
import { Home, Camera, BarChart3, MessageSquare } from "lucide-react";

const Navbar = () => {
  const navItems = [
    { icon: <Home size={22} />, path: "/", label: "Home" },
    { icon: <BarChart3 size={22} />, path: "/dashboard", label: "Insights" },
    { icon: <Camera size={26} />, path: "/report", label: "Report", special: true },
    { icon: <MessageSquare size={22} />, path: "/assistant", label: "Ezhil AI" },
  ];

  return (
    <nav style={{ 
      position: 'fixed', 
      bottom: '10px', 
      left: '10px', 
      right: '10px', 
      background: 'rgba(255, 255, 255, 0.95)', 
      backdropFilter: 'blur(15px)', 
      border: '1px solid rgba(0,0,0,0.05)', 
      borderRadius: '24px',
      padding: '8px 4px', 
      display: 'flex', 
      justifyContent: 'space-around',
      alignItems: 'center',
      zIndex: 1000,
      boxShadow: '0 8px 32px rgba(0,0,0,0.08)'
    }}>
      {navItems.map((item) => (
        <NavLink
          key={item.path}
          to={item.path}
          style={{ textDecoration: 'none', position: 'relative' }}
        >
          {({ isActive }) => (
            <motion.div
              whileTap={{ scale: 0.9 }}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '2px',
                padding: '4px 12px',
                color: isActive ? 'var(--primary)' : 'var(--text-muted)',
                transition: 'color 0.3s ease'
              }}
            >
              <div style={{
                background: item.special ? 'var(--primary)' : 'transparent',
                color: item.special ? 'white' : 'inherit',
                width: item.special ? '48px' : 'auto',
                height: item.special ? '48px' : 'auto',
                borderRadius: item.special ? '16px' : '0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: item.special ? '0 4px 12px rgba(45, 106, 79, 0.3)' : 'none',
                marginBottom: item.special ? '2px' : '0'
              }}>
                {item.icon}
              </div>
              {!item.special && (
                <span style={{ fontSize: '0.65rem', fontWeight: '800', letterSpacing: '0.3px', textTransform: 'uppercase' }}>
                  {item.label}
                </span>
              )}
              {isActive && !item.special && (
                <motion.div 
                  layoutId="navTab"
                  style={{ 
                    position: 'absolute', 
                    bottom: '-4px', 
                    width: '4px', 
                    height: '4px', 
                    borderRadius: '50%', 
                    background: 'var(--primary)' 
                  }} 
                />
              )}
            </motion.div>
          )}
        </NavLink>
      ))}
    </nav>
  );
};

export default Navbar;
