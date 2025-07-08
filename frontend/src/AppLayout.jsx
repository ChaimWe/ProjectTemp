import React, { useState, useRef, useCallback } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import TopBar from './components/layout/Topbar';
import Sidebar from './components/layout/Sidebar';
import { Box } from '@mui/material';
import { useThemeContext } from './context/ThemeContext';
import RulesLoaderPopup from './components/upload/RulesLoaderPopup';
import { normalizeRulesData } from './components/WAFView/WAFView';
import AIChatPanel from './components/popup/AIChatPanel';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';
import Modal from '@mui/material/Modal';

/**
 * AppLayout component provides the main layout, top bar, sidebar, and context for the app.
 * Manages global state and handlers for the application.
 */
export default function AppLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [loaderPopupOpen, setLoaderPopupOpen] = useState(false);
  const [warningCount, setWarningCount] = useState(0);
  const [data, setData] = useState([]);
  const [warningsPopupOpen, setWarningsPopupOpen] = useState(false);
  const [showArrows, setShowArrows] = useState(true);
  const [dottedLines, setDottedLines] = useState(false);
  const [animatedLines, setAnimatedLines] = useState(false);
  const flowRef = useRef();
  const { darkTheme } = useThemeContext();
  const [viewType, setViewType] = useState('tree'); // tree, table, card, etc.
  const [treeSetup, setTreeSetup] = useState('collapsible'); // collapsible, horizontal, indented, etc.
  const [orderBy, setOrderBy] = useState('name'); // name, date, type, etc.
  const [treeStyle, setTreeStyle] = useState('dependency'); // dependency, radial, angled
  const [aiChatOpen, setAiChatOpen] = useState(false);

  /**
   * Handles exporting the flowchart as a PDF file.
   */
  const exportToPdf = useCallback(async () => {
    if (!flowRef.current) {
      console.warn('Flow ref not available');
      return;
    }

    try {
      // Use the handleExportPdf method from the FlowChart component
      if (flowRef.current.handleExportPdf) {
        flowRef.current.handleExportPdf();
      } else {
        console.warn('handleExportPdf method not available on flow ref');
      }
    } catch (error) {
      console.error('Error exporting to PDF:', error);
      alert('Failed to export PDF. Please try again.');
    }
  }, [flowRef]);

  /**
   * Handles exporting the flowchart as an image file.
   */
  const exportToImage = useCallback(async () => {
    if (!flowRef.current) {
      console.warn('Flow ref not available');
      return;
    }

    try {
      // Use the handleExportImage method from the FlowChart component
      if (flowRef.current.handleExportImage) {
        flowRef.current.handleExportImage();
      } else {
        console.warn('handleExportImage method not available on flow ref');
      }
    } catch (error) {
      console.error('Error exporting to image:', error);
      alert('Failed to export image. Please try again.');
    }
  }, [flowRef]);

  /**
   * Handles opening the warnings popup.
   */
  const handleWarnings = useCallback(() => {
    setWarningsPopupOpen(true);
  }, []);

  // Determine which section is active for TopBar
  const aclDetails = location.pathname.includes('debugger')
    ? { aclName: 'Request Debugger' }
    : location.pathname.includes('ai')
    ? { aclName: 'AI Assistant' }
    : { aclName: 'WAF Rules' };

  return (
    <div style={{ fontFamily: "'Poppins', sans-serif", width: '100%', minHeight: '100vh', background: 'none', position: 'absolute', top: 0, left: 0, right: 0, overflowX: 'hidden', boxShadow: 'none', borderRadius: 0 }}>
      <TopBar
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        setLoaderPopupOpen={setLoaderPopupOpen}
        aclDetails={aclDetails}
        warningCount={warningCount}
        onExportPdf={exportToPdf}
        onExportImage={exportToImage}
        onWarnings={handleWarnings}
        showArrows={showArrows}
        setShowArrows={setShowArrows}
        dottedLines={dottedLines}
        setDottedLines={setDottedLines}
        animatedLines={animatedLines}
        setAnimatedLines={setAnimatedLines}
        viewType={viewType}
        setViewType={setViewType}
        treeSetup={treeSetup}
        setTreeSetup={setTreeSetup}
        orderBy={orderBy}
        setOrderBy={setOrderBy}
        rules={data}
        treeStyle={treeStyle}
        setTreeStyle={setTreeStyle}
      />
      <Box sx={{ display: 'flex', width: '100vw', height: '100vh', pt: '70px', background: 'none', backgroundColor: 'none', m: 0, p: 0 }}>
        <Sidebar 
          view={location.pathname.includes('debugger') ? 'debugger' : location.pathname.includes('ai') ? 'ai' : 'tree'} 
          setView={v => navigate(v === 'debugger' ? '/app/debugger' : v === 'ai' ? '/app/ai' : '/app/visualization')} 
        />
        <Box sx={{ flex: 1, overflow: 'auto', background: 'none', backgroundColor: 'none', m: 0, p: 0 }}>
          <Outlet context={{
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
            showArrows,
            setShowArrows,
            dottedLines,
            setDottedLines,
            animatedLines,
            setAnimatedLines,
            viewType,
            setViewType,
            treeSetup,
            setTreeSetup,
            orderBy,
            setOrderBy,
            treeStyle,
            setTreeStyle
          }} />
        </Box>
      </Box>
      {/* Floating AI Chat Button */}
      <button
        onClick={() => setAiChatOpen(true)}
        style={{
          position: 'fixed',
          bottom: 32,
          right: 32,
          zIndex: 3000,
          width: 64,
          height: 64,
          borderRadius: '50%',
          background: '#1976d2',
          color: '#fff',
          border: 'none',
          boxShadow: '0 4px 16px rgba(25, 118, 210, 0.25)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 32,
          transition: 'background 0.2s',
        }}
        title="Open AI Assistant"
      >
        <ChatBubbleOutlineIcon style={{ fontSize: 36 }} />
      </button>
      {/* AI Chat Modal */}
      <Modal open={aiChatOpen} onClose={() => setAiChatOpen(false)} style={{ zIndex: 3500 }}>
        <Box sx={{
          position: 'fixed',
          bottom: 100,
          right: 40,
          width: 420,
          maxWidth: '95vw',
          height: 540,
          maxHeight: '90vh',
          background: darkTheme ? '#23272f' : '#fff',
          borderRadius: 4,
          boxShadow: 24,
          p: 0,
          zIndex: 3501,
          display: 'flex',
          flexDirection: 'column',
        }}>
          <AIChatPanel isAIPage={false} />
        </Box>
      </Modal>
      <RulesLoaderPopup
        open={loaderPopupOpen}
        onClose={() => setLoaderPopupOpen(false)}
        onRulesLoaded={(rules) => {
          setData(normalizeRulesData(rules));
          setLoaderPopupOpen(false);
          // Optionally, add a snackbar or notification here
        }}
      />
    </div>
  );
}
