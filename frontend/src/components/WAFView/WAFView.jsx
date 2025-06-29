import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Box, IconButton, Tooltip, Typography } from '@mui/material';
import { ReactFlowProvider } from 'reactflow';
import FlowChart from '../tree/FlowChart';
import RulesLoaderPopup from '../upload/RulesLoaderPopup';
import RulePopup from '../popup/RulePopup';
import RuleDetailsPopup from '../popup/RuleDetailsPopup';
import RuleJsonPopup from '../popup/RuleJsonPopup';
import WarningsPopup from '../popup/WarningsPopup';
import { transformData } from '../tree/NodeTransformer';
import RuleTransformer from '../tree/RuleTransformer';
import Tree from '../tree/NodeTransformer';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import { useThemeContext } from '../../context/ThemeContext';
import getAnalyzedData from '../../data/getAnalyzedData';
import TableView from './TableView';
import CardView from './CardView';
import Topbar from '../layout/Topbar';

/**
 * Lays out nodes in a hierarchical top-down structure.
 * @param {Array} nodes - The array of nodes.
 * @param {Array} edges - The array of edges.
 * @returns {Object} - An object containing the array of positioned nodes.
 */
function layoutHierarchically(nodes, edges) {
    const nodeMap = new Map(nodes.map(n => [n.id, n]));
    const childrenMap = new Map();
    const parentMap = new Map();

    nodes.forEach(n => {
        childrenMap.set(n.id, []);
        parentMap.set(n.id, []);
    });

    edges.forEach(edge => {
        if (childrenMap.has(edge.source) && parentMap.has(edge.target)) {
            childrenMap.get(edge.source).push(edge.target);
            parentMap.get(edge.target).push(edge.source);
        }
    });

    const roots = nodes.filter(n => (parentMap.get(n.id) || []).length === 0);
    const levels = new Map();
    const visited = new Set();

    function assignLevels(nodeIds, level) {
        if (nodeIds.length === 0) return;

        const currentLevelNodes = [];
        const nextLevelNodeIds = new Set();

        nodeIds.forEach(nodeId => {
            if (visited.has(nodeId)) return;
            visited.add(nodeId);
            currentLevelNodes.push(nodeId);
            (childrenMap.get(nodeId) || []).forEach(childId => nextLevelNodeIds.add(childId));
        });

        if (currentLevelNodes.length > 0) {
            levels.set(level, currentLevelNodes);
            assignLevels(Array.from(nextLevelNodeIds), level + 1);
        }
    }

    assignLevels(roots.map(r => r.id), 0);

    const positionedNodes = [];
    const ySpacing = 200;
    const xSpacing = 280;

    let maxLevelWidth = 0;
    levels.forEach(nodeIds => {
        maxLevelWidth = Math.max(maxLevelWidth, nodeIds.length * xSpacing);
    });


    levels.forEach((nodeIds, level) => {
        const y = level * ySpacing;
        const levelWidth = nodeIds.length * xSpacing;
        const xOffset = (maxLevelWidth - levelWidth) / 2; // Center align each level

        nodeIds.forEach((nodeId, i) => {
            const node = nodeMap.get(nodeId);
            if (node) {
                positionedNodes.push({
                    ...node,
                    position: { x: xOffset + i * xSpacing, y },
                });
            }
        });
    });
    
    // Fallback for any nodes not caught in the hierarchy (e.g., cycles, disconnected)
    const positionedNodeIds = new Set(positionedNodes.map(n => n.id));
    const unpositionedNodes = nodes.filter(n => !positionedNodeIds.has(n.id));
    if (unpositionedNodes.length > 0) {
      const lastY = (levels.size || 0) * ySpacing;
      unpositionedNodes.forEach((node, i) => {
          positionedNodes.push({
              ...node,
              position: { x: (i % 5) * xSpacing, y: lastY + (Math.floor(i / 5) + 1) * ySpacing }
          });
      });
    }


    return { nodes: positionedNodes };
}

/**
 * WAFView component manages the main visualization and data transformation for WAF rules.
 * Handles loading, transforming, and passing data to the FlowChart.
 */
const WAFView = ({
  data,
  setData,
  exportToPdf,
  exportToImage,
  handleWarnings,
  setWarningCount,
  warningsPopupOpen,
  setWarningsPopupOpen,
  flowRef,
  loaderPopupOpen,
  setLoaderPopupOpen,
  handleExportVectorPdf,
  showArrows,
  setShowArrows,
  dottedLines,
  setDottedLines,
  animatedLines,
  setAnimatedLines,
  viewType = 'tree',
  setViewType,
  treeSetup = 'collapsible',
  setTreeSetup,
  orderBy = 'name',
  setOrderBy,
  treeStyle = 'dependency',
  setTreeStyle
}) => {
    console.log('[WAFView] Render - viewType:', viewType, 'orderBy:', orderBy, 'treeSetup:', treeSetup, 'treeStyle:', treeStyle);
    const { darkTheme } = useThemeContext();

    const [searchTerm, setSearchTerm] = useState('');
    const [selectedNode, setSelectedNode] = useState(null);
    const [rulePopupOpen, setRulePopupOpen] = useState(false);
    const [backTo, setBackTo] = useState(null);
    const [aclDetails, setAclDetails] = useState({
        aclName: 'WAF Rules',
        capacity: 0
    });
    const [graphData, setGraphData] = useState(null);
    const [popupData, setPopupData] = useState(null);
    const [originalRules, setOriginalRules] = useState([]); // Store full AWS WAF rules
    const [aiSummary, setAiSummary] = useState([]); // Store AI summary (Type, Condition)
    const [responseStyle, setResponseStyle] = useState('concise');
    const [popupRule, setPopupRule] = useState(null);
    const [orderDirection, setOrderDirection] = useState('asc');

    // Only allow dependency-based layout for tree view if treeStyle is 'dependency'
    const effectiveOrderBy = viewType === 'tree' && treeStyle === 'dependency' ? 'dependencies' : orderBy;

    // Add comprehensive debugging
    console.log('[WAFView] Debug Info:', {
        originalRules: originalRules?.length || 0,
        viewType,
        treeStyle,
        effectiveOrderBy,
        orderBy,
        data: data?.length || 0,
        graphData: graphData ? `${graphData.nodes?.length || 0} nodes, ${graphData.edges?.length || 0} edges` : 'null'
    });

    // Effect to initialize originalRules from data prop
    useEffect(() => {
        console.log('[WAFView] Data prop changed:', {
            dataLength: data?.length || 0,
            originalRulesLength: originalRules?.length || 0,
            dataType: typeof data,
            isArray: Array.isArray(data)
        });

        if (data && Array.isArray(data) && data.length > 0 && (!originalRules || originalRules.length === 0)) {
            console.log('[WAFView] Initializing originalRules from data prop');
            const normalized = normalizeRulesData(data);
            console.log('[WAFView] Normalized data from prop:', {
                isArray: Array.isArray(normalized),
                length: Array.isArray(normalized) ? normalized.length : 'N/A'
            });
            
            if (Array.isArray(normalized) && normalized.length > 0) {
                setOriginalRules(normalized);
                console.log('[WAFView] Set originalRules from data prop:', normalized.length);
            }
        }
    }, [data, originalRules]);

    /**
     * Effect: Transforms incoming data into graphData and popupData for visualization.
     */
    useEffect(() => {
        console.log('[WAFView] Data processing effect triggered:', {
            originalRulesLength: originalRules?.length || 0,
            viewType,
            treeStyle,
            effectiveOrderBy
        });

        if (!originalRules || originalRules.length === 0) {
            console.log('[WAFView] No original rules, clearing graph data');
            setGraphData(null);
            setPopupData(null);
            return;
        }

        try {
            let finalGraphData = null;
            let finalPopupData = null;

            if (viewType === 'tree') {
                console.log('[WAFView] Processing tree view with treeStyle:', treeStyle);
                
                // Step 1: Common data transformation for all tree styles
                const transformedData = transformData(originalRules);
                console.log('[WAFView] Initial transformation result:', {
                    hasNodes: !!transformedData?.nodes,
                    nodeCount: transformedData?.nodes?.length || 0,
                    hasEdges: !!transformedData?.edges,
                    edgeCount: transformedData?.edges?.length || 0
                });
                
                if (!transformedData || !transformedData.nodes) {
                    throw new Error("Initial transformation failed");
                }
                
                const ruleTransformer = new RuleTransformer(transformedData.nodes.map(n => n.data));
                const ruleTransformed = ruleTransformer.transformRules();
                console.log('[WAFView] Rule transformation result:', {
                    hasNodes: !!ruleTransformed?.nodes,
                    nodeCount: ruleTransformed?.nodes?.length || 0,
                    hasEdges: !!ruleTransformed?.edges,
                    edgeCount: ruleTransformed?.edges?.length || 0,
                    hasWarnings: !!ruleTransformed?.globalWarnings,
                    warningCount: ruleTransformed?.globalWarnings?.length || 0
                });
                
                if (!ruleTransformed) {
                    throw new Error("Rule transformation failed");
                }

                const treeHelper = new Tree();
                const baseNodes = ruleTransformed.nodes.map(node => {
                    if (!node.data.hw) {
                        node.data.hw = treeHelper.calculateCard(node.data);
                    }
                    return node;
                });

                const baseEdges = ruleTransformed.edges
                    .filter(e => e && e.source && e.target && e.id)
                    .map(e => ({ ...e, type: 'smoothstep', animated: animatedLines }));

                console.log('[WAFView] Base nodes and edges prepared:', {
                    baseNodesCount: baseNodes.length,
                    baseEdgesCount: baseEdges.length
                });

                let positionedNodes = [];

                // Step 2: Sort nodes for layouts that need it
                let sortedNodes = [];
                if (treeStyle !== 'dependency') {
                    sortedNodes = [...baseNodes].sort((a, b) => {
                        const aVal = a.data[effectiveOrderBy] || '';
                        const bVal = b.data[effectiveOrderBy] || '';
                        if (effectiveOrderBy.toLowerCase().includes('date')) {
                            return new Date(aVal || 0) - new Date(bVal || 0);
                        }
                        return String(aVal).localeCompare(String(bVal), undefined, { numeric: true });
                    });
                    console.log('[WAFView] Sorted nodes for non-dependency layout:', sortedNodes.length);
                }

                // Step 3: Layout-specific positioning
                if (treeStyle === 'dependency') {
                    console.log('[WAFView] Using layout: dependency');
                    treeHelper.calculateNodePositionHierarchical(baseNodes, baseEdges);
                    positionedNodes = baseNodes;
                    finalGraphData = { nodes: positionedNodes, edges: baseEdges.map(e => ({ ...e, type: undefined, animated: animatedLines })) };
                } else if (treeStyle === 'radial') {
                    console.log('[WAFView] Using layout: radial');
                    // Restore previous radial layout: evenly distribute nodes in a circle
                    const N = sortedNodes.length;
                    const radius = 350;
                    const centerX = 600;
                    const centerY = 350;
                    positionedNodes = sortedNodes.map((node, i) => {
                        const angle = (2 * Math.PI * i) / N;
                        const x = centerX + radius * Math.cos(angle);
                        const y = centerY + radius * Math.sin(angle);
                        return { ...node, position: { x, y } };
                    });
                    finalGraphData = { nodes: positionedNodes, edges: baseEdges };
                } else if (treeStyle === 'angled') {
                    console.log('[WAFView] Using layout: angled (triangle with corner routing)');
                    // Arrange nodes diagonally (triangle on its side) with reduced spacing
                    const k = 80; // reduced spacing factor from 120 to 80
                    positionedNodes = sortedNodes.map((node, i) => ({
                        ...node,
                        position: { x: 100 + i * k, y: 100 + i * k },
                    }));
                    // Edges: route through bottom left for child, top right for parent
                    const edges = [];
                    const minX = Math.min(...positionedNodes.map(n => n.position.x));
                    const minY = Math.min(...positionedNodes.map(n => n.position.y));
                    const maxX = Math.max(...positionedNodes.map(n => n.position.x));
                    const maxY = Math.max(...positionedNodes.map(n => n.position.y));
                    positionedNodes.forEach((node) => {
                        const nodeId = node.id;
                        baseEdges.forEach(edge => {
                            if (edge.target === nodeId) {
                                const depNode = positionedNodes.find(n => n.id === edge.source);
                                if (depNode) {
                                    // If depNode is above node, route through bottom left; else, top right
                                    const from = depNode.position;
                                    const to = node.position;
                                    let waypoints = [];
                                    if (from.y < to.y) {
                                        // Dependency (parent above child): bottom left
                                        waypoints = [
                                            { x: minX, y: maxY }, // bottom left corner
                                            { x: to.x, y: maxY }, // horizontal to child x
                                            { x: to.x, y: to.y }  // up to child
                                        ];
                                    } else {
                                        // Parent below child: top right
                                        waypoints = [
                                            { x: maxX, y: minY }, // top right corner
                                            { x: from.x, y: minY }, // horizontal to parent x
                                            { x: from.x, y: from.y } // down to parent
                                        ];
                                    }
                                    edges.push({
                                        id: `angled-${depNode.id}-${nodeId}`,
                                        source: depNode.id,
                                        target: nodeId,
                                        type: 'custom',
                                        animated: animatedLines,
                                        data: { waypoints }
                                    });
                                }
                            }
                        });
                    });
                    finalGraphData = { nodes: positionedNodes, edges };
                }

                if (process.env.NODE_ENV !== 'production') {
                    console.log(`[WAFView] [${treeStyle}] Final nodes:`, positionedNodes);
                    console.log(`[WAFView] [${treeStyle}] Final edges:`, finalGraphData.edges);
                }

                finalPopupData = {
                    nodes: positionedNodes,
                    globalWarnings: ruleTransformed.globalWarnings
                };
                if (setWarningCount) {
                    setWarningCount(ruleTransformed.globalWarnings?.length || 0);
                }

            } else {
                // Table/Card views (existing logic)
                const sortedRules = [...originalRules].sort((a, b) => {
                    if (!orderBy) return 0;
                    const aVal = a[orderBy] ?? '';
                    const bVal = b[orderBy] ?? '';
                    const aNum = parseFloat(aVal);
                    const bNum = parseFloat(bVal);
                    const isNumeric = !isNaN(aNum) && !isNaN(bNum);
                    let cmp = 0;
                    if (orderBy.toLowerCase().includes('date')) {
                        cmp = new Date(aVal || 0) - new Date(bVal || 0);
                    } else if (isNumeric) {
                        cmp = aNum - bNum;
                    } else {
                        cmp = String(aVal).localeCompare(String(bVal), undefined, { numeric: true });
                    }
                    return orderDirection === 'asc' ? cmp : -cmp;
                });
                // When not in tree view, there's no complex graph data
                 finalGraphData = { nodes: [], edges: [] };
                 finalPopupData = { nodes: sortedRules, globalWarnings: [] };
            }
            
            setGraphData(finalGraphData);
            setPopupData(finalPopupData);

        } catch (error) {
            console.error("[WAFView] Error during data processing:", error);
            setGraphData(null);
            setPopupData(null);
        }
    }, [originalRules, setWarningCount, effectiveOrderBy, treeSetup, treeStyle, viewType, animatedLines, orderDirection, orderBy]);

    /**
     * Handles node selection and opens the rule popup.
     */
    const handleNodeClick = useCallback((nodeId) => {
        setSelectedNode(nodeId);
        if (nodeId !== null) {
            if (viewType === 'tree' && graphData && graphData.nodes) {
                const node = graphData.nodes.find(n => n.id === nodeId);
                setPopupRule(node ? node.data : null);
            }
            setRulePopupOpen(true);
            if (setWarningsPopupOpen) setWarningsPopupOpen(false);
        }
    }, [setWarningsPopupOpen, viewType, graphData]);

    /**
     * Centers the view on a specific node in the flowchart.
     */
    const centerNode = useCallback((nodeId) => {
        if (flowRef.current) {
            const { x, y } = flowRef.current.getNode(nodeId).position;
            flowRef.current.setCenter(x, y, { duration: 800 });
        }
    }, []);

    /**
     * Handles rules received from the loader popup and normalizes them.
     */
    const handleRulesReceived = useCallback(async (rulesData, style = responseStyle) => {
        console.log('[WAFView] handleRulesReceived called with:', {
            rulesDataType: typeof rulesData,
            isString: typeof rulesData === 'string',
            isArray: Array.isArray(rulesData),
            isObject: typeof rulesData === 'object',
            style
        });

        if (typeof rulesData === 'string') {
            try {
                rulesData = JSON.parse(rulesData);
                console.log('[WAFView] Parsed string data:', {
                    isArray: Array.isArray(rulesData),
                    length: Array.isArray(rulesData) ? rulesData.length : 'N/A'
                });
            } catch (e) {
                console.error('[WAFView] Failed to parse rules data:', e);
                return;
            }
        }
        
        const normalized = normalizeRulesData(rulesData);
        console.log('[WAFView] Normalized rules data:', {
            isArray: Array.isArray(normalized),
            length: Array.isArray(normalized) ? normalized.length : 'N/A',
            firstRule: Array.isArray(normalized) && normalized.length > 0 ? Object.keys(normalized[0]) : 'N/A'
        });

        if (!Array.isArray(normalized)) {
            console.error('[WAFView] Normalized data is not an array:', normalized);
            return;
        }

        // Always use dependency-transformed rules for AI summary
        console.log('[WAFView] Starting dependency transformation for AI...');
        const transformedData = transformData(normalized);
        console.log('[WAFView] Initial transformData result:', {
            hasNodes: !!transformedData?.nodes,
            nodeCount: transformedData?.nodes?.length || 0,
            hasEdges: !!transformedData?.edges,
            edgeCount: transformedData?.edges?.length || 0
        });

        const ruleTransformer = new RuleTransformer(transformedData.nodes.map(n => n.data));
        const ruleTransformed = ruleTransformer.transformRules();
        console.log('[WAFView] RuleTransformer result:', {
            hasNodes: !!ruleTransformed?.nodes,
            nodeCount: ruleTransformed?.nodes?.length || 0,
            hasEdges: !!ruleTransformed?.edges,
            edgeCount: ruleTransformed?.edges?.length || 0,
            hasWarnings: !!ruleTransformed?.globalWarnings,
            warningCount: ruleTransformed?.globalWarnings?.length || 0
        });

        const dependencyNodes = ruleTransformed?.nodes?.map(n => n.data) || normalized;
        const dependencyEdges = ruleTransformed?.edges || [];
        
        console.log('[WAFView] Sending to AI analysis:', {
            nodeCount: dependencyNodes.length,
            edgeCount: dependencyEdges.length,
            style
        });

        const analyzed = await getAnalyzedData({ nodes: dependencyNodes, edges: dependencyEdges }, style);
        console.log('[WAFView] AI analysis result:', {
            hasRules: !!analyzed?.rules,
            ruleCount: analyzed?.rules?.length || 0,
            firstRule: analyzed?.rules?.[0] ? Object.keys(analyzed.rules[0]) : 'N/A',
            sampleRule: analyzed?.rules?.[0] || 'N/A',
            fullResponse: analyzed
        });

        setOriginalRules(normalized); // Store the full rules for graph logic
        setAiSummary(analyzed.rules || []); // Store the AI summary for display
        setData(normalized); // Optionally keep for compatibility
        setResponseStyle(style); // Save the style for future loads
        
        console.log('[WAFView] State updated:', {
            originalRulesLength: normalized.length,
            aiSummaryLength: analyzed.rules?.length || 0
        });
    }, [setData, responseStyle]);

    // Handler to update AI style and re-fetch summary
    const handleChangeAiStyle = async (newStyle) => {
        console.log('[WAFView] handleChangeAiStyle called:', {
            newStyle,
            originalRulesLength: originalRules?.length || 0,
            isArray: Array.isArray(originalRules)
        });

        if (!originalRules || !Array.isArray(originalRules)) {
            console.error('[WAFView] No original rules available for AI style change');
            return;
        }

        // Always use dependency-transformed rules for AI summary
        console.log('[WAFView] Re-transforming rules for AI style change...');
        const transformedData = transformData(originalRules);
        console.log('[WAFView] TransformData for style change:', {
            hasNodes: !!transformedData?.nodes,
            nodeCount: transformedData?.nodes?.length || 0,
            hasEdges: !!transformedData?.edges,
            edgeCount: transformedData?.edges?.length || 0
        });

        const ruleTransformer = new RuleTransformer(transformedData.nodes.map(n => n.data));
        const ruleTransformed = ruleTransformer.transformRules();
        console.log('[WAFView] RuleTransformer for style change:', {
            hasNodes: !!ruleTransformed?.nodes,
            nodeCount: ruleTransformed?.nodes?.length || 0,
            hasEdges: !!ruleTransformed?.edges,
            edgeCount: ruleTransformed?.edges?.length || 0,
            hasWarnings: !!ruleTransformed?.globalWarnings,
            warningCount: ruleTransformed?.globalWarnings?.length || 0
        });

        const dependencyNodes = ruleTransformed?.nodes?.map(n => n.data) || originalRules;
        const dependencyEdges = ruleTransformed?.edges || [];
        
        console.log('[WAFView] Sending to AI analysis for style change:', {
            nodeCount: dependencyNodes.length,
            edgeCount: dependencyEdges.length,
            newStyle
        });

        const analyzed = await getAnalyzedData({ nodes: dependencyNodes, edges: dependencyEdges }, newStyle);
        console.log('[WAFView] AI analysis result for style change:', {
            hasRules: !!analyzed?.rules,
            ruleCount: analyzed?.rules?.length || 0
        });

        setAiSummary(analyzed.rules || []);
        setResponseStyle(newStyle);
        
        console.log('[WAFView] AI style change completed:', {
            newStyle,
            aiSummaryLength: analyzed.rules?.length || 0
        });
    };

    // Handler for Table/Card click
    const handleRuleClick = (rule) => {
        setPopupRule(rule);
        setRulePopupOpen(true);
    };

    // Ensure tree is visible after switching back or layout change
    useEffect(() => {
        if (viewType === 'tree' && graphData && graphData.nodes && graphData.nodes.length > 0 && flowRef.current) {
            setTimeout(() => {
                try {
                    flowRef.current.fitView({ padding: 0.2, includeHiddenNodes: true });
                } catch (e) { /* ignore */ }
            }, 100);
        }
    }, [viewType, graphData, treeStyle]);

    const handleSortChange = (field, direction) => {
        setOrderBy(field);
        setOrderDirection(direction);
    };

    // Defensive filtering and debugging before rendering
    const isValidNode = node => node && node.position && typeof node.position.x === 'number' && typeof node.position.y === 'number' && !isNaN(node.position.x) && !isNaN(node.position.y);
    const validNodes = graphData && Array.isArray(graphData.nodes) ? graphData.nodes.filter(isValidNode) : [];
    const nodeIds = new Set(validNodes.map(n => n.id));
    const validEdges = graphData && Array.isArray(graphData.edges) ? graphData.edges.filter(e => e && nodeIds.has(e.source) && nodeIds.has(e.target)) : [];
    if (process.env.NODE_ENV !== 'production') {
        console.log('[WAFView] Final valid nodes:', validNodes);
        console.log('[WAFView] Final valid edges:', validEdges);
    }

    return (
        <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, width: '100vw', height: '100vh', overflow: 'hidden' }}>
            {/* Background */}
            <Box sx={{ 
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundImage: 'url("/src/assets/pexels-scottwebb-1029624.jpg")',
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat',
                zIndex: -1,
                ...(darkTheme ? {
                  '&::after': {
                    content: '""',
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(0, 0, 0, 0.3)',
                    backdropFilter: 'blur(5px)',
                    zIndex: 0,
                  }
                } : {})
            }} />
            {/* Content area */}
            <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, width: '100%', height: '100%', display: 'flex', flexDirection: 'column', color: darkTheme ? '#fff' : '#333', background: 'none', boxShadow: 'none', borderRadius: 0 }}>
                {/* Topbar */}
                <Topbar
                    searchTerm={searchTerm}
                    setSearchTerm={setSearchTerm}
                    setLoaderPopupOpen={setLoaderPopupOpen}
                    aclDetails={aclDetails}
                    warningCount={aiSummary.length}
                    onExportPdf={exportToPdf}
                    onExportImage={exportToImage}
                    onWarnings={handleWarnings}
                    showArrows={showArrows}
                    setShowArrows={setShowArrows}
                    dottedLines={dottedLines}
                    setDottedLines={setDottedLines}
                    animatedLines={animatedLines}
                    setAnimatedLines={setAnimatedLines}
                    viewType={viewType}
                    setViewType={setViewType}
                    orderBy={orderBy}
                    setOrderBy={setOrderBy}
                    rules={originalRules}
                    treeStyle={treeStyle}
                    setTreeStyle={setTreeStyle}
                    orderDirection={orderDirection}
                    setOrderDirection={setOrderDirection}
                />
                {/* Flow Chart */}
                <Box sx={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'flex-start', width: '100%', height: '100%' }}>
                    <Box sx={{ width: 'calc(100% - 144px)', maxWidth: '1400px', margin: '72px 120px 0px 24px', height: 'calc(100vh - 120px)', position: 'relative', background: 'none', backgroundColor: darkTheme ? 'rgba(34, 34, 34, 0.3)' : 'rgba(255, 255, 255, 0.3)', overflow: 'hidden', borderRadius: 0 }}>
                        <ReactFlowProvider>
                            {viewType === 'tree' ? (
                                validNodes.length > 0 ? (
                                    <FlowChart
                                        ref={flowRef}
                                        allNodes={validNodes}
                                        allEdges={validEdges}
                                        selectedNode={selectedNode}
                                        setSelectedNode={handleNodeClick}
                                        searchTerm={searchTerm}
                                        showArrows={showArrows}
                                        dottedLines={dottedLines}
                                        animatedLines={animatedLines}
                                        treeSetup={treeStyle}
                                        orderBy={effectiveOrderBy}
                                        treeStyle={treeStyle}
                                    />
                                ) : (
                                    <Box sx={{ p: 4, textAlign: 'center', color: darkTheme ? '#fff' : '#333' }}>
                                        No valid nodes to display. Check your data or layout.
                                    </Box>
                                )
                            ) : null}
                            {viewType === 'table' && (
                                <TableView
                                    rules={effectiveOrderBy === 'dependencies' ? originalRules : originalRules}
                                    orderBy={effectiveOrderBy}
                                    orderDirection={orderDirection}
                                    onRuleClick={handleRuleClick}
                                    onSortChange={handleSortChange}
                                />
                            )}
                            {viewType === 'card' && (
                                <CardView
                                    rules={effectiveOrderBy === 'dependencies' ? originalRules : originalRules}
                                    orderBy={effectiveOrderBy}
                                    orderDirection={orderDirection}
                                    onRuleClick={handleRuleClick}
                                    onSortChange={handleSortChange}
                                />
                            )}
                        </ReactFlowProvider>
                    </Box>
                </Box>
            </Box>
            {rulePopupOpen && popupRule && (
                <RulePopup
                    dataArray={originalRules}
                    selectedNode={popupRule}
                    onClose={() => setRulePopupOpen(false)}
                    aiSummary={aiSummary}
                    responseStyle={responseStyle}
                    onChangeStyle={handleChangeAiStyle}
                    edges={validEdges}
                />
            )}
            {warningsPopupOpen && popupData && (
                <WarningsPopup
                    warnings={popupData.globalWarnings}
                    onClose={() => {
                        if (setWarningsPopupOpen) setWarningsPopupOpen(false);
                    }}
                    onSelectNode={(node) => {
                        handleNodeClick(node);
                        setBackTo(true);
                    }}
                />
            )}
            {/* Loader Popup for loading rules */}
            <RulesLoaderPopup
                open={loaderPopupOpen}
                onRulesReceived={handleRulesReceived}
                onClose={() => setLoaderPopupOpen(false)}
            />
        </Box>
    );
};

/**
 * Utility to normalize rules data to an array.
 */
function normalizeRulesData(rulesData) {
    // If null/undefined, return empty array
    if (!rulesData) return [];
    
    // If already an array, return as is
    if (Array.isArray(rulesData)) return rulesData;
    
    // If object, try to extract rules array
    if (typeof rulesData === 'object') {
        // Try common properties where rules might be stored
        if (Array.isArray(rulesData.rules)) return rulesData.rules;
        if (Array.isArray(rulesData.Rules)) return rulesData.Rules;
        if (Array.isArray(rulesData.data)) return rulesData.data;
        
        // If we have a Statement property, wrap it in an array
        if (rulesData.Statement) return [rulesData];
        
        // Try to get all values if they're arrays
        const values = Object.values(rulesData);
        const arrayValues = values.filter(Array.isArray);
        if (arrayValues.length === 1) return arrayValues[0];
    }
    
    // If we can't normalize it, return empty array
    return [];
}

export default WAFView;
export { normalizeRulesData };