console.log('!!! WAFView.jsx loaded !!!');
import React, { useState, useEffect, useCallback } from 'react';
import { Box } from '@mui/material';
import FlowChart from '../tree/FlowChart';
import TopBar from '../layout/Topbar';
import RulesLoaderPopup from '../upload/RulesLoaderPopup';
import RulePopup from '../popup/RulePopup';
import WarningsPopup from '../popup/WarningsPopup';
import { transformData } from '../tree/NodeTransformer';
import RuleTransformer from '../tree/RuleTransformer';
import Tree from '../tree/NodeTransformer';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

const WAFView = ({ data, setData }) => {
    console.log('[WAFView] Render - data:', data);

    const [searchTerm, setSearchTerm] = useState('');
    const [selectedNode, setSelectedNode] = useState(null);
    const [loaderPopupOpen, setLoaderPopupOpen] = useState(false);
    const [rulePopupOpen, setRulePopupOpen] = useState(false);
    const [warningsPopupOpen, setWarningsPopupOpen] = useState(false);
    const [backTo, setBackTo] = useState(null);
    const flowRef = React.useRef(null);
    const [aclDetails, setAclDetails] = useState({
        aclName: 'WAF Rules',
        capacity: 0
    });
    const [graphData, setGraphData] = useState(null);
    const [popupData, setPopupData] = useState(null);

    // Compute graphData and popupData when data changes
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
            setGraphData({
                nodes: ruleTransformed.nodes,
                edges: ruleTransformed.edges
            });
            setPopupData({
                nodes: ruleTransformed.nodes,
                globalWarnings: ruleTransformed.globalWarnings
            });
            console.log('[WAFView] Final transformed result:',
                'nodes:', ruleTransformed.nodes?.length,
                'edges:', ruleTransformed.edges?.length
            );
        } catch (error) {
            setGraphData(null);
            setPopupData(null);
            console.error('[WAFView] Error transforming data:', error);
        }
    }, [data]);

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

    // Handle node selection
    const handleNodeClick = useCallback((nodeId) => {
        console.log('[WAFView] handleNodeClick:', nodeId);
        setSelectedNode(nodeId);
        if (nodeId !== null) {
            setRulePopupOpen(true);
            setWarningsPopupOpen(false);
        }
    }, []);

    // Export functions
    const exportToPdf = useCallback(() => {
        console.log('[WAFView] exportToPdf called');
        const chartArea = document.querySelector('.react-flow');
        if (!chartArea) {
            alert('Could not find the graph area to export.');
            return;
        }
        html2canvas(chartArea, { backgroundColor: '#fff', useCORS: true }).then(canvas => {
            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF({ orientation: 'landscape', unit: 'px', format: [canvas.width, canvas.height] });
            pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
            pdf.save('waf-graph.pdf');
        }).catch(err => {
            console.error('Error exporting PDF:', err);
            alert('Failed to export PDF.');
        });
    }, []);

    const exportToImage = useCallback(() => {
        console.log('[WAFView] exportToImage called');
        const chartArea = document.querySelector('.react-flow');
        if (!chartArea) {
            alert('Could not find the graph area to export.');
            return;
        }
        html2canvas(chartArea, { backgroundColor: '#fff', useCORS: true }).then(canvas => {
            const imgData = canvas.toDataURL('image/png');
            const link = document.createElement('a');
            link.href = imgData;
            link.download = 'waf-graph.png';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }).catch(err => {
            console.error('Error exporting image:', err);
            alert('Failed to export image.');
        });
    }, []);

    // Center node function
    const centerNode = useCallback((nodeId) => {
        console.log('[WAFView] centerNode called with:', nodeId);
        if (flowRef.current) {
            const { x, y } = flowRef.current.getNode(nodeId).position;
            flowRef.current.setCenter(x, y, { duration: 800 });
        }
    }, []);

    // Handle rules received
    const handleRulesReceived = useCallback((rulesData) => {
        console.log('[WAFView] --- handleRulesReceived DEBUG PATCH ACTIVE ---');
        // Fix: Parse if string
        if (typeof rulesData === 'string') {
            try {
                console.log('[WAFView] Parsing rulesData from string');
                rulesData = JSON.parse(rulesData);
            } catch (e) {
                console.error('[WAFView] Failed to parse rulesData string:', e);
                return;
            }
        }
        console.log('[WAFView] handleRulesReceived called with:', rulesData, JSON.stringify(rulesData));
        console.log('[WAFView] typeof rulesData:', typeof rulesData, 'isArray:', Array.isArray(rulesData));
        if (!rulesData) {
            console.error('[WAFView] Invalid rules data received (null or undefined)');
            return;
        }
        // Debug: show all keys
        if (typeof rulesData === 'object' && !Array.isArray(rulesData)) {
            console.log('[WAFView] rulesData keys:', Object.keys(rulesData));
            console.log('[WAFView] rulesData.Rules:', rulesData.Rules, 'isArray:', Array.isArray(rulesData.Rules));
            console.log('[WAFView] rulesData.rules:', rulesData.rules, 'isArray:', Array.isArray(rulesData.rules));
        }
        if (!Array.isArray(rulesData)) {
            // Try to extract from a property
            if (rulesData.rules && Array.isArray(rulesData.rules)) {
                console.log('[WAFView] Extracted rules array from rulesData.rules');
                rulesData = rulesData.rules;
            } else if (rulesData.Rules && Array.isArray(rulesData.Rules)) {
                console.log('[WAFView] Extracted rules array from rulesData.Rules');
                rulesData = rulesData.Rules;
            } else {
                console.error('[WAFView] Invalid rules data received (not an array and no rules/rules property)');
                return;
            }
        }
        console.log('[WAFView] handleRulesReceived - setting data:', rulesData.length);
        setData(rulesData);
    }, [setData]);

    console.log('[WAFView] Render - graphData:', graphData, 'popupData:', popupData);

    return (
        <Box sx={{ position: 'relative', width: '100%', height: '100vh', overflow: 'hidden' }}>
            {graphData ? (
                <FlowChart
                    key={`flowchart-${graphData.nodes.length}-${graphData.edges.length}`}
                    allNodes={graphData.nodes}
                    allEdges={graphData.edges}
                    selectedNode={selectedNode}
                    setSelectedNode={handleNodeClick}
                    searchTerm={searchTerm}
                    ref={flowRef}
                />
            ) : (
                <div style={{ color: '#aaa', padding: 20 }}>No graph data available</div>
            )}
            <TopBar
                searchTerm={searchTerm}
                setSearchTerm={setSearchTerm}
                setLoaderPopupOpen={setLoaderPopupOpen}
                aclDetails={aclDetails}
                warningCount={popupData?.globalWarnings?.length || 0}
                onExportPdf={exportToPdf}
                onExportImage={exportToImage}
                onWarnings={() => {
                    console.log('[WAFView] onWarnings clicked');
                    setWarningsPopupOpen(true);
                    setRulePopupOpen(false);
                }}
            />
            {loaderPopupOpen && (
                <RulesLoaderPopup
                    open={loaderPopupOpen}
                    onRulesReceived={handleRulesReceived}
                    onClose={() => {
                        console.log('[WAFView] loader popup closed');
                        setLoaderPopupOpen(false);
                    }}
                />
            )}
            {rulePopupOpen && popupData && (
                <RulePopup
                    backTo={backTo}
                    dataArray={data}
                    selectedNode={popupData.nodes[+selectedNode]}
                    centerNode={centerNode}
                    onClose={() => {
                        console.log('[WAFView] rule popup closed');
                        setRulePopupOpen(false);
                    }}
                    backToWarning={() => {
                        console.log('[WAFView] back to warning clicked');
                        setWarningsPopupOpen(true);
                        setRulePopupOpen(false);
                        setBackTo(null);
                    }}
                />
            )}
            {warningsPopupOpen && popupData && (
                <WarningsPopup
                    warnings={popupData.globalWarnings}
                    onClose={() => {
                        console.log('[WAFView] warnings popup closed');
                        setWarningsPopupOpen(false);
                    }}
                    onSelectNode={(node) => {
                        console.log('[WAFView] warning node selected:', node);
                        handleNodeClick(node);
                        setBackTo(true);
                    }}
                />
            )}
        </Box>
    );
};

export default WAFView;