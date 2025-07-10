import React, { useMemo, useState } from 'react';
import { Box, Typography, Tabs, Tab, Stack, Chip, Divider } from '@mui/material';

function getRuleRelationships(rule, allRules) {
  // Find dependencies (rules this rule depends on)
  const dependencies = [];
  // Find dependents (rules that depend on this rule)
  const ruleName = rule.Name || rule.name || rule.id;
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
  referencedLabels.forEach(label => {
    const parent = allRules.find(r => (r.RuleLabels || r.ruleLabels || []).some(l => (l.Name || l) === label));
    if (parent) dependencies.push(parent);
  });
  const emittedLabels = (rule.RuleLabels || rule.ruleLabels || []).map(l => l.Name || l);
  const dependents = allRules.filter(r => {
    const labels = findLabelMatch(r.Statement);
    return labels.some(l => emittedLabels.includes(l));
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

function getFields(data) {
  const name = data.Name || data.name || '';
  const priority = data.Priority || data.priority || '';
  const action = data.Action ? Object.keys(data.Action)[0] : (data.action || '');
  const type = data.Type || data.type || (data.Statement ? Object.keys(data.Statement)[0] : '');
  const labels = (data.RuleLabels || data.ruleLabels || []).map(l => l.Name || l).filter(Boolean);
  const metric = data.VisibilityConfig?.MetricName || data.metric || '';
  return { name, priority, action, type, labels, metric };
}

function getJson(data) {
  let jsonData = data.Statement || data.json || data;
  if (typeof jsonData === 'string') {
    try {
      jsonData = JSON.parse(jsonData);
    } catch (e) {}
  }
  return JSON.stringify(jsonData, null, 2);
}

const RuleDetailsSidebar = ({ rule, rules }) => {
  const [tab, setTab] = useState(0);
  const relationships = useMemo(() => rule && rules ? getRuleRelationships(rule, rules) : { dependencies: [], dependents: [] }, [rule, rules]);
  const aiSummaryText = useMemo(() => rule ? summarizeRule(rule, relationships) : '', [rule, relationships]);

  if (!rule) {
    return <Typography variant="body1" sx={{ color: '#888', p: 3 }}>Select a rule to see details.</Typography>;
  }

  return (
    <Box sx={{ flex: 1, width: '75%', p: 4, boxSizing: 'border-box', height: '100%', overflowY: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
      <Typography variant="h5" sx={{ mb: 2 }}>
        Rule: {rule.Name || rule.name || rule.id}
      </Typography>
      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
        <Tab label="Details" />
        <Tab label="JSON" />
        <Tab label="Dependencies" />
        <Tab label="Warnings" />
      </Tabs>
      <TabPanel value={tab} index={0}>
        <Box sx={{ mb: 2, p: 2, bgcolor: '#f5f7fa', borderRadius: 2 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 500, mb: 1 }}>🧠 AI Summary</Typography>
          <Typography variant="body2" sx={{ whiteSpace: 'pre-line', wordBreak: 'break-word' }}>{aiSummaryText}</Typography>
        </Box>
        <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
          <Chip label={rule.action || 'No Action'} color="info" variant="outlined" />
          <Chip label={`Priority: ${rule.priority}`} color="error" variant="outlined" />
        </Stack>
        <Divider sx={{ my: 2 }} />
        <Typography variant="subtitle1" sx={{ fontWeight: 500, mb: 1 }}>Fields</Typography>
        <Box sx={{ mb: 2 }}>
          {Object.entries(getFields(rule)).map(([k, v]) => (
            <div key={k}><strong>{k}:</strong> {Array.isArray(v) ? v.join(', ') : v}</div>
          ))}
        </Box>
      </TabPanel>
      <TabPanel value={tab} index={1}>
        <pre style={{ background: '#f5f5f5', padding: 16, borderRadius: 4, fontSize: 14, maxWidth: '100%', overflowX: 'auto' }}>{getJson(rule)}</pre>
      </TabPanel>
      <TabPanel value={tab} index={2}>
        <Typography variant="subtitle1" sx={{ fontWeight: 500, mb: 1 }}>Dependencies</Typography>
        <Box sx={{ mb: 2 }}>
          {relationships.dependencies.length === 0 ? (
            <Typography variant="body2">No dependencies.</Typography>
          ) : (
            relationships.dependencies.map((r, i) => (
              <div key={i}>{r.Name || r.name || r.id}</div>
            ))
          )}
        </Box>
        <Typography variant="subtitle1" sx={{ fontWeight: 500, mb: 1 }}>Dependents</Typography>
        <Box sx={{ mb: 2 }}>
          {relationships.dependents.length === 0 ? (
            <Typography variant="body2">No dependents.</Typography>
          ) : (
            relationships.dependents.map((r, i) => (
              <div key={i}>{r.Name || r.name || r.id}</div>
            ))
          )}
        </Box>
      </TabPanel>
      <TabPanel value={tab} index={3}>
        <Typography variant="subtitle1" sx={{ fontWeight: 500, mb: 1 }}>Warnings</Typography>
        {(rule.warnings || []).length === 0 ? (
          <Typography variant="body2">No warnings.</Typography>
        ) : (
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            {(rule.warnings || []).map((issue, idx) => (
              <li key={idx} style={{ color: '#d32f2f' }}>{issue}</li>
            ))}
          </ul>
        )}
      </TabPanel>
    </Box>
  );
};

export default RuleDetailsSidebar; 