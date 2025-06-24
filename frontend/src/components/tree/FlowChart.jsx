import React, { useState, useEffect, useCallback, forwardRef, useMemo } from 'react';
import ReactFlow, {
    Controls,
    Panel,
    useReactFlow,
    getRectOfNodes,
    getTransformForBounds,
    Background,
} from 'reactflow';
import 'reactflow/dist/style.css';
import CustomNode from './CustomNode';
import { useThemeContext } from '../../context/ThemeContext';
import { IconButton, Tooltip, Stack, Divider } from '@mui/material';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import VisibilityIcon from '@mui/icons-material/Visibility';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

const nodeTypes = {
    'custom-node': CustomNode,
};

/**
 * FlowChart component renders the main flowchart visualization using ReactFlow.
 * Handles node/edge selection, search, and visual styles for edges and nodes.
 */
const FlowChart = forwardRef(({ allNodes, allEdges, selectedNode, setSelectedNode, searchTerm, showArrows, setShowArrows, dottedLines, animatedLines }, ref) => {
    console.log('[FlowChart] Render - allNodes:', allNodes, 'allEdges:', allEdges, 'selectedNode:', selectedNode);

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

    /**
     * Initializes the nodes and edges state from props.
     */
    const initializeData = useCallback((nodes, edges) => {
        console.log('[FlowChart] Initializing data with nodes:', nodes?.length, 'edges:', edges?.length);
        if (nodes?.length > 0 && edges?.length >= 0) {
            setNodes(nodes);
            setEdges(edges);
            setIsInitialized(true);
            return true;
        }
        return false;
    }, [setNodes, setEdges]);

    // Handle data initialization and updates
    useEffect(() => {
        console.log('[FlowChart] allNodes/allEdges changed - allNodes:', allNodes?.length, 'allEdges:', allEdges?.length);
        
        // Reset state if data is cleared
        if (!allNodes?.length) {
            console.log('[FlowChart] Resetting state due to missing data');
            setIsInitialized(false);
            setNodes([]);
            setEdges([]);
            setHighlightedEdges(new Set());
            setBlurredNodes(new Set());
            setConnectedNodeIds(new Set());
            return;
        }

        // Initialize or update data
        const success = initializeData(allNodes, allEdges);
        console.log('[FlowChart] Data initialization result:', success);
    }, [allNodes, allEdges, initializeData]);

    /**
     * Handles search term changes to blur non-matching nodes.
     */
    useEffect(() => {
        if (!isInitialized) return;

        console.log('[FlowChart] searchTerm changed:', searchTerm);
        if (!searchTerm) {
            console.log('[FlowChart] Clearing blurred nodes');
            setBlurredNodes(new Set());
            return;
        }

        const lowerSearch = searchTerm.toLowerCase();
        const nodesToBlur = new Set(
            allNodes.filter(node => !JSON.stringify(node.data).toLowerCase().includes(lowerSearch))
                    .map(node => node.id)
        );
        console.log('[FlowChart] Setting blurred nodes:', nodesToBlur);
        setBlurredNodes(nodesToBlur);
    }, [searchTerm, allNodes, isInitialized]);

    const connectedNode = useCallback((id) => {
        console.log('[FlowChart] connectedNode called with:', id);
        const connectedEdges = edges.filter(edge =>
            edge.source === id || edge.target === id
        );
        console.log('[FlowChart] connectedEdges found:', connectedEdges);
        setHighlightedEdges(new Set(connectedEdges.map(edge => edge.id)));
    }, [edges]);

    /**
     * Returns the set of node IDs directly connected to a given node.
     */
    const getDirectlyConnectedNodeIds = useCallback((nodeId) => {
        console.log('[FlowChart] getDirectlyConnectedNodeIds called with:', nodeId);
        const connected = new Set();
        edges.forEach(edge => {
            if (edge.source === nodeId) connected.add(edge.target);
            if (edge.target === nodeId) connected.add(edge.source);
        });
        console.log('[FlowChart] directly connected nodes:', connected);
        return connected;
    }, [edges]);

    const onNodeMouseEnter = useCallback((_, node) => {
        console.log('[FlowChart] onNodeMouseEnter:', node.id);
        if (!selectedNode && !doubleClickedNode) {
            connectedNode(node.id);
        }
    }, [selectedNode, doubleClickedNode, connectedNode]);

    const onNodeMouseLeave = useCallback(() => {
        console.log('[FlowChart] onNodeMouseLeave');
        if (!selectedNode && !doubleClickedNode) {
            setHighlightedEdges(new Set());
        }
    }, [selectedNode, doubleClickedNode]);

    /**
     * Handles node click events for selection and highlighting.
     */
    const onNodeClick = useCallback((_, node) => {
        console.log('[FlowChart] onNodeClick:', node.id, 'current selectedNode:', selectedNode);
        if (selectedNode === node.id) {
            console.log('[FlowChart] Deselecting node');
            setSelectedNode(null);
            setHighlightedEdges(new Set());
            setConnectedNodeIds(new Set());
        } else {
            console.log('[FlowChart] Selecting node');
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
        console.log('[FlowChart] onNodeDoubleClick:', node.id);
        if (doubleClickedNode === node.id) {
            console.log('[FlowChart] Clearing double click selection');
            setDoubleClickedNode(null);
            setBlurredNodes(new Set());
            setHighlightedEdges(new Set());
        } else {
            console.log('[FlowChart] Setting double click selection');
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
        console.log('[FlowChart] onInit called with instance:', instance);
    }, []);

    // Deduplicate nodes by ID
    const dedupedNodes = useMemo(() => {
        const seen = new Set();
        return nodes.filter(n => {
            if (seen.has(n.id)) return false;
            seen.add(n.id);
            return true;
        });
    }, [nodes]);

    // Add small random offset to nodes with the same position
    const nodesWithOffset = useMemo(() => {
        const posMap = new Map();
        return dedupedNodes.map(n => {
            const key = `${n.position.x},${n.position.y}`;
            if (posMap.has(key)) {
                // Add a small offset if position is already taken
                const count = posMap.get(key) + 1;
                posMap.set(key, count);
                return {
                    ...n,
                    position: {
                        x: n.position.x + Math.random() * 10 * count,
                        y: n.position.y + Math.random() * 10 * count
                    }
                };
            } else {
                posMap.set(key, 1);
                return n;
            }
        });
    }, [dedupedNodes]);

    // Prepare nodes with styles
    const nodeIdHasChildren = new Set(edges.map(e => e.source));
    const nodeIdHasParents = new Set(edges.map(e => e.target));
    const nodesWithStyles = nodesWithOffset.map(node => {
        let style = {
            ...node.style,
            opacity: blurredNodes.has(node.id) ? 0.2 : 1,
            transition: 'all 0.3s ease-in-out',
            borderRadius: '10px',
            boxShadow: node.id === selectedNode ? '0 0 0 4px yellow' : 'none',
        };
        if (connectedNodeIds.has(node.id)) {
            style = {
                ...style,
                border: '3px solid red',
                boxShadow: '0 0 0 4px red',
            };
        }
        // Determine parent/child status
        const isParent = nodeIdHasChildren.has(node.id);
        const isChild = nodeIdHasParents.has(node.id);
        return { ...node, style, data: { ...node.data, isParent, isChild } };
    });

    const onEdgeClick = useCallback((event, edge) => {
        if (!showArrows) {
            setVisibleEdges(prev => {
                const newSet = new Set(prev);
                newSet.add(edge.id);
                return newSet;
            });
        }
    }, [showArrows]);

    /**
     * Prepares the edge objects with styles and animation for ReactFlow.
     */
    const edgesWithStyles = edges
        .filter(edge => showArrows || visibleEdges.has(edge.id))
        .map(edge => {
            const isConnected = selectedNode && (edge.source === selectedNode || edge.target === selectedNode);
            return {
                ...edge,
                type: 'straight',
                animated: animatedLines,
                style: {
                    stroke: isConnected ? '#c62828' : (darkTheme ? '#fff' : '#444'),
                    strokeWidth: isConnected ? 2.5 : 1,
                    strokeDasharray: dottedLines ? '5 5' : undefined,
                    transition: 'stroke 0.2s',
                },
                markerEnd: showArrows ? {
                    type: 'arrowclosed',
                    width: 20,
                    height: 20,
                    color: isConnected ? '#c62828' : (darkTheme ? '#fff' : '#444'),
                } : undefined,
            };
        });

    console.log('[FlowChart] Render - nodesWithStyles:', nodesWithStyles.length, 'edgesWithStyles:', edgesWithStyles.length, 'isInitialized:', isInitialized);

    // Debug: Log node positions
    if (nodesWithStyles.length > 0) {
        const positions = nodesWithStyles.map(n => n.position);
        console.log('[FlowChart] Node positions:', positions);
        const outOfBounds = positions.filter(pos => !pos || pos.x < 0 || pos.y < 0 || pos.x > 2000 || pos.y > 2000);
        if (outOfBounds.length > 0) {
            console.warn('[FlowChart] WARNING: Some node positions are out of visible area:', outOfBounds);
        }
    }

    // Only keep the raster PDF export using html2canvas
    const handleExportPdf = useCallback((afterExportCallback) => {
        const flowElement = document.querySelector('.react-flow');
        if (!flowElement) {
            alert('Could not find the graph area to export.');
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
                alert('Failed to export PDF.');
                if (afterExportCallback) afterExportCallback();
            });
        }, 100); // 100ms delay to ensure DOM is ready
    }, []);

    /**
     * Expose PDF export to parent via ref.
     */
    React.useImperativeHandle(ref, () => ({
        handleExportPdf,
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

    if (!allNodes?.length) {
        console.log('[FlowChart] No data to render, showing waiting message');
        return <div style={{ color: '#aaa', padding: 20 }}>Waiting for data to render flowchart…</div>;
    }

    if (!isInitialized || nodes.length === 0) {
        console.log('[FlowChart] Not initialized or no nodes, showing loading message');
        return <div style={{ color: '#aaa', padding: 20 }}>Loading flowchart...</div>;
    }

    console.log('[FlowChart] Rendering ReactFlow with', nodesWithStyles.length, 'nodes and', edgesWithStyles.length, 'edges');

    return (
        <div style={{ width: '100%', height: '100%', position: 'relative' }}>
            <ReactFlow
                ref={ref}
                nodes={nodesWithStyles}
                edges={edgesWithStyles}
                nodeTypes={nodeTypes}
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
            >
                <Background
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
            </ReactFlow>
        </div>
    );
});

export default FlowChart;
