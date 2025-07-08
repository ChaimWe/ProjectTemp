import React from 'react';
import { Handle, Position } from 'reactflow';
import { useThemeContext } from '../../context/ThemeContext';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import BlockIcon from '@mui/icons-material/Block';
import VisibilityIcon from '@mui/icons-material/Visibility';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import Tooltip from '@mui/material/Tooltip';
import ReactDOM from 'react-dom';

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

    // Helper: get rule type and key info
    function getRuleTypeAndInfo(statement) {
        if (!statement) return { type: 'Unknown', info: '' };
        if (statement.ByteMatchStatement) {
            return { type: 'ByteMatch', info: `"${statement.ByteMatchStatement.SearchString}"` };
        }
        if (statement.RegexMatchStatement) {
            return { type: 'RegexMatch', info: statement.RegexMatchStatement.RegexString };
        }
        if (statement.RateBasedStatement) {
            return { type: 'RateBased', info: `Limit: ${statement.RateBasedStatement.Limit}` };
        }
        if (statement.AndStatement) {
            return { type: 'And', info: `${statement.AndStatement.Statements?.length || 0} conditions` };
        }
        if (statement.OrStatement) {
            return { type: 'Or', info: `${statement.OrStatement.Statements?.length || 0} options` };
        }
        if (statement.LabelMatchStatement) {
            return { type: 'LabelMatch', info: statement.LabelMatchStatement.Key };
        }
        return { type: Object.keys(statement)[0], info: '' };
    }

    // Popup mode: best-of info, modal for details
    if (data.inPopup) {
        const { type, info } = getRuleTypeAndInfo(data.Statement);
        const action = data.Action ? Object.keys(data.Action)[0] : 'None';
        const labels = (data.RuleLabels || []).map(l => l.Name);
        const [showDetails, setShowDetails] = React.useState(false);
        const bigDiameter = 110;
        const bigNodeStyle = {
            ...getNodeStyle(data.action, bigDiameter, isParent, isChild, darkTheme),
            fontSize: 15,
            padding: 6,
            minWidth: bigDiameter,
            minHeight: bigDiameter,
            maxWidth: bigDiameter + 10,
            maxHeight: bigDiameter + 10,
            zIndex: 2,
            position: 'relative',
        };
        // Icon for type
        let typeIcon = <InfoOutlinedIcon fontSize="small" style={{ verticalAlign: 'middle', marginRight: 2 }} />;
        if (type === 'Block') typeIcon = <BlockIcon fontSize="small" style={{ color: '#c62828', verticalAlign: 'middle', marginRight: 2 }} />;
        if (type === 'Count') typeIcon = <VisibilityIcon fontSize="small" style={{ color: '#1976d2', verticalAlign: 'middle', marginRight: 2 }} />;
        // Status dot (always green for now)
        const statusDot = <CheckCircleIcon fontSize="small" style={{ color: '#43a047', position: 'absolute', top: 6, right: 6 }} />;
        return (
            <>
            <div style={bigNodeStyle} title={data.name}>
                <Handle 
                    type="target" 
                    position={Position.Top} 
                    id={`target-${id}`} 
                    style={{ opacity: 0, background: darkTheme ? '#fff' : '#000' }} 
                />
                {/* Status dot */}
                {statusDot}
                {/* Name with tooltip for overflow */}
                <Tooltip title={data.Name || data.name} arrow>
                  <div style={{ fontWeight: 'bold', fontSize: 18, textAlign: 'center', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', width: '100%', color: '#fff', textShadow: darkTheme ? '0 1px 2px rgba(0,0,0,0.5)' : 'none' }}>{data.Name || data.name}</div>
                </Tooltip>
                {/* Type icon, action badge, priority */}
                <div style={{ fontSize: 12, textAlign: 'center', color: '#fff', margin: '2px 0', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                  {typeIcon}
                  <span style={{
                    display: 'inline-block',
                    background: action === 'Block' ? '#ffebee' : action === 'Count' ? '#e3f2fd' : '#e8f5e9',
                    color: action === 'Block' ? '#c62828' : action === 'Count' ? '#1976d2' : '#388e3c',
                    borderRadius: 6,
                    padding: '1px 6px',
                    fontWeight: 500,
                    fontSize: 11,
                  }}>{action}</span>
                  <span style={{ fontSize: 11, color: '#ffd600', marginLeft: 2 }}>P{data.Priority}</span>
                </div>
                {/* Labels with tooltip */}
                {labels.length > 0 && (
                  <Tooltip title={labels.join(', ')} arrow>
                    <div style={{ fontSize: 11, color: '#ffe082', margin: '1px 0', textAlign: 'center', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '95%' }}>{labels.join(', ')}</div>
                  </Tooltip>
                )}
                {/* Key info with tooltip */}
                {info && (
                  <Tooltip title={info} arrow>
                    <div style={{ fontSize: 11, color: '#b3e5fc', margin: '1px 0', textAlign: 'center', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '95%' }}>{info}</div>
                  </Tooltip>
                )}
                {/* Metric name with tooltip */}
                {data.VisibilityConfig?.MetricName && (
                  <Tooltip title={data.VisibilityConfig.MetricName} arrow>
                    <div style={{ fontSize: 10, color: '#bdbdbd', margin: '1px 0', textAlign: 'center', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '95%' }}>{data.VisibilityConfig.MetricName}</div>
                  </Tooltip>
                )}
                {/* Show Details button opens custom modal */}
                <button
                    style={{
                        marginTop: 4,
                        fontSize: 10,
                        background: '#f5f5f5',
                        border: '1px solid #ccc',
                        borderRadius: 6,
                        padding: '1px 4px',
                        cursor: 'pointer',
                        color: '#333',
                        width: '80%',
                        maxWidth: 90,
                        alignSelf: 'center',
                        display: 'block',
                        boxSizing: 'border-box',
                        overflow: 'hidden',
                        whiteSpace: 'nowrap',
                        textOverflow: 'ellipsis',
                    }}
                    onClick={e => { e.stopPropagation(); setShowDetails(true); }}
                >
                    Show Details
                </button>
                <Handle 
                    type="source" 
                    position={Position.Bottom} 
                    id={`source-${id}`} 
                    style={{ opacity: 0, background: darkTheme ? '#fff' : '#000' }} 
                />
            </div>
            {/* Custom HTML/CSS modal for details */}
            {showDetails && ReactDOM.createPortal(
              <div style={{
                position: 'fixed',
                top: 0,
                left: 0,
                width: '100vw',
                height: '100vh',
                background: 'rgba(0,0,0,0.25)',
                zIndex: 9999,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
                onClick={() => setShowDetails(false)}
              >
                <div style={{
                  background: '#fff',
                  color: '#222',
                  borderRadius: 14,
                  boxShadow: '0 8px 40px rgba(0,0,0,0.25)',
                  padding: 36,
                  minWidth: 320,
                  maxWidth: 600,
                  width: '90vw',
                  maxHeight: '80vh',
                  overflow: 'auto',
                  position: 'relative',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 18,
                  margin: 0,
                }}
                  onClick={e => e.stopPropagation()}
                >
                  <div style={{ fontWeight: 'bold', fontSize: 26, marginBottom: 10, textAlign: 'left' }}>Full Statement JSON</div>
                  <pre style={{ fontSize: 15, background: '#f7f7f7', color: '#222', borderRadius: 8, padding: 18, maxHeight: 400, overflow: 'auto', margin: 0 }}>
                    {(() => {
                      let jsonData = data.Statement || data.json || data;
                      if (typeof jsonData === 'string') {
                        try {
                          jsonData = JSON.parse(jsonData);
                        } catch (e) {
                          // fallback: show as is
                        }
                      }
                      return JSON.stringify(jsonData, null, 2);
                    })()}
                  </pre>
                </div>
              </div>,
              document.body
            )}
            </>
        );
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