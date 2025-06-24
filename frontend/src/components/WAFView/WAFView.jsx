console.log('!!! WAFView.jsx loaded !!!');
import React, { useState, useEffect, useCallback } from 'react';
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
  dottedLines,
  animatedLines
}) => {
    console.log('[WAFView] Render - data:', data);
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

    /**
     * Effect: Transforms incoming data into graphData and popupData for visualization.
     */
    useEffect(() => {
        if (!data) {
            setGraphData(null);
            setPopupData(null);
            return;
        }
        try {
            console.log('[WAFView] Computing transformed data');
            const transformedData = transformData(data);
            console.log('[WAFView] Data transformed:', transformedData);
            if (!transformedData || !transformedData.nodes) {
                setGraphData(null);
                setPopupData(null);
                return;
            }
            // Use RuleTransformer to get nodes and edges based on label dependencies
            const ruleTransformer = new RuleTransformer(transformedData.nodes.map(n => n.data));
            const ruleTransformed = ruleTransformer.transformRules();
            if (!ruleTransformed) {
                setGraphData(null);
                setPopupData(null);
                return;
            }
            // Assign hw (height/width) to each node's data
            const treeHelper = new Tree();
            ruleTransformed.nodes.forEach((node) => {
                if (!node.data.hw) {
                    node.data.hw = treeHelper.calculateCard(node.data);
                }
            });
            // Assign positions using a radial/concentric layout
            treeHelper.calculateNodePositionHierarchical(ruleTransformed.nodes, ruleTransformed.edges);
            // Filter out invalid edges
            const validEdges = ruleTransformed.edges.filter(e => e && e.source && e.target && e.id);
            if (validEdges.length !== ruleTransformed.edges.length) {
                console.warn('[WAFView] Dropped invalid edges:', ruleTransformed.edges.filter(e => !e || !e.source || !e.target || !e.id));
            }
            setGraphData({
                nodes: ruleTransformed.nodes,
                edges: validEdges
            });
            setPopupData({
                nodes: ruleTransformed.nodes,
                globalWarnings: ruleTransformed.globalWarnings
            });
            console.log('[WAFView] Final transformed result:',
                'nodes:', ruleTransformed.nodes?.length,
                'edges:', ruleTransformed.edges?.length
            );
            // Set warning count in AppLayout
            if (setWarningCount) {
                setWarningCount(ruleTransformed.globalWarnings?.length || 0);
            }
        } catch (error) {
            setGraphData(null);
            setPopupData(null);
            console.error('[WAFView] Error transforming data:', error);
        }
    }, [data, setWarningCount]);

    // Log state changes
    useEffect(() => {
        console.log('[WAFView] graphData changed:', graphData);
    }, [graphData]);

    useEffect(() => {
        console.log('[WAFView] popupData changed:', popupData);
    }, [popupData]);

    useEffect(() => {
        console.log('[WAFView] loaderPopupOpen changed:', loaderPopupOpen);
    }, [loaderPopupOpen]);

    /**
     * Handles node selection and opens the rule popup.
     */
    const handleNodeClick = useCallback((nodeId) => {
        console.log('[WAFView] handleNodeClick:', nodeId);
        setSelectedNode(nodeId);
        if (nodeId !== null) {
            setRulePopupOpen(true);
            if (setWarningsPopupOpen) setWarningsPopupOpen(false);
        }
    }, [setWarningsPopupOpen]);

    /**
     * Centers the view on a specific node in the flowchart.
     */
    const centerNode = useCallback((nodeId) => {
        console.log('[WAFView] centerNode called with:', nodeId);
        if (flowRef.current) {
            const { x, y } = flowRef.current.getNode(nodeId).position;
            flowRef.current.setCenter(x, y, { duration: 800 });
        }
    }, []);

    /**
     * Handles rules received from the loader popup and normalizes them.
     */
    const handleRulesReceived = useCallback((rulesData) => {
        console.log('[WAFView] --- handleRulesReceived DEBUG PATCH ACTIVE ---');
        if (typeof rulesData === 'string') {
            try {
                console.log('[WAFView] Parsing rulesData from string');
                rulesData = JSON.parse(rulesData);
            } catch (e) {
                console.error('[WAFView] Failed to parse rulesData string:', e);
                return;
            }
        }
        const normalized = normalizeRulesData(rulesData);
        if (!Array.isArray(normalized)) {
            console.error('[WAFView] Invalid rules data received (not an array after normalization)');
            return;
        }
        setData(normalized);
    }, [setData]);

    console.log('[WAFView] Render - graphData:', graphData, 'popupData:', popupData);

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
                {/* Flow Chart */}
                <Box sx={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'flex-start', width: '100%', height: '100%' }}>
                    <Box sx={{ width: 'calc(100% - 144px)', maxWidth: '1400px', margin: '72px 120px 0px 24px', height: 'calc(100vh - 120px)', position: 'relative', background: 'none', backgroundColor: darkTheme ? 'rgba(34, 34, 34, 0.3)' : 'rgba(255, 255, 255, 0.3)', overflow: 'hidden', borderRadius: 0 }}>
                        <ReactFlowProvider>
                            {graphData && (
                                <FlowChart
                                    ref={flowRef}
                                    allNodes={graphData.nodes}
                                    allEdges={graphData.edges}
                                    selectedNode={selectedNode}
                                    setSelectedNode={handleNodeClick}
                                    searchTerm={searchTerm}
                                    showArrows={showArrows}
                                    dottedLines={dottedLines}
                                    animatedLines={animatedLines}
                                />
                            )}
                        </ReactFlowProvider>
                    </Box>
                </Box>
            </Box>
            {rulePopupOpen && popupData && (
                <RulePopup
                    backTo={backTo}
                    dataArray={data}
                    selectedNode={popupData.nodes[+selectedNode]}
                    centerNode={centerNode}
                    onClose={() => {
                        setRulePopupOpen(false);
                    }}
                    backToWarning={() => {
                        if (setWarningsPopupOpen) setWarningsPopupOpen(true);
                        setRulePopupOpen(false);
                        setBackTo(null);
                    }}
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
                onRulesReceived={(rules) => {
                    setData(rules);
                    setLoaderPopupOpen(false);
                }}
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