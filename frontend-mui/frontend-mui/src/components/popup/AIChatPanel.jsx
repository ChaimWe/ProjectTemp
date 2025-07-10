import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Box, TextField, Button, Typography, CircularProgress, Paper, Select, MenuItem, FormControl, InputLabel, Switch, FormControlLabel } from '@mui/material';
import { useThemeContext } from '../../context/ThemeContext';

// Instructions for different AI response styles
const styleInstructions = {
  concise: 'Summarize each rule briefly.',
  detailed: 'Provide a detailed, step-by-step explanation for each rule.',
  table: 'Return your answer as a markdown table, no extra text.',
  bullet: 'Return your answer as a list of bullet points, one per line, no extra text.',
  human: 'Explain the rules in simple, non-technical language.',
  json: 'Return only a JSON object as specified.'
};

function parseMarkdownTable(md) {
  const lines = md.trim().split(/\r?\n/).filter(line => line.trim().startsWith('|'));
  if (lines.length < 2) return null;
  const header = lines[0].split('|').map(cell => cell.trim()).filter(Boolean);
  const rows = lines.slice(2).map(line => line.split('|').map(cell => cell.trim()).filter(Boolean));
  return { header, rows };
}

function renderMarkdownTable(md) {
  const table = parseMarkdownTable(md);
  if (!table) return <span>{md}</span>;
  return (
    <table style={{ borderCollapse: 'collapse', width: '100%', margin: '8px 0' }}>
      <thead>
        <tr>
          {table.header.map((cell, i) => (
            <th key={i} style={{ border: '1px solid #ccc', padding: 4, background: '#f5f5f5', fontWeight: 'bold' }}>{cell}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {table.rows.map((row, i) => (
          <tr key={i}>
            {row.map((cell, j) => (
              <td key={j} style={{ border: '1px solid #ccc', padding: 4 }}>{cell}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function renderJsonBlock(text) {
  let json = null;
  try {
    const match = text.match(/```json([\s\S]*?)```/i);
    if (match) {
      json = JSON.parse(match[1]);
    } else {
      json = JSON.parse(text.replace(/```json|```/g, ''));
    }
  } catch {
    return <pre style={{ background: '#f5f5f5', padding: 8, borderRadius: 4 }}>{text}</pre>;
  }
  return <pre style={{ background: '#f5f5f5', padding: 8, borderRadius: 4 }}>{JSON.stringify(json, null, 2)}</pre>;
}

export default function AIChatPanel({ rule, allRules, edges = [], isAIPage = false }) {
  const { getColor } = useThemeContext();
  const messagesEndRef = useRef(null);
  const containerRef = useRef(null);

  // Chat state management
  const [messages, setMessages] = useState([
    { sender: 'ai', text: isAIPage
      ? 'Hi! Ask me anything about your WAF rules and I will help you understand, analyze, or improve them.'
      : 'Hi! Ask me anything about this rule and I will help you understand or improve it.' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [responseStyle, setResponseStyle] = useState('concise');
  const [seeAllRules, setSeeAllRules] = useState(true);
  const [scrollSpeed, setScrollSpeed] = useState('normal');
  const [activeTab, setActiveTab] = useState('chat');
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true);

  // Calculate parent and child rules for the current rule
  const ruleId = String(rule?.id || '');
  const parentIds = edges.filter(e => String(e.target) === ruleId).map(e => String(e.source));
  const childIds = edges.filter(e => String(e.source) === ruleId).map(e => String(e.target));
  const parentRules = (allRules || []).filter((r, index) => parentIds.includes(String(index)));
  const childRules = (allRules || []).filter((r, index) => childIds.includes(String(index)));
  const parentNames = parentRules.map(r => r.Name).join(', ') || 'None';
  const childNames = childRules.map(r => r.Name).join(', ') || 'None';

  // Scroll logic
  const isAtBottom = () => {
    const container = containerRef.current;
    if (!container) return false;
    const threshold = 20;
    return container.scrollHeight - container.scrollTop - container.clientHeight <= threshold;
  };

  const handleScroll = useCallback(() => {
    setShouldAutoScroll(isAtBottom());
  }, []);

  const scrollToBottom = useCallback(() => {
    if (!shouldAutoScroll || !containerRef.current) return;
    containerRef.current.scrollTop = containerRef.current.scrollHeight;
  }, [shouldAutoScroll]);

  useEffect(() => {
    scrollToBottom();
  }, [messages.length, scrollToBottom]);

  // Placeholder for AI send logic
  const sendMessage = async () => {
    if (!input.trim()) return;
    const userMsg = { sender: 'user', text: input };
    setMessages(msgs => [...msgs, userMsg]);
    setLoading(true);
    setInput('');
    // TODO: Integrate with OpenAI or backend AI API
    setTimeout(() => {
      setMessages(msgs => [...msgs, { sender: 'ai', text: 'AI response placeholder.' }]);
      setLoading(false);
    }, 1200);
  };

  const handleStyleChange = (e) => {
    setResponseStyle(e.target.value);
    setMessages([
      { sender: 'ai', text: isAIPage
        ? 'Hi! Ask me anything about your WAF rules and I will help you understand, analyze, or improve them.'
        : (rule?.id ? 'Hi! Ask me anything about this rule and I will help you understand or improve it.' : 'Hi! Ask me anything about your WAF rules and I will help you understand, analyze, or improve them.') }
    ]);
    setInput('');
  };

  const renderAiMessage = (msg) => {
    if (msg.sender !== 'ai') return <span>{msg.text}</span>;
    if (responseStyle === 'bullet') {
      const lines = msg.text
        .split(/\n|\r/)
        .map(line => line.trim())
        .filter(line => line && (line.startsWith('-') || line.startsWith('•') || /^[a-zA-Z0-9]/.test(line)));
      return (
        <ul style={{ margin: 0, paddingLeft: 18 }}>
          {lines.map((line, idx) => (
            <li key={idx} style={{ marginBottom: 4 }}>{line.replace(/^[-•]\s*/, '')}</li>
          ))}
        </ul>
      );
    }
    if (responseStyle === 'table' && msg.text.includes('|')) {
      return renderMarkdownTable(msg.text);
    }
    if (responseStyle === 'json') {
      return renderJsonBlock(msg.text);
    }
    if (['detailed', 'human', 'concise'].includes(responseStyle)) {
      const html = msg.text.replace(/^(#+)\s*(.*)$/gm, (m, hashes, title) => `<b>${title.trim()}</b>`)
        .replace(/\*\*(.*?)\*\*/g, '<b>$1</b>')
        .replace(/\n/g, '<br/>');
      return <span dangerouslySetInnerHTML={{ __html: html }} />;
    }
    return <span>{msg.text}</span>;
  };

  return (
    <Paper sx={{ p: 2, mt: 2, background: getColor('background'), color: getColor('barText'), minHeight: 400 }}>
      <Typography variant="h6" sx={{ mb: 1 }}>
        AI Chat
      </Typography>
      <Box ref={containerRef} sx={{ maxHeight: 300, overflowY: 'auto', mb: 2, p: 1, background: getColor('background'), borderRadius: 1, border: `1px solid ${getColor('border')}` }}>
        {messages.map((msg, idx) => (
          <Box key={idx} sx={{ mb: 1, textAlign: msg.sender === 'user' ? 'right' : 'left' }}>
            <Typography variant="body2" sx={{ fontWeight: msg.sender === 'user' ? 'bold' : 'normal', color: msg.sender === 'user' ? 'primary.main' : 'secondary.main' }}>
              {msg.sender === 'user' ? 'You' : 'AI'}:
            </Typography>
            <Box>{renderAiMessage(msg)}</Box>
          </Box>
        ))}
        <div ref={messagesEndRef} />
      </Box>
      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
        <TextField
          fullWidth
          size="small"
          variant="outlined"
          placeholder="Type your question..."
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') sendMessage(); }}
          disabled={loading}
        />
        <Button variant="contained" onClick={sendMessage} disabled={loading || !input.trim()}>
          {loading ? <CircularProgress size={20} /> : 'Send'}
        </Button>
        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel>Style</InputLabel>
          <Select value={responseStyle} label="Style" onChange={handleStyleChange}>
            <MenuItem value="concise">Concise</MenuItem>
            <MenuItem value="detailed">Detailed</MenuItem>
            <MenuItem value="bullet">Bullet</MenuItem>
            <MenuItem value="table">Table</MenuItem>
            <MenuItem value="human">Human</MenuItem>
            <MenuItem value="json">JSON</MenuItem>
          </Select>
        </FormControl>
      </Box>
    </Paper>
  );
} 