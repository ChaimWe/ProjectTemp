import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Typography, Button, Paper, useTheme, List, ListItem, ListItemIcon, ListItemText } from '@mui/material';
import logo from '../assets/1002079229-removebg-preview.png';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

export default function AboutPage() {
  const navigate = useNavigate();
  const theme = useTheme();

  const features = [
    'Interactive Visualization: Dynamic graph-based interface showing relationships between WAF rules',
    'Dependency Analysis: Easily identify rule dependencies and potential conflicts',
    'Optimization Insights: Get recommendations for improving your WAF configuration',
    'Real-time Updates: See changes and updates to your WAF rules in real-time',
  ];

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: theme.palette.background.default,
        fontFamily: 'Poppins, sans-serif',
        pt: 8,
        px: 2,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
      }}
    >
      <Box sx={{ mt: 4, mb: 2, textAlign: 'center' }}>
        <img src={logo} alt="AppsFlyer Logo" style={{ height: 90, marginBottom: 16 }} />
        <Typography variant="h3" sx={{ fontWeight: 700, mb: 2, color: theme.palette.primary.main }}>
          About AWS WAF Visualization Tool
        </Typography>
      </Box>
      <Box sx={{ maxWidth: 800, width: '100%' }}>
        <Paper elevation={3} sx={{ p: { xs: 2, sm: 4 }, borderRadius: 4, mb: 4 }}>
          <Typography variant="h5" sx={{ fontWeight: 600, mb: 2 }}>
            Purpose
          </Typography>
          <Typography variant="body1" sx={{ mb: 2 }}>
            Our AWS WAF Visualization Tool is designed to simplify the complex task of managing AWS Web Application Firewall (WAF) rules. By providing intuitive visual representations of rule relationships and dependencies, we help security teams better understand and optimize their WAF configurations.
          </Typography>
        </Paper>
        <Paper elevation={3} sx={{ p: { xs: 2, sm: 4 }, borderRadius: 4, mb: 4 }}>
          <Typography variant="h5" sx={{ fontWeight: 600, mb: 2 }}>
            Key Features
          </Typography>
          <List>
            {features.map((feature, idx) => (
              <ListItem key={idx} sx={{ pl: 0 }}>
                <ListItemIcon sx={{ minWidth: 32 }}>
                  <CheckCircleIcon color="success" />
                </ListItemIcon>
                <ListItemText primary={feature} />
              </ListItem>
            ))}
          </List>
        </Paper>
        <Paper elevation={3} sx={{ p: { xs: 2, sm: 4 }, borderRadius: 4, mb: 4 }}>
          <Typography variant="h5" sx={{ fontWeight: 600, mb: 2 }}>
            How It Works
          </Typography>
          <Typography variant="body1">
            The tool connects to your AWS WAF configuration and creates an interactive visual representation of your rules and their relationships. You can explore dependencies, analyze rule patterns, and identify potential optimizations through our intuitive interface.
          </Typography>
        </Paper>
        <Box sx={{ textAlign: 'center', mt: 4 }}>
          <Button
            variant="contained"
            size="large"
            onClick={() => navigate('/explorer')}
            sx={{ fontWeight: 600, px: 4, py: 1.5, borderRadius: 3 }}
          >
            Start Visualizing
          </Button>
        </Box>
      </Box>
    </Box>
  );
} 