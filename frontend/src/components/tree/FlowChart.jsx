import React, { useState, useEffect, useCallback, forwardRef, useMemo } from 'react';
import ReactFlow, {
    Controls,
    Panel,
    useReactFlow,
    getRectOfNodes,
    getTransformForBounds,
    Background,
    ReactFlowProvider,
} from 'reactflow';
import 'reactflow/dist/style.css';
import CustomNode from './CustomNode';
import { useThemeContext } from '../../context/ThemeContext';
import { IconButton, Tooltip, Stack, Divider, Select, MenuItem, FormControl, InputLabel } from '@mui/material';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import VisibilityIcon from '@mui/icons-material/Visibility';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import CenterFocusStrongIcon from '@mui/icons-material/CenterFocusStrong';
import LockIcon from '@mui/icons-material/Lock';
import LockOpenIcon from '@mui/icons-material/LockOpen';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import CustomPolylineEdge from './CustomPolylineEdge';

/**
 * FlowChart component renders the main flowchart visualization using ReactFlow.
 * Handles node/edge selection, search, and visual styles for edges and nodes.
 */
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
    const { getNodes } = useReactFlow();
    const reactFlowInstance = useReactFlow();
    const [pendingExport, setPendingExport] = useState(false);
    const [reactFlowInstanceState, setReactFlowInstance] = useState(null);
    const [isLocked, setIsLocked] = useState(false);

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

    // Debugging for nodesPerRow and orderBy
    useEffect(() => {
        console.log('[FlowChart] orderBy:', orderBy);
    }, [orderBy]);

    const nodeTypes = useMemo(() => ({
        'custom-node': CustomNode,
    }), []);
    const edgeTypes = useMemo(() => ({
        custom: CustomPolylineEdge,
    }), []);

    /**
     * Initializes the nodes and edges state from props.
     */
    const initializeData = useCallback((nodes, edges) => {
        if (nodes?.length > 0 && edges?.length >= 0) {
            setNodes(nodes);
            setEdges(edges);
            setIsInitialized(true);
            return true;
        }
        return false;
    }, [setNodes, setEdges]);

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

    const colorOrder = ['gray', 'blue', 'light blue', 'green'];
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
            // Use the old parentChild logic here
            nodesCopy.sort((a, b) => {
                const getRank = (n) => {
                    const p = n.data?.isParent;
                    const c = n.data?.isChild;
                    if (!p && !c) return 0; // neither
                    if (p && !c) return 1; // parent only
                    if (p && c) return 2; // both
                    if (!p && c) return 3; // child only
                    return 4; // fallback (shouldn't happen)
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

    // Handle data initialization and updates
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
        // Initialize or update data
        const success = initializeData(sortedNodes, allEdges);
        // Fit view to canvas when nodes/edges change
        if (reactFlowInstance && sortedNodes.length > 0) {
            setTimeout(() => {
                try {
                    reactFlowInstance.fitView({ padding: 0.1, includeHiddenNodes: true });
                } catch (e) { /* ignore */ }
            }, 100);
        }
    }, [sortedNodes, allEdges, initializeData, reactFlowInstance]);

    /**
     * Handles search term changes to blur non-matching nodes.
     */
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

    /**
     * Returns the set of node IDs directly connected to a given node.
     */
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

    /**
     * Handles node click events for selection and highlighting.
     */
    const onNodeClick = useCallback((_, node) => {
        if (selectedNode === node.id) {
            setSelectedNode(null);
            setHighlightedEdges(new Set());
            setConnectedNodeIds(new Set());
        } else {
            setSelectedNode(node.id);
            const connectedIds = getDirectlyConnectedNodeIds(node.id);
            setConnectedNodeIds(connectedIds);
            
            // Show arrows connected to this node when arrows are hidden
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

    /**
     * Handles double-click events to highlight dependencies.
     */
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
        setReactFlowInstance(instance);
    }, []);

    // Arrange nodes in a grid layout based on a fixed nodesPerRow and sorted order
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

    // Replace dedupedNodes with gridNodes in nodesWithOffset
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
    const nodeIdHasChildren = new Set(edges.map(e => e.source));
    const nodeIdHasParents = new Set(edges.map(e => e.target));
    const nodesWithStyles = useMemo(() => {
        const baseNodes = (layoutType === 'collapsible') ? gridNodes : sortedNodes;
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
                const isParent = edges.some(e => e.source === node.id && e.target === selectedNode);
                const isChild = edges.some(e => e.source === selectedNode && e.target === node.id);
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
    }, [layoutType, sortedNodes, gridNodes, blurredNodes, connectedNodeIds, selectedNode, edges]);

    const onEdgeClick = useCallback((event, edge) => {
        if (!showArrows) {
            setVisibleEdges(prev => {
                const newSet = new Set(prev);
                newSet.add(edge.id);
                return newSet;
            });
        }
    }, [showArrows]);

    const nodePositionMap = useMemo(() => {
        const map = new Map();
        nodesWithStyles.forEach(n => {
            map.set(n.id, n.position);
        });
        return map;
    }, [nodesWithStyles]);

    // Prepare edges with styles and direction for parent/child
    const edgesWithStyles = edges.map(edge => {
        let style = { stroke: '#bbb', strokeWidth: 2, opacity: 0.6 };
        let direction = undefined;
        if (selectedNode) {
            if (edge.source === selectedNode) {
                // Edge from selected node to child
                style = { ...style, stroke: '#00e676', strokeWidth: 3, opacity: 1 };
                direction = 'child';
            } else if (edge.target === selectedNode) {
                // Edge from parent to selected node
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

    // Add debugging for edge visibility
    useEffect(() => {
        // console.log('[FlowChart] showArrows:', showArrows);
        // console.log('[FlowChart] Total edges:', edges.length);
        // console.log('[FlowChart] Visible edges after filter:', edgesWithStyles.length);
        // console.log('[FlowChart] selectedNode:', selectedNode);
        // console.log('[FlowChart] visibleEdges size:', visibleEdges.size);
    }, [showArrows, edges.length, edgesWithStyles.length, selectedNode, visibleEdges.size]);

    // Only keep the raster PDF export using html2canvas
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
                scale: 8, // Even higher for sharpness
                width: Math.round(rect.width),
                height: Math.round(rect.height),
                scrollX: -window.scrollX,
                scrollY: -window.scrollY,
                onclone: (clonedDoc) => {
                    // Remove any unwanted overlays or UI elements if needed
                }
            }).then(canvas => {
                // Disable image smoothing for sharp lines
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
        }, 100); // 100ms delay to ensure DOM is ready
    }, []);

    // Add image export functionality
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
                scale: 2, // Good quality for images
                width: Math.round(rect.width),
                height: Math.round(rect.height),
                scrollX: -window.scrollX,
                scrollY: -window.scrollY,
                onclone: (clonedDoc) => {
                    // Remove any unwanted overlays or UI elements if needed
                }
            }).then(canvas => {
                // Convert to PNG and download
                const link = document.createElement('a');
                link.download = 'waf-rules-flowchart.png';
                link.href = canvas.toDataURL('image/png');
                link.click();
                if (afterExportCallback) afterExportCallback();
            }).catch(err => {
                console.error('Error exporting image:', err);
                if (afterExportCallback) afterExportCallback();
            });
        }, 100); // 100ms delay to ensure DOM is ready
    }, [darkTheme]);

    /**
     * Expose PDF export to parent via ref.
     */
    React.useImperativeHandle(ref, () => ({
        handleExportPdf,
        handleExportImage,
    }));

    // Style configuration based on dark mode
    const flowStyles = useMemo(() => ({
        backgroundColor: 'transparent',
    }), []);

    const edgeStyles = useMemo(() => ({
        stroke: darkTheme ? '#fff' : '#333',
        strokeWidth: 2,
        opacity: 0.6,
    }), [darkTheme]);

    const highlightedEdgeStyles = useMemo(() => ({
        ...edgeStyles,
        stroke: darkTheme ? '#4CAF50' : '#2E7D32',
        strokeWidth: 3,
        opacity: 1,
    }), [darkTheme, edgeStyles]);

    // Robustly auto-center the tree after layout (treeStyle) or node changes
    useEffect(() => {
        if (reactFlowInstance && layoutType && nodesWithStyles.length > 0) {
            setTimeout(() => {
                if (layoutType === 'angled') {
                    // Center the bounding box of all nodes and fit the diagonal
                    const xs = nodesWithStyles.map(n => n.position.x);
                    const ys = nodesWithStyles.map(n => n.position.y);
                    const minX = Math.min(...xs);
                    const maxX = Math.max(...xs);
                    const minY = Math.min(...ys);
                    const maxY = Math.max(...ys);
                    const centerX = (minX + maxX) / 2;
                    const centerY = (minY + maxY) / 2;
                    // Calculate zoom to fit the diagonal in the viewport
                    const container = document.querySelector('.react-flow');
                    let zoom = 1;
                    if (container) {
                        const width = container.clientWidth;
                        const height = container.clientHeight;
                        const diagWidth = maxX - minX + 100;
                        const diagHeight = maxY - minY + 100;
                        const zoomX = width / diagWidth;
                        const zoomY = height / diagHeight;
                        zoom = Math.min(zoomX, zoomY, 1);
                    }
                    reactFlowInstance.setCenter(centerX, centerY, { zoom });
                } else {
                    reactFlowInstance.fitView({ padding: 0.2 });
                }
            }, 100);
        }
    }, [layoutType, nodesWithStyles.length, reactFlowInstance]);

    const handleRecenter = () => {
        if (reactFlowInstance) {
            reactFlowInstance.fitView({ padding: 0.2, includeHiddenNodes: true });
        }
    };

    // Final defensive pass before rendering
    nodesWithStyles.forEach(n => {
        if (!n.position || typeof n.position.x !== 'number' || isNaN(n.position.x)) {
            n.position = n.position || {};
            n.position.x = 0;
        }
        if (!n.position || typeof n.position.y !== 'number' || isNaN(n.position.y)) {
            n.position = n.position || {};
            n.position.y = 0;
        }
    });

    // Debug: print all node positions and order before rendering
    console.log('nodesWithStyles:', nodesWithStyles.map(n => ({id: n.id, x: n.position?.x, y: n.position?.y})));

    if (!sortedNodes?.length || nodesWithStyles.length === 0) {
        return <div style={{ color: '#aaa', padding: 20 }}>No nodes to display. Please load or add rules to see the flowchart.</div>;
    }

    // Remove the options UI for popups/inspector by checking treeSetup/orderBy
    if (layoutType === 'popupLayered' || orderBy === 'dependency') {
        // Do not render the options bar
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
                    onEdgeClick={onEdgeClick}
                    onInit={onInit}
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
                        style: edgeStyles,
                    }}
                    panOnDrag={!isLocked}
                    zoomOnScroll={!isLocked}
                    zoomOnPinch={!isLocked}
                    zoomOnDoubleClick={!isLocked}
                >
                    <>
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
                                button: {
                                    backgroundColor: darkTheme ? 'rgba(68, 68, 68, 0.8)' : 'rgba(255, 255, 255, 0.8)',
                                    color: darkTheme ? '#fff' : '#333',
                                    border: 'none',
                                    '&:hover': {
                                        backgroundColor: darkTheme ? 'rgba(85, 85, 85, 0.9)' : 'rgba(240, 240, 240, 0.9)',
                                    },
                                },
                            }}
                        />
                    </>
                </ReactFlow>
            </div>
        );
    } else {
        return (
            <div style={{ width: '100%', height: '100%', position: 'relative' }}>
                <div style={{ position: 'absolute', top: 10, left: 10, zIndex: 10, background: 'rgba(255,255,255,0.9)', borderRadius: 8, padding: 8, display: 'flex', gap: 12, alignItems: 'center' }}>
                    <Tooltip title="Recenter Tree">
                        <IconButton onClick={handleRecenter} size="small">
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
                    onEdgeClick={onEdgeClick}
                    onInit={onInit}
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
                        style: edgeStyles,
                    }}
                    panOnDrag={!isLocked}
                    zoomOnScroll={!isLocked}
                    zoomOnPinch={!isLocked}
                    zoomOnDoubleClick={!isLocked}
                >
                    <>
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
                                button: {
                                    backgroundColor: darkTheme ? 'rgba(68, 68, 68, 0.8)' : 'rgba(255, 255, 255, 0.8)',
                                    color: darkTheme ? '#fff' : '#333',
                                    border: 'none',
                                    '&:hover': {
                                        backgroundColor: darkTheme ? 'rgba(85, 85, 85, 0.9)' : 'rgba(240, 240, 240, 0.9)',
                                    },
                                },
                            }}
                        />
                    </>
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
