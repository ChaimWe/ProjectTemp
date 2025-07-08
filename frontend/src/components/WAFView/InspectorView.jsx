import React, { useState, useMemo, useRef } from 'react';
import FlowChart from '../tree/FlowChart';
import CenterFocusStrongIcon from '@mui/icons-material/CenterFocusStrong';
import { IconButton, Tooltip } from '@mui/material';

// --- Dependency subgraph logic (from DependencyTreePopup) ---
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

const InspectorView = ({ rules, dependencyNodes, dependencyEdges }) => {
  const [selected, setSelected] = useState(rules && rules.length > 0 ? rules[0] : null);
  const flowRef = useRef();

  // Use dependencyNodes/Edges if provided, else fallback to rules
  const allNodes = useMemo(() => {
    if (dependencyNodes && dependencyNodes.length > 0) {
      return dependencyNodes.map(rule => ({ id: rule.Name || rule.name, data: rule }));
    }
    return rules.map(rule => ({ id: rule.Name || rule.name, data: rule }));
  }, [dependencyNodes, rules]);

  const allEdges = useMemo(() => {
    if (dependencyEdges && dependencyEdges.length > 0) {
      return dependencyEdges.map(e => ({ ...e, source: String(e.source), target: String(e.target) }));
    }
    const edges = [];
    rules.forEach(rule => {
      const nodeId = rule.Name || rule.name;
      const deps = rule.dependencies || rule.Dependencies || [];
      (Array.isArray(deps) ? deps : [deps]).forEach(dep => {
        if (dep) edges.push({ source: String(dep), target: String(nodeId), id: `edge-${dep}-${nodeId}` });
      });
    });
    return edges;
  }, [dependencyEdges, rules]);

  // Get the subgraph for the selected node, and mark nodes as inPopup for rich info
  const { nodes: subNodes, edges: subEdges } = useMemo(() => {
    const res = getDependencySubgraph(selected, allNodes, allEdges);
    // Custom layout: selected in center, parents above, children below
    if (!selected) return { nodes: [], edges: [] };
    const nodeId = selected.id || selected.Name || selected.name;
    const parents = res.nodes.filter(n => res.edges.some(e => e.target === nodeId && e.source === n.id));
    const children = res.nodes.filter(n => res.edges.some(e => e.source === nodeId && e.target === n.id));
    const center = res.nodes.find(n => n.id === nodeId);
    const spacingX = 250;
    const spacingY = 180;
    let nodes = [];
    // Parents row
    parents.forEach((n, i) => {
      nodes.push({
        ...n,
        position: { x: i * spacingX - ((parents.length-1)*spacingX/2), y: 0 },
        type: 'custom-node',
        data: { ...n.data, inPopup: true }
      });
    });
    // Center node
    if (center) {
      nodes.push({
        ...center,
        position: { x: 0, y: spacingY },
        type: 'custom-node',
        data: { ...center.data, inPopup: true }
      });
    }
    // Children row
    children.forEach((n, i) => {
      nodes.push({
        ...n,
        position: { x: i * spacingX - ((children.length-1)*spacingX/2), y: 2*spacingY },
        type: 'custom-node',
        data: { ...n.data, inPopup: true }
      });
    });
    return { nodes, edges: res.edges };
  }, [selected, allNodes, allEdges]);

  // Debug output for InspectorView subgraph extraction
  console.log('[InspectorView] selected:', selected);
  console.log('[InspectorView] allNodes:', allNodes);
  console.log('[InspectorView] allEdges:', allEdges);
  console.log('[InspectorView] subNodes:', subNodes);
  console.log('[InspectorView] subEdges:', subEdges);

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

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 80px)', width: '100%', background: 'rgba(255,255,255,0.95)' }}>
      {/* Left: Node list */}
      <div style={{ width: 260, borderRight: '1px solid #eee', overflowY: 'auto', padding: '24px 0', background: '#fafbfc' }}>
        {rules && rules.length > 0 ? rules.map((rule, idx) => {
          const name = rule.Name || rule.name || '';
          const priority = rule.Priority || rule.priority || '';
          return (
            <div
              key={rule.Name || rule.name || idx}
              onClick={() => setSelected(rule)}
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
      {/* Right: Dependency tree exactly as in the popup */}
      <div style={{ flex: 1, padding: '36px 48px', overflowY: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
        <div style={{ fontWeight: 'bold', fontSize: 24, marginBottom: 18 }}>
          Dependency Tree for: {selected?.Name || selected?.name || selected?.id}
        </div>
        <div style={{ marginBottom: 12 }}>
          <Tooltip title="Recenter Tree">
            <IconButton onClick={() => flowRef.current?.handleExportPdf ? flowRef.current?.handleExportPdf() : flowRef.current?.fitView?.({ padding: 0.2, includeHiddenNodes: true })} size="small">
              <CenterFocusStrongIcon />
            </IconButton>
          </Tooltip>
        </div>
        <div style={{ width: '100%', minHeight: 400, background: '#f7fafd', borderRadius: 8, boxShadow: '0 2px 12px #1976d222', padding: 16 }}>
          <FlowChart
            ref={flowRef}
            allNodes={subNodes}
            allEdges={subEdges}
            selectedNode={selected?.id || selected?.Name || selected?.name}
            setSelectedNode={() => {}}
            searchTerm={''}
            showArrows={true}
            setShowArrows={() => {}}
            dottedLines={false}
            animatedLines={false}
            treeSetup={'popupLayered'}
            orderBy={'dependency'}
          />
        </div>
      </div>
    </div>
  );
};

export default InspectorView; 