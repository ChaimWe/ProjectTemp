import React, { useState, useMemo } from 'react';
import { Box, useTheme, Stack, Button, Drawer } from '@mui/material';
import Topbar from '../components/Topbar';
import { useDataSource } from '../context/DataSourceContext';
import FlowChart from '../components/tree/FlowChart';
import RuleDetailsSidebar from '../components/WAFView/RuleDetailsSidebar';
import InspectorView from '../components/WAFView/InspectorView';

export default function ExplorerPage() {
  const theme = useTheme();
  const [viewMode, setViewMode] = useState('tree');
  const { aclData, albData, setAclData, setAlbData, clearAclData, clearAlbData } = useDataSource();
  const [aclFileName, setAclFileName] = useState(null);
  const [albFileName, setAlbFileName] = useState(null);
  const [selectedNode, setSelectedNode] = useState(null);

  // For now, use aclData for both views
  const rules = useMemo(() => aclData?.Rules || [], [aclData]);

  // Build edges from dependencies, or infer from RuleLabels/LabelMatchStatement if needed
  const edges = useMemo(() => {
    const e = [];
    rules.forEach(rule => {
      const nodeId = rule.Name || rule.name;
      // Prefer explicit dependencies
      let deps = rule.dependencies || rule.Dependencies;
      if (!deps) {
        // Infer from LabelMatchStatement (WAF style)
        const findLabelMatches = (obj) => {
          if (!obj || typeof obj !== 'object') return [];
          let matches = [];
          if (obj.LabelMatchStatement && obj.LabelMatchStatement.Key) {
            matches.push(obj.LabelMatchStatement.Key);
          }
          Object.values(obj).forEach(val => {
            matches = matches.concat(findLabelMatches(val));
          });
          return matches;
        };
        deps = findLabelMatches(rule.Statement);
      }
      (Array.isArray(deps) ? deps : [deps]).forEach(dep => {
        if (dep) e.push({ source: String(dep), target: String(nodeId), id: `edge-${dep}-${nodeId}`, type: 'custom' });
      });
    });
    return e;
  }, [rules]);

  // Compute isParent/isChild for each node based on edges
  const nodeIdSet = new Set(rules.map(r => r.Name || r.name));
  const parentMap = {};
  const childMap = {};
  edges.forEach(edge => {
    parentMap[edge.source] = true;
    childMap[edge.target] = true;
  });

  const nodes = useMemo(() => rules.map(r => {
    const id = r.Name || r.name;
    return {
      id,
      type: 'custom-node',
      data: {
        ...r,
        name: id,
        action: r.Action ? Object.keys(r.Action)[0] : r.action || '',
        isParent: !!parentMap[id],
        isChild: !!childMap[id],
      }
    };
  }), [rules, parentMap, childMap]);

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
      <Topbar viewMode={viewMode} setViewMode={setViewMode} />
      <Stack direction="row" spacing={2} sx={{ mt: 2, mb: 2, ml: 2 }}>
        <Button onClick={() => { clearAclData(); setAclFileName(null); }} disabled={!aclFileName} variant="outlined">Clear ACL</Button>
        <Button onClick={() => { clearAlbData(); setAlbFileName(null); }} disabled={!albFileName} variant="outlined">Clear ALB</Button>
      </Stack>
      <Box sx={{ position: 'relative', zIndex: 1, width: '100vw', height: 'calc(100vh - 112px)', mt: 8 }}>
        {viewMode === 'tree' ? (
          <>
            <FlowChart allNodes={nodes} allEdges={edges} selectedNode={selectedNode ? (selectedNode.Name || selectedNode.name) : null} setSelectedNode={handleNodeSelect} />
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