import React, { useState, useRef, useCallback } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import TopBar from './components/layout/Topbar';
import Sidebar from './components/layout/Sidebar';
import { Box } from '@mui/material';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { useThemeContext } from './context/ThemeContext';

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

  /**
   * Handles exporting the flowchart as a PDF file.
   */
  const exportToPdf = useCallback(async () => {
    if (!flowRef.current) {
      console.warn('Flow ref not available');
      return;
    }

    try {
      // Get the flow container element
      const flowElement = document.querySelector('.react-flow');
      if (!flowElement) {
        console.warn('Flow element not found');
        return;
      }

      // Create a canvas from the flow element
      const canvas = await html2canvas(flowElement, {
        backgroundColor: darkTheme ? '#1a1a1a' : '#ffffff',
        scale: 2, // Higher quality
        logging: false,
        useCORS: true
      });

      // Calculate dimensions
      const imgWidth = 210; // A4 width in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      // Create PDF
      const pdf = new jsPDF('l', 'mm', 'a4'); // Landscape orientation
      pdf.addImage(canvas.toDataURL('image/jpeg', 1.0), 'JPEG', 0, 0, imgWidth, imgHeight);
      
      // Save the PDF
      pdf.save('waf-rules-flowchart.pdf');
    } catch (error) {
      console.error('Error exporting to PDF:', error);
      alert('Failed to export PDF. Please try again.');
    }
  }, [flowRef, darkTheme]);

  /**
   * Handles exporting the flowchart as an image file.
   */
  const exportToImage = useCallback(async () => {
    if (!flowRef.current) {
      console.warn('Flow ref not available');
      return;
    }

    try {
      const flowElement = document.querySelector('.react-flow');
      if (!flowElement) {
        console.warn('Flow element not found');
        return;
      }

      const canvas = await html2canvas(flowElement, {
        backgroundColor: darkTheme ? '#1a1a1a' : '#ffffff',
        scale: 2,
        logging: false,
        useCORS: true
      });

      // Convert to PNG and download
      const link = document.createElement('a');
      link.download = 'waf-rules-flowchart.png';
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (error) {
      console.error('Error exporting to image:', error);
      alert('Failed to export image. Please try again.');
    }
  }, [flowRef, darkTheme]);

  /**
   * Handles opening the warnings popup.
   */
  const handleWarnings = useCallback(() => {
    setWarningsPopupOpen(true);
  }, []);

  // Determine which section is active for TopBar
  const aclDetails = location.pathname.includes('debugger')
    ? { aclName: 'Request Debugger' }
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
      />
      <Box sx={{ display: 'flex', width: '100vw', height: '100vh', pt: '70px', background: 'none', backgroundColor: 'none', m: 0, p: 0 }}>
        <Sidebar view={location.pathname.includes('debugger') ? 'debugger' : 'tree'} setView={v => navigate(v === 'debugger' ? '/app/debugger' : '/app/visualization')} />
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
            dottedLines,
            animatedLines
          }} />
        </Box>
      </Box>
    </div>
  );
}
