export default class Tree {
    static NODE_WIDTH = 200;
    static NODE_HEIGHT = 160;

    transformNodes(tranformedRulesArray) {
        const nodes = [];
        tranformedRulesArray.forEach((rule, i) => {
            nodes.push({
                id: String(i),
                // Remove position assignment here
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
        // Remove call to calculateNodePositionHierarchical
        // this.calculateNodePositionHierarchical(nodes, []);
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
}

export const transformData = (data) => {
    if (!data || !Array.isArray(data)) {
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
                return;
            }

            // Assign unique grid position
            const GRID_SIZE = 250;
            const NODES_PER_ROW = Math.ceil(Math.sqrt(data.length));
            const row = Math.floor(index / NODES_PER_ROW);
            const col = index % NODES_PER_ROW;
            let x = col * GRID_SIZE;
            let y = row * GRID_SIZE;
            // ... (rest of the original file)
        });
        // ... (rest of the original file)
    } catch (error) {
        return null;
    }
};
// ... (rest of the original file) 