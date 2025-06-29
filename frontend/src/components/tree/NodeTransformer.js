export default class Tree {
    static NODE_WIDTH = 200;
    static NODE_HEIGHT = 160;

    transformNodes(tranformedRulesArray) {
        const nodes = [];
        tranformedRulesArray.forEach((rule, i) => {
            nodes.push({
                id: String(i),
                position: { x: 0, y: 0 },
                type: 'custom-node',
                data: {
                    id: String(i),
                    name: rule.name || rule.Name,
                    priority: rule.priority,
                    action: rule.action,
                    ruleLabels: rule.ruleLabels,
                    labelState: rule.labelState,
                    hw: this.calculateCard(rule),
                    warnings: rule.warnings,
                    insertHeaders: rule.insertHeaders,
                    level: rule.level,
                    json: rule.json // <-- ensure JSON is available for popup
                },
            });
        });

        this.calculateNodePositionHierarchical(nodes, []);
        return nodes;
    }


    calculateCard(rule) {
        const text = [rule.name, ...rule.ruleLabels, ...rule.labelState.map(([_, label]) => label)];
        const width = Math.max(
            Tree.NODE_WIDTH,
            ...text.map(text => text?.length * 7 + 105 || 0)
        );
        const height = Math.max(
            text.length * 28 + 100,
            Tree.NODE_HEIGHT
        );

        return { height, width };
    }

    // Arrange nodes in a hierarchical (top-down tree) layout based on dependency level
    calculateNodePositionHierarchical(nodes, edges) {
        if (nodes.length === 0) return;
        const centerX = 1000;
        const startY = 100;
        const verticalSpacing = 120;
        const horizontalSpacing = 120;

        // 1. Calculate levels for each node (distance from a root)
        const nodeMap = new Map(nodes.map(n => [n.id, n]));
        const parentMap = new Map();
        const childMap = new Map();
        edges.forEach(edge => {
            if (!parentMap.has(edge.target)) parentMap.set(edge.target, []);
            parentMap.get(edge.target).push(edge.source);
            if (!childMap.has(edge.source)) childMap.set(edge.source, []);
            childMap.get(edge.source).push(edge.target);
        });
        nodes.forEach(node => {
            node.level = parentMap.has(node.id) ? null : 0;
        });
        let changed = true;
        while (changed) {
            changed = false;
            nodes.forEach(node => {
                if (node.level === null) {
                    const parents = parentMap.get(node.id) || [];
                    const parentLevels = parents.map(pid => nodeMap.get(pid)?.level).filter(lvl => lvl !== null);
                    if (parentLevels.length > 0) {
                        node.level = Math.max(...parentLevels) + 1;
                        changed = true;
                    }
                }
            });
        }
        // Group nodes by level
        const levelMap = new Map();
        nodes.forEach(node => {
            const lvl = node.level || 0;
            if (!levelMap.has(lvl)) levelMap.set(lvl, []);
            levelMap.get(lvl).push(node);
        });
        // 2. Assign positions
        // Identify node types
        const allNodeIds = new Set(nodes.map(n => n.id));
        const childIds = new Set();
        const parentIds = new Set();
        edges.forEach(e => {
            childIds.add(e.target);
            parentIds.add(e.source);
        });
        const grayNodes = nodes.filter(n => !parentIds.has(n.id) && !childIds.has(n.id));
        const rootNodes = nodes.filter(n => !childIds.has(n.id) && parentIds.has(n.id));
        const nonRootNodes = nodes.filter(n => childIds.has(n.id) && parentIds.has(n.id));
        const leafNodes = nodes.filter(n => childIds.has(n.id) && !parentIds.has(n.id));

        // Place gray nodes in the first row (max 8 per row)
        const maxPerRow = 8;
        const rowGap = 80;
        let y = startY;
        let rowNodes = grayNodes;
        while (rowNodes.length > 0) {
            const count = Math.min(rowNodes.length, maxPerRow);
            const row = rowNodes.slice(0, count);
            const rowWidth = (row.length - 1) * horizontalSpacing;
            const rowStartX = centerX - rowWidth / 2;
            row.forEach((node, i) => {
                let x = rowStartX + i * horizontalSpacing;
                let yVal = y;
                if (isNaN(x) || isNaN(yVal)) {
                    console.warn('[NodeTransformer] Hierarchical node position is NaN, setting to 0:', { node, x, y: yVal });
                    x = 0;
                    yVal = 0;
                }
                node.position = { x, y: yVal };
            });
            y += rowGap;
            rowNodes = rowNodes.slice(count);
        }

        // Place root nodes in the next row(s)
        rowNodes = rootNodes;
        while (rowNodes.length > 0) {
            const count = Math.min(rowNodes.length, maxPerRow);
            const row = rowNodes.slice(0, count);
            const rowWidth = (row.length - 1) * horizontalSpacing;
            const rowStartX = centerX - rowWidth / 2;
            row.forEach((node, i) => {
                node.position = { x: rowStartX + i * horizontalSpacing, y };
            });
            y += rowGap;
            rowNodes = rowNodes.slice(count);
        }

        // Place non-root (teal) nodes in the next row(s)
        rowNodes = nonRootNodes;
        while (rowNodes.length > 0) {
            const count = Math.min(rowNodes.length, maxPerRow);
            const row = rowNodes.slice(0, count);
            const rowWidth = (row.length - 1) * horizontalSpacing;
            const rowStartX = centerX - rowWidth / 2;
            row.forEach((node, i) => {
                node.position = { x: rowStartX + i * horizontalSpacing, y };
            });
            y += rowGap;
            rowNodes = rowNodes.slice(count);
        }

        // Place leaf (green) nodes in the last row(s)
        rowNodes = leafNodes;
        while (rowNodes.length > 0) {
            const count = Math.min(rowNodes.length, maxPerRow);
            const row = rowNodes.slice(0, count);
            const rowWidth = (row.length - 1) * horizontalSpacing;
            const rowStartX = centerX - rowWidth / 2;
            row.forEach((node, i) => {
                node.position = { x: rowStartX + i * horizontalSpacing, y };
            });
            y += rowGap;
            rowNodes = rowNodes.slice(count);
        }
        // Final defensive pass: ensure all node positions are valid numbers
        nodes.forEach(node => {
            let x = node.position?.x;
            let y = node.position?.y;
            if (typeof x !== 'number' || isNaN(x)) x = 0;
            if (typeof y !== 'number' || isNaN(y)) y = 0;
            node.position = { x, y };
        });
    }
}

export const transformData = (data) => {
    console.log('[NodeTransformer] Starting data transformation');
    
    if (!data || !Array.isArray(data)) {
        console.error('[NodeTransformer] Invalid input data');
        return null;
    }

    try {
        const nodes = [];
        const edges = [];
        const globalWarnings = [];
        const nodeMap = new Map();

        // First pass: Create nodes
        data.forEach((rule, index) => {
            if (!rule || typeof rule !== 'object') {
                console.warn('[NodeTransformer] Invalid rule object at index', index);
                return;
            }

            const node = {
                id: String(index),
                type: 'custom-node',
                data: { ...rule },
                position: { x: 0, y: 0 },
            };
            nodes.push(node);
            nodeMap.set(String(index), node);

            // Collect global warnings
            if (rule.warnings && Array.isArray(rule.warnings)) {
                rule.warnings.forEach(warning => {
                    if (warning && typeof warning === 'object') {
                        globalWarnings.push({
                            ...warning,
                            ruleId: String(index)
                        });
                    }
                });
            }
        });

        console.log('[NodeTransformer] Created nodes:', nodes.length);

        // Second pass: Create edges
        nodes.forEach((node) => {
            if (!node.data || !node.data.dependencies) {
                return;
            }

            const dependencies = Array.isArray(node.data.dependencies) 
                ? node.data.dependencies 
                : [node.data.dependencies];

            dependencies.forEach((dep, depIndex) => {
                if (dep === undefined || dep === null) {
                    console.warn('[NodeTransformer] Invalid dependency for node', node.id);
                    return;
                }

                // If dep is a number, use as index; if string, try parseInt
                let depId = typeof dep === 'number' ? String(dep) : String(parseInt(dep));
                const targetNode = nodeMap.get(depId);
                if (!targetNode) {
                    console.warn('[NodeTransformer] Missing target node for dependency:', dep);
                    return;
                }

                edges.push({
                    id: `${node.id}-${depId}-${depIndex}`,
                    source: node.id,
                    target: depId,
                });
            });
        });

        console.log('[NodeTransformer] Created edges:', edges.length);

        // Position nodes in a grid layout
        const GRID_SIZE = 250;
        const NODES_PER_ROW = Math.ceil(Math.sqrt(nodes.length));

        nodes.forEach((node, index) => {
            const row = Math.floor(index / NODES_PER_ROW);
            const col = index % NODES_PER_ROW;
            let x = col * GRID_SIZE;
            let y = row * GRID_SIZE;
            if (isNaN(x) || isNaN(y)) {
                console.warn('[NodeTransformer] Node position is NaN, setting to 0:', { node, x, y });
                x = 0;
                y = 0;
            }
            node.position = { x, y };
        });

        console.log('[NodeTransformer] Positioned nodes in grid layout');

        const result = {
            nodes,
            edges,
            globalWarnings
        };

        console.log('[NodeTransformer] Transformation complete:', 
            'nodes:', result.nodes.length,
            'edges:', result.edges.length,
            'warnings:', result.globalWarnings.length
        );

        return result;
    } catch (error) {
        console.error('[NodeTransformer] Error during transformation:', error);
        return null;
    }
};