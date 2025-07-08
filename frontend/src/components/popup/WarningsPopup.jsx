import React, { useState, useRef } from 'react';
import CloseIcon from '@mui/icons-material/Close';
import { Box, IconButton } from '@mui/material';
import { useThemeContext } from '../../context/ThemeContext';
import Draggable from 'react-draggable';
import './style/RuleDetailsPopup.css';

const WarningsPopup = ({ warnings, onClose, onSelectNode }) => {
  const [expandedWarnings, setExpandedWarnings] = useState({});
  const { getColor } = useThemeContext();
  const nodeRef = useRef(null);

  const containerStyle = {
    position: 'fixed',
    bottom: 20,
    right: 20,
    width: 350,
    height: '60vh',
    backgroundColor: getColor('barBackground'),
    borderRadius: 2,
    boxShadow: getColor('shadow'),
    border: `1px solid ${getColor('border')}`,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    zIndex: 1100,
  };

  const headerStyle = {
    display: 'flex',
    borderBottom: `1px solid ${getColor('border')}`,
    padding: '8px',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: getColor('barBackground'),
  };

  const toggleWarning = (id) => {
    setExpandedWarnings((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  return (
    <Draggable
      handle=".drag-handle"
      nodeRef={nodeRef}
      bounds="parent"
    >
      <Box ref={nodeRef} sx={containerStyle}>
        <Box sx={headerStyle} className="drag-handle">
          <Box sx={{ color: getColor('barText'), fontWeight: 'bold' }}>
            Validation Warnings
          </Box>
          <IconButton onClick={onClose} size="small" sx={{ color: getColor('barText') }}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>
        <Box sx={{ p: 2, overflow: 'auto', flex: 1 }}>
          {warnings.length === 0 ? (
            <p style={{ color: '#666' }}>No warnings found.</p>
          ) : (
            warnings.map(({ id, rule, warnings }) => {
              const isExpanded = expandedWarnings[id];
              return (
                <Box key={id} sx={{ mb: 2, backgroundColor: getColor('background'), borderRadius: 1, overflow: 'hidden' }}>
                  <Box
                    sx={{
                      p: 1,
                      display: 'flex',
                      alignItems: 'center',
                      cursor: 'pointer',
                      color: getColor('barText'),
                      borderBottom: `1px solid ${getColor('border')}`,
                      '&:hover': {
                        backgroundColor: getColor('hover')
                      }
                    }}
                    onClick={() => toggleWarning(id)}
                  >
                    <span style={{ marginRight: '8px' }}>
                      {isExpanded ? '▼' : '▶'}
                    </span>
                    <span style={{ fontWeight: 500 }}>
                      {rule}
                    </span>
                    <span style={{ marginLeft: '12px', fontSize: '0.9em' }}>
                      {warnings.length} warning{warnings.length > 1 ? 's' : ''}
                    </span>
                  </Box>
                  {isExpanded && (
                    <Box sx={{ p: 1, backgroundColor: getColor('background') }}>
                      {warnings.map((warning, idx) => (
                        <Box
                          key={idx}
                          sx={{
                            p: 1,
                            color: getColor('barText'),
                            '&:hover': {
                              backgroundColor: getColor('hover')
                            }
                          }}
                          onClick={() => onSelectNode && onSelectNode(warning.node)}
                        >
                          {warning.message}
                        </Box>
                      ))}
                    </Box>
                  )}
                </Box>
              );
            })
          )}
        </Box>
      </Box>
    </Draggable>
  );
};

export default WarningsPopup;