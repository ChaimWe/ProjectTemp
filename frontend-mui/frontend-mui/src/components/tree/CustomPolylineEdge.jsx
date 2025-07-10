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

  return (
    <g>
      <polyline
        id={id}
        points={pointsStr}
        fill="none"
        stroke="#22cc22"
        strokeWidth={2}
        markerEnd={markerEnd}
        style={style}
        className={animated ? 'react-flow__edge-path--animated' : ''}
      />
    </g>
  );
};

export default CustomPolylineEdge; 