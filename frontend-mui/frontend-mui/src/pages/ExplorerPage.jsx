import React, { useState, useMemo } from 'react';
import { Box, useTheme, Stack, Button, Drawer } from '@mui/material';
import Topbar from '../components/Topbar';
import { useDataSource } from '../context/DataSourceContext';
import FlowChart from '../components/tree/FlowChart';
import RuleDetailsSidebar from '../components/WAFView/RuleDetailsSidebar';
import InspectorView from '../components/WAFView/InspectorView';
import RuleTransformer from '../components/tree/RuleTransformer';

export default function ExplorerPage() {
  const theme = useTheme();
  const [viewMode, setViewMode] = useState('tree');
  React.useEffect(() => {
    if (viewMode !== 'tree' && viewMode !== 'inspector') {
      setViewMode('tree');
    }
  }, [viewMode]);
  const { aclData, albData, setAclData, setAlbData, clearAclData, clearAlbData } = useDataSource();
  const [selectedNode, setSelectedNode] = useState(null);
  const [ruleSet, setRuleSet] = useState('acl'); // 'acl' or 'alb'

  // Select rules based on ruleSet
  const rules = useMemo(() => {
    if (ruleSet === 'acl') return aclData?.Rules || [];
    if (ruleSet === 'alb') return albData?.Rules || [];
    return [];
  }, [ruleSet, aclData, albData]);

  // Use RuleTransformer to process rules into nodes/edges
  const transformed = useMemo(() => {
    if (!rules.length) return { nodes: [], edges: [] };
    const transformer = new RuleTransformer(rules);
    const result = transformer.transformRules() || { nodes: [], edges: [] };
    // Fallback: if no edges, create edges between consecutive nodes
    if (result.nodes.length > 1 && (!result.edges || result.edges.length === 0)) {
      result.edges = result.nodes.slice(1).map((node, i) => ({
        id: `edge-fallback-${i}`,
        source: result.nodes[i].id,
        target: node.id,
        type: 'custom',
      }));
    }
    return result;
  }, [rules]);

  // Handler for node selection in tree mode
  const handleNodeSelect = (nodeId) => {
    const found = rules.find(r => (r.Name || r.name) === nodeId);
    setSelectedNode(found || null);
  };

  // Handler to close inspector drawer
  const handleCloseInspector = () => setSelectedNode(null);

  return (
    <Box
      sx={{
        minHeight: '100vh',
        width: '100%',
        position: 'relative',
        fontFamily: 'Poppins, sans-serif',
        pt: 2,
        background: theme.palette.mode === 'dark'
          ? 'linear-gradient(rgba(34,34,34,0.95), rgba(34, 34, 34, 0.95))'
          : theme.palette.background.default,
      }}
    >
      <Topbar viewMode={viewMode} setViewMode={setViewMode} ruleSet={ruleSet} setRuleSet={setRuleSet} />
      <Stack direction="row" spacing={2} sx={{ mt: 2, mb: 2, ml: 2 }}>
        <Button onClick={() => { clearAclData(); }} disabled={!aclData} variant="outlined">Clear ACL</Button>
        <Button onClick={() => { clearAlbData(); }} disabled={!albData} variant="outlined">Clear ALB</Button>
      </Stack>
      <Box sx={{ position: 'relative', zIndex: 1, width: '100vw', height: 'calc(100vh - 112px)', mt: 8 }}>
        {viewMode === 'tree' ? (
          <>
            <FlowChart allNodes={transformed.nodes} allEdges={transformed.edges} selectedNode={selectedNode ? (selectedNode.Name || selectedNode.name) : null} setSelectedNode={handleNodeSelect} />
            <Drawer
              anchor="right"
              open={!!selectedNode}
              onClose={handleCloseInspector}
              PaperProps={{ sx: { width: 500, maxWidth: '100vw', p: 0, boxShadow: 6 } }}
            >
              {selectedNode && (
                <RuleDetailsSidebar rule={selectedNode} rules={rules} />
              )}
            </Drawer>
          </>
        ) : (
          <InspectorView rules={rules} showSubgraph={true} />
        )}
      </Box>
    </Box>
  );
} 