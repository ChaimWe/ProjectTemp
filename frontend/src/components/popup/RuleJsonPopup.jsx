import React, { useState, useRef } from 'react';
import { Box, IconButton, TextField } from '@mui/material';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import { useThemeContext } from '../../context/ThemeContext';
import Draggable from 'react-draggable';
import './style/RuleDetailsPopup.css';

/**
 * RuleJsonPopup component displays the raw JSON for a rule in a popup dialog.
 * Handles closing the popup.
 */
const RuleJsonPopup = ({ json }) => {
  const { getColor } = useThemeContext();
  const [searchTerm, setSearchTerm] = useState('');
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);
  const matchRefs = useRef([]);
  const nodeRef = useRef(null);

  const handleMatchNavigation = (direction) => {
    if (!json || !searchTerm) return;
    const regex = new RegExp(searchTerm, 'gi');
    const matches = json.match(regex) || [];
    if (matches.length === 0) return;

    setCurrentMatchIndex(prev => {
      const newIndex = direction === 'NEXT'
        ? (prev + 1) % matches.length
        : (prev - 1 + matches.length) % matches.length;

      setTimeout(() => {
        const matchElement = matchRefs.current[newIndex];
        if (matchElement) {
          matchElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 0);

      return newIndex;
    });
  };

  const handleKeyDown = (event) => {
    if (event.key === 'Enter') {
      handleMatchNavigation('NEXT');
    }
  };

  return (
    <Draggable
      handle=".drag-handle"
      nodeRef={nodeRef}
      bounds="parent"
    >
      <Box ref={nodeRef} sx={{ position: 'relative' }}>
        <Box className="drag-handle" sx={{ 
          p: 1, 
          display: 'flex', 
          alignItems: 'center', 
          gap: 1,
          borderBottom: `1px solid ${getColor('border')}`,
          backgroundColor: getColor('barBackground'),
        }}>
          <TextField
            size="small"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search in JSON..."
            sx={{ flex: 1 }}
          />
          <IconButton
            onClick={() => handleMatchNavigation('PREV')}
            disabled={!searchTerm}
          >
            <ArrowUpwardIcon />
          </IconButton>
          <IconButton
            onClick={() => handleMatchNavigation('NEXT')}
            disabled={!searchTerm}
          >
            <ArrowDownwardIcon />
          </IconButton>
        </Box>
        <Box sx={{ 
          maxHeight: '60vh',
          overflow: 'auto',
          p: 2,
          backgroundColor: getColor('background'),
          color: getColor('barText'),
          fontFamily: 'monospace',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word'
        }}>
          {json}
        </Box>
      </Box>
    </Draggable>
  );
};

export default RuleJsonPopup;