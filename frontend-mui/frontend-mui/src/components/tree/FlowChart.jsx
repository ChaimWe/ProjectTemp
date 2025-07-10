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
import { IconButton, Tooltip, ToggleButton, ToggleButtonGroup } from '@mui/material';
import CenterFocusStrongIcon from '@mui/icons-material/CenterFocusStrong';
import LockIcon from '@mui/icons-material/Lock';
import LockOpenIcon from '@mui/icons-material/LockOpen';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import CustomPolylineEdge from './CustomPolylineEdge';
import { Box } from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import CompareArrowsIcon from '@mui/icons-material/CompareArrows';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord';
import { Button } from '@mui/material';

// Define nodeTypes and edgeTypes as constants outside the component (no hooks)
const nodeTypes = { 'custom-node': CustomNode };
const edgeTypes = { custom: CustomPolylineEdge };

// Defensive helper for positions
function safeNumber(val) {
  return typeof val === 'number' && !isNaN(val) ? val : 0;
}

// Helper to assign color based on parent/child
function getNodeColor(node) {
  const isParent = node.data?.isParent;
  const isChild = node.data?.isChild;
  if (isParent && isChild) return 'light blue';
  if (isParent) return 'blue';
  if (isChild) return 'green';
  return 'gray';
}

// Add props for layoutType, orderBy, nodesPerRow, setShowArrows, dottedLines, animatedLines (to match old code)
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
    layoutType: layoutTypeProp = 'dependency',
    orderBy: orderByProp = 'dependency',
    nodesPerRow: nodesPerRowProp = 8,
}, ref) => {
    const [hoveredNode, setHoveredNode] = useState(null);
    const [showHelp, setShowHelp] = useState(false);
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

    // Add local state for controls
    const [layoutType, setLayoutType] = useState(layoutTypeProp);
    const [orderBy, setOrderBy] = useState(orderByProp);
    const [nodesPerRow, setNodesPerRow] = useState(nodesPerRowProp);

    // --- BEGIN PORTED TREE LOGIC FROM OLD FLOWCHART ---
    // Dependency grouping and fallback edge logic
    const colorOrder = ['gray', 'blue', 'light blue', 'green'];
    // Topological sort for dependency order
    const topologicalSort = (nodes, edges) => {
        const inDegree = {};
        const graph = {};
        nodes.forEach(n => {
            inDegree[n.id] = 0;
            graph[n.id] = [];
        });
        edges.forEach(e => {
            if (graph[e.source]) {
                graph[e.source].push(e.target);
                inDegree[e.target] = (inDegree[e.target] || 0) + 1;
            }
        });
        const queue = nodes.filter(n => inDegree[n.id] === 0).map(n => n.id);
        const result = [];
        const nodeMap = Object.fromEntries(nodes.map(n => [n.id, n]));
        while (queue.length) {
            const id = queue.shift();
            if (nodeMap[id]) result.push(nodeMap[id]);
            (graph[id] || []).forEach(nei => {
                inDegree[nei]--;
                if (inDegree[nei] === 0) queue.push(nei);
            });
        }
        // If cycle, fallback to original order
        if (result.length !== nodes.length) return nodes;
        return result;
    };
    // Group and sort nodes
    const sortedNodes = useMemo(() => {
        if (!allNodes) return [];
        let nodesCopy = [...allNodes];
        if (orderBy === 'name') {
            nodesCopy.sort((a, b) => (a.data.name || '').localeCompare(b.data.name || ''));
        } else if (orderBy === 'date') {
            nodesCopy.sort((a, b) => new Date(a.data.date || 0) - new Date(b.data.date || 0));
        } else if (orderBy === 'type') {
            nodesCopy.sort((a, b) => (a.data.type || '').localeCompare(b.data.type || ''));
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
                    if (!p && !c) return 0; // neither
                    if (p && !c) return 1; // parent only
                    if (p && c) return 2; // both
                    if (!p && c) return 3; // child only
                    return 4; // fallback
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
    }, [allNodes, orderBy]);
    // Layout logic based on layoutType
    const layoutNodes = useCallback((nodes) => {
        if (layoutType === 'radial') {
            // Radial layout: position nodes in a circle
            const centerX = 500;
            const centerY = 400;
            const radius = 300;
            const angleStep = (2 * Math.PI) / nodes.length;
            return nodes.map((node, i) => ({
                ...node,
                position: {
                    x: centerX + radius * Math.cos(i * angleStep),
                    y: centerY + radius * Math.sin(i * angleStep),
                },
            }));
        } else if (layoutType === 'angled') {
            // Angled layout: position nodes in a diagonal (angled) line, then center it
            const startX = 0;
            const startY = 0;
            const step = 40;
            let nodesCopy = nodes.map((node, i) => ({
                ...node,
                position: {
                    x: startX + i * step,
                    y: startY + i * step,
                },
            }));
            // Center the diagonal in the viewport
            const minX = Math.min(...nodesCopy.map(n => n.position.x));
            const maxX = Math.max(...nodesCopy.map(n => n.position.x));
            const minY = Math.min(...nodesCopy.map(n => n.position.y));
            const maxY = Math.max(...nodesCopy.map(n => n.position.y));
            const centerX = (minX + maxX) / 2;
            const centerY = (minY + maxY) / 2;
            const desiredCenterX = 600;
            const desiredCenterY = 400;
            const offsetX = desiredCenterX - centerX;
            const offsetY = desiredCenterY - centerY;
            nodesCopy.forEach(node => {
                node.position.x += offsetX;
                node.position.y += offsetY;
            });
            return nodesCopy;
        } else {
            // Default to dependency/hierarchical layout
            // (Assume nodes are already positioned by parent)
            return nodes;
        }
    }, [layoutType]);
    // Grid and dependency layout
    const gridNodes = useMemo(() => {
        if (!sortedNodes?.length) return [];
        const NODES_PER_ROW = Math.max(2, Math.min(nodesPerRow || 8, 16));
        const GRID_SIZE = 180;
        if (layoutType === 'radial' || layoutType === 'angled') {
            // Use layoutNodes to assign positions for radial/angled
            return layoutNodes(sortedNodes);
        }
        if (orderBy === 'dependency') {
            // Group nodes by type (dependency view)
            const neither = sortedNodes.filter(n => !n.data.isParent && !n.data.isChild);
            const parentOnly = sortedNodes.filter(n => n.data.isParent && !n.data.isChild);
            const both = sortedNodes.filter(n => n.data.isParent && n.data.isChild);
            const childOnly = sortedNodes.filter(n => !n.data.isParent && n.data.isChild);
            const groups = [neither, parentOnly, both, childOnly];
            // Find the widest row among all groups for centering
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
                            position: { x: centerOffset + i * GRID_SIZE, y: y }
                        });
                    });
                    y += GRID_SIZE; // Move y after each row
                }
                // Add vertical space between groups
                y += 40;
            });
            return nodes;
        } else {
            // Normal grid layout
            return sortedNodes.map((node, index) => {
                const row = Math.floor(index / NODES_PER_ROW);
                const col = index % NODES_PER_ROW;
                let x = col * GRID_SIZE;
                let y = row * GRID_SIZE;
                return {
                    ...node,
                    position: { x, y },
                };
            });
        }
    }, [sortedNodes, orderBy, nodesPerRow, layoutType, layoutNodes]);
    // Custom layout for popupLayered: selected node center, parents above, children below
    const popupLayeredNodes = useMemo(() => {
        if (layoutType !== 'popupLayered' || !selectedNode || !allNodes) return null;
        const nodeMap = Object.fromEntries(allNodes.map(n => [n.id, n]));
        const selected = nodeMap[selectedNode.id || selectedNode];
        if (!selected) return null;
        // Find direct parents and children
        const parents = allEdges.filter(e => e.target === selected.id).map(e => nodeMap[e.source]).filter(Boolean);
        const children = allEdges.filter(e => e.source === selected.id).map(e => nodeMap[e.target]).filter(Boolean);
        // Layout: parents at y=0, selected at y=1, children at y=2
        const spacingX = 250;
        const spacingY = 180;
        const nodes = [];
        // Parents
        parents.forEach((n, i) => {
            nodes.push({
                ...n,
                position: { x: i * spacingX - ((parents.length-1)*spacingX/2), y: 0 },
            });
        });
        // Selected node
        nodes.push({
            ...selected,
            position: { x: 0, y: spacingY },
        });
        // Children
        children.forEach((n, i) => {
            nodes.push({
                ...n,
                position: { x: i * spacingX - ((children.length-1)*spacingX/2), y: 2*spacingY },
            });
        });
        return nodes;
    }, [layoutType, selectedNode, allNodes, allEdges]);

    const filteredEdges = useMemo(() => {
        const nodeIds = new Set(allNodes.map(n => n.id));
        const valid = (allEdges || []).filter(e => e.source && e.target && nodeIds.has(e.source) && nodeIds.has(e.target));
        // Fallback: if no edges but multiple nodes, generate fallback edges
        if (valid.length === 0 && allNodes.length > 1) {
            const fallback = allNodes.slice(1).map((node, i) => ({
                id: `edge-fallback-${i}`,
                source: allNodes[i].id,
                target: node.id,
            }));
            return fallback;
        }
        return valid;
    }, [allEdges, allNodes]);
    // --- END PORTED TREE LOGIC ---

    // Remove initializeData and related useEffect
    useEffect(() => {
        if (!gridNodes?.length) {
            setNodes([]);
            setEdges([]);
            setHighlightedEdges(new Set());
            setBlurredNodes(new Set());
            setConnectedNodeIds(new Set());
            return;
        }
        setNodes(gridNodes);
        setEdges(filteredEdges);
        if (reactFlowInstance && gridNodes.length > 0) {
            setTimeout(() => {
                try {
                    reactFlowInstance.fitView({ padding: 0.1, includeHiddenNodes: true });
                } catch (e) { /* ignore */ }
            }, 100);
        }
    }, [gridNodes, filteredEdges, reactFlowInstance]);

    useEffect(() => {
        if (!isInitialized) return;
        if (!searchTerm) {
            setBlurredNodes(new Set());
            return;
        }
        const lowerSearch = searchTerm.toLowerCase();
        const nodesToBlur = new Set(
            gridNodes.filter(node => !JSON.stringify(node.data).toLowerCase().includes(lowerSearch))
                    .map(node => node.id)
        );
        setBlurredNodes(nodesToBlur);
    }, [searchTerm, gridNodes, isInitialized]);

    const connectedNode = useCallback((id) => {
        const connectedEdges = filteredEdges.filter(edge =>
            edge.source === id || edge.target === id
        );
        setHighlightedEdges(new Set(connectedEdges.map(edge => edge.id)));
    }, [filteredEdges]);

    const getDirectlyConnectedNodeIds = useCallback((nodeId) => {
        const connected = new Set();
        filteredEdges.forEach(edge => {
            if (edge.source === nodeId) connected.add(edge.target);
            if (edge.target === nodeId) connected.add(edge.source);
        });
        return connected;
    }, [filteredEdges]);

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
                const connectedEdges = filteredEdges.filter(edge =>
                    edge.source === node.id || edge.target === node.id
                );
                setVisibleEdges(new Set(connectedEdges.map(edge => edge.id)));
            }
            connectedNode(node.id);
        }
    }, [selectedNode, setSelectedNode, getDirectlyConnectedNodeIds, connectedNode, filteredEdges, showArrows]);

    const findUpwardDependencies = useCallback((nodeId, visited = new Set()) => {
        if (visited.has(nodeId)) return visited;
        visited.add(nodeId);
        filteredEdges.filter(e => e.target === nodeId).forEach(e => findUpwardDependencies(e.source, visited));
        return visited;
    }, [filteredEdges]);

    const findDownwardDependencies = useCallback((nodeId, visited = new Set()) => {
        if (visited.has(nodeId)) return visited;
        visited.add(nodeId);
        filteredEdges.filter(e => e.source === nodeId).forEach(e => findDownwardDependencies(e.target, visited));
        return visited;
    }, [filteredEdges]);

    const onNodeDoubleClick = useCallback((_, node) => {
        if (doubleClickedNode === node.id) {
            setDoubleClickedNode(null);
            setBlurredNodes(new Set());
            setHighlightedEdges(new Set());
        } else {
            const upward = findUpwardDependencies(node.id);
            const downward = findDownwardDependencies(node.id);
            const relatedNodes = new Set([...upward, ...downward, node.id]);
            const blurred = new Set(gridNodes.map(n => n.id).filter(id => !relatedNodes.has(id)));
            const relatedEdges = filteredEdges.filter(edge => {
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
    }, [doubleClickedNode, gridNodes, filteredEdges, findUpwardDependencies, findDownwardDependencies, setSelectedNode]);

    const onInit = useCallback((instance) => {
        // No-op for now
    }, []);

    // Layout logic for nodes
    // const layoutNodes = useCallback((nodes, edges, orderBy, nodesPerRow) => { // This line is removed as per the edit hint
    //     if (orderBy === 'number') { // This line is removed as per the edit hint
    //         // Grid layout for number sort // This line is removed as per the edit hint
    //         const GRID_SIZE = 180; // This line is removed as per the edit hint
    //         return nodes.map((node, index) => { // This line is removed as per the edit hint
    //             const row = Math.floor(index / nodesPerRow); // This line is removed as per the edit hint
    //             const col = index % nodesPerRow; // This line is removed as per the edit hint
    //             return { // This line is removed as per the edit hint
    //                 ...node, // This line is removed as per the edit hint
    //                 position: { x: col * GRID_SIZE, y: row * GRID_SIZE }, // This line is removed as per the edit hint
    //             }; // This line is removed as per the edit hint
    //         }); // This line is removed as per the edit hint
    //     } else if (orderBy === 'dependency') { // This line is removed as per the edit hint
    //         // Group nodes by color/type for dependency sort // This line is removed as per the edit hint
    //         const colorGroups = { // This line is removed as per the edit hint
    //             gray: [], // This line is removed as per the edit hint
    //             blue: [], // This line is removed as per the edit hint
    //             green: [], // This line is removed as per the edit hint
    //         }; // This line is removed as per the edit hint
    //         nodes.forEach(n => { // This line is removed as per the edit hint
    //             const color = (n.data.color || '').toLowerCase(); // This line is removed as per the edit hint
    //             if (color === 'blue') colorGroups.blue.push(n); // This line is removed as per the edit hint
    //             else if (color === 'green') colorGroups.green.push(n); // This line is removed as per the edit hint
    //             else colorGroups.gray.push(n); // This line is removed as per the edit hint
    //         }); // This line is removed as per the edit hint
    //         const GRID_SIZE = 180; // This line is removed as per the edit hint
    //         const groupOrder = ['gray', 'blue', 'green']; // This line is removed as per the edit hint
    //         let positioned = []; // This line is removed as per the edit hint
    //         let y = 0; // This line is removed as per the edit hint
    //         groupOrder.forEach(group => { // This line is removed as per the edit hint
    //             const groupNodes = colorGroups[group]; // This line is removed as per the edit hint
    //             groupNodes.forEach((node, i) => { // This line is removed as per the edit hint
    //                 positioned.push({ // This line is removed as per the edit hint
    //                     ...node, // This line is removed as per the edit hint
    //                     position: { x: i * GRID_SIZE, y }, // This line is removed as per the edit hint
    //                 }); // This line is removed as per the edit hint
    //             }); // This line is removed as per the edit hint
    //             if (groupNodes.length > 0) y += GRID_SIZE; // This line is removed as per the edit hint
    //         }); // This line is removed as per the edit hint
    //         return positioned; // This line is removed as per the edit hint
    //     } else { // This line is removed as per the edit hint
    //         // Default to grid // This line is removed as per the edit hint
    //         const GRID_SIZE = 180; // This line is removed as per the edit hint
    //         return nodes.map((node, index) => { // This line is removed as per the edit hint
    //             const row = Math.floor(index / nodesPerRow); // This line is removed as per the edit hint
    //             const col = index % nodesPerRow; // This line is removed as per the edit hint
    //             return { // This line is removed as per the edit hint
    //                 ...node, // This line is removed as per the edit hint
    //                 position: { x: col * GRID_SIZE, y: row * GRID_SIZE }, // This line is removed as per the edit hint
    //             }; // This line is removed as per the edit hint
    //         }); // This line is removed as per the edit hint
    //     } // This line is removed as per the edit hint
    // }, []); // This line is removed as per the edit hint

    // Use layoutNodes to position nodes
    // const positionedNodes = useMemo(() => layoutNodes(sortedNodes, edges, orderBy, nodesPerRow), [sortedNodes, edges, orderBy, nodesPerRow]); // This line is removed as per the edit hint

    // Replace positionedNodes with gridNodes and popupLayeredNodes logic
    const nodesWithOffset = useMemo(() => {
        if (popupLayeredNodes) return popupLayeredNodes;
        const posMap = new Map();
        return gridNodes.map(n => {
            let x = n.position?.x;
            let y = n.position?.y;
            if (typeof x !== 'number' || isNaN(x)) x = 0;
            if (typeof y !== 'number' || isNaN(y)) y = 0;
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

    // Prepare nodes with styles
    const nodeIdHasChildren = new Set(filteredEdges.map(e => e.source));
    const nodeIdHasParents = new Set(filteredEdges.map(e => e.target));
    const nodesWithStyles = useMemo(() => {
        const baseNodes = (layoutType === 'collapsible') ? gridNodes : gridNodes;
        return baseNodes.map(node => {
            // Ensure node.position is always a valid object
            let position = node.position;
            if (!position || typeof position !== 'object') {
                position = { x: 0, y: 0 };
            } else {
                position = {
                    x: (typeof position.x === 'number' && !isNaN(position.x)) ? position.x : 0,
                    y: (typeof position.y === 'number' && !isNaN(position.y)) ? position.y : 0,
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
                // Determine parent/child relationship to selectedNode
                const isParent = filteredEdges.some(e => e.source === node.id && e.target === selectedNode);
                const isChild = filteredEdges.some(e => e.source === selectedNode && e.target === node.id);
                if (isParent && isChild) {
                    style = {
                        ...style,
                        border: '4px solid #d500f9', // bright purple
                        background: '#f3e5f5', // light purple
                    };
                } else if (isParent) {
                    style = {
                        ...style,
                        border: '4px solid #2979ff', // bright blue
                        background: '#e3f2fd', // light blue
                    };
                } else if (isChild) {
                    style = {
                        ...style,
                        border: '4px solid #00e676', // bright green
                        background: '#e8f5e9', // light green
                    };
                } else {
                    style = {
                        ...style,
                        border: '4px solid #ff1744', // bright red
                        background: '#ffebee', // light red
                    };
                }
            }
            if (node.id === selectedNode) {
                style = {
                    ...style,
                    border: '5px solid #ffd600', // bright yellow
                    background: '#fffde7', // light yellow
                };
            }
            // Determine parent/child status for node rendering
            const isParent = nodeIdHasChildren.has(node.id);
            const isChild = nodeIdHasParents.has(node.id);
            // Assign color for sorting
            let color = 'gray';
            if (isParent && isChild) color = 'light blue';
            else if (isParent) color = 'blue';
            else if (isChild) color = 'green';
            else color = 'gray';
            return { ...node, position, style, data: { ...node.data, isParent, isChild, color } };
        });
    }, [layoutType, gridNodes, blurredNodes, connectedNodeIds, selectedNode, filteredEdges]);

    // Prepare edges with styles and direction for parent/child
    const edgesWithStyles = useMemo(() => filteredEdges.map(edge => {
        // Deep clean: remove sourceHandle/targetHandle if undefined
        const cleaned = { ...edge };
        if (cleaned.sourceHandle === undefined) delete cleaned.sourceHandle;
        if (cleaned.targetHandle === undefined) delete cleaned.targetHandle;
        let style = { stroke: '#ff0000', strokeWidth: 4, opacity: 1 };
        let direction = undefined;
        if (selectedNode) {
            if (cleaned.source === selectedNode) direction = 'child';
            else if (cleaned.target === selectedNode) direction = 'parent';
        }
        return {
            ...cleaned,
            style,
            direction,
            type: 'custom',
        };
    }), [filteredEdges, selectedNode, highlightedEdges]);

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

    // Debug: Log edges and nodes before rendering
    console.log('edgesWithStyles', edgesWithStyles);
    console.log('nodesWithStyles', nodesWithStyles);

    if (!gridNodes?.length || nodesWithStyles.length === 0) {
        return <div style={{ color: '#aaa', padding: 20 }}>No nodes to display. Please load or add rules to see the flowchart.</div>;
    }

    // Export handler
    const handleExport = async () => {
        const chart = document.getElementById('flowchart-container');
        if (!chart) return;
        const canvas = await html2canvas(chart, { backgroundColor: null });
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF({ orientation: 'landscape', unit: 'px', format: [canvas.width, canvas.height] });
        pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
        pdf.save('tree-view-export.pdf');
    };

    // Determine which nodes/edges are highlighted/faded
    // const highlightSet = new Set(); // This line is removed as per the edit hint
    // if (hoveredNode || selectedNode) {
    //     const focusId = hoveredNode || selectedNode;
    //     highlightSet.add(focusId);
    //     edges.forEach(edge => {
    //         if (edge.source === focusId) highlightSet.add(edge.target);
    //         if (edge.target === focusId) highlightSet.add(edge.source);
    //     });
    // }

    // Pass isFaded and highlighted to nodes/edges
    // const nodesWithStyles = gridNodes.map(node => { // This line is removed as per the edit hint
    //     const isHighlighted = highlightSet.size === 0 || highlightSet.has(node.id); // This line is removed as per the edit hint
    //     return { // This line is removed as per the edit hint
    //         ...node, // This line is removed as per the edit hint
    //         isFaded: !isHighlighted, // This line is removed as per the edit hint
    //         selected: selectedNode === node.id, // This line is removed as per the edit hint
    //     }; // This line is removed as per the edit hint
    // }); // This line is removed as per the edit hint
    // const edgesWithStyles = edges.map(edge => { // This line is removed as per the edit hint
    //     const isHighlighted = highlightSet.size === 0 || (highlightSet.has(edge.source) && highlightSet.has(edge.target)); // This line is removed as per the edit hint
    //     return { // This line is removed as per the edit hint
    //         ...edge, // This line is removed as per the edit hint
    //         data: { ...edge.data, highlighted: isHighlighted }, // This line is removed as per the edit hint
    //     }; // This line is removed as per the edit hint
    // }); // This line is removed as per the edit hint

    return (
        <Box sx={{ width: '100%', height: '100%', position: 'relative' }}>
            {/* Controls: Sorting, Nodes/Row, Export, Help */}
            <Box sx={{ position: 'absolute', top: 8, left: 8, zIndex: 10, display: 'flex', gap: 2, alignItems: 'center' }}>
                {/* Layout Type Toggle */}
                <ToggleButtonGroup
                    value={layoutType}
                    exclusive
                    onChange={(_, v) => v && setLayoutType(v)}
                    size="small"
                    sx={{ mr: 1 }}
                >
                    <ToggleButton value="dependency">Dependency</ToggleButton>
                    <ToggleButton value="grid">Grid</ToggleButton>
                    <ToggleButton value="radial">Radial</ToggleButton>
                    <ToggleButton value="angled">Angled</ToggleButton>
                    <ToggleButton value="popupLayered">Popup</ToggleButton>
                </ToggleButtonGroup>
                {/* Order By Toggle */}
                <ToggleButtonGroup
                    value={orderBy}
                    exclusive
                    onChange={(_, v) => v && setOrderBy(v)}
                    size="small"
                    sx={{ mr: 1 }}
                >
                    <ToggleButton value="dependency">Dependency</ToggleButton>
                    <ToggleButton value="name">Name</ToggleButton>
                    <ToggleButton value="type">Type</ToggleButton>
                    <ToggleButton value="number">Number</ToggleButton>
                    <ToggleButton value="color">Color</ToggleButton>
                </ToggleButtonGroup>
                {/* Nodes Per Row Toggle */}
                <ToggleButtonGroup
                    value={nodesPerRow}
                    exclusive={false}
                    onChange={(_, v) => v && setNodesPerRow(v)}
                    size="small"
                    sx={{ mr: 1 }}
                >
                    {[4, 6, 8, 10, 12, 16].map(n => (
                        <ToggleButton key={n} value={n}>{n} / row</ToggleButton>
                    ))}
                </ToggleButtonGroup>
                <Tooltip title="Export as PDF">
                    <IconButton onClick={handleExport} size="small">
                        <DownloadIcon />
                    </IconButton>
                </Tooltip>
                <Tooltip title="Help / Legend">
                    <IconButton onClick={() => setShowHelp(true)} size="small">
                        <HelpOutlineIcon />
                    </IconButton>
                </Tooltip>
            </Box>
            {/* Legend/Help Dialog */}
            {showHelp && (
                <Box sx={{ position: 'absolute', top: 60, left: 8, zIndex: 20, background: '#fff', borderRadius: 2, boxShadow: 4, p: 2, minWidth: 260 }}>
                    <div style={{ fontWeight: 600, marginBottom: 8 }}>Legend</div>
                    <div style={{ display: 'flex', alignItems: 'center', marginBottom: 4 }}>
                        <CompareArrowsIcon style={{ color: '#00897b', marginRight: 8 }} /> Parent & Child (teal)
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', marginBottom: 4 }}>
                        <ArrowUpwardIcon style={{ color: '#1976d2', marginRight: 8 }} /> Parent (blue)
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', marginBottom: 4 }}>
                        <ArrowDownwardIcon style={{ color: '#43a047', marginRight: 8 }} /> Child (green)
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', marginBottom: 4 }}>
                        <FiberManualRecordIcon style={{ color: '#bdbdbd', marginRight: 8 }} /> Other (gray)
                    </div>
                    <div style={{ marginTop: 8, fontSize: 13, color: '#555' }}>
                        <b>How to use:</b><br />
                        - Click or hover a node to highlight its dependencies.<br />
                        - Click a node to open details.<br />
                        - Use the export button to save the view.<br />
                        - Keyboard: Tab to focus nodes, Enter to select.<br />
                    </div>
                    <Box sx={{ textAlign: 'right', mt: 1 }}>
                        <Button size="small" onClick={() => setShowHelp(false)}>Close</Button>
                    </Box>
                </Box>
            )}
            <div id="flowchart-container" style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 600 }}>
                <ReactFlow
                    ref={ref}
                    nodes={nodesWithStyles}
                    edges={edgesWithStyles}
                    nodeTypes={nodeTypes}
                    edgeTypes={edgeTypes}
                    onNodeClick={onNodeClick}
                    onNodeDoubleClick={onNodeDoubleClick}
                    onNodeMouseEnter={(_, node) => setHoveredNode(node.id)}
                    onNodeMouseLeave={() => setHoveredNode(null)}
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
                    {/* Background removed for plain/transparent look */}
                    <Controls
                        style={{
                            backgroundColor: darkTheme ? 'rgba(235, 58, 58, 0.8)' : 'rgba(255, 255, 255, 0.8)',
                            borderColor: darkTheme ? 'rgba(243, 92, 92, 0.77)' : 'rgba(0, 0, 0, 0.1)',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                        }}
                    />
                </ReactFlow>
            </div>
        </Box>
    );
});

const FlowChart = React.memo(React.forwardRef((props, ref) => (
    <ReactFlowProvider>
        <FlowChartInner {...props} ref={ref} />
    </ReactFlowProvider>
)));

export default FlowChart; 