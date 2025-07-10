import React from 'react';
import { Handle, Position } from 'reactflow';
import { useThemeContext } from '../../context/ThemeContext';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import BlockIcon from '@mui/icons-material/Block';
import VisibilityIcon from '@mui/icons-material/Visibility';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import Tooltip from '@mui/material/Tooltip';
import ReactDOM from 'react-dom';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import CompareArrowsIcon from '@mui/icons-material/CompareArrows';
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord';

const getNodeStyle = (action, diameter, isParent, isChild, darkTheme, isFaded) => {
    const nodeStyle = {
        width: diameter,
        height: diameter,
        borderRadius: '50%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '14px',
        fontWeight: 'bold',
        color: '#fff',
        boxShadow: darkTheme 
            ? '0 4px 6px rgba(0, 0, 0, 0.4)' 
            : '0 4px 6px rgba(56, 57, 59, 0.3)',
        border: `3px solid ${darkTheme ? '#444' : 'rgb(23, 26, 23)'}`,
        textAlign: 'center',
        padding: 0,
        position: 'relative',
        background: darkTheme ? '#2f4f4f' : '#2f4f4f',
        transition: 'all 0.3s ease',
        opacity: isFaded ? 0.3 : 1,
        outline: 'none',
    };
    if (isParent && !isChild) {
        nodeStyle.background = darkTheme ? '#1976d2' : '#1976d2'; // blue
        nodeStyle.border = `3px solid ${darkTheme ? '#2196f3' : '#2196f3'}`;
    } else if (!isParent && isChild) {
        nodeStyle.background = darkTheme ? '#43a047' : '#43a047'; // green
        nodeStyle.border = `3px solid ${darkTheme ? '#66bb6a' : '#66bb6a'}`;
    } else if (isParent && isChild) {
        nodeStyle.background = darkTheme ? '#00897b' : '#00897b'; // teal
        nodeStyle.border = `3px solid ${darkTheme ? '#26a69a' : '#26a69a'}`;
    } else {
        nodeStyle.background = darkTheme ? '#757575' : '#bdbdbd'; // gray
        nodeStyle.border = `3px solid ${darkTheme ? '#bdbdbd' : '#757575'}`;
    }
    return nodeStyle;
};

export default function CustomNode({ data, id, selected, isFaded }) {
    const { darkTheme } = useThemeContext();
    const diameter = 80;
    const isParent = data.isParent;
    const isChild = data.isChild;
    const displayName = data.name && data.name.length > 8 ? data.name.slice(0, 8) + '\u2026' : data.name;
    const nodeStyle = getNodeStyle(data.action, diameter, isParent, isChild, darkTheme, isFaded);
    if (selected) {
        nodeStyle.boxShadow = darkTheme 
            ? '0 0 0 2px #fff, 0 4px 6px rgba(0, 0, 0, 0.4)' 
            : '0 0 0 2px #000, 0 4px 6px rgba(56, 57, 59, 0.3)';
    }
    // Icon logic
    let icon = <FiberManualRecordIcon fontSize="small" aria-label="Other" />;
    let iconTooltip = 'Other';
    if (isParent && isChild) {
        icon = <CompareArrowsIcon fontSize="small" aria-label="Parent & Child" />;
        iconTooltip = 'Parent & Child';
    } else if (isParent) {
        icon = <ArrowUpwardIcon fontSize="small" aria-label="Parent" />;
        iconTooltip = 'Parent';
    } else if (isChild) {
        icon = <ArrowDownwardIcon fontSize="small" aria-label="Child" />;
        iconTooltip = 'Child';
    }
    return (
        <div
            style={nodeStyle}
            tabIndex={0}
            aria-label={iconTooltip + ' node: ' + (data.Name || data.name)}
            role="button"
        >
            <Tooltip title={iconTooltip} arrow>
                <span>{icon}</span>
            </Tooltip>
            <Tooltip title={data.Name || data.name} arrow>
                <div style={{ fontWeight: 'bold', fontSize: 18, textAlign: 'center', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', width: '100%', color: '#fff', textShadow: darkTheme ? '0 1px 2px rgba(0,0,0,0.5)' : 'none', marginTop: 4 }}>{data.Name || data.name}</div>
            </Tooltip>
            {/* Action and count/priority below name */}
            <div style={{ fontSize: 14, color: '#e0e0e0', marginTop: 4, textAlign: 'center', fontWeight: 500 }}>
                {data.action && <span style={{ marginRight: 4 }}>{data.action}</span>}
                {(data.Priority !== undefined || data.priority !== undefined) && <span>| {data.Priority ?? data.priority}</span>}
            </div>
        </div>
    );
} 