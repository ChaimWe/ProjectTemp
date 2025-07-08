import React, { useState, useMemo } from 'react';
import { Box, IconButton, Modal, Tooltip } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import FullscreenIcon from '@mui/icons-material/Fullscreen';
import FullscreenExitIcon from '@mui/icons-material/FullscreenExit';
import FlowChart from '../tree/FlowChart';
import { useThemeContext } from '../../context/ThemeContext';

/**
 * Given a node id, all nodes, and all edges, return the set of nodes and edges
 * that are directly or indirectly connected to the node (parents and children).
 */
function getDependencySubgraph(selectedNode, allNodes, allEdges) {
  if (!selectedNode) return { nodes: [], edges: [] };
  const nodeId = selectedNode.id;
  const nodeMap = Object.fromEntries(allNodes.map(n => [String(n.id), n]));
  // Debug: print all input data
  console.log('DependencyTreePopup: allNodes raw:', allNodes);

  // Direct children
  const childIds = allEdges.filter(e => e.source === nodeId).map(e => e.target);
  // Direct parents
  const parentIds = allEdges.filter(e => e.target === nodeId).map(e => e.source);

  // Only the selected node, its direct parents, and direct children
  const directIds = [nodeId, ...childIds, ...parentIds];
  const filteredNodes = directIds.map(id => nodeMap[id]).filter(Boolean);
  const filteredEdges = allEdges.filter(
    e =>
      (e.source === nodeId && childIds.includes(e.target)) ||
      (e.target === nodeId && parentIds.includes(e.source))
  );

  return { nodes: filteredNodes, edges: filteredEdges };
}

const DependencyTreePopup = ({ open, onClose, selectedNode, allNodes, allEdges }) => {
  const { getColor } = useThemeContext();
  const [fullscreen, setFullscreen] = useState(true);

  console.log('DependencyTreePopup: allNodes raw:', allNodes);

  // Memoize the filtered subgraph
  const { nodes, edges } = useMemo(
    () => {
      const res = getDependencySubgraph(selectedNode, allNodes, allEdges);
      // Mark nodes as inPopup for rich info
      return {
        nodes: res.nodes.map(n => ({ ...n, data: { ...n.data, inPopup: true } })),
        edges: res.edges,
      };
    },
    [selectedNode, allNodes, allEdges]
  );

  return (
    <Modal open={open} onClose={onClose} style={{ zIndex: 2000 }}>
      <Box
        sx={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: fullscreen ? '100vw' : '80vw',
          height: fullscreen ? '100vh' : '80vh',
          background: getColor('background'),
          boxShadow: 24,
          borderRadius: fullscreen ? 0 : 4,
          p: 2,
          zIndex: 2001,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
          <span style={{ fontWeight: 'bold', fontSize: 18, color: getColor('barText') }}>
            Dependency Tree for: {selectedNode?.name || selectedNode?.data?.name || selectedNode?.id}
          </span>
          <span>
            <Tooltip title={fullscreen ? 'Exit Fullscreen' : 'Fullscreen'}>
              <IconButton onClick={() => setFullscreen(f => !f)}>
                {fullscreen ? <FullscreenExitIcon /> : <FullscreenIcon />}
              </IconButton>
            </Tooltip>
            <Tooltip title="Close">
              <IconButton onClick={onClose}>
                <CloseIcon />
              </IconButton>
            </Tooltip>
          </span>
        </Box>
        <Box sx={{ flex: 1, minHeight: 0, background: getColor('barBackground'), borderRadius: 2, p: 1 }}>
          <FlowChart
            allNodes={nodes}
            allEdges={edges}
            selectedNode={selectedNode}
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
      </Box>
    </Modal>
  );
};

export default DependencyTreePopup; 