import { Box } from '@mui/material';
import RequestDebugger from '../debugger/RequestDebugger';
import Sidebar from '../components/layout/Sidebar';
import { useState, useEffect } from 'react';
import backgroundImage from '../assets/pexels-scottwebb-1029624.jpg';
import logo from '../assets/1002079229-removebg-preview.png';
import WAFView, { normalizeRulesData } from '../components/WAFView/WAFView';
import { useOutletContext } from 'react-router-dom';
import { useThemeContext } from '../context/ThemeContext';

/**
 * ExplorerPage component manages the main app view, switching between tree and debugger views.
 * Passes context and handlers to WAFView and RequestDebugger.
 */
export default function ExplorerPage() {
  const [view, setView] = useState('tree');
  const [searchTerm, setSearchTerm] = useState('');
  const [warningCount, setWarningCountLocal] = useState(0);
  const { darkTheme } = useThemeContext();
  const styles = getStyles(darkTheme);

  // Get handlers and state from AppLayout context
  const {
    exportToPdf,
    exportToImage,
    handleWarnings,
    setWarningCount,
    warningsPopupOpen,
    setWarningsPopupOpen,
    flowRef,
    loaderPopupOpen,
    setLoaderPopupOpen,
    data,
    setData,
    handleExportVectorPdf,
    showArrows,
    dottedLines,
    animatedLines
  } = useOutletContext();

  // Debug logging
  useEffect(() => {
    console.log('[ExplorerPage] Data changed:', data);
  }, [data]);

  useEffect(() => {
    console.log('[ExplorerPage] View changed:', view);
  }, [view]);

  /**
   * Handles setting and normalizing new data for the app.
   */
  const handleSetData = (newData) => {
    const normalized = normalizeRulesData(newData);
    setData(normalized);
  };

  /**
   * Handles rules received from the loader popup and normalizes them.
   */
  const handleRulesReceived = (rulesData) => {
    const normalized = normalizeRulesData(rulesData);
    setData(normalized);
    setLoaderPopupOpen(false);
  };

  console.log('[ExplorerPage] Render - view:', view, 'data:', data);
  
  return (
    <div style={{ ...styles.mainContainer, position: 'relative' }}>
      {/* Dark overlay for dark mode */}
      {darkTheme && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          background: 'rgba(0,0,0,0.55)',
          zIndex: 0,
          pointerEvents: 'none',
        }} />
      )}
      <Box sx={{ display: 'flex', width: '100vw', height: '100vh', pt: '70px', background: 'transparent', position: 'relative', zIndex: 1 }}>
        <Sidebar view={view} setView={setView} />
        <Box sx={{ flex: 1, overflow: 'auto' }}>
          {view === 'tree' && (
            <WAFView
              data={data}
              setData={handleSetData}
              exportToPdf={exportToPdf}
              exportToImage={exportToImage}
              handleWarnings={handleWarnings}
              setWarningCount={setWarningCount}
              warningsPopupOpen={warningsPopupOpen}
              setWarningsPopupOpen={setWarningsPopupOpen}
              flowRef={flowRef}
              loaderPopupOpen={loaderPopupOpen}
              setLoaderPopupOpen={setLoaderPopupOpen}
              handleExportVectorPdf={handleExportVectorPdf}
              showArrows={showArrows}
              dottedLines={dottedLines}
              animatedLines={animatedLines}
            />
          )}
          {view === 'debugger' && (
            <>
              {console.log('[ExplorerPage] Debug - Raw data:', data)}
              {console.log('[ExplorerPage] Debug - Normalized data:', normalizeRulesData(data))}
              <RequestDebugger 
                key={`debugger-${normalizeRulesData(data)?.length || 0}`} 
                rules={normalizeRulesData(data)} 
              />
            </>
          )}
        </Box>
      </Box>
    </div>
  );
}

/**
 * Returns style objects for the ExplorerPage based on the current theme.
 */
function getStyles(darkTheme) {
  return {
    mainContainer: {
      fontFamily: "'Poppins', sans-serif",
      width: '100%',
      minHeight: '100vh',
      background: darkTheme
        ? `linear-gradient(rgba(34,34,34,0.95), rgba(34, 34, 34, 0.95)), url(${backgroundImage}) no-repeat center center / cover`
        : `url(${backgroundImage}) no-repeat center center / cover`,
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      overflowX: 'hidden',
      transition: 'background 0.5s',
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
}