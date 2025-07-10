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

// Move nodeTypes and edgeTypes outside the component to avoid React Flow warning
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

const FlowChartInner = forwardRef(({
    allNodes,
    allEdges,
    selectedNode,
    setSelectedNode,
    searchTerm,
    showArrows,
    orderBy: orderByProp = 'number',
}, ref) => {
    const [orderBy, setOrderBy] = useState(orderByProp);
    const [hoveredNode, setHoveredNode] = useState(null);
    const [showHelp, setShowHelp] = useState(false);
    const [nodesPerRow, setNodesPerRow] = useState(8);
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

    // Node grouping and layout logic
    const colorOrder = ['gray', 'blue', 'light blue', 'green'];
    // Preprocess: set isParent and isChild on each node
    const preprocessedNodes = useMemo(() => {
        if (!allNodes) return [];
        const parentIds = new Set((allEdges || []).map(e => e.source));
        const childIds = new Set((allEdges || []).map(e => e.target));
        return allNodes.map(n => ({
            ...n,
            data: {
                ...n.data,
                isParent: parentIds.has(n.id),
                isChild: childIds.has(n.id),
            }
        }));
    }, [allNodes, allEdges]);

    const sortedNodes = useMemo(() => {
        if (!preprocessedNodes) return [];
        let nodesCopy = [...preprocessedNodes];
        // Assign color property for grouping
        nodesCopy = nodesCopy.map(n => ({
          ...n,
          data: {
            ...n.data,
            color: getNodeColor(n)
          }
        }));
        if (orderBy === 'dependency') {
          // Group nodes by color/type for dependency sort
          const colorGroups = {
            gray: [],
            blue: [],
            'light blue': [],
            green: [],
          };
          nodesCopy.forEach(n => {
            const color = (n.data.color || '').toLowerCase();
            if (colorGroups[color]) colorGroups[color].push(n);
            else colorGroups.gray.push(n);
          });
          // Flatten in color order
          return colorOrder.flatMap(color => colorGroups[color]);
        }
        // Default: sort by number
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
          const aNum = getNum(a, preprocessedNodes.indexOf(a));
          const bNum = getNum(b, preprocessedNodes.indexOf(b));
          return aNum - bNum;
        });
        return nodesCopy;
    }, [preprocessedNodes, allEdges, orderBy]);

    // Layout nodes in grouped rows for dependency sort
    const layoutNodes = useCallback((nodes, edges, orderBy, nodesPerRow) => {
      if (orderBy === 'dependency') {
        // Group nodes by color/type
        const colorGroups = {
          gray: [],
          blue: [],
          'light blue': [],
          green: [],
        };
        nodes.forEach(n => {
          const color = (n.data.color || '').toLowerCase();
          if (colorGroups[color]) colorGroups[color].push(n);
          else colorGroups.gray.push(n);
        });
        const GRID_SIZE = 180;
        let positioned = [];
        let y = 0;
        colorOrder.forEach(group => {
          const groupNodes = colorGroups[group];
          groupNodes.forEach((node, i) => {
            positioned.push({
              ...node,
              position: { x: safeNumber(i * GRID_SIZE), y: safeNumber(y) },
            });
          });
          if (groupNodes.length > 0) y += GRID_SIZE;
        });
        return positioned;
      } else {
        // Default to grid
        const GRID_SIZE = 180;
        return nodes.map((node, index) => {
          const row = Math.floor(index / nodesPerRow);
          const col = index % nodesPerRow;
          return {
            ...node,
            position: { x: safeNumber(col * GRID_SIZE), y: safeNumber(row * GRID_SIZE) },
          };
        });
      }
    }, []);

    // Use layoutNodes to position nodes
    const positionedNodes = useMemo(() => layoutNodes(sortedNodes, allEdges, orderBy, nodesPerRow), [sortedNodes, allEdges, orderBy, nodesPerRow]);

    // Defensive: filter out edges with missing/undefined source/target
    const filteredEdges = useMemo(() => {
      return (allEdges || []).filter(e => e.source && e.target);
    }, [allEdges]);

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
        const success = initializeData(sortedNodes, filteredEdges);
        if (reactFlowInstance && sortedNodes.length > 0) {
            setTimeout(() => {
                try {
                    reactFlowInstance.fitView({ padding: 0.1, includeHiddenNodes: true });
                } catch (e) { /* ignore */ }
            }, 100);
        }
    }, [sortedNodes, filteredEdges, initializeData, reactFlowInstance]);

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
            const blurred = new Set(nodes.map(n => n.id).filter(id => !relatedNodes.has(id)));
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
    }, [doubleClickedNode, nodes, filteredEdges, findUpwardDependencies, findDownwardDependencies, setSelectedNode]);

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

    const popupLayeredNodes = useMemo(() => {
        if (orderBy !== 'popupLayered' || !selectedNode || !allNodes) return null;
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
    }, [orderBy, selectedNode, allNodes, allEdges]);

    const nodesWithOffset = useMemo(() => {
        if (popupLayeredNodes) return popupLayeredNodes;
        const posMap = new Map();
        return positionedNodes.map(n => {
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
    }, [positionedNodes, popupLayeredNodes]);

    const nodeIdHasChildren = new Set(filteredEdges.map(e => e.source));
    const nodeIdHasParents = new Set(filteredEdges.map(e => e.target));
    const highlightSet = new Set();
    if (hoveredNode || selectedNode) {
        const focusId = hoveredNode || selectedNode;
        highlightSet.add(focusId);
        filteredEdges.forEach(edge => {
            if (edge.source === focusId) highlightSet.add(edge.target);
            if (edge.target === focusId) highlightSet.add(edge.source);
        });
    }

    // Node style: circular, colored, centered text
    const nodesWithStyles = positionedNodes.map(node => {
        // Assign color for sorting
        let color = (node.data.color || '').toLowerCase();
        let bgColor = '#bdbdbd'; // gray default
        if (color === 'blue') bgColor = '#1976d2';
        else if (color === 'green') bgColor = '#43a047';
        // Style for circular node
        const style = {
            width: 56,
            height: 56,
            borderRadius: '50%',
            background: bgColor,
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 600,
            fontSize: 14,
            boxShadow: node.selected ? '0 0 0 4px #ffd600' : '0 2px 8px rgba(0,0,0,0.08)',
            border: node.selected ? '3px solid #ffd600' : '2px solid #fff',
            transition: 'box-shadow 0.2s, border 0.2s',
        };
        return {
            ...node,
            style,
        };
    });
    // Edge style: smooth, light gray, no arrowheads
    const edgesWithStyles = filteredEdges.map(edge => ({
        ...edge,
        type: 'custom',
        style: { stroke: '#bbb', strokeWidth: 2, opacity: 0.6 },
        markerEnd: undefined,
    }));

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
            <Box sx={{ position: 'absolute', top: 8, left: 8, zIndex: 10, display: 'flex', gap: 2 }}>
                <ToggleButtonGroup
                    value={orderBy}
                    exclusive
                    onChange={(_, val) => val && setOrderBy(val)}
                    size="small"
                >
                    <ToggleButton value="number">Sort by Number</ToggleButton>
                    <ToggleButton value="dependency">Sort by Parent/Child</ToggleButton>
                </ToggleButtonGroup>
                <ToggleButtonGroup
                    value={nodesPerRow}
                    exclusive
                    onChange={(_, val) => val && setNodesPerRow(val)}
                    size="small"
                    sx={{ ml: 2 }}
                >
                    <ToggleButton value={8}>8/row</ToggleButton>
                    <ToggleButton value={16}>16/row</ToggleButton>
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