import React, { useState, useEffect, useCallback, forwardRef, useMemo } from 'react';
import ReactFlow, {
    Controls,
    useReactFlow,
    Background,
    ReactFlowProvider,
} from 'reactflow';
import 'reactflow/dist/style.css';
import CustomNode from './CustomNode';
import { useThemeContext } from '../../context/ThemeContext';
import { IconButton, Tooltip } from '@mui/material';
import CenterFocusStrongIcon from '@mui/icons-material/CenterFocusStrong';
import LockIcon from '@mui/icons-material/Lock';
import LockOpenIcon from '@mui/icons-material/LockOpen';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import CustomPolylineEdge from './CustomPolylineEdge';

// Move nodeTypes and edgeTypes outside the component to avoid React Flow warning
const nodeTypes = { 'custom-node': CustomNode };
const edgeTypes = { custom: CustomPolylineEdge };

// Defensive helper for positions
function safeNumber(val) {
  return typeof val === 'number' && !isNaN(val) ? val : 0;
}

const FlowChartInner = forwardRef(({
    allNodes,
    allEdges,
    selectedNode,
    setSelectedNode,
    searchTerm,
    showArrows,
    setShowArrows,
    dottedLines,
    animatedLines,
    layoutType = 'dependency',
    orderBy,
    nodesPerRow,
}, ref) => {
    const [nodes, setNodes] = useState([]);
    const [edges, setEdges] = useState([]);
    const [highlightedEdges, setHighlightedEdges] = useState(new Set());
    const [blurredNodes, setBlurredNodes] = useState(new Set());
    const [doubleClickedNode, setDoubleClickedNode] = useState(null);
    const [connectedNodeIds, setConnectedNodeIds] = useState(new Set());
    const [isInitialized, setIsInitialized] = useState(false);
    const [visibleEdges, setVisibleEdges] = useState(new Set());
    const { darkTheme } = useThemeContext();
    const reactFlowInstance = useReactFlow();
    const [isLocked, setIsLocked] = useState(false);

    // Remove useMemo for nodeTypes/edgeTypes, use the above
    // const nodeTypes = useMemo(() => ({
    //     'custom-node': CustomNode,
    // }), []);
    // const edgeTypes = useMemo(() => ({
    //     custom: CustomPolylineEdge,
    // }), []);

    const initializeData = useCallback((nodes, edges) => {
        if (nodes?.length > 0 && edges?.length >= 0) {
            setNodes(nodes);
            setEdges(edges);
            setIsInitialized(true);
            return true;
        }
        return false;
    }, [setNodes, setEdges]);

    const colorOrder = ['gray', 'blue', 'light blue', 'green'];
    const sortedNodes = useMemo(() => {
        if (!allNodes) return [];
        let nodesCopy = [...allNodes];
        if (orderBy === 'name') {
            nodesCopy.sort((a, b) => (a.data.name || '').localeCompare(b.data.name || ''));
        } else if (orderBy === 'number') {
            nodesCopy.sort((a, b) => {
                const getNum = (node, idx) => {
                    if (typeof node.data?.Priority === 'number') return node.data.Priority;
                    if (typeof node.data?.number === 'number') return node.data.number;
                    const parsed = parseInt(node.id, 10);
                    if (!isNaN(parsed)) return parsed;
                    const match = String(node.id).match(/(\d+)$/);
                    if (match) return parseInt(match[1], 10);
                    return idx;
                };
                const aNum = getNum(a, allNodes.indexOf(a));
                const bNum = getNum(b, allNodes.indexOf(b));
                return aNum - bNum;
            });
        } else if (orderBy === 'dependency') {
            nodesCopy.sort((a, b) => {
                const getRank = (n) => {
                    const p = n.data?.isParent;
                    const c = n.data?.isChild;
                    if (!p && !c) return 0;
                    if (p && !c) return 1;
                    if (p && c) return 2;
                    if (!p && c) return 3;
                    return 4;
                };
                return getRank(a) - getRank(b);
            });
        } else if (orderBy === 'color') {
            nodesCopy.sort((a, b) => {
                const aIdx = colorOrder.indexOf((a.data.color || '').toLowerCase());
                const bIdx = colorOrder.indexOf((b.data.color || '').toLowerCase());
                return (aIdx === -1 ? 999 : aIdx) - (bIdx === -1 ? 999 : bIdx);
            });
        }
        return nodesCopy;
    }, [allNodes, allEdges, orderBy]);

    useEffect(() => {
        if (!sortedNodes?.length) {
            setIsInitialized(false);
            setNodes([]);
            setEdges([]);
            setHighlightedEdges(new Set());
            setBlurredNodes(new Set());
            setConnectedNodeIds(new Set());
            return;
        }
        const success = initializeData(sortedNodes, allEdges);
        if (reactFlowInstance && sortedNodes.length > 0) {
            setTimeout(() => {
                try {
                    reactFlowInstance.fitView({ padding: 0.1, includeHiddenNodes: true });
                } catch (e) { /* ignore */ }
            }, 100);
        }
    }, [sortedNodes, allEdges, initializeData, reactFlowInstance]);

    useEffect(() => {
        if (!isInitialized) return;
        if (!searchTerm) {
            setBlurredNodes(new Set());
            return;
        }
        const lowerSearch = searchTerm.toLowerCase();
        const nodesToBlur = new Set(
            sortedNodes.filter(node => !JSON.stringify(node.data).toLowerCase().includes(lowerSearch))
                    .map(node => node.id)
        );
        setBlurredNodes(nodesToBlur);
    }, [searchTerm, sortedNodes, isInitialized]);

    const connectedNode = useCallback((id) => {
        const connectedEdges = edges.filter(edge =>
            edge.source === id || edge.target === id
        );
        setHighlightedEdges(new Set(connectedEdges.map(edge => edge.id)));
    }, [edges]);

    const getDirectlyConnectedNodeIds = useCallback((nodeId) => {
        const connected = new Set();
        edges.forEach(edge => {
            if (edge.source === nodeId) connected.add(edge.target);
            if (edge.target === nodeId) connected.add(edge.source);
        });
        return connected;
    }, [edges]);

    const onNodeMouseEnter = useCallback((_, node) => {
        if (!selectedNode && !doubleClickedNode) {
            connectedNode(node.id);
        }
    }, [selectedNode, doubleClickedNode, connectedNode]);

    const onNodeMouseLeave = useCallback(() => {
        if (!selectedNode && !doubleClickedNode) {
            setHighlightedEdges(new Set());
        }
    }, [selectedNode, doubleClickedNode]);

    const onNodeClick = useCallback((_, node) => {
        if (selectedNode === node.id) {
            setSelectedNode(null);
            setHighlightedEdges(new Set());
            setConnectedNodeIds(new Set());
        } else {
            setSelectedNode(node.id);
            const connectedIds = getDirectlyConnectedNodeIds(node.id);
            setConnectedNodeIds(connectedIds);
            if (!showArrows) {
                const connectedEdges = edges.filter(edge =>
                    edge.source === node.id || edge.target === node.id
                );
                setVisibleEdges(new Set(connectedEdges.map(edge => edge.id)));
            }
            connectedNode(node.id);
        }
    }, [selectedNode, setSelectedNode, getDirectlyConnectedNodeIds, connectedNode, edges, showArrows]);

    const findUpwardDependencies = useCallback((nodeId, visited = new Set()) => {
        if (visited.has(nodeId)) return visited;
        visited.add(nodeId);
        edges.filter(e => e.target === nodeId).forEach(e => findUpwardDependencies(e.source, visited));
        return visited;
    }, [edges]);

    const findDownwardDependencies = useCallback((nodeId, visited = new Set()) => {
        if (visited.has(nodeId)) return visited;
        visited.add(nodeId);
        edges.filter(e => e.source === nodeId).forEach(e => findDownwardDependencies(e.target, visited));
        return visited;
    }, [edges]);

    const onNodeDoubleClick = useCallback((_, node) => {
        if (doubleClickedNode === node.id) {
            setDoubleClickedNode(null);
            setBlurredNodes(new Set());
            setHighlightedEdges(new Set());
        } else {
            const upward = findUpwardDependencies(node.id);
            const downward = findDownwardDependencies(node.id);
            const relatedNodes = new Set([...upward, ...downward, node.id]);
            const blurred = new Set(nodes.map(n => n.id).filter(id => !relatedNodes.has(id)));
            const relatedEdges = edges.filter(edge => {
                const isUpwardEdge = edge.target === node.id && upward.has(edge.source);
                const isDownwardEdge = edge.source === node.id && downward.has(edge.target);
                const parentToParent = upward.has(edge.source) && upward.has(edge.target) &&
                    findUpwardDependencies(edge.target).has(edge.source);
                const childToChild = downward.has(edge.source) && downward.has(edge.target) &&
                    findDownwardDependencies(edge.source).has(edge.target);
                return isUpwardEdge || isDownwardEdge || parentToParent || childToChild;
            });
            setDoubleClickedNode(node.id);
            setBlurredNodes(blurred);
            setHighlightedEdges(new Set(relatedEdges.map(e => e.id)));
        }
        setSelectedNode(node.id);
    }, [doubleClickedNode, nodes, edges, findUpwardDependencies, findDownwardDependencies, setSelectedNode]);

    const onInit = useCallback((instance) => {
        // No-op for now
    }, []);

    const gridNodes = useMemo(() => {
        if (!sortedNodes?.length) return [];
        const NODES_PER_ROW = Math.max(2, Math.min(nodesPerRow || 8, 16));
        const GRID_SIZE = 180;
        if (orderBy === 'dependency') {
            const neither = sortedNodes.filter(n => !n.data.isParent && !n.data.isChild);
            const parentOnly = sortedNodes.filter(n => n.data.isParent && !n.data.isChild);
            const both = sortedNodes.filter(n => n.data.isParent && n.data.isChild);
            const childOnly = sortedNodes.filter(n => !n.data.isParent && n.data.isChild);
            const groups = [neither, parentOnly, both, childOnly];
            let maxRowWidth = 0;
            groups.forEach(group => {
                const rows = Math.ceil(group.length / NODES_PER_ROW) || 1;
                for (let r = 0; r < rows; r++) {
                    const nodesInRow = r === rows - 1 ? (group.length % NODES_PER_ROW || NODES_PER_ROW) : NODES_PER_ROW;
                    const width = (nodesInRow - 1) * GRID_SIZE;
                    if (width > maxRowWidth) maxRowWidth = width;
                }
            });
            let nodes = [];
            let y = 0;
            groups.forEach(group => {
                const rows = Math.ceil(group.length / NODES_PER_ROW) || 1;
                for (let r = 0; r < rows; r++) {
                    const startIdx = r * NODES_PER_ROW;
                    const endIdx = Math.min(startIdx + NODES_PER_ROW, group.length);
                    const rowNodes = group.slice(startIdx, endIdx);
                    const rowWidth = (rowNodes.length - 1) * GRID_SIZE;
                    const centerOffset = (maxRowWidth - rowWidth) / 2;
                    rowNodes.forEach((node, i) => {
                        nodes.push({
                            ...node,
                            position: { x: safeNumber(centerOffset + i * GRID_SIZE), y: safeNumber(y) }
                        });
                    });
                    y += GRID_SIZE;
                }
                y += 40;
            });
            return nodes;
        } else {
            return sortedNodes.map((node, index) => {
                const row = Math.floor(index / NODES_PER_ROW);
                const col = index % NODES_PER_ROW;
                let x = safeNumber(col * GRID_SIZE);
                let y = safeNumber(row * GRID_SIZE);
                return {
                    ...node,
                    position: { x, y },
                };
            });
        }
    }, [sortedNodes, orderBy, nodesPerRow]);

    const popupLayeredNodes = useMemo(() => {
        if (layoutType !== 'popupLayered' || !selectedNode || !allNodes) return null;
        const nodeMap = Object.fromEntries(allNodes.map(n => [n.id, n]));
        const selected = nodeMap[selectedNode.id || selectedNode];
        if (!selected) return null;
        const parents = allEdges.filter(e => e.target === selected.id).map(e => nodeMap[e.source]).filter(Boolean);
        const children = allEdges.filter(e => e.source === selected.id).map(e => nodeMap[e.target]).filter(Boolean);
        const spacingX = 250;
        const spacingY = 180;
        const nodes = [];
        parents.forEach((n, i) => {
            nodes.push({
                ...n,
                position: { x: safeNumber(i * spacingX - ((parents.length-1)*spacingX/2)), y: 0 },
            });
        });
        nodes.push({
            ...selected,
            position: { x: 0, y: safeNumber(spacingY) },
        });
        children.forEach((n, i) => {
            nodes.push({
                ...n,
                position: { x: safeNumber(i * spacingX - ((children.length-1)*spacingX/2)), y: safeNumber(2*spacingY) },
            });
        });
        return nodes;
    }, [layoutType, selectedNode, allNodes, allEdges]);

    const nodesWithOffset = useMemo(() => {
        if (popupLayeredNodes) return popupLayeredNodes;
        const posMap = new Map();
        return gridNodes.map(n => {
            let x = safeNumber(n.position?.x);
            let y = safeNumber(n.position?.y);
            const key = `${x},${y}`;
            if (posMap.has(key)) {
                const count = posMap.get(key) + 1;
                posMap.set(key, count);
                return {
                    ...n,
                    position: {
                        x: x + Math.random() * 10 * count,
                        y: y + Math.random() * 10 * count
                    }
                };
            } else {
                posMap.set(key, 1);
                return {
                    ...n,
                    position: { x, y }
                };
            }
        });
    }, [gridNodes, popupLayeredNodes]);

    const nodeIdHasChildren = new Set(edges.map(e => e.source));
    const nodeIdHasParents = new Set(edges.map(e => e.target));
    const nodesWithStyles = useMemo(() => {
        const baseNodes = gridNodes;
        return baseNodes.map(node => {
            let position = node.position;
            if (!position || typeof position !== 'object') {
                position = { x: 0, y: 0 };
            } else {
                position = {
                    x: safeNumber(position.x),
                    y: safeNumber(position.y),
                };
            }
            let style = {
                ...node.style,
                opacity: blurredNodes.has(node.id) ? 0.2 : 1,
                filter: blurredNodes.has(node.id) ? 'blur(1.5px)' : 'none',
                zIndex: connectedNodeIds.has(node.id) ? 10 : 1,
                transition: 'all 0.3s ease-in-out',
                borderRadius: '10px',
                boxShadow: node.id === selectedNode ? '0 0 0 4px yellow' : 'none',
            };
            if (connectedNodeIds.has(node.id)) {
                const isParent = edges.some(e => e.source === node.id && e.target === selectedNode);
                const isChild = edges.some(e => e.source === selectedNode && e.target === node.id);
                if (isParent && isChild) {
                    style = {
                        ...style,
                        border: '4px solid #d500f9',
                        background: '#f3e5f5',
                    };
                } else if (isParent) {
                    style = {
                        ...style,
                        border: '4px solid #2979ff',
                        background: '#e3f2fd',
                    };
                } else if (isChild) {
                    style = {
                        ...style,
                        border: '4px solid #00e676',
                        background: '#e8f5e9',
                    };
                } else {
                    style = {
                        ...style,
                        border: '4px solid #ff1744',
                        background: '#ffebee',
                    };
                }
            }
            if (node.id === selectedNode) {
                style = {
                    ...style,
                    border: '5px solid #ffd600',
                    background: '#fffde7',
                };
            }
            const isParent = nodeIdHasChildren.has(node.id);
            const isChild = nodeIdHasParents.has(node.id);
            let color = 'gray';
            if (isParent && isChild) color = 'light blue';
            else if (isParent) color = 'blue';
            else if (isChild) color = 'green';
            else color = 'gray';
            return { ...node, position, style, data: { ...node.data, isParent, isChild, color } };
        });
    }, [gridNodes, blurredNodes, connectedNodeIds, selectedNode, edges, nodeIdHasChildren, nodeIdHasParents]);

    const edgesWithStyles = edges.map(edge => {
        let style = { stroke: '#bbb', strokeWidth: 2, opacity: 0.6 };
        let direction = undefined;
        if (selectedNode) {
            if (edge.source === selectedNode) {
                style = { ...style, stroke: '#00e676', strokeWidth: 3, opacity: 1 };
                direction = 'child';
            } else if (edge.target === selectedNode) {
                style = { ...style, stroke: '#2979ff', strokeWidth: 3, opacity: 1 };
                direction = 'parent';
            }
        }
        return {
            ...edge,
            style,
            data: { ...edge.data, direction },
        };
    });

    const handleExportPdf = useCallback((afterExportCallback) => {
        const flowElement = document.querySelector('.react-flow');
        if (!flowElement) {
            if (afterExportCallback) afterExportCallback();
            return;
        }
        setTimeout(() => {
            const rect = flowElement.getBoundingClientRect();
            html2canvas(flowElement, {
                backgroundColor: '#fff',
                useCORS: true,
                scale: 8,
                width: Math.round(rect.width),
                height: Math.round(rect.height),
                scrollX: -window.scrollX,
                scrollY: -window.scrollY,
                onclone: (clonedDoc) => {},
            }).then(canvas => {
                const ctx = canvas.getContext('2d');
                if (ctx) ctx.imageSmoothingEnabled = false;
                const imgData = canvas.toDataURL('image/png');
                const pdf = new jsPDF({
                    orientation: rect.width > rect.height ? 'landscape' : 'portrait',
                    unit: 'px',
                    format: [Math.round(rect.width), Math.round(rect.height)]
                });
                pdf.addImage(imgData, 'PNG', 0, 0, rect.width, rect.height);
                pdf.save('waf-graph.pdf');
                if (afterExportCallback) afterExportCallback();
            }).catch(err => {
                if (afterExportCallback) afterExportCallback();
            });
        }, 100);
    }, []);

    const handleExportImage = useCallback((afterExportCallback) => {
        const flowElement = document.querySelector('.react-flow');
        if (!flowElement) {
            if (afterExportCallback) afterExportCallback();
            return;
        }
        setTimeout(() => {
            const rect = flowElement.getBoundingClientRect();
            html2canvas(flowElement, {
                backgroundColor: darkTheme ? '#1a1a1a' : '#ffffff',
                useCORS: true,
                scale: 2,
                width: Math.round(rect.width),
                height: Math.round(rect.height),
                scrollX: -window.scrollX,
                scrollY: -window.scrollY,
                onclone: (clonedDoc) => {},
            }).then(canvas => {
                const link = document.createElement('a');
                link.download = 'waf-rules-flowchart.png';
                link.href = canvas.toDataURL('image/png');
                link.click();
                if (afterExportCallback) afterExportCallback();
            }).catch(err => {
                if (afterExportCallback) afterExportCallback();
            });
        }, 100);
    }, [darkTheme]);

    React.useImperativeHandle(ref, () => ({
        handleExportPdf,
        handleExportImage,
    }));

    const flowStyles = useMemo(() => ({
        backgroundColor: 'transparent',
    }), []);

    if (!sortedNodes?.length || nodesWithStyles.length === 0) {
        return <div style={{ color: '#aaa', padding: 20 }}>No nodes to display. Please load or add rules to see the flowchart.</div>;
    }

    if (layoutType === 'popupLayered' || orderBy === 'dependency') {
        return (
            <div style={{ width: '100%', height: '100%', position: 'relative' }}>
                <ReactFlow
                    ref={ref}
                    nodes={nodesWithStyles}
                    edges={edgesWithStyles}
                    nodeTypes={nodeTypes}
                    edgeTypes={edgeTypes}
                    onNodeClick={onNodeClick}
                    onNodeDoubleClick={onNodeDoubleClick}
                    onNodeMouseEnter={onNodeMouseEnter}
                    onNodeMouseLeave={onNodeMouseLeave}
                    fitView
                    fitViewOptions={{
                        padding: 0.2,
                        includeHiddenNodes: true
                    }}
                    minZoom={0.1}
                    maxZoom={1.5}
                    defaultViewport={{ zoom: 0.8 }}
                    style={flowStyles}
                    defaultEdgeOptions={{
                        style: { stroke: darkTheme ? '#fff' : '#333', strokeWidth: 2, opacity: 0.6 },
                    }}
                >
                    <Background
                        variant="dots"
                        color={darkTheme ? '#666' : '#aaa'}
                        gap={16}
                        size={1}
                        style={{
                            backgroundColor: 'yellow',
                            opacity: 0.2
                        }}
                    />
                    <Controls
                        style={{
                            backgroundColor: darkTheme ? 'rgba(235, 58, 58, 0.8)' : 'rgba(255, 255, 255, 0.8)',
                            borderColor: darkTheme ? 'rgba(243, 92, 92, 0.77)' : 'rgba(0, 0, 0, 0.1)',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                        }}
                    />
                </ReactFlow>
            </div>
        );
    } else {
        return (
            <div style={{ width: '100%', height: '100%', position: 'relative' }}>
                <div style={{ position: 'absolute', top: 10, left: 10, zIndex: 10, background: 'rgba(255,255,255,0.9)', borderRadius: 8, padding: 8, display: 'flex', gap: 12, alignItems: 'center' }}>
                    <Tooltip title="Recenter Tree">
                        <IconButton onClick={() => reactFlowInstance && reactFlowInstance.fitView({ padding: 0.2, includeHiddenNodes: true })} size="small">
                            <CenterFocusStrongIcon />
                        </IconButton>
                    </Tooltip>
                    <Tooltip title={isLocked ? "Unlock View" : "Lock View"}>
                        <IconButton onClick={() => setIsLocked(l => !l)} size="small">
                            {isLocked ? <LockIcon /> : <LockOpenIcon />}
                        </IconButton>
                    </Tooltip>
                </div>
                <ReactFlow
                    ref={ref}
                    nodes={nodesWithStyles}
                    edges={edgesWithStyles}
                    nodeTypes={nodeTypes}
                    edgeTypes={edgeTypes}
                    onNodeClick={onNodeClick}
                    onNodeDoubleClick={onNodeDoubleClick}
                    onNodeMouseEnter={onNodeMouseEnter}
                    onNodeMouseLeave={onNodeMouseLeave}
                    fitView
                    fitViewOptions={{
                        padding: 0.2,
                        includeHiddenNodes: true
                    }}
                    minZoom={0.1}
                    maxZoom={1.5}
                    defaultViewport={{ zoom: 0.8 }}
                    style={flowStyles}
                    defaultEdgeOptions={{
                        style: { stroke: darkTheme ? '#fff' : '#333', strokeWidth: 2, opacity: 0.6 },
                    }}
                >
                    <Background
                        variant="dots"
                        color={darkTheme ? '#666' : '#aaa'}
                        gap={16}
                        size={1}
                        style={{
                            backgroundColor: 'transparent',
                            opacity: 0.2
                        }}
                    />
                    <Controls
                        style={{
                            backgroundColor: darkTheme ? 'rgba(51, 51, 51, 0.8)' : 'rgba(255, 255, 255, 0.8)',
                            borderColor: darkTheme ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.1)',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                        }}
                    />
                </ReactFlow>
            </div>
        );
    }
});

const FlowChart = React.memo(React.forwardRef((props, ref) => (
    <ReactFlowProvider>
        <FlowChartInner {...props} ref={ref} />
    </ReactFlowProvider>
)));

export default FlowChart; 