import React, { useState } from 'react';
import { Box, TextField, Button, Typography, CircularProgress, Paper } from '@mui/material';
import { useThemeContext } from '../../context/ThemeContext';
import OpenAI from 'openai';

const RuleChatPopup = ({ rule, onClose }) => {
  const { getColor } = useThemeContext();
  const [messages, setMessages] = useState([
    { sender: 'ai', text: 'Hi! Ask me anything about this rule and I will help you understand or improve it.' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

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
      const systemPrompt = `You are an expert in AWS WAF rules. The user will ask questions about a specific rule. Always answer clearly and concisely, using the rule JSON provided. If the user asks for improvements, suggest best practices.`;
      const chatHistory = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Rule JSON: ${JSON.stringify(rule, null, 2)}` },
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

  return (
    <Box sx={{
      position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: 2000,
      background: 'rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center'
    }}>
      <Paper sx={{ width: 400, maxWidth: '90vw', maxHeight: '80vh', p: 2, borderRadius: 2, boxShadow: 6, display: 'flex', flexDirection: 'column' }}>
        <Typography variant="h6" sx={{ mb: 1 }}>💬 AI Assistant for this Rule</Typography>
        <Box sx={{ flex: 1, overflowY: 'auto', mb: 2, background: getColor('barBackground'), borderRadius: 1, p: 1, minHeight: 120 }}>
          {messages.map((msg, i) => (
            <Box key={i} sx={{ mb: 1, textAlign: msg.sender === 'user' ? 'right' : 'left' }}>
              <Typography variant="body2" color={msg.sender === 'ai' ? 'primary' : 'textPrimary'}>
                <b>{msg.sender === 'ai' ? 'AI:' : 'You:'}</b> {msg.text}
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