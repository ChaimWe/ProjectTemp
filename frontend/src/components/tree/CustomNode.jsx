import React from 'react';
import { Handle, Position } from '@xyflow/react';

const getNodeStyle = (action, diameter, isParent, isChild) => {
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
        color: 'white',
        boxShadow: '0 4px 6px rgba(56, 57, 59, 0.3)',
        border: '3px solid rgb(23, 26, 23)',
        textAlign: 'center',
        padding: 0,
        position: 'relative',
        background: '#2f4f4f',
    };
    // Color logic
    if (isParent && !isChild) {
        nodeStyle.background = '#1060a5'; // blue
    } else if (!isParent && isChild) {
        nodeStyle.background = '#1f9e21'; // green
    } else if (isParent && isChild) {
        nodeStyle.background = '#1fa59e'; // teal (mix)
    } else {
        nodeStyle.background = '#888888'; // gray
    }
    // Optionally, override for action if you want
    return nodeStyle;
};

export default function CustomNode({ data, id }) {
    //console.log('[CustomNode] id:', id, 'data:', data);
    // Use a fixed diameter for all nodes
    const diameter = 60;
    const isParent = data.isParent;
    const isChild = data.isChild;
    // Truncate name if too long
    const displayName = data.name && data.name.length > 8 ? data.name.slice(0, 8) + '…' : data.name;
    return (
        <div style={{ ...getNodeStyle(data.action, diameter, isParent, isChild) }} title={data.name}>
            <Handle type="target" position={Position.Top} id={`target-${id}`} style={{ opacity: 0 }} />
            <div style={{ fontSize: 12, fontWeight: 'bold', textAlign: 'center', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', width: '100%' }}>{displayName}</div>
            <div style={{ fontSize: 9, textAlign: 'center' }}>{data.action} | {data.priority}</div>
            <Handle type="source" position={Position.Bottom} id={`source-${id}`} style={{ opacity: 0 }} />
        </div>
    );
}