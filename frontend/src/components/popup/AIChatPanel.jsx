import React, { useState, useEffect, useRef } from 'react';
import { Box, TextField, Button, Typography, CircularProgress, Paper, Select, MenuItem, FormControl, InputLabel, Switch, FormControlLabel } from '@mui/material';
import { useThemeContext } from '../../context/ThemeContext';
import OpenAI from 'openai';

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

  // Chat state management
  const [messages, setMessages] = useState([
    { sender: 'ai', text: isAIPage
      ? 'Hi! Ask me anything about your WAF rules and I will help you understand, analyze, or improve them.'
      : 'Hi! Ask me anything about this rule and I will help you understand or improve it.' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [responseStyle, setResponseStyle] = useState('concise');
  const [seeAllRules, setSeeAllRules] = useState(false);
  const [scrollSpeed, setScrollSpeed] = useState('normal');
  const [activeTab, setActiveTab] = useState('chat');
  const [userScrolledUp, setUserScrolledUp] = useState(false);
  const [lastScrollTop, setLastScrollTop] = useState(0);

  // Calculate parent and child rules for the current rule
  const ruleId = String(rule?.id || '');
  const parentIds = edges.filter(e => String(e.target) === ruleId).map(e => String(e.source));
  const childIds = edges.filter(e => String(e.source) === ruleId).map(e => String(e.target));
  const parentRules = (allRules || []).filter((r, index) => parentIds.includes(String(index)));
  const childRules = (allRules || []).filter((r, index) => childIds.includes(String(index)));
  const parentNames = parentRules.map(r => r.Name).join(', ') || 'None';
  const childNames = childRules.map(r => r.Name).join(', ') || 'None';

  // Scroll logic
  const scrollToBottom = () => {
    if (scrollSpeed !== 'none' && messagesEndRef.current) {
      const container = messagesEndRef.current.parentElement;
      const lastMessage = messages[messages.length - 1];
      const responseLength = lastMessage?.text?.length || 0;
      const baseDurationPerChar = {
        slow: 24.0,
        normal: 12.0,
        fast: 8.0,
        instant: 0
      }[scrollSpeed] || 12.0;
      const scrollDuration = scrollSpeed === 'instant' ? 0 : Math.max(8000, responseLength * baseDurationPerChar);

      if (scrollDuration === 0) {
        messagesEndRef.current.scrollIntoView({ behavior: 'auto' });
        setUserScrolledUp(false);
      } else {
        const startTime = performance.now();
        const startScrollTop = container.scrollTop;
        const targetScrollTop = container.scrollHeight - container.clientHeight;
        const distance = targetScrollTop - startScrollTop;
        const animateScroll = (currentTime) => {
          const elapsed = currentTime - startTime;
          const progress = Math.min(elapsed / scrollDuration, 1);
          const easeOutQuart = 1 - Math.pow(1 - progress, 4);
          if (!userScrolledUp) {
            const expectedScrollTop = startScrollTop + (distance * easeOutQuart);
            container.scrollTop = expectedScrollTop;
          }
          if (progress < 1 && !userScrolledUp) {
            requestAnimationFrame(animateScroll);
          }
        };
        requestAnimationFrame(animateScroll);
      }
    }
  };

  const handleScroll = (e) => {
    const container = e.target;
    const currentScrollTop = container.scrollTop;
    const maxScrollTop = container.scrollHeight - container.clientHeight;
    if (currentScrollTop < lastScrollTop && currentScrollTop < maxScrollTop - 100) {
      setUserScrolledUp(true);
    }
    if (currentScrollTop >= maxScrollTop - 50) {
      setUserScrolledUp(false);
    }
    setLastScrollTop(currentScrollTop);
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollSpeed]);

  // AI send logic
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
      const currentRuleInfo = rule?.id
        ? `The user is currently focused on rule #${parseInt(rule.id, 10) + 1}: ${rule.name || rule.Name || 'Unknown Rule'}`
        : 'The user is asking about their WAF rules in general.';
      const dependencyInfo = `Parent rules: ${parentNames}. Child rules: ${childNames}. When asked about dependencies, always use the provided parent and child rule information, not your own analysis.`;
      const relationshipInstruction = `\nIf the user asks about the relationship between the current rule and another rule, check if that rule is listed as a parent or child. If it is a child, say 'rule-X is a child of rule-Y.' If it is a parent, say 'rule-X is a parent of rule-Y.' If it is not in either list, say there is no direct relationship.`;
      const systemPrompt = `You are an expert in AWS WAF rules. The user will ask questions about their WAF rules. Always answer clearly and concisely, using the rule JSON provided. If the user asks for improvements, suggest best practices. Style: ${styleInstruction}\n${currentRuleInfo}\n${dependencyInfo}${relationshipInstruction}`;
      const contextRules = seeAllRules && Array.isArray(allRules) ? allRules : [rule];
      const chatHistory = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Rule JSON: ${JSON.stringify(contextRules, null, 2)}` },
      ];
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
    <Box sx={{
      width: '100%',
      maxWidth: 900,
      margin: '0 auto',
      mt: 4,
      mb: 4,
      p: 2,
      display: 'flex',
      flexDirection: 'column',
      minHeight: '70vh'
    }}>
      <Paper sx={{
        width: '100%',
        p: 3,
        borderRadius: 3,
        boxShadow: `0 8px 32px rgba(25,118,210,0.08)`,
        display: 'flex',
        flexDirection: 'column',
        background: getColor('barBackground'),
        border: `1px solid ${getColor('border')}`,
        position: 'relative',
        minHeight: '60vh'
      }}>
        <Typography
          variant="h6"
          sx={{
            mb: 2,
            background: 'linear-gradient(45deg, rgba(25, 118, 210, 0.7), rgba(46, 125, 50, 0.7))',
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            fontWeight: 'bold',
            textAlign: 'center',
            fontSize: '1.3rem'
          }}
        >
          {isAIPage ? '🤖 AI Assistant for WAF Rules' : '🤖 AI Assistant for this Rule'}
        </Typography>

        {/* Tab Navigation */}
        <Box sx={{ display: 'flex', mb: 2, borderBottom: `1px solid ${getColor('border')}` }}>
          <Button
            onClick={() => setActiveTab('chat')}
            sx={{
              flex: 1,
              background: activeTab === 'chat' ? 'linear-gradient(45deg, rgba(25, 118, 210, 0.3), rgba(46, 125, 50, 0.3))' : 'transparent',
              color: getColor('barText'),
              borderRadius: 0,
              borderBottom: activeTab === 'chat' ? '3px solid rgba(25, 118, 210, 0.6)' : 'none',
              fontWeight: 'bold',
              textTransform: 'none',
              '&:hover': {
                background: activeTab === 'chat' ? 'linear-gradient(45deg, rgba(25, 118, 210, 0.4), rgba(46, 125, 50, 0.4))' : 'rgba(25, 118, 210, 0.05)',
              },
              transition: 'all 0.3s ease',
            }}
          >
            💬 Chat
          </Button>
          <Button
            onClick={() => setActiveTab('settings')}
            sx={{
              flex: 1,
              background: activeTab === 'settings' ? 'linear-gradient(45deg, rgba(25, 118, 210, 0.3), rgba(46, 125, 50, 0.3))' : 'transparent',
              color: getColor('barText'),
              borderRadius: 0,
              borderBottom: activeTab === 'settings' ? '3px solid rgba(25, 118, 210, 0.6)' : 'none',
              fontWeight: 'bold',
              textTransform: 'none',
              '&:hover': {
                background: activeTab === 'settings' ? 'linear-gradient(45deg, rgba(25, 118, 210, 0.4), rgba(46, 125, 50, 0.4))' : 'rgba(25, 118, 210, 0.05)',
              },
              transition: 'all 0.3s ease',
            }}
          >
            ⚙️ Settings
          </Button>
        </Box>

        {/* Chat Tab */}
        {activeTab === 'chat' && (
          <Box sx={{ flex: 1, overflow: 'auto', mb: 2, minHeight: 300, maxHeight: 400 }} onScroll={handleScroll}>
            {messages.map((msg, idx) => (
              <Box
                key={idx}
                sx={{
                  display: 'flex',
                  justifyContent: msg.sender === 'user' ? 'flex-end' : 'flex-start',
                  mb: 1
                }}
              >
                <Box
                  sx={{
                    background: msg.sender === 'user'
                      ? 'linear-gradient(90deg, #1976d2 0%, #2e7d32 100%)'
                      : 'rgba(25, 118, 210, 0.08)',
                    color: msg.sender === 'user' ? '#fff' : getColor('barText'),
                    px: 2,
                    py: 1,
                    borderRadius: 2,
                    maxWidth: '80%',
                    boxShadow: msg.sender === 'user'
                      ? '0 2px 8px rgba(25,118,210,0.12)'
                      : '0 1px 4px rgba(25,118,210,0.04)'
                  }}
                >
                  <b>{msg.sender === 'user' ? 'You' : 'AI'}:</b> {renderAiMessage(msg)}
                </Box>
              </Box>
            ))}
            <div ref={messagesEndRef} />
            {loading && (
              <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
                <CircularProgress size={28} />
              </Box>
            )}
          </Box>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <Box sx={{ mb: 2 }}>
            <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
              <FormControl fullWidth>
                <InputLabel id="ai-style-label" sx={{ color: getColor('barText'), fontWeight: 500 }}>AI Response Style</InputLabel>
                <Select
                  labelId="ai-style-label"
                  value={responseStyle}
                  label="AI Response Style"
                  onChange={handleStyleChange}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 2,
                      backgroundColor: getColor('background'),
                      '&:hover fieldset': {
                        borderColor: 'rgba(25, 118, 210, 0.4)',
                        borderWidth: '2px',
                      },
                      '&.Mui-focused fieldset': {
                        borderColor: 'rgba(46, 125, 50, 0.4)',
                        borderWidth: '2px',
                      },
                      '&:hover': {
                        transform: 'translateY(-2px)',
                        transition: 'all 0.3s ease',
                        boxShadow: '0 4px 12px rgba(25, 118, 210, 0.1)',
                      },
                    },
                    '& .MuiSelect-select': {
                      fontWeight: 500,
                      color: getColor('barText'),
                    }
                  }}
                >
                  <MenuItem value="concise">📝 Concise</MenuItem>
                  <MenuItem value="detailed">🔍 Detailed</MenuItem>
                  <MenuItem value="table">📊 Table</MenuItem>
                  <MenuItem value="bullet">• Bullet Points</MenuItem>
                  <MenuItem value="human">👥 Human-Friendly</MenuItem>
                  <MenuItem value="json">⚙️ JSON Only</MenuItem>
                </Select>
              </FormControl>
              <FormControl fullWidth>
                <InputLabel id="scroll-speed-label" sx={{ color: getColor('barText'), fontWeight: 500 }}>Scroll Speed</InputLabel>
                <Select
                  labelId="scroll-speed-label"
                  value={scrollSpeed}
                  label="Scroll Speed"
                  onChange={e => setScrollSpeed(e.target.value)}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 2,
                      backgroundColor: getColor('background'),
                      '&:hover fieldset': {
                        borderColor: 'rgba(25, 118, 210, 0.4)',
                        borderWidth: '2px',
                      },
                      '&.Mui-focused fieldset': {
                        borderColor: 'rgba(46, 125, 50, 0.4)',
                        borderWidth: '2px',
                      },
                      '&:hover': {
                        transform: 'translateY(-2px)',
                        transition: 'all 0.3s ease',
                        boxShadow: '0 4px 12px rgba(25, 118, 210, 0.1)',
                      },
                    },
                    '& .MuiSelect-select': {
                      fontWeight: 500,
                      color: getColor('barText'),
                    }
                  }}
                >
                  <MenuItem value="slow">🐌 Very Slow (24s/char)</MenuItem>
                  <MenuItem value="normal">⚡ Normal (12s/char)</MenuItem>
                  <MenuItem value="fast">🚀 Fast (8s/char)</MenuItem>
                  <MenuItem value="instant">⚡ Instant</MenuItem>
                  <MenuItem value="none">❌ No Auto-scroll</MenuItem>
                </Select>
              </FormControl>
            </Box>
            <Box sx={{ display: 'flex', gap: 3, alignItems: 'center', justifyContent: 'center' }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={seeAllRules}
                    onChange={e => setSeeAllRules(e.target.checked)}
                    sx={{
                      '& .MuiSwitch-switchBase.Mui-checked': {
                        color: 'rgba(25, 118, 210, 0.7)',
                      }
                    }}
                  />
                }
                label="See All Rules"
              />
            </Box>
          </Box>
        )}

        {/* Input area */}
        {activeTab === 'chat' && (
          <Box sx={{ display: 'flex', alignItems: 'center', mt: 2 }}>
            <TextField
              fullWidth
              variant="outlined"
              placeholder="Type your question..."
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !loading) sendMessage();
              }}
              sx={{
                mr: 2,
                background: getColor('background'),
                borderRadius: 2,
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2,
                }
              }}
              disabled={loading}
            />
            <Button
              variant="contained"
              color="primary"
              onClick={sendMessage}
              disabled={loading || !input.trim()}
              sx={{
                minWidth: 100,
                fontWeight: 600,
                background: 'linear-gradient(45deg, #1976d2, #2e7d32)',
                color: '#fff',
                boxShadow: '0 2px 8px rgba(25,118,210,0.12)',
                '&:hover': {
                  background: 'linear-gradient(45deg, #1565c0, #1b5e20)',
                }
              }}
            >
              {loading ? <CircularProgress size={22} sx={{ color: '#fff' }} /> : 'Send'}
            </Button>
          </Box>
        )}
      </Paper>
    </Box>
  );
}
