import React, { useState } from 'react';
import { Card, CardContent, Typography, Grid, Button, Dialog, DialogTitle, DialogContent, IconButton, Stack } from '@mui/material';
import { useThemeContext } from '../../context/ThemeContext';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';

function summarizeStatement(statement) {
  if (!statement) return '-';
  if (typeof statement !== 'object') return String(statement);
  if (statement.LabelMatchStatement) {
    return `LabelMatch: ${statement.LabelMatchStatement.Key}`;
  }
  if (statement.AndStatement) {
    return `AND (${statement.AndStatement.Statements.length} conditions)`;
  }
  if (statement.OrStatement) {
    return `OR (${statement.OrStatement.Statements.length} conditions)`;
  }
  if (statement.NotStatement) {
    return `NOT (${summarizeStatement(statement.NotStatement.Statement)})`;
  }
  if (statement.ByteMatchStatement) {
    return `ByteMatch: ${statement.ByteMatchStatement.SearchString}`;
  }
  if (statement.IPSetReferenceStatement) {
    return `IPSetReference: ${statement.IPSetReferenceStatement.ARN}`;
  }
  if (statement.RegexPatternSetReferenceStatement) {
    return `RegexPatternSetReference: ${statement.RegexPatternSetReferenceStatement.ARN}`;
  }
  if (statement.SqliMatchStatement) {
    return 'SQLiMatch';
  }
  if (statement.XssMatchStatement) {
    return 'XSSMatch';
  }
  if (statement.RateBasedStatement) {
    return `RateBased: ${statement.RateBasedStatement.Limit}`;
  }
  // Fallback: show keys
  return Object.keys(statement).join(', ');
}

const getSortedRules = (rules, orderBy, orderDirection = 'asc') => {
  if (!Array.isArray(rules)) return [];
  return [...rules].sort((a, b) => {
    if (!orderBy) return 0;
    const aVal = a[orderBy] ?? '';
    const bVal = b[orderBy] ?? '';
    const aNum = parseFloat(aVal);
    const bNum = parseFloat(bVal);
    const isNumeric = !isNaN(aNum) && !isNaN(bNum);
    let cmp = 0;
    if (orderBy.toLowerCase().includes('date')) {
      cmp = new Date(aVal || 0) - new Date(bVal || 0);
    } else if (isNumeric) {
      cmp = aNum - bNum;
    } else {
      cmp = String(aVal).localeCompare(String(bVal), undefined, { numeric: true });
    }
    return orderDirection === 'asc' ? cmp : -cmp;
  });
};

const CardView = ({ rules = [], orderBy = '', orderDirection = 'asc', onRuleClick, onSortChange }) => {
  const [openJson, setOpenJson] = useState(null); // rule index or null
  const { darkTheme } = useThemeContext();
  if (!rules.length) return <div>No rules to display.</div>;
  const sortedRules = getSortedRules(rules, orderBy, orderDirection);
  return (
    <div style={{ maxHeight: 500, overflow: 'auto', background: 'transparent' }}>
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1, ml: 2 }}>
        <Typography variant="subtitle2">Order:</Typography>
        <IconButton size="small" onClick={() => onSortChange && onSortChange(orderBy, orderDirection === 'asc' ? 'desc' : 'asc')}>
          {orderDirection === 'asc' ? <ArrowUpwardIcon /> : <ArrowDownwardIcon />}
        </IconButton>
        <Typography variant="caption">({orderDirection === 'asc' ? 'Ascending' : 'Descending'})</Typography>
      </Stack>
      <Grid container spacing={2} sx={{ mt: 2 }}>
        {sortedRules.map((rule, idx) => (
          <Grid item xs={12} sm={6} md={4} lg={3} key={idx}>
            <Card
              variant="outlined"
              onClick={() => onRuleClick && onRuleClick(rule)}
              style={{ cursor: 'pointer', background: darkTheme ? '#23272b' : '#fff', color: darkTheme ? '#fff' : '#333', borderColor: darkTheme ? '#444' : '#ccc', boxShadow: darkTheme ? '0 2px 8px #111' : '0 2px 8px #ccc' }}
            >
              <CardContent sx={{ background: darkTheme ? '#23272b' : '#fff', color: darkTheme ? '#fff' : '#333' }}>
                {Object.entries(rule).map(([key, value]) => (
                  key === 'Statement' && value ? (
                    <div key={key}>
                      <Typography variant="body2" color="text.secondary" sx={{ color: darkTheme ? '#fff' : '#333' }}>
                        <strong>{key}:</strong> {summarizeStatement(value)}{' '}
                        <Button size="small" onClick={e => { e.stopPropagation(); setOpenJson(idx); }}>Show Full</Button>
                      </Typography>
                      <Dialog open={openJson === idx} onClose={() => setOpenJson(null)} maxWidth="md" fullWidth>
                        <DialogTitle>Full Statement JSON</DialogTitle>
                        <DialogContent>
                          <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all', maxHeight: 400, overflow: 'auto' }}>
                            {JSON.stringify(value, null, 2)}
                          </pre>
                        </DialogContent>
                      </Dialog>
                    </div>
                  ) : (
                    <Typography key={key} variant="body2" color="text.secondary" sx={{ color: darkTheme ? '#fff' : '#333' }}>
                      <strong>{key}:</strong> {typeof value === 'object' ? JSON.stringify(value) : String(value ?? '-')}
                    </Typography>
                  )
                ))}
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </div>
  );
};

export default CardView; 