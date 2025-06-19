import { Box } from '@mui/material';
import WAFRuleTree from '../components/WAFView/WAFView';
import Sidebar from '../components/layout/Sidebar';
import { useState, useEffect } from 'react';
import RequestDebugger from '../debugger/RequestDebugger';
import backgroundImage from '../assets/pexels-scottwebb-1029624.jpg';
import logo from '../assets/1002079229-removebg-preview.png';

export default function ExplorerPage() {
  const [view, setView] = useState('tree');
  const [data, setData] = useState(null);

  // Debug logging
  useEffect(() => {
    console.log('[ExplorerPage] Data changed:', data);
  }, [data]);

  useEffect(() => {
    console.log('[ExplorerPage] View changed:', view);
  }, [view]);

  const handleSetData = (newData) => {
    console.log('[ExplorerPage] setData called with:', newData);
    setData(newData);
  };

  console.log('[ExplorerPage] Render - view:', view, 'data:', data);

  return (
    <div style={styles.mainContainer}>
      <nav style={styles.nav}>
        <div style={styles.navContent}>
          <img
            src={logo}
            alt="Logo"
            style={styles.logoImage}
            onClick={() => window.location.href = '/'}
          />
          <div style={styles.navLinks}>
            <button style={styles.navButton} onClick={() => window.location.href = '/'}>Home</button>
            <button style={styles.navButton} onClick={() => window.location.href = '/about'}>About</button>
          </div>
        </div>
      </nav>
      <Box sx={{ display: 'flex', width: '100vw', height: '100vh', pt: '70px', background: 'transparent' }}>
        <Sidebar view={view} setView={setView} />
        <Box sx={{ flex: 1, overflow: 'auto' }}>
          {view === 'tree' && <WAFRuleTree data={data} setData={handleSetData} />}
          {view === 'debugger' && <RequestDebugger rules={data} />}
        </Box>
      </Box>
    </div>
  );
}

const styles = {
  mainContainer: {
    fontFamily: "'Poppins', sans-serif",
    width: '100%',
    minHeight: '100vh',
    background: `url(${backgroundImage}) no-repeat center center / cover`,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    overflowX: 'hidden',
  },
  nav: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    height: '70px',
    display: 'flex',
    alignItems: 'center',
    transition: 'background 0.3s ease, box-shadow 0.3s ease',
    background: 'rgba(255, 255, 255, 0.5)',
    boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
  },
  navContent: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '0 1.5rem',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
  },
  logoImage: {
    height: '100px',
    cursor: 'pointer',
  },
  navLinks: {
    display: 'flex',
    gap: '1rem',
  },
  navButton: {
    background: 'transparent',
    color: '#220d4e',
    border: 'none',
    padding: '0.5rem 1rem',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '1rem',
    transition: 'background 0.2s ease',
  },
};