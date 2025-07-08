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
import InspectorView from './InspectorView';

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
  setTreeStyle,
  searchTerm,
  setSearchTerm
}) => {
    const { darkTheme } = useThemeContext();

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
    const [dependencyEdges, setDependencyEdges] = useState([]);
    const [dependencyNodes, setDependencyNodes] = useState([]);
    // Add state for nodesPerRow
    const [nodesPerRow, setNodesPerRow] = useState(8); // Default 8 per row
    // Add debugging for nodesPerRow
    useEffect(() => {
        console.log('[WAFView] nodesPerRow changed:', nodesPerRow);
    }, [nodesPerRow]);

    // Add debugging for orderBy
    useEffect(() => {
        console.log('[WAFView] orderBy changed:', orderBy);
    }, [orderBy]);

    // Only allow dependency-based layout for tree view if treeStyle is 'dependency'
    // Fix: orderBy must be 'number' or 'parentChild' for FlowChart's Select
    // Use 'number' as fallback for dependency-based layout
    const effectiveOrderBy = viewType === 'tree' && treeStyle === 'dependency' ? 'number' : orderBy;

    // Define filteredRules at the top of the component
    const filteredRules = originalRules.filter(rule => {
        if (!searchTerm) return true;
        const searchLower = searchTerm.toLowerCase();
        return Object.entries(rule).some(([key, value]) => {
            if (typeof value === 'string' || typeof value === 'number') {
                return String(value).toLowerCase().includes(searchLower);
            }
            if (typeof value === 'object' && value !== null) {
                return JSON.stringify(value).toLowerCase().includes(searchLower);
            }
            return false;
        });
    });

    /**
     * Filter rules based on search term
     */
    const filterRulesBySearch = useCallback((rules) => {
        if (!searchTerm) return rules;
        
        const searchLower = searchTerm.toLowerCase();
        return rules.filter(rule => {
            // Search in all string and number fields
            return Object.entries(rule).some(([key, value]) => {
                if (typeof value === 'string' || typeof value === 'number') {
                    return String(value).toLowerCase().includes(searchLower);
                }
                if (typeof value === 'object' && value !== null) {
                    // For objects (like Statement), stringify and search
                    return JSON.stringify(value).toLowerCase().includes(searchLower);
                }
                return false;
            });
        });
    }, [searchTerm]);

    // Add comprehensive debugging
    // console.log('[WAFView] Debug Info:', {
    //     originalRules: originalRules?.length || 0,
    //     viewType,
    //     treeStyle,
    //     effectiveOrderBy,
    //     orderBy,
    //     data: data?.length || 0,
    //     graphData: graphData ? `${graphData.nodes?.length || 0} nodes, ${graphData.edges?.length || 0} edges` : 'null'
    // });

    // Effect to initialize originalRules from data prop
    useEffect(() => {
        if (data && Array.isArray(data) && data.length > 0 && (!originalRules || originalRules.length === 0)) {
            const normalized = normalizeRulesData(data);
            if (Array.isArray(normalized) && normalized.length > 0) {
                setOriginalRules(normalized);
            }
        }
    }, [data, originalRules]);

    /**
     * Effect: Transforms incoming data into graphData and popupData for visualization.
     */
    useEffect(() => {
        if (!originalRules || originalRules.length === 0) {
            setGraphData(null);
            setPopupData(null);
            return;
        }

        try {
            // --- Always build dependency nodes/edges for popups and AI ---
            const filteredRules = originalRules.filter(rule => {
                if (!searchTerm) return true;
                const searchLower = searchTerm.toLowerCase();
                return Object.entries(rule).some(([key, value]) => {
                    if (typeof value === 'string' || typeof value === 'number') {
                        return String(value).toLowerCase().includes(searchLower);
                    }
                    if (typeof value === 'object' && value !== null) {
                        return JSON.stringify(value).toLowerCase().includes(searchLower);
                    }
                    return false;
                });
            });

            // Always build dependency graph for relationships
            const transformedData = transformData(filteredRules);
            const ruleTransformer = new RuleTransformer(transformedData.nodes.map(n => n.data));
            const ruleTransformed = ruleTransformer.transformRules();
            const dependencyNodes = ruleTransformed?.nodes?.map(n => n.data) || filteredRules;
            const dependencyEdges = ruleTransformed?.edges || [];

            let finalGraphData = null;
            let finalPopupData = null;
            let positionedNodes = [];
            let sortedNodes = [];
            let baseNodes = ruleTransformed.nodes.map(node => {
                if (!node.data.hw) {
                    node.data.hw = (new Tree()).calculateCard(node.data);
                }
                return node;
            });
            let baseEdges = ruleTransformed.edges
                .filter(e => e && e.source && e.target && e.id)
                .map(e => ({ ...e, type: 'smoothstep', animated: animatedLines }));

            if (viewType === 'tree') {
                if (!transformedData || !transformedData.nodes) {
                    throw new Error("Initial transformation failed");
                }
                if (!ruleTransformed) {
                    throw new Error("Rule transformation failed");
                }
                // For grid layout, do not assign positions here
                positionedNodes = baseNodes;
                finalGraphData = { nodes: positionedNodes, edges: baseEdges.map(e => ({ ...e, type: undefined, animated: animatedLines })) };
                finalPopupData = {
                    nodes: positionedNodes,
                    globalWarnings: ruleTransformed.globalWarnings
                };
                if (setWarningCount) {
                    setWarningCount(ruleTransformed.globalWarnings?.length || 0);
                }
            } else {
                // Table/Card views (existing logic)
                const sortedRules = [...filteredRules].sort((a, b) => {
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
                // For non-tree views, graphData is empty, but popups still get relationships
                finalGraphData = { nodes: [], edges: [] };
                finalPopupData = { nodes: sortedRules, globalWarnings: [] };
            }
            
            // --- Always store dependencyEdges for popups ---
            setGraphData(finalGraphData);
            setPopupData(finalPopupData);
            // Store for popups regardless of viewType
            setDependencyEdges(dependencyEdges);
            setDependencyNodes(dependencyNodes);

        } catch (error) {
            setGraphData(null);
            setPopupData(null);
        }
    }, [originalRules, setWarningCount, effectiveOrderBy, treeSetup, treeStyle, viewType, animatedLines, orderDirection, orderBy, searchTerm, filterRulesBySearch]);

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
        if (typeof rulesData === 'string') {
            try {
                rulesData = JSON.parse(rulesData);
            } catch (e) {
                return;
            }
        }
        
        const normalized = normalizeRulesData(rulesData);

        if (!Array.isArray(normalized)) {
            return;
        }

        // Always use dependency-transformed rules for AI summary
        const transformedData = transformData(normalized);
        const ruleTransformer = new RuleTransformer(transformedData.nodes.map(n => n.data));
        const ruleTransformed = ruleTransformer.transformRules();

        const dependencyNodes = ruleTransformed?.nodes?.map(n => n.data) || normalized;
        const dependencyEdges = ruleTransformed?.edges || [];
        
        const analyzed = await getAnalyzedData({ nodes: dependencyNodes, edges: dependencyEdges }, style);

        setOriginalRules(normalized); // Store the full rules for graph logic
        setAiSummary(analyzed.rules || []); // Store the AI summary for display
        setData(normalized); // Optionally keep for compatibility
        setResponseStyle(style); // Save the style for future loads
    }, [setData, responseStyle]);

    // Handler to update AI style and re-fetch summary
    const handleChangeAiStyle = async (newStyle) => {
        if (!originalRules || !Array.isArray(originalRules)) {
            return;
        }

        // Always use dependency-transformed rules for AI summary
        const transformedData = transformData(originalRules);

        const ruleTransformer = new RuleTransformer(transformedData.nodes.map(n => n.data));
        const ruleTransformed = ruleTransformer.transformRules();

        const dependencyNodes = ruleTransformed?.nodes?.map(n => n.data) || originalRules;
        const dependencyEdges = ruleTransformed?.edges || [];
        
        const analyzed = await getAnalyzedData({ nodes: dependencyNodes, edges: dependencyEdges }, newStyle);

        setAiSummary(analyzed.rules || []);
        setResponseStyle(newStyle);
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

    // Compute isParent and isChild for each node based on edges
    function annotateNodesWithParentChild(nodes, edges) {
        const parentIds = new Set(edges.map(e => e.source));
        const childIds = new Set(edges.map(e => e.target));
        return nodes.map(node => ({
            ...node,
            data: {
                ...node.data,
                isParent: parentIds.has(node.id),
                isChild: childIds.has(node.id),
            },
        }));
    }

    // Sort nodes according to orderBy
    function sortNodes(nodes, orderBy) {
        let nodesCopy = [...nodes];
        if (orderBy === 'number') {
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
                const aNum = getNum(a, nodes.indexOf(a));
                const bNum = getNum(b, nodes.indexOf(b));
                return aNum - bNum;
            });
        } else if (orderBy === 'dependency') {
            // Parent/child sort
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
        }
        return nodesCopy;
    }

    // Defensive filtering and debugging before rendering
    const validNodes = graphData && Array.isArray(graphData.nodes) ? graphData.nodes : [];
    const annotatedNodes = annotateNodesWithParentChild(validNodes, graphData && Array.isArray(graphData.edges) ? graphData.edges : []);
    const sortedNodes = sortNodes(annotatedNodes, orderBy);
    const nodeIds = new Set(sortedNodes.map(n => n.id));
    const validEdges = graphData && Array.isArray(graphData.edges) ? graphData.edges.filter(e => e && nodeIds.has(e.source) && nodeIds.has(e.target)) : [];

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
                    nodesPerRow={nodesPerRow}
                    setNodesPerRow={setNodesPerRow}
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
                            {viewType === 'tree' && sortedNodes.length > 0 && (
                                <FlowChart
                                    ref={flowRef}
                                    allNodes={sortedNodes}
                                    allEdges={validEdges}
                                    selectedNode={selectedNode}
                                    setSelectedNode={handleNodeClick}
                                    searchTerm={searchTerm}
                                    showArrows={showArrows}
                                    dottedLines={dottedLines}
                                    animatedLines={animatedLines}
                                    layoutType="collapsible"
                                    orderBy={orderBy}
                                    nodesPerRow={nodesPerRow}
                                />
                            )}
                            {viewType === 'radial' && sortedNodes.length > 0 && (
                                <FlowChart
                                    ref={flowRef}
                                    allNodes={sortedNodes}
                                    allEdges={validEdges}
                                    selectedNode={selectedNode}
                                    setSelectedNode={handleNodeClick}
                                    searchTerm={searchTerm}
                                    showArrows={showArrows}
                                    dottedLines={dottedLines}
                                    animatedLines={animatedLines}
                                    layoutType="radial"
                                    orderBy={orderBy}
                                    nodesPerRow={nodesPerRow}
                                />
                            )}
                            {viewType === 'angled' && sortedNodes.length > 0 && (
                                <FlowChart
                                    ref={flowRef}
                                    allNodes={sortedNodes}
                                    allEdges={validEdges}
                                    selectedNode={selectedNode}
                                    setSelectedNode={handleNodeClick}
                                    searchTerm={searchTerm}
                                    showArrows={showArrows}
                                    dottedLines={dottedLines}
                                    animatedLines={animatedLines}
                                    layoutType="angled"
                                    orderBy={orderBy}
                                    nodesPerRow={nodesPerRow}
                                />
                            )}
                            {viewType === 'inspector' && (
                                <InspectorView
                                    rules={filteredRules}
                                    dependencyNodes={dependencyNodes}
                                    dependencyEdges={dependencyEdges}
                                />
                            )}
                            {viewType === 'table' && (
                                <TableView
                                    rules={filteredRules}
                                    orderBy={effectiveOrderBy}
                                    orderDirection={orderDirection}
                                    onRuleClick={handleRuleClick}
                                    onSortChange={handleSortChange}
                                />
                            )}
                            {viewType === 'card' && (
                                <CardView
                                    rules={filteredRules}
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
                    dataArray={viewType === 'tree' ? graphData?.nodes || [] : dependencyNodes}
                    allRules={originalRules}
                    selectedNode={popupRule}
                    onClose={() => setRulePopupOpen(false)}
                    aiSummary={aiSummary}
                    responseStyle={responseStyle}
                    onChangeStyle={handleChangeAiStyle}
                    edges={dependencyEdges}
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
                onRulesLoaded={handleRulesReceived}
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