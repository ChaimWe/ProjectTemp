import React from 'react';
import { getBezierPath, BaseEdge } from 'reactflow';

const OFFSET = 30; // adjust as needed for elbow

const CustomPolylineEdge = ({ id, sourceX, sourceY, targetX, targetY, data, animated, style = {}, markerEnd }) => {
  let points;
  if (data?.direction === 'parent' || data?.direction === 'child' || data?.direction === 'angled') {
    // Go down first, then out
    points = [
      [sourceX, sourceY],
      [sourceX, targetY],
      [targetX, targetY]
    ];
  } else {
    // Fallback: straight line
    points = [
      [sourceX, sourceY],
      [targetX, targetY]
    ];
  }
  const pointsStr = points.map(([x, y]) => `${x},${y}`).join(' ');
  // Opacity logic: full if highlighted, faded otherwise
  const edgeOpacity = data?.highlighted ? 1 : 0.7;
  return (
    <g aria-label="Edge">
      <polyline
        id={id}
        points={pointsStr}
        fill="none"
        stroke="#1976d2"
        strokeWidth={3}
        markerEnd={markerEnd}
        style={{ ...style, opacity: edgeOpacity }}
        className={animated ? 'react-flow__edge-path--animated' : ''}
      />
    </g>
  );
};

export default CustomPolylineEdge; 