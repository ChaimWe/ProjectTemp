import React from 'react';
import { Handle, Position } from 'reactflow';
import { useThemeContext } from '../../context/ThemeContext';

const getNodeStyle = (action, diameter, isParent, isChild, darkTheme) => {
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
    };

    // Color logic with dark mode support
    if (isParent && !isChild) {
        nodeStyle.background = darkTheme ? '#1976d2' : '#1060a5'; // blue
        nodeStyle.border = `3px solid ${darkTheme ? '#2196f3' : '#1e88e5'}`;
    } else if (!isParent && isChild) {
        nodeStyle.background = darkTheme ? '#2e7d32' : '#1f9e21'; // green
        nodeStyle.border = `3px solid ${darkTheme ? '#4caf50' : '#43a047'}`;
    } else if (isParent && isChild) {
        nodeStyle.background = darkTheme ? '#00897b' : '#1fa59e'; // teal (mix)
        nodeStyle.border = `3px solid ${darkTheme ? '#26a69a' : '#26a69a'}`;
    } else {
        nodeStyle.background = darkTheme ? '#424242' : '#888888'; // gray
        nodeStyle.border = `3px solid ${darkTheme ? '#616161' : '#757575'}`;
    }

    return nodeStyle;
};

export default function CustomNode({ data, id, selected }) {
    const { darkTheme } = useThemeContext();
    const diameter = 60;
    const isParent = data.isParent;
    const isChild = data.isChild;
    const displayName = data.name && data.name.length > 8 ? data.name.slice(0, 8) + '…' : data.name;

    const nodeStyle = getNodeStyle(data.action, diameter, isParent, isChild, darkTheme);
    if (selected) {
        nodeStyle.boxShadow = darkTheme 
            ? '0 0 0 2px #fff, 0 4px 6px rgba(0, 0, 0, 0.4)' 
            : '0 0 0 2px #000, 0 4px 6px rgba(56, 57, 59, 0.3)';
    }

    return (
        <div style={nodeStyle} title={data.name}>
            <Handle 
                type="target" 
                position={Position.Top} 
                id={`target-${id}`} 
                style={{ 
                    opacity: 0,
                    background: darkTheme ? '#fff' : '#000'
                }} 
            />
            <div style={{ 
                fontSize: 12, 
                fontWeight: 'bold', 
                textAlign: 'center', 
                whiteSpace: 'nowrap', 
                overflow: 'hidden', 
                textOverflow: 'ellipsis', 
                width: '100%',
                color: '#fff',
                textShadow: darkTheme ? '0 1px 2px rgba(0,0,0,0.5)' : 'none'
            }}>
                {displayName}
            </div>
            <div style={{ 
                fontSize: 9, 
                textAlign: 'center',
                color: darkTheme ? 'rgba(255,255,255,0.9)' : '#fff',
                textShadow: darkTheme ? '0 1px 2px rgba(0,0,0,0.5)' : 'none'
            }}>
                {data.action} | {data.priority}
            </div>
            <Handle 
                type="source" 
                position={Position.Bottom} 
                id={`source-${id}`} 
                style={{ 
                    opacity: 0,
                    background: darkTheme ? '#fff' : '#000'
                }} 
            />
        </div>
    );
}