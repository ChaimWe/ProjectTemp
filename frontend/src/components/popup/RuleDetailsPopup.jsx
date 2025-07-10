import React, { useState } from 'react';
import './style/RuleDetailsPopup.css';
import { useThemeContext } from '../../context/ThemeContext';
import { Box, Tabs, Tab, Paper, Typography, Alert } from '@mui/material';

const RuleDetailsPopup = ({ rule, dataArray, centerNode, aiSummary, responseStyle }) => {
  const { getColor } = useThemeContext();
  const [tab, setTab] = useState(0);
  if (!rule) {
    return <Alert severity="error" sx={{ p: 2, m: 2 }}>Error: Rule not found. Please try selecting a different rule.</Alert>;
  }
  const ruleIndex = parseInt(rule.id, 10);
  const aiRuleData = aiSummary && aiSummary[ruleIndex];

  // Tab content
  const detailsTab = (
    <Box sx={{ p: 2 }}>
      <Typography variant="h6" sx={{ color: getColor('barText'), mb: 2 }}>
        Rule #{parseInt(rule.id, 10) + 1}: {rule.name}
      </Typography>
      <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mb: 2 }}>
        <Typography variant="body2" sx={{ fontWeight: 600, color: getColor('barText') }}>
          Action:
        </Typography>
        <span className={`action-badge ${rule.action ? rule.action.toLowerCase() : ''}`}>{rule.action || 'No Action'}</span>
        <span className="priority-badge priority-red">Priority: {rule.priority}</span>
      </Box>
      {aiRuleData && (
        <Paper elevation={1} sx={{ background: getColor('barBackground'), p: 2, mb: 2 }}>
          <Typography variant="subtitle1" sx={{ color: getColor('barText'), mb: 1 }}>📝 AI Analysis</Typography>
          <Typography variant="body2"><strong>Type:</strong> {aiRuleData.Type || 'N/A'}</Typography>
          <Typography variant="body2"><strong>Condition:</strong> {aiRuleData.Condition || 'N/A'}</Typography>
          {aiRuleData.Dependencies && aiRuleData.Dependencies.length > 0 && (
            <Typography variant="body2"><strong>Dependencies:</strong> {aiRuleData.Dependencies.join(', ')}</Typography>
          )}
        </Paper>
      )}
    </Box>
  );

  const jsonTab = (
    <Box sx={{ p: 2 }}>
      <Typography variant="subtitle1" sx={{ mb: 1, color: getColor('barText') }}>Rule JSON</Typography>
      <Paper sx={{ background: getColor('background'), p: 2, fontSize: 13, overflow: 'auto', maxHeight: 300 }}>
        <pre style={{ margin: 0 }}>{JSON.stringify(rule, null, 2)}</pre>
      </Paper>
    </Box>
  );

  const dependenciesTab = (
    <Box sx={{ p: 2 }}>
      <Typography variant="subtitle1" sx={{ mb: 1, color: getColor('barText') }}>Dependencies</Typography>
      <div className="labels-container">
        {(rule.labelState || []).length > 0 ? (
          (rule.labelState || []).map(([logic, label, rules], i) => (
            <div key={i} className="logic-container" style={{ color: getColor('barText'), marginBottom: '5px' }}>
              {logic && <span style={{ color: '#ff9800' }}>{logic} </span>}
              <span>{label}</span> <br />
              <small key={i} className="rule-reference">
                {(rules || []).length > 0 ?
                  (rules || []).map((rule, i) => (
                    <React.Fragment key={`${rule.id || ''}-${rule.name || ''}-${i}`}>
                      <span onClick={() => centerNode(String(i))}> → Rule #{i+1}: {rule.name}</span>
                      <br />
                    </React.Fragment>
                  )) :
                  <span>—</span>}
              </small>
              <br />
            </div>
          ))
        ) : (
          <Typography variant="body2" className="no-data">No label dependencies</Typography>
        )}
      </div>
    </Box>
  );

  const warningsTab = (
    <Box sx={{ p: 2 }}>
      <Typography variant="subtitle1" sx={{ mb: 1, color: getColor('barText') }}>⚠️ Rule Warnings</Typography>
      {(rule.warnings || []).length > 0 ? (
        <ul>
          {(rule.warnings || []).map((issue, idx) => (
            <li key={idx} className="warning-item">
              {issue}
            </li>
          ))}
        </ul>
      ) : (
        <Typography variant="body2" className="no-data">No warnings for this rule</Typography>
      )}
    </Box>
  );

  return (
    <Paper sx={{ width: 480, maxWidth: '95vw', borderRadius: 3, background: getColor('background'), boxShadow: 3 }}>
      <Tabs
        value={tab}
        onChange={(_, v) => setTab(v)}
        variant="fullWidth"
        sx={{ borderBottom: 1, borderColor: getColor('border'), background: getColor('barBackground'), borderRadius: 3 }}
      >
        <Tab label="Details" />
        <Tab label="JSON" />
        <Tab label="Dependencies" />
        <Tab label="Warnings" />
      </Tabs>
      {tab === 0 && detailsTab}
      {tab === 1 && jsonTab}
      {tab === 2 && dependenciesTab}
      {tab === 3 && warningsTab}
    </Paper>
  );
};

export default RuleDetailsPopup;