/* RuleTransformer: encapsulates rule transformation logic */
export default class RuleTransformer {
  constructor(rulesArray) {
    this.level = 0;
    this.warnings = [];
    this.links = [];
    this.rulesArray = rulesArray;
  }

  transformRules() {
    console.log('[RuleTransformer] Starting rule transformation');

    if (!this.rulesArray || !this.rulesArray.length || !Array.isArray(this.rulesArray)) {
      console.error('[RuleTransformer] Invalid input data');
      return null;
    }

    try {
      const sortedRules = [...this.rulesArray].sort((a, b) => a.Priority - b.Priority);
      const newRules = [];

      sortedRules.forEach((rule, index) => {
        this.warnings = [];
        this.validateRule(rule);
        const labelState = this.labelStatement(rule.Statement, newRules, index);
        const labelScopeDown = rule.Statement?.RateBasedStatement?.ScopeDownStatement ?
          this.labelStatement(rule.Statement.RateBasedStatement.ScopeDownStatement, newRules, index) : [];

        const transformedRule = {
          json: JSON.stringify(rule, null, 2),
          id: index,
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

      console.log('[RuleTransformer] Transformation complete:', newRules.length, 'nodes processed');
      return {
        nodes: newRules.map((rule, idx) => ({
          id: rule.id.toString(),
          type: 'custom-node',
          data: rule,
          // position will be assigned later if missing
        })),
        edges: this.links,
        globalWarnings: this.collectWarnings(newRules)
      };
    } catch (error) {
      console.error('[RuleTransformer] Error during transformation:', error);
      return null;
    }
  }

  validateRule(rule) {
    ['Name', 'Priority', 'Statement', 'Action'].forEach(key => {
      if (rule[key] === undefined) {
        this.warnings.push(`Missing required field: ${key}`);
      }
    });

    if (rule.Name !== rule.VisibilityConfig.MetricName) {
      this.warnings.push(`Name and MetricName do not match`);
    }
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

    if (matchingRules.length === 0) {
      if ([...this.rulesArray][currentIndex].RuleLabels?.some(l => l.Name === name)) {
        this.warnings.push(`Label '${name}' is self-referential - rule depends on a label it generates`);
      } else if (![...this.rulesArray].some(r => r.RuleLabels?.some(l => l.Name === name))) {
        this.warnings.push(`Label '${name}' is not defined in any rule`);
      } else {
        this.warnings.push(`Label '${name}' is not defined in any rule with lower priority`);
      }
      return [];
    }

    return matchingRules.map(rule => {
      if (rule.level === this.level) this.level++;
      if (['ALLOW', 'BLOCK'].includes(rule.action)) {
        this.warnings.push(`Label '${name}' is created in a terminal rule (${rule.action}) - this may affect rule evaluation`);
      }
      this.links.push({
        id: `edge-${rule.id}-${currentIndex}-${Date.now()}`,
        source: `${rule.id}`,
        target: `${currentIndex}`
      });
      return { name: rule.name, id: rule.id };
    });
  }

  collectWarnings(rules) {
    return rules
      .filter(rule => rule.warnings.length > 0)
      .map(rule => ({ id: rule.id, rule: rule.name, warnings: rule.warnings }));
  }
}

export const transformRules = (data) => {
    console.log('[RuleTransformer] Starting rule transformation');

    if (!data || !data.nodes || !Array.isArray(data.nodes)) {
        console.error('[RuleTransformer] Invalid input data');
        return null;
    }

    try {
        const transformedNodes = data.nodes.map((node) => {
            if (!node || !node.data) {
                console.warn('[RuleTransformer] Invalid node:', node);
                return null;
            }

            const { id, position, data } = node;
            const transformedNode = {
                id,
                position,
                type: 'custom-node',
                data: {
                    ...data,
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

        console.log('[RuleTransformer] Transformation complete:', transformedNodes.length, 'nodes processed');
        return transformedNodes;
    } catch (error) {
        console.error('[RuleTransformer] Error during transformation:', error);
        return null;
    }
};