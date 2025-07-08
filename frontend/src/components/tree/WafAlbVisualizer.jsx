import React, { useState, useMemo } from 'react';
import FlowChart from './FlowChart';
import InspectorView from '../WAFView/InspectorView';
import CytoscapeComponent from 'react-cytoscapejs';
import RequestDebugger from '../../debugger/RequestDebugger';

const BORDER_COLORS = {
  WAF: '2px solid red',
  ALB: '2px dashed green',
};
const BADGES = {
  WAF: '[WAF]',
  ALB: '[ALB]',
};
const CLUSTER_BG = {
  WAF: '#f5f5f5',
  ALB: '#e6f7ff',
};

function getNodeColor(node, labelToNode, edges) {
  const hasOutgoing = edges.some(e => e.from === node.id);
  const hasIncoming = edges.some(e => e.to === node.id);
  if (hasOutgoing && hasIncoming) return '#2196f3'; // blue
  if (hasOutgoing) return '#4caf50'; // green
  return '#ccc'; // gray
}

const NodeBox = ({ node, style, onMouseEnter, onMouseLeave }) => (
  <div
    style={{
      border: BORDER_COLORS[node.type],
      borderRadius: 8,
      padding: 12,
      margin: '16px 0',
      background: '#fff',
      position: 'relative',
      minWidth: 180,
      boxShadow: '0 1px 4px #0001',
      ...style,
    }}
    onMouseEnter={onMouseEnter}
    onMouseLeave={onMouseLeave}
  >
    <span style={{
      position: 'absolute',
      top: 6,
      right: 10,
      fontSize: 12,
      color: node.type === 'WAF' ? 'red' : 'green',
      fontWeight: 700,
    }}>{BADGES[node.type]}</span>
    <div style={{ fontWeight: 600 }}>{node.name}</div>
    <div style={{ fontSize: 13, color: '#888' }}>{node.type} Rule</div>
    <div style={{ fontSize: 12, marginTop: 4 }}>
      <strong>Labels:</strong> {node.labels.join(', ')}
    </div>
    <div style={{ fontSize: 12, marginTop: 2 }}>
      <strong>Priority:</strong> {node.priority}
    </div>
  </div>
);

const Legend = () => (
  <div style={{
    position: 'absolute',
    bottom: 24,
    right: 24,
    background: '#fff',
    border: '1px solid #ccc',
    borderRadius: 8,
    padding: 16,
    fontSize: 13,
    boxShadow: '0 1px 4px #0002',
    zIndex: 10,
    minWidth: 220,
  }}>
    <div style={{ fontWeight: 700, marginBottom: 8 }}>Legend</div>
    <div><span style={{ color: '#ccc', fontWeight: 700 }}>■</span> Gray: No blue parents/children</div>
    <div><span style={{ color: '#4caf50', fontWeight: 700 }}>■</span> Green: Has blue children</div>
    <div><span style={{ color: '#2196f3', fontWeight: 700 }}>■</span> Blue: Both blue parents and children</div>
    <div style={{ marginTop: 8 }}><span style={{ border: '2px solid red', padding: '0 8px' }} /> Solid Red Border: waf_rules.json</div>
    <div><span style={{ border: '2px dashed green', padding: '0 8px' }} /> Dashed Green Border: alb_rules.json</div>
    <div style={{ marginTop: 8 }}><span style={{ color: 'red' }}>[WAF]</span> = waf_rules.json, <span style={{ color: 'green' }}>[ALB]</span> = alb_rules.json</div>
    <div style={{ marginTop: 8, fontSize: 12, color: '#888' }}>Hover node for details.</div>
  </div>
);

const VIEW_OPTIONS = [
  { value: 'dual', label: 'Dual Cluster' },
  { value: 'cluster', label: 'Cluster Graph' },
  { value: 'waf-tree', label: 'WAF Tree' },
  { value: 'alb-tree', label: 'ALB Tree' },
  { value: 'waf-inspector', label: 'WAF Inspector' },
  { value: 'alb-inspector', label: 'ALB Inspector' },
];

const WafAlbVisualizer = () => {
  const [wafData, setWafData] = useState(null);
  const [albData, setAlbData] = useState(null);
  const [error, setError] = useState(null);
  const [hoverNode, setHoverNode] = useState(null);
  const [view, setView] = useState('dual');
  const [showDebugger, setShowDebugger] = useState(false);

  const handleFileUpload = (event, setData) => {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const json = JSON.parse(e.target.result);
        setData(json);
        setError(null);
      } catch (err) {
        setError('Invalid JSON file.');
      }
    };
    reader.readAsText(file);
  };

  // Build nodes and edges
  const { wafNodes, albNodes, edges, labelToWaf, labelToAlb } = useMemo(() => {
    if (!wafData || !albData) return { wafNodes: [], albNodes: [], edges: [], labelToWaf: {}, labelToAlb: {} };
    // WAF nodes
    const wafNodes = wafData.Rules.map(rule => ({
      id: rule.Name,
      name: rule.Name,
      type: 'WAF',
      labels: (rule.RuleLabels || []).map(l => l.Name),
      priority: rule.Priority,
      raw: rule,
    }));
    // ALB nodes
    const albNodes = albData.Rules.map(rule => ({
      id: rule.Name,
      name: rule.Name,
      type: 'ALB',
      labels: (rule.RuleLabels || []).map(l => l.Name),
      priority: rule.Priority,
      raw: rule,
    }));
    // Map labels to nodes
    const labelToWaf = {};
    wafNodes.forEach(node => node.labels.forEach(label => { labelToWaf[label] = node; }));
    const labelToAlb = {};
    albNodes.forEach(node => node.labels.forEach(label => { labelToAlb[label] = node; }));
    // Edges: for each label present in both, connect WAF to ALB
    const edges = [];
    Object.keys(labelToWaf).forEach(label => {
      if (labelToAlb[label]) {
        edges.push({
          from: labelToWaf[label].id,
          to: labelToAlb[label].id,
          label,
        });
      }
    });
    return { wafNodes, albNodes, edges, labelToWaf, labelToAlb };
  }, [wafData, albData]);

  // Build edges for WAF and ALB trees (internal relationships)
  const wafEdges = useMemo(() => {
    // Example: connect by priority or custom logic (no real dependencies in sample)
    return [];
  }, [wafNodes]);
  const albEdges = useMemo(() => {
    return [];
  }, [albNodes]);

  return (
    <div style={{ padding: 24, position: 'relative', minHeight: 600 }}>
      <h2>WAF & ALB Rules Visualizer</h2>
      <div style={{ marginBottom: 16 }}>
        <label style={{ marginRight: 8 }}>
          Upload waf_rules.json:
          <input
            type="file"
            accept=".json,application/json"
            onChange={e => handleFileUpload(e, setWafData)}
            style={{ marginLeft: 8 }}
          />
        </label>
        <label style={{ marginLeft: 32 }}>
          Upload alb_rules.json:
          <input
            type="file"
            accept=".json,application/json"
            onChange={e => handleFileUpload(e, setAlbData)}
            style={{ marginLeft: 8 }}
          />
        </label>
        <select value={view} onChange={e => setView(e.target.value)} style={{ marginLeft: 32, padding: '4px 12px', fontSize: 16 }}>
          {VIEW_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
        </select>
      </div>
      {error && <div style={{ color: 'red', marginBottom: 16 }}>{error}</div>}
      <div style={{ marginBottom: 24 }}>
        <strong>Status:</strong>
        <ul>
          <li>WAF Rules: {wafData ? 'Loaded' : 'Not loaded'}</li>
          <li>ALB Rules: {albData ? 'Loaded' : 'Not loaded'}</li>
        </ul>
      </div>
      {wafData && albData && (
        <button style={{ marginBottom: 16 }} onClick={() => setShowDebugger(v => !v)}>
          {showDebugger ? 'Hide' : 'Open'} Request Debugger
        </button>
      )}
      {wafData && albData ? (
        <>
          {view === 'dual' && (
            <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'flex-start', position: 'relative', minHeight: 500 }}>
              {/* WAF Cluster */}
              <div style={{ background: CLUSTER_BG.WAF, padding: 24, borderRadius: 12, minWidth: 260, marginRight: 48, flex: 1 }}>
                <div style={{ fontWeight: 700, marginBottom: 8 }}>WAF Rules</div>
                {wafNodes.map((node, idx) => (
                  <NodeBox
                    key={node.id}
                    node={node}
                    style={{
                      background: getNodeColor(node, null, edges),
                      opacity: hoverNode && hoverNode.id !== node.id ? 0.7 : 1,
                      cursor: 'pointer',
                    }}
                    onMouseEnter={() => setHoverNode(node)}
                    onMouseLeave={() => setHoverNode(null)}
                  />
                ))}
              </div>
              {/* SVG Edges */}
              <svg style={{ position: 'absolute', left: 0, top: 0, pointerEvents: 'none', width: '100%', height: '100%', zIndex: 1 }}>
                {edges.map((edge, i) => {
                  const fromIdx = wafNodes.findIndex(n => n.id === edge.from);
                  const toIdx = albNodes.findIndex(n => n.id === edge.to);
                  if (fromIdx === -1 || toIdx === -1) return null;
                  const x1 = 260 + 24;
                  const y1 = 60 + fromIdx * 100;
                  const x2 = 260 + 48 + 24;
                  const y2 = 60 + toIdx * 100;
                  return (
                    <g key={i}>
                      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#bbb" strokeWidth={2} markerEnd="url(#arrowhead)" />
                      <text x={(x1 + x2) / 2} y={(y1 + y2) / 2 - 8} fontSize={12} fill="#888">Allowed Traffic</text>
                    </g>
                  );
                })}
                <defs>
                  <marker id="arrowhead" markerWidth="8" markerHeight="8" refX="8" refY="4" orient="auto" markerUnits="strokeWidth">
                    <polygon points="0,0 8,4 0,8" fill="#bbb" />
                  </marker>
                </defs>
              </svg>
              {/* ALB Cluster */}
              <div style={{ background: CLUSTER_BG.ALB, padding: 24, borderRadius: 12, minWidth: 260, marginLeft: 48, flex: 1 }}>
                <div style={{ fontWeight: 700, marginBottom: 8 }}>ALB Rules</div>
                {albNodes.map((node, idx) => (
                  <NodeBox
                    key={node.id}
                    node={node}
                    style={{
                      background: getNodeColor(node, null, edges),
                      opacity: hoverNode && hoverNode.id !== node.id ? 0.7 : 1,
                      cursor: 'pointer',
                    }}
                    onMouseEnter={() => setHoverNode(node)}
                    onMouseLeave={() => setHoverNode(null)}
                  />
                ))}
              </div>
              {/* Hover details */}
              {hoverNode && (
                <div style={{
                  position: 'absolute',
                  left: hoverNode.type === 'WAF' ? 40 : 'auto',
                  right: hoverNode.type === 'ALB' ? 40 : 'auto',
                  top: 40,
                  background: '#fff',
                  border: '1px solid #ccc',
                  borderRadius: 8,
                  padding: 16,
                  zIndex: 10,
                  minWidth: 260,
                  boxShadow: '0 2px 8px #0002',
                }}>
                  <div style={{ fontWeight: 700, marginBottom: 8 }}>{hoverNode.name} ({hoverNode.type})</div>
                  <div><strong>Source:</strong> {hoverNode.type === 'WAF' ? 'waf_rules.json' : 'alb_rules.json'}</div>
                  <div><strong>Priority:</strong> {hoverNode.priority}</div>
                  <div><strong>Labels:</strong> {hoverNode.labels.join(', ')}</div>
                  <div style={{ marginTop: 8, fontSize: 13, color: '#888' }}>Raw Data:</div>
                  <pre style={{ maxHeight: 120, overflow: 'auto', background: '#f8f8f8', padding: 8, fontSize: 12 }}>{JSON.stringify(hoverNode.raw, null, 2)}</pre>
                </div>
              )}
              <Legend />
            </div>
          )}
          {view === 'cluster' && (
            <div style={{ height: 600, background: '#f8fafd', borderRadius: 12, marginBottom: 24 }}>
              <CytoscapeComponent
                elements={[
                  // Compound parent nodes for clusters
                  { data: { id: 'waf-cluster', label: 'WAF Rules' }, classes: 'wafCluster' },
                  { data: { id: 'alb-cluster', label: 'ALB Rules' }, classes: 'albCluster' },
                  // WAF nodes
                  ...wafNodes.map(node => ({
                    data: { id: node.id, label: node.name, parent: 'waf-cluster' },
                    classes: 'wafNode',
                  })),
                  // ALB nodes
                  ...albNodes.map(node => ({
                    data: { id: node.id, label: node.name, parent: 'alb-cluster' },
                    classes: 'albNode',
                  })),
                  // Edges between clusters
                  ...edges.map(edge => ({
                    data: { source: edge.from, target: edge.to, label: edge.label },
                    classes: 'wafAlbEdge',
                  })),
                ]}
                style={{ width: '100%', height: '100%' }}
                layout={{ name: 'preset' }}
                stylesheet={[
                  {
                    selector: '.wafCluster',
                    style: {
                      'background-color': '#f5f5f5',
                      'border-width': 2,
                      'border-color': '#d32f2f',
                      'shape': 'roundrectangle',
                      'label': 'data(label)',
                      'text-valign': 'top',
                      'text-halign': 'center',
                      'font-size': 18,
                      'font-weight': 'bold',
                    },
                  },
                  {
                    selector: '.albCluster',
                    style: {
                      'background-color': '#e6f7ff',
                      'border-width': 2,
                      'border-color': '#388e3c',
                      'shape': 'roundrectangle',
                      'label': 'data(label)',
                      'text-valign': 'top',
                      'text-halign': 'center',
                      'font-size': 18,
                      'font-weight': 'bold',
                    },
                  },
                  {
                    selector: '.wafNode',
                    style: {
                      'background-color': '#fff',
                      'border-width': 2,
                      'border-color': '#d32f2f',
                      'shape': 'ellipse',
                      'label': 'data(label)',
                      'font-size': 14,
                    },
                  },
                  {
                    selector: '.albNode',
                    style: {
                      'background-color': '#fff',
                      'border-width': 2,
                      'border-color': '#388e3c',
                      'shape': 'ellipse',
                      'label': 'data(label)',
                      'font-size': 14,
                    },
                  },
                  {
                    selector: '.wafAlbEdge',
                    style: {
                      'width': 3,
                      'line-color': '#2196f3',
                      'target-arrow-color': '#2196f3',
                      'target-arrow-shape': 'triangle',
                      'curve-style': 'bezier',
                      'label': 'data(label)',
                      'font-size': 12,
                      'text-background-color': '#fff',
                      'text-background-opacity': 1,
                      'text-background-padding': 2,
                    },
                  },
                ]}
              />
            </div>
          )}
          {view === 'waf-tree' && wafNodes.length > 0 && (
            <FlowChart
              allNodes={wafNodes}
              allEdges={wafEdges}
              selectedNode={null}
              setSelectedNode={() => {}}
              searchTerm={''}
              showArrows={true}
              dottedLines={false}
              animatedLines={false}
              layoutType="collapsible"
              orderBy={'number'}
              nodesPerRow={8}
            />
          )}
          {view === 'alb-tree' && albNodes.length > 0 && (
            <FlowChart
              allNodes={albNodes}
              allEdges={albEdges}
              selectedNode={null}
              setSelectedNode={() => {}}
              searchTerm={''}
              showArrows={true}
              dottedLines={false}
              animatedLines={false}
              layoutType="collapsible"
              orderBy={'number'}
              nodesPerRow={8}
            />
          )}
          {view === 'waf-inspector' && wafNodes.length > 0 && (
            <InspectorView
              rules={wafNodes.map(n => n.raw)}
              dependencyNodes={wafNodes.map(n => n.raw)}
              dependencyEdges={[]}
            />
          )}
          {view === 'alb-inspector' && albNodes.length > 0 && (
            <InspectorView
              rules={albNodes.map(n => n.raw)}
              dependencyNodes={albNodes.map(n => n.raw)}
              dependencyEdges={[]}
            />
          )}
        </>
      ) : (
        <div style={{ color: '#888' }}>
          Please upload both waf_rules.json and alb_rules.json to view the visualization.
        </div>
      )}
      {/* Always render debugger below, if toggled and files loaded */}
      {showDebugger && wafData && albData && (
        <div style={{ marginTop: 32, background: '#f8fafd', borderRadius: 12, boxShadow: '0 2px 8px #0001', padding: 24, border: '2px solid #1976d2' }}>
          <h3 style={{ marginTop: 0, marginBottom: 16, color: '#1976d2' }}>Request Debugger</h3>
          <RequestDebugger rules={wafData.Rules} albRules={albData.Rules} />
        </div>
      )}
    </div>
  );
};

export default WafAlbVisualizer; 