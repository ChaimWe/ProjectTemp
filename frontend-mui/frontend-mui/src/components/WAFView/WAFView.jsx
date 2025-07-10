import React, { useMemo, useState } from 'react';
import { Box, Typography, Paper, Drawer, IconButton } from '@mui/material';
import { useDataSource } from '../../context/DataSourceContext';
import FlowChart from '../tree/FlowChart';
import Tree from '../tree/NodeTransformer';
import RuleTransformer from '../tree/RuleTransformer';
import InspectorView from './InspectorView';
import CloseIcon from '@mui/icons-material/Close';

// Helper to detect WAF vs ALB data
function detectDataType(data) {
  if (!data || !Array.isArray(data.Rules)) return 'unknown';
  if (data.Rules.some(rule => rule.Statement || rule.Action)) return 'waf';
  if (data.Rules.some(rule => rule.Conditions || rule.Actions)) return 'alb';
  return 'unknown';
}

export default function WAFView() {
  const { awsMode, jsonData } = useDataSource();
  // In a real app, you would get data from props or context
  // For now, use jsonData for JSON mode, or fetch from backend for AWS mode
  const data = jsonData; // This can be extended for AWS mode

  const dataType = useMemo(() => detectDataType(data), [data]);

  // Inspector state
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const [inspectorRules, setInspectorRules] = useState([]);
  const [inspectorSelected, setInspectorSelected] = useState(null);

  // Transform data for visualization
  const wafTransformed = useMemo(() => {
    if (dataType === 'waf' && data && Array.isArray(data.Rules)) {
      // Use RuleTransformer or NodeTransformer as needed
      const transformer = new RuleTransformer(data.Rules);
      return transformer.transformRules();
    }
    return null;
  }, [data, dataType]);

  // Placeholder for ALB transformation
  const albTransformed = useMemo(() => {
    if (dataType === 'alb' && data && Array.isArray(data.Rules)) {
      // TODO: Implement ALB transformation logic
      return data.Rules;
    }
    return null;
  }, [data, dataType]);

  // Handler for node/rule selection
  const handleNodeSelect = (nodeId) => {
    let rules = [];
    let selected = null;
    if (dataType === 'waf' && wafTransformed) {
      rules = data.Rules;
      selected = rules.find(r => r.Name === nodeId || r.name === nodeId || r.id === nodeId);
    } else if (dataType === 'alb' && albTransformed) {
      rules = data.Rules;
      selected = rules.find(r => r.Name === nodeId || r.name === nodeId || r.id === nodeId);
    }
    setInspectorRules(rules);
    setInspectorSelected(selected);
    setInspectorOpen(true);
  };

  return (
    <Box sx={{ width: '100%', minHeight: 400, mt: 4 }}>
      {dataType === 'waf' && wafTransformed ? (
        <FlowChart
          allNodes={wafTransformed.nodes}
          allEdges={wafTransformed.edges}
          selectedNode={null}
          setSelectedNode={handleNodeSelect}
        />
      ) : dataType === 'alb' && albTransformed ? (
        <Paper elevation={2} sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="h5" sx={{ mb: 2 }}>ALB Rules Visualization (Coming Soon)</Typography>
          <Typography variant="body1">ALB rules detected. Visualization for ALB rules will be implemented here.</Typography>
          <Box sx={{ mt: 2 }}>
            {albTransformed.map((rule, idx) => (
              <Paper key={idx} sx={{ p: 2, mb: 2, cursor: 'pointer' }} onClick={() => { setInspectorRules(albTransformed); setInspectorSelected(rule); setInspectorOpen(true); }}>
                <Typography variant="subtitle1"><strong>{rule.Name || rule.name}</strong></Typography>
                <Typography variant="body2">Priority: {rule.Priority || rule.priority}</Typography>
              </Paper>
            ))}
          </Box>
        </Paper>
      ) : (
        <Paper elevation={2} sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="h6">No valid WAF or ALB data detected.</Typography>
        </Paper>
      )}
      <Drawer anchor="right" open={inspectorOpen} onClose={() => setInspectorOpen(false)} PaperProps={{ sx: { width: 700, maxWidth: '100vw' } }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 2 }}>
          <Typography variant="h6">Inspector</Typography>
          <IconButton onClick={() => setInspectorOpen(false)}><CloseIcon /></IconButton>
        </Box>
        <Box sx={{ flex: 1, minHeight: 0 }}>
          <InspectorView rules={inspectorRules} selectedRule={inspectorSelected} />
        </Box>
      </Drawer>
    </Box>
  );
} 