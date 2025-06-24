import React, { useState } from 'react';
import { Box, IconButton } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import RuleDetailsPopup from './RuleDetailsPopup';
import RuleJsonPopup from './RuleJsonPopup';
import { useThemeContext } from '../../context/ThemeContext';
import Draggable from 'react-draggable';
import RuleChatPopup from './RuleChatPopup';

/**
 * RulePopup component displays detailed information about a selected rule in a popup dialog.
 * Handles navigation and closing of the popup.
 */
const RulePopup = ({ selectedNode, onClose, dataArray, backToWarning, backTo, centerNode }) => {
  const [viewMode, setViewMode] = useState('details');
  const [chatOpen, setChatOpen] = useState(false);
  const { getColor } = useThemeContext();
  const styles = {
    container: {
      position: 'fixed',
      bottom: 20,
      right: 20,
      width: 350,
      height: '60vh',
      backgroundColor: getColor('background'),
      borderRadius: 2,
      boxShadow: getColor('shadow'),
      border: `1px solid ${getColor('border')}`,
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      zIndex: 1100,
    },
    header: {
      display: 'flex',
      borderBottom: `1px solid ${getColor('border')}`,
      backgroundColor: getColor('barBackground'),
      padding: '8px',
      alignItems: 'center',
      justifyContent: 'space-between',
      cursor: 'move',
    },
    tabButton: (active) => ({
      color: getColor('barText'),
      background: 'none',
      border: 'none',
      padding: '5px 10px',
      cursor: 'pointer',
      fontWeight: active ? 'bold' : 'normal',
      borderBottom: active ? `2px solid ${getColor('border')}` : 'none'
    })
  };

  /**
   * Handles closing the popup.
   */
  const handleClose = () => {
    // ... existing code ...
  };

  return (
    <>
      <Draggable handle=".rule-popup-drag-handle" cancel=".MuiIconButton-root,button[tabindex='-1']">
        <Box sx={styles.container}>
          <Box sx={styles.header} className="rule-popup-drag-handle">
            <div>
              <button
                style={styles.tabButton(viewMode === 'details')}
                onClick={() => setViewMode('details')}
              >  Details
              </button>
              <button
                style={styles.tabButton(viewMode === 'json')}
                onClick={() => setViewMode('json')}
              >  JSON
              </button>
              {backTo && <button onClick={backToWarning} style={{ boxShadow: getColor('shadow'), borderRadius: '10px', color: getColor('barText'), background: 'none', border: 'none', padding: '5px 10px', cursor: 'pointer', fontWeight: 'bold' }}>Back</button>}
            </div>
            <IconButton
              onClick={onClose}
              size="small"
              sx={{ color: getColor('barText') }}>
              <CloseIcon fontSize="small" />
            </IconButton>
          </Box>
          <Box sx={{ overflow: 'auto', flex: 1, p: 2, padding: '8px', backgroundColor: getColor('barBackground') }}>
            {viewMode === 'details' ? (
              <RuleDetailsPopup rule={selectedNode} dataArray={dataArray} centerNode={centerNode} onOpenChat={() => setChatOpen(true)} />
            ) : (
              <RuleJsonPopup json={selectedNode.data ? selectedNode.data.json : selectedNode.json} />
            )}
          </Box>
        </Box>
      </Draggable>
      {chatOpen && (
        <RuleChatPopup rule={selectedNode} onClose={() => setChatOpen(false)} />
      )}
    </>
  );
};

export default RulePopup;