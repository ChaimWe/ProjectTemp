import React, { useState } from 'react';
import { Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Button, Dialog, DialogTitle, DialogContent, TableSortLabel } from '@mui/material';
import { useThemeContext } from '../../context/ThemeContext';

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
    // Numeric sort if both values are numbers
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

const TableView = ({ rules = [], orderBy = '', orderDirection = 'asc', onRuleClick, onSortChange }) => {
  const [openJson, setOpenJson] = useState(null); // rule index or null
  const { darkTheme } = useThemeContext();
  if (!rules.length) return <div>No rules to display.</div>;
  const columns = Object.keys(rules[0] || {});
  const sortedRules = getSortedRules(rules, orderBy || columns[0], orderDirection);
  return (
    <>
      <TableContainer component={Paper} sx={{ mt: 2, maxHeight: 500, overflow: 'auto', background: darkTheme ? '#23272b' : '#fff' }}>
        <Table size="small" stickyHeader sx={{ background: darkTheme ? '#23272b' : '#fff', color: darkTheme ? '#fff' : '#333' }}>
          <TableHead>
            <TableRow sx={{ background: darkTheme ? '#181a1b' : '#f5f5f5' }}>
              {columns.map(col => (
                <TableCell key={col} sx={{ background: darkTheme ? '#181a1b' : '#f5f5f5', color: darkTheme ? '#fff' : '#333', borderColor: darkTheme ? '#444' : '#ccc' }}>
                  <TableSortLabel
                    active={orderBy === col}
                    direction={orderBy === col ? orderDirection : 'asc'}
                    onClick={() => onSortChange && onSortChange(col, orderBy === col && orderDirection === 'asc' ? 'desc' : 'asc')}
                    sx={{ color: darkTheme ? '#fff' : '#333', '& .MuiSvgIcon-root': { color: darkTheme ? '#fff' : '#333' } }}
                  >
                    {col}
                  </TableSortLabel>
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {sortedRules.map((rule, idx) => (
              <TableRow
                key={idx}
                hover
                onClick={() => onRuleClick && onRuleClick(rule)}
                style={{ cursor: 'pointer' }}
                sx={{ background: darkTheme ? '#23272b' : '#fff', color: darkTheme ? '#fff' : '#333', '&:hover': { background: darkTheme ? '#2c3136' : '#f0f0f0' } }}
              >
                {columns.map(col => (
                  <TableCell key={col} sx={{ color: darkTheme ? '#fff' : '#333', borderColor: darkTheme ? '#444' : '#ccc' }}>
                    {col === 'Statement' && rule.Statement ? (
                      <>
                        {summarizeStatement(rule.Statement)}{' '}
                        <Button size="small" onClick={e => { e.stopPropagation(); setOpenJson(idx); }}>Show Full</Button>
                        <Dialog open={openJson === idx} onClose={() => setOpenJson(null)} maxWidth="md" fullWidth>
                          <DialogTitle>Full Statement JSON</DialogTitle>
                          <DialogContent>
                            <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all', maxHeight: 400, overflow: 'auto' }}>
                              {JSON.stringify(rule.Statement, null, 2)}
                            </pre>
                          </DialogContent>
                        </Dialog>
                      </>
                    ) : (typeof rule[col] === 'object' ? JSON.stringify(rule[col]) : String(rule[col] ?? '-'))}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </>
  );
};

export default TableView; 