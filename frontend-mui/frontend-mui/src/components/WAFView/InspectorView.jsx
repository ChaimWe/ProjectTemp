import React, { useState, useMemo, useRef } from 'react';
import { Box, Typography, Tabs, Tab, Stack, Chip, Divider } from '@mui/material';
import FlowChart from '../tree/FlowChart';
import RuleDetailsSidebar from './RuleDetailsSidebar';

function getRuleRelationships(rule, allRules) {
  // Find dependencies (rules this rule depends on)
  const dependencies = [];
  // Find dependents (rules that depend on this rule)
  const dependents = [];
  const ruleName = rule.Name || rule.name || rule.id;
  // Find all labels this rule references
  function findLabelMatch(obj) {
    if (!obj || typeof obj !== 'object') return [];
    let matches = [];
    if (obj.LabelMatchStatement && obj.LabelMatchStatement.Key) {
      matches.push(obj.LabelMatchStatement.Key);
    }
    Object.values(obj).forEach(val => {
      matches = matches.concat(findLabelMatch(val));
    });
    return matches;
  }
  const referencedLabels = findLabelMatch(rule.Statement);
  // For each referenced label, find the rule that emits it
  referencedLabels.forEach(label => {
    const parent = allRules.find(r => (r.RuleLabels || r.ruleLabels || []).some(l => (l.Name || l) === label));
    if (parent) dependencies.push(parent);
  });
  // Find all rules that reference a label emitted by this rule
  const emittedLabels = (rule.RuleLabels || rule.ruleLabels || []).map(l => l.Name || l);
  allRules.forEach(r => {
    const labels = findLabelMatch(r.Statement);
    if (labels.some(l => emittedLabels.includes(l))) {
      dependents.push(r);
    }
  });
  return { dependencies, dependents };
}

function summarizeRule(rule, relationships) {
  let summary = '';
  if (rule.Statement?.ByteMatchStatement) {
    summary += `This rule matches requests where the path contains "${rule.Statement.ByteMatchStatement.SearchString}". `;
  } else if (rule.Conditions) {
    summary += `This ALB rule matches requests with conditions: ` + rule.Conditions.map(c => `${c.Field}=${(c.Values || []).join(',')}`).join('; ') + '. ';
  } else {
    summary += 'This rule matches requests based on its statement logic. ';
  }
  if (relationships.dependencies.length > 0) {
    summary += `It depends on ${relationships.dependencies.length} other rule(s): ` + relationships.dependencies.map(r => r.Name || r.name || r.id).join(', ') + '. ';
    summary += 'These dependencies mean this rule will only match if those rules have emitted the required labels.';
  } else {
    summary += 'It does not depend on any other rules.';
  }
  if (relationships.dependents.length > 0) {
    summary += ` It is referenced by ${relationships.dependents.length} other rule(s): ` + relationships.dependents.map(r => r.Name || r.name || r.id).join(', ') + '. ';
    summary += 'This means other rules rely on the labels emitted by this rule.';
  } else {
    summary += ' No other rules directly depend on this rule.';
  }
  return summary;
}

function TabPanel(props) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`rule-details-tabpanel-${index}`}
      aria-labelledby={`rule-details-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ pt: 2 }}>{children}</Box>}
    </div>
  );
}

function getDependencySubgraph(selectedNode, allNodes, allEdges) {
  if (!selectedNode) return { nodes: [], edges: [] };
  const nodeId = selectedNode.id || selectedNode.Name || selectedNode.name;
  const nodeMap = Object.fromEntries(allNodes.map(n => [String(n.id), n]));
  // Direct children
  const childIds = allEdges.filter(e => e.source === nodeId).map(e => e.target);
  // Direct parents
  const parentIds = allEdges.filter(e => e.target === nodeId).map(e => e.source);
  // Only the selected node, its direct parents, and direct children
  const directIds = [nodeId, ...childIds, ...parentIds];
  const filteredNodes = directIds.map(id => nodeMap[id]).filter(Boolean);
  // Include all edges between any of the displayed nodes
  const filteredNodeIds = new Set(directIds);
  const filteredEdges = allEdges.filter(
    e => filteredNodeIds.has(e.source) && filteredNodeIds.has(e.target)
  );
  return { nodes: filteredNodes, edges: filteredEdges };
}

const InspectorView = ({ rules, showSubgraph, initialSelected }) => {
  const [selected, setSelected] = useState(initialSelected || (rules && rules.length > 0 ? rules[0] : null));
  const [tab, setTab] = useState(0);

  React.useEffect(() => {
    if (initialSelected) setSelected(initialSelected);
  }, [initialSelected]);

  // Prepare allNodes/allEdges for subgraph
  const allNodes = useMemo(() => rules.map(rule => ({ id: rule.Name || rule.name, data: rule })), [rules]);
  const allEdges = useMemo(() => {
    const edges = [];
    rules.forEach(rule => {
      const nodeId = rule.Name || rule.name;
      const deps = rule.dependencies || rule.Dependencies || [];
      (Array.isArray(deps) ? deps : [deps]).forEach(dep => {
        if (dep) edges.push({ source: String(dep), target: String(nodeId), id: `edge-${dep}-${nodeId}` });
      });
    });
    return edges;
  }, [rules]);

  // Subgraph for selected rule
  const { nodes: subNodes, edges: subEdges } = useMemo(() => {
    if (!showSubgraph || !selected) return { nodes: [], edges: [] };
    return getDependencySubgraph(selected, allNodes, allEdges);
  }, [showSubgraph, selected, allNodes, allEdges]);

  // Helper to pretty-print JSON, parsing if needed
  const getJson = (data) => {
    let jsonData = data.Statement || data.json || data;
    if (typeof jsonData === 'string') {
      try {
        jsonData = JSON.parse(jsonData);
      } catch (e) {}
    }
    return JSON.stringify(jsonData, null, 2);
  };

  // Extract key fields for the table
  const getFields = (data) => {
    const name = data.Name || data.name || '';
    const priority = data.Priority || data.priority || '';
    const action = data.Action ? Object.keys(data.Action)[0] : (data.action || '');
    const type = data.Type || data.type || (data.Statement ? Object.keys(data.Statement)[0] : '');
    const labels = (data.RuleLabels || data.ruleLabels || []).map(l => l.Name || l).filter(Boolean);
    const metric = data.VisibilityConfig?.MetricName || data.metric || '';
    return { name, priority, action, type, labels, metric };
  };

  const relationships = useMemo(() => selected && rules ? getRuleRelationships(selected, rules) : { dependencies: [], dependents: [] }, [selected, rules]);
  const aiSummaryText = useMemo(() => selected ? summarizeRule(selected, relationships) : '', [selected, relationships]);

  return (
    <div style={{ display: 'flex', height: '100%', width: '100%', background: 'rgba(255,255,255,0.95)' }}>
      {/* Left: Node list */}
      <div style={{ width: 260, borderRight: '1px solid #eee', overflowY: 'auto', padding: '24px 0', background: '#fafbfc', height: '100%' }}>
        {rules && rules.length > 0 ? rules.map((rule, idx) => {
          const name = rule.Name || rule.name || '';
          const priority = rule.Priority || rule.priority || '';
          return (
            <div
              key={rule.Name || rule.name || idx}
              onClick={() => { setSelected(rule); setTab(0); }}
              style={{
                padding: '12px 24px',
                cursor: 'pointer',
                background: selected === rule ? '#e3f2fd' : 'transparent',
                fontWeight: selected === rule ? 600 : 400,
                borderLeft: selected === rule ? '4px solid #1976d2' : '4px solid transparent',
                color: selected === rule ? '#1976d2' : '#222',
                transition: 'background 0.2s, color 0.2s',
              }}
            >
              <div style={{ fontSize: 17 }}>{name}</div>
              <div style={{ fontSize: 13, color: '#888' }}>Priority: {priority}</div>
            </div>
          );
        }) : <div style={{ padding: 24, color: '#888' }}>No rules found.</div>}
      </div>
      {/* Right: Panel with details/tabs, fills all remaining space */}
      <div style={{ flex: 1, minWidth: 0, height: '100%', width: '100%', display: 'flex', flexDirection: 'column' }}>
        {selected && (
          <>
            <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
              <Tab label="Details" />
              <Tab label="JSON" />
              <Tab label="Dependencies" />
              <Tab label="Warnings" />
              <Tab label="Subgraph" />
            </Tabs>
            {tab === 0 && <RuleDetailsSidebar rule={selected} rules={rules} />}
            {tab === 1 && (
              <pre style={{ background: '#f5f5f5', padding: 16, borderRadius: 4, fontSize: 14, maxWidth: '100%', overflowX: 'auto' }}>{JSON.stringify(selected.Statement || selected.json || selected, null, 2)}</pre>
            )}
            {tab === 2 && (
              <Box sx={{ p: 2 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 500, mb: 1 }}>Dependencies</Typography>
                {/* Dependencies logic from RuleDetailsSidebar */}
                {/* ... */}
              </Box>
            )}
            {tab === 3 && (
              <Box sx={{ p: 2 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 500, mb: 1 }}>Warnings</Typography>
                {/* Warnings logic from RuleDetailsSidebar */}
                {/* ... */}
              </Box>
            )}
            {tab === 4 && (
              showSubgraph && subNodes.length > 0 ? (
                <Box sx={{ width: '100%', minHeight: 300, background: '#f7fafd', borderRadius: 2, boxShadow: '0 2px 12px #1976d222', mb: 3, p: 2 }}>
                  <FlowChart
                    allNodes={subNodes}
                    allEdges={subEdges}
                    selectedNode={selected.id || selected.Name || selected.name}
                    setSelectedNode={() => {}}
                    searchTerm={''}
                    showArrows={true}
                    setShowArrows={() => {}}
                    dottedLines={false}
                    animatedLines={false}
                    treeSetup={'popupLayered'}
                    orderBy={'dependency'}
                  />
                </Box>
              ) : (
                <Typography variant="body2" sx={{ p: 2 }}>No subgraph available for this rule.</Typography>
              )
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default InspectorView; 