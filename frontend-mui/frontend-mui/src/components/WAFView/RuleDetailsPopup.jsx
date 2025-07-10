import React, { useState, useMemo } from 'react';
import {
  Drawer,
  Box,
  Typography,
  Button,
  Chip,
  IconButton,
  Divider,
  Tooltip,
  Stack,
  useTheme,
  Tabs,
  Tab
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import DependencyTreePopup from './DependencyTreePopup';

// Utility: Extract WAF dependency edges from rules
function extractWafEdges(rules) {
  // Map label name to emitting rule name
  const labelToRule = {};
  rules.forEach(rule => {
    (rule.RuleLabels || rule.ruleLabels || []).forEach(label => {
      labelToRule[label.Name || label] = rule.Name || rule.name || rule.id;
    });
  });
  // Find LabelMatchStatement references
  const edges = [];
  rules.forEach(rule => {
    function findLabelMatch(obj) {
      if (!obj || typeof obj !== 'object') return;
      if (obj.LabelMatchStatement && obj.LabelMatchStatement.Key) {
        const label = obj.LabelMatchStatement.Key;
        if (labelToRule[label]) {
          edges.push({ source: labelToRule[label], target: rule.Name || rule.name || rule.id });
        }
      }
      Object.values(obj).forEach(findLabelMatch);
    }
    findLabelMatch(rule.Statement);
  });
  return edges;
}

function getRuleRelationships(rule, allRules) {
  // Find dependencies (rules this rule depends on)
  const dependencies = [];
  // Find dependents (rules that depend on this rule)
  const dependents = [];
  const ruleName = rule.Name || rule.name || rule.id;
  // Find all labels this rule references
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
  // For each referenced label, find the rule that emits it
  referencedLabels.forEach(label => {
    const parent = allRules.find(r => (r.RuleLabels || r.ruleLabels || []).some(l => (l.Name || l) === label));
    if (parent) dependencies.push(parent);
  });
  // Find all rules that reference a label emitted by this rule
  const emittedLabels = (rule.RuleLabels || rule.ruleLabels || []).map(l => l.Name || l);
  allRules.forEach(r => {
    const labels = findLabelMatch(r.Statement);
    if (labels.some(l => emittedLabels.includes(l))) {
      dependents.push(r);
    }
  });
  return { dependencies, dependents };
}

function summarizeRule(rule, relationships) {
  // Basic summary of what the rule does
  let summary = '';
  if (rule.Statement?.ByteMatchStatement) {
    summary += `This rule matches requests where the path contains "${rule.Statement.ByteMatchStatement.SearchString}". `;
  } else if (rule.Conditions) {
    summary += `This ALB rule matches requests with conditions: ` + rule.Conditions.map(c => `${c.Field}=${(c.Values || []).join(',')}`).join('; ') + '. ';
  } else {
    summary += 'This rule matches requests based on its statement logic. ';
  }
  // Add relationships
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

const RuleDetailsPopup = ({ open, onClose, rule, dataArray, centerNode, onOpenChat, aiSummary, responseStyle, allNodes, warnings }) => {
  const theme = useTheme();
  const [tab, setTab] = useState(0);
  // Compute edges for WAF rules
  const edges = useMemo(() => extractWafEdges(dataArray), [dataArray]);
  if (!rule) {
    return null;
  }
  // AI summary logic
  const relationships = useMemo(() => getRuleRelationships(rule, dataArray), [rule, dataArray]);
  const aiSummaryText = useMemo(() => summarizeRule(rule, relationships), [rule, relationships]);
  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{ sx: { width: 500, maxWidth: '100vw', p: 0, boxShadow: 6 } }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 2, borderBottom: `1px solid ${theme.palette.divider}` }}>
        <Typography variant="h6" sx={{ fontWeight: 600 }}>
          Rule #{parseInt(rule.id, 10) + 1}: {rule.name}
        </Typography>
        <IconButton onClick={onClose}><CloseIcon /></IconButton>
      </Box>
      <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="fullWidth" sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tab label="Details" />
        <Tab icon={<AccountTreeIcon />} label="Dependencies" />
        <Tab icon={<WarningAmberIcon color={warnings?.length ? 'warning' : 'disabled'} />} label="Warnings" />
      </Tabs>
      <Box sx={{ p: 3, overflowY: 'auto', height: '100%' }}>
        <TabPanel value={tab} index={0}>
          <Box sx={{ mb: 2, p: 2, bgcolor: theme.palette.action.hover, borderRadius: 2 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 500, mb: 1 }}>🧠 AI Summary</Typography>
            <Typography variant="body2">{aiSummaryText}</Typography>
          </Box>
          <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
            {/* Ask AI button removed, replaced by static summary */}
          </Stack>
          <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
            <Chip label={rule.action || 'No Action'} color="info" variant="outlined" />
            <Chip label={`Priority: ${rule.priority}`} color="error" variant="outlined" />
          </Stack>
          {aiRuleData && (
            <Box sx={{ mb: 2, p: 2, bgcolor: theme.palette.action.hover, borderRadius: 2 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 500, mb: 1 }}>📝 AI Analysis</Typography>
              <Typography variant="body2"><strong>Type:</strong> {aiRuleData.Type || 'N/A'}</Typography>
              <Typography variant="body2"><strong>Condition:</strong> {aiRuleData.Condition || 'N/A'}</Typography>
              {aiRuleData.Dependencies && aiRuleData.Dependencies.length > 0 && (
                <Typography variant="body2"><strong>Dependencies:</strong> {aiRuleData.Dependencies.join(', ')}</Typography>
              )}
            </Box>
          )}
          {(rule.warnings || []).length > 0 && (
            <Box sx={{ mb: 2, p: 2, bgcolor: theme.palette.warning.light, borderRadius: 2 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 500, mb: 1 }}>⚠️ Rule Warnings</Typography>
              <ul style={{ margin: 0, paddingLeft: 18 }}>
                {(rule.warnings || []).map((issue, idx) => (
                  <li key={idx} style={{ color: theme.palette.warning.dark }}>{issue}</li>
                ))}
              </ul>
            </Box>
          )}
          <Divider sx={{ my: 2 }} />
          <Typography variant="subtitle1" sx={{ fontWeight: 500, mb: 1 }}>🔗 Dependant on rules</Typography>
          <Box sx={{ mb: 2 }}>
            {(rule.labelState || []).length > 0 ? (
              (rule.labelState || []).map(([logic, label, rulesArr], i) => (
                <Box key={i} sx={{ mb: 1 }}>
                  {logic && <span style={{ color: theme.palette.warning.main }}>{logic} </span>}
                  <span>{label}</span>
                  <br />
                  <small>
                    {(rulesArr || []).length > 0 ?
                      (rulesArr || []).map((r, j) => (
                        <span key={j} style={{ cursor: 'pointer', color: theme.palette.primary.main }} onClick={() => centerNode(String(j))}>
                          → Rule #{j + 1}: {r.name}
                          <br />
                        </span>
                      )) :
                      <span style={{ color: theme.palette.warning.main }}>→ ⚠️</span>}
                  </small>
                </Box>
              ))
            ) : (
              <Typography variant="body2" color="text.secondary">No label dependencies</Typography>
            )}
          </Box>
          <Divider sx={{ my: 2 }} />
          <Typography variant="subtitle1" sx={{ fontWeight: 500, mb: 1 }}>🏷️ Added Labels</Typography>
          <Box sx={{ mb: 2 }}>
            {(rule.ruleLabels || []).length > 0 ? (
              (rule.ruleLabels || []).map(label => (
                <Chip key={label} label={label} color="success" variant="outlined" sx={{ mr: 1, mb: 1 }} />
              ))
            ) : (
              <Typography variant="body2" color="text.secondary">No labels added by this rule</Typography>
            )}
          </Box>
          <Typography variant="subtitle1" sx={{ fontWeight: 500, mb: 1 }}>📜 Insert Headers</Typography>
          <Box sx={{ mb: 2 }}>
            {(rule.insertHeaders || []).length > 0 ? (
              (rule.insertHeaders || []).map(header => (
                <Chip key={header.name} label={`${header.name}=${header.value}`} color="info" variant="outlined" sx={{ mr: 1, mb: 1 }} />
              ))
            ) : (
              <Typography variant="body2" color="text.secondary">No headers used in this rule</Typography>
            )}
          </Box>
        </TabPanel>
        <TabPanel value={tab} index={1}>
          <Box sx={{ minHeight: 300 }}>
            <DependencyTreePopup
              open={true}
              onClose={() => {}}
              selectedNode={rule}
              allNodes={allNodes || dataArray.map(r => ({ id: r.Name || r.name || r.id, ...r }))}
              allEdges={edges}
            />
          </Box>
        </TabPanel>
        <TabPanel value={tab} index={2}>
          <Box sx={{ minHeight: 200 }}>
            {warnings && warnings.length > 0 ? (
              warnings.map(({ id, rule: ruleName, warnings: warnArr }) => (
                <Box key={id} sx={{ mb: 2, backgroundColor: theme.palette.background.paper, borderRadius: 1, overflow: 'hidden', boxShadow: 1 }}>
                  <Box
                    sx={{
                      p: 1,
                      display: 'flex',
                      alignItems: 'center',
                      color: theme.palette.text.primary,
                      borderBottom: `1px solid ${theme.palette.divider}`,
                    }}
                  >
                    <WarningAmberIcon color="warning" sx={{ mr: 1 }} />
                    <span style={{ fontWeight: 500 }}>{ruleName}</span>
                    <span style={{ marginLeft: '12px', fontSize: '0.9em' }}>{warnArr.length} warning{warnArr.length > 1 ? 's' : ''}</span>
                  </Box>
                  <Box sx={{ p: 1 }}>
                    {warnArr.map((warning, idx) => (
                      <Box key={idx} sx={{ p: 1, color: theme.palette.warning.dark }}>
                        {typeof warning === 'string' ? warning : warning.message}
                      </Box>
                    ))}
                  </Box>
                </Box>
              ))
            ) : (
              <Typography variant="body2" color="text.secondary">No warnings found.</Typography>
            )}
          </Box>
        </TabPanel>
      </Box>
    </Drawer>
  );
};

export default RuleDetailsPopup; 