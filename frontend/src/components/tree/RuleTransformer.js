/* RuleTransformer: encapsulates rule transformation logic */
export default class RuleTransformer {
  constructor(rulesArray) {
    this.level = 0;
    this.warnings = [];
    this.links = [];
    this.rulesArray = rulesArray;
  }

  transformRules() {
    if (!this.rulesArray || !this.rulesArray.length || !Array.isArray(this.rulesArray)) {
      return null;
    }

    try {
      const sortedRules = [...this.rulesArray].sort((a, b) => a.Priority - b.Priority);
      const newRules = [];
      const nodeIds = [];
      sortedRules.forEach((rule, index) => {
        this.warnings = [];
        this.validateRule(rule);
        const labelState = this.labelStatement(rule.Statement, newRules, index);
        const labelScopeDown = rule.Statement?.RateBasedStatement?.ScopeDownStatement ?
          this.labelStatement(rule.Statement.RateBasedStatement.ScopeDownStatement, newRules, index) : [];

        const nodeId = rule.Name;
        nodeIds.push(nodeId);
        const transformedRule = {
          json: JSON.stringify(rule, null, 2),
          id: nodeId,
          name: rule.Name,
          priority: rule.Priority,
          action: rule.Action ? Object.keys(rule.Action)[0] : Object.keys(rule.OverrideAction)[0],
          ruleLabels: rule.RuleLabels?.map(label => label.Name) || [],
          insertHeaders: rule.Action?.Count?.CustomRequestHandling?.InsertHeaders?.map(h => { return { name: h.Name, value: h.Value } }) || [],
          labelState: [...labelState, ...labelScopeDown],
          level: this.level,
          warnings: [...this.warnings]
        };
        newRules.push(transformedRule);
      });
      console.log('[RuleTransformer] Created node ids:', nodeIds);
      return {
        nodes: newRules.map((rule) => ({
          id: rule.id,
          type: 'custom-node',
          data: rule,
        })),
        edges: this.links,
        globalWarnings: this.collectWarnings(newRules)
      };
    } catch (error) {
      return null;
    }
  }

  validateRule(rule) {
    ['Name', 'Priority', 'Statement', 'Action'].forEach(key => {
      if (rule[key] === undefined) {
        this.warnings.push(`Missing required field: ${key}`);
      }
    });

    /*if (rule.Name !== rule.VisibilityConfig.MetricName) {
      this.warnings.push(`Name and MetricName do not match`);
    }*/
  }

  labelStatement(statement, rules, currentIndex) {
    if (!statement) return [];

    if (statement.LabelMatchStatement) {
      return [[
        '',  // אין תנאי לוגי
        statement.LabelMatchStatement.Key,  // שם הלייבל
        this.findParentDependencies(rules, statement.LabelMatchStatement.Key, currentIndex)  // מערך של שמות חוקים
      ]];
    }

    if (statement.NotStatement?.Statement.LabelMatchStatement) {
      return [[
        '!',
        statement.NotStatement.Statement.LabelMatchStatement.Key,
        this.findParentDependencies(rules, statement.NotStatement.Statement.LabelMatchStatement.Key, currentIndex)
      ]];
    }

    const processStatements = (statements, logic) => {
      return statements.flatMap(stmt => {
        const result = this.labelStatement(stmt, rules, currentIndex);
        return result.map(([existingLogic, label, deps]) => [
          existingLogic || logic,
          label,
          deps
        ]);
      });
    };

    if (statement.AndStatement) return processStatements(statement.AndStatement.Statements, '&&');

    if (statement.OrStatement) return processStatements(statement.OrStatement.Statements, '||');

    return [];
  }

  findParentDependencies(rules, name, currentIndex) {
    const matchingRules = rules.filter(r => r.ruleLabels?.includes(name));
    const currentRuleName = [...this.rulesArray][currentIndex].Name;
    return matchingRules.map(rule => {
      if (rule.level === this.level) this.level++;
      if (["ALLOW", "BLOCK"].includes(rule.action)) {
        this.warnings.push(`Label '${name}' is created in a terminal rule (${rule.action}) - this may affect rule evaluation`);
      }
      const sourceId = rule.id;
      const targetId = currentRuleName;
      const edge = {
        id: `edge-${sourceId}-${targetId}-${Date.now()}`,
        source: sourceId,
        target: targetId
      };
      this.links.push(edge);
      console.log('[RuleTransformer] Created edge:', JSON.stringify(edge, null, 2));
      return { name: rule.name, id: sourceId };
    });
  }

  collectWarnings(rules) {
    return rules
      .filter(rule => rule.warnings.length > 0)
      .map((rule, index) => ({ id: String(index), rule: rule.name, warnings: rule.warnings }));
  }
}

export const transformRules = (data) => {
    if (!data || !data.nodes || !Array.isArray(data.nodes)) {
        return null;
    }

    try {
        const transformedNodes = data.nodes.map((node) => {
            if (!node || !node.data) {
                return null;
            }

            const { id, position, data } = node;
            const transformedNode = {
                id,
                position,
                type: 'custom-node',
                data: {
                    ...data,
                    json: data.json, // ensure json is present
                    label: data.name || 'Unnamed Rule',
                    description: data.description || 'No description available',
                    type: data.type || 'Unknown',
                    warnings: Array.isArray(data.warnings) ? data.warnings : [],
                    dependencies: Array.isArray(data.dependencies) ? data.dependencies : [],
                }
            };

            // Ensure all required fields exist
            if (!transformedNode.data.label) transformedNode.data.label = 'Unnamed Rule';
            if (!transformedNode.data.description) transformedNode.data.description = 'No description available';
            if (!transformedNode.data.type) transformedNode.data.type = 'Unknown';
            if (!Array.isArray(transformedNode.data.warnings)) transformedNode.data.warnings = [];
            if (!Array.isArray(transformedNode.data.dependencies)) transformedNode.data.dependencies = [];

            return transformedNode;
        }).filter(Boolean); // Remove any null nodes

        return transformedNodes;
    } catch (error) {
        return null;
    }
};

// Optional utility to print all parent/child relationships for debugging
export function printRuleRelationships(rules, edges) {
  if (!Array.isArray(rules) || !Array.isArray(edges)) {
    return;
  }
  rules.forEach(rule => {
    const ruleId = rule.name || rule.Name;
    const parentIds = edges.filter(e => e.target === ruleId).map(e => e.source);
    const childIds = edges.filter(e => e.source === ruleId).map(e => e.target);
    const parentNames = rules.filter(r => parentIds.includes(r.name || r.Name)).map(r => r.name || r.Name);
    const childNames = rules.filter(r => childIds.includes(r.name || r.Name)).map(r => r.name || r.Name);
  });
}