import React, { useState, useEffect } from 'react';
import { Box, TextField, Button, Typography, CircularProgress, Paper, Select, MenuItem, FormControl, InputLabel, Switch, FormControlLabel } from '@mui/material';
import { useThemeContext } from '../../context/ThemeContext';
import OpenAI from 'openai';

const styleInstructions = {
  concise: 'Summarize each rule briefly.',
  detailed: 'Provide a detailed, step-by-step explanation for each rule.',
  table: 'Return your answer as a markdown table, no extra text.',
  bullet: 'Return your answer as a list of bullet points, one per line, no extra text.',
  human: 'Explain the rules in simple, non-technical language.',
  json: 'Return only a JSON object as specified.'
};

function parseMarkdownTable(md) {
  // Extract rows from markdown table
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
    // Try to extract JSON from code block or plain text
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

const RuleChatPopup = ({ rule, allRules, edges = [], onClose }) => {
  const { getColor } = useThemeContext();
  
  const [messages, setMessages] = useState([
    { sender: 'ai', text: 'Hi! Ask me anything about this rule and I will help you understand or improve it.' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [responseStyle, setResponseStyle] = useState('concise');
  const [seeAllRules, setSeeAllRules] = useState(false);

  // Compute parent and child rules for the current rule
  const ruleId = String(rule.id || '');
  const parentIds = edges.filter(e => String(e.target) === ruleId).map(e => String(e.source));
  const childIds = edges.filter(e => String(e.source) === ruleId).map(e => String(e.target));
  
  // Match rules by their position in the array (since edges use array indices as IDs)
  const parentRules = (allRules || []).filter((r, index) => parentIds.includes(String(index)));
  const childRules = (allRules || []).filter((r, index) => childIds.includes(String(index)));
  
  const parentNames = parentRules.map(r => r.Name).join(', ') || 'None';
  const childNames = childRules.map(r => r.Name).join(', ') || 'None';

  const sendMessage = async () => {
    if (!input.trim()) return;
    const userMsg = { sender: 'user', text: input };
    setMessages(msgs => [...msgs, userMsg]);
    setLoading(true);
    setInput('');
    try {
      const openai = new OpenAI({
        apiKey: import.meta.env.VITE_REACT_APP_OPENAI_API_KEY,
        dangerouslyAllowBrowser: true
      });
      const styleInstruction = styleInstructions[responseStyle] || styleInstructions.concise;
      const currentRuleInfo = `The user is currently focused on rule #${parseInt(rule.id, 10) + 1}: ${rule.name}`;
      const dependencyInfo = `Parent rules: ${parentNames}. Child rules: ${childNames}. When asked about dependencies, always use the provided parent and child rule information, not your own analysis.`;
      const relationshipInstruction = `\nIf the user asks about the relationship between the current rule and another rule, check if that rule is listed as a parent or child. If it is a child, say 'rule-X is a child of rule-Y.' If it is a parent, say 'rule-X is a parent of rule-Y.' If it is not in either list, say there is no direct relationship.`;
      const systemPrompt = `You are an expert in AWS WAF rules. The user will ask questions about a specific rule. Always answer clearly and concisely, using the rule JSON provided. If the user asks for improvements, suggest best practices. Style: ${styleInstruction}\n${currentRuleInfo}\n${dependencyInfo}${relationshipInstruction}`;
      const contextRules = seeAllRules && Array.isArray(allRules) ? allRules : [rule];
      const chatHistory = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Rule JSON: ${JSON.stringify(contextRules, null, 2)}` },
      ];
      // Add previous user/ai messages
      messages.filter(m => m.sender !== 'ai' || m.text !== chatHistory[0].content).forEach(m => {
        chatHistory.push({ role: m.sender === 'user' ? 'user' : 'assistant', content: m.text });
      });
      chatHistory.push({ role: 'user', content: input });
      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: chatHistory,
        temperature: 0.3
      });
      const aiText = response.choices[0].message.content;
      setMessages(msgs => [...msgs, { sender: 'ai', text: aiText }]);
    } catch (e) {
      setMessages(msgs => [...msgs, { sender: 'ai', text: 'Sorry, I could not get a response from the AI.' }]);
    }
    setLoading(false);
  };

  const handleStyleChange = (e) => {
    setResponseStyle(e.target.value);
    setMessages([
      { sender: 'ai', text: 'Hi! Ask me anything about this rule and I will help you understand or improve it.' }
    ]);
    setInput('');
  };

  // Helper to render AI response according to style
  const renderAiMessage = (msg) => {
    if (msg.sender !== 'ai') return <span>{msg.text}</span>;
    if (responseStyle === 'bullet') {
      // Split on newlines or dashes
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
    // For detailed, human, concise: add bold headings if present
    if (['detailed', 'human', 'concise'].includes(responseStyle)) {
      // Convert markdown headings to bold
      const html = msg.text.replace(/^(#+)\s*(.*)$/gm, (m, hashes, title) => `<b>${title.trim()}</b>`)
        .replace(/\*\*(.*?)\*\*/g, '<b>$1</b>')
        .replace(/\n/g, '<br/>');
      return <span dangerouslySetInnerHTML={{ __html: html }} />;
    }
    return <span>{msg.text}</span>;
  };

  // Handler for clicking the overlay to close the popup
  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <Box
      sx={{
        position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: 2000,
        background: 'rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center'
      }}
      onClick={handleOverlayClick}
    >
      <Paper sx={{ width: 400, maxWidth: '90vw', maxHeight: '80vh', p: 2, borderRadius: 2, boxShadow: 6, display: 'flex', flexDirection: 'column' }}>
        <Typography variant="h6" sx={{ mb: 1 }}>💬 AI Assistant for this Rule</Typography>
        <FormControl fullWidth sx={{ mb: 2 }}>
          <InputLabel id="ai-style-label">AI Response Style</InputLabel>
          <Select
            labelId="ai-style-label"
            value={responseStyle}
            label="AI Response Style"
            onChange={handleStyleChange}
          >
            <MenuItem value="concise">Concise</MenuItem>
            <MenuItem value="detailed">Detailed</MenuItem>
            <MenuItem value="table">Table</MenuItem>
            <MenuItem value="bullet">Bullet Points</MenuItem>
            <MenuItem value="human">Human-Friendly</MenuItem>
            <MenuItem value="json">JSON Only</MenuItem>
          </Select>
        </FormControl>
        <FormControlLabel
          control={<Switch checked={seeAllRules} onChange={e => setSeeAllRules(e.target.checked)} color="primary" />}
          label="AI sees all rules"
          sx={{ mb: 2 }}
        />
        <Box sx={{ flex: 1, overflowY: 'auto', mb: 2, background: getColor('barBackground'), borderRadius: 1, p: 1, minHeight: 120 }}>
          {messages.map((msg, i) => (
            <Box key={i} sx={{ mb: 1, textAlign: msg.sender === 'user' ? 'right' : 'left' }}>
              <Typography variant="body2" color={msg.sender === 'ai' ? 'primary' : 'textPrimary'}>
                <b>{msg.sender === 'ai' ? 'AI:' : 'You:'}</b> {renderAiMessage(msg)}
              </Typography>
            </Box>
          ))}
          {loading && <CircularProgress size={20} sx={{ display: 'block', mx: 'auto', my: 1 }} />}
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <TextField
            fullWidth
            size="small"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !loading && sendMessage()}
            placeholder="Ask about this rule..."
            disabled={loading}
          />
          <Button onClick={sendMessage} disabled={loading || !input.trim()} variant="contained">Send</Button>
        </Box>
        <Button onClick={onClose} sx={{ mt: 1 }} color="secondary">Close</Button>
      </Paper>
    </Box>
  );
};

export default RuleChatPopup; 