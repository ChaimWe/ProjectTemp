import React, { useState, useEffect, useCallback, forwardRef } from 'react';
import {
    ReactFlow,
    useNodesState,
    useEdgesState,
    Controls,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import CustomNode from './CustomNode';
import { useThemeContext } from '../../context/ThemeContext';

const nodeTypes = {
    'custom-node': CustomNode,
};

const FlowChart = forwardRef(({ allNodes, allEdges, selectedNode, setSelectedNode, searchTerm }, ref) => {
    console.log('[FlowChart] Render - allNodes:', allNodes, 'allEdges:', allEdges, 'selectedNode:', selectedNode);

    const [nodes, setNodes] = useNodesState([]);
    const [edges, setEdges] = useEdgesState([]);
    const [highlightedEdges, setHighlightedEdges] = useState(new Set());
    const [blurredNodes, setBlurredNodes] = useState(new Set());
    const [doubleClickedNode, setDoubleClickedNode] = useState(null);
    const [connectedNodeIds, setConnectedNodeIds] = useState(new Set());
    const [isInitialized, setIsInitialized] = useState(false);
    const { getColor } = useThemeContext();

    // Memoize the data initialization function
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
        if (!allNodes?.length || !allEdges?.length) {
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

    // Handle search term changes
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
            setConnectedNodeIds(getDirectlyConnectedNodeIds(node.id));
            connectedNode(node.id);
        }
    }, [selectedNode, setSelectedNode, getDirectlyConnectedNodeIds, connectedNode]);

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
        if (ref?.current) ref.current = instance;
    }, [ref]);

    // Prepare nodes with styles
    const nodeIdHasChildren = new Set(edges.map(e => e.source));
    const nodeIdHasParents = new Set(edges.map(e => e.target));
    const nodesWithStyles = nodes.map(node => {
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

    // Prepare edges with styles
    const edgesWithStyles = edges.map(edge => {
        const isConnected = selectedNode && (edge.source === selectedNode || edge.target === selectedNode);
        return {
            ...edge,
            type: 'straight',
            style: {
                stroke: isConnected ? '#e53935' : '#444',
                strokeWidth: isConnected ? 5 : 3,
                transition: 'all 0.2s ease-in-out',
            },
            markerEnd: {
                type: 'arrowclosed',
                width: 20,
                height: 20,
                color: isConnected ? '#e53935' : '#444',
            },
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

    if (!allNodes?.length || !allEdges?.length) {
        console.log('[FlowChart] No data to render, showing waiting message');
        return <div style={{ color: '#aaa', padding: 20 }}>Waiting for data to render flowchart…</div>;
    }

    if (!isInitialized || nodes.length === 0) {
        console.log('[FlowChart] Not initialized or no nodes, showing loading message');
        return <div style={{ color: '#aaa', padding: 20 }}>Loading flowchart...</div>;
    }

    console.log('[FlowChart] Rendering ReactFlow with', nodesWithStyles.length, 'nodes and', edgesWithStyles.length, 'edges');

    return (
        <div style={{ width: '100vw', height: '100vh', backgroundColor: getColor('background') }}>
            <ReactFlow
                nodes={nodesWithStyles}
                edges={edgesWithStyles}
                nodeTypes={nodeTypes}
                onNodeMouseEnter={onNodeMouseEnter}
                onNodeMouseLeave={onNodeMouseLeave}
                onNodeClick={onNodeClick}
                onNodeDoubleClick={onNodeDoubleClick}
                ref={ref}
                onInit={onInit}
                fitView
                fitViewOptions={{
                    padding: 0.23,
                    includeHiddenNodes: true,
                    duration: 800,
                    easing: (t) => t * (2 - t)
                }}
                minZoom={0.06}
                maxZoom={2}
                defaultViewport={{ zoom: 0.6 }}
                zoomOnScroll
                panOnDrag
            >
                <Controls />
            </ReactFlow>
        </div>
    );
});

export default FlowChart;
