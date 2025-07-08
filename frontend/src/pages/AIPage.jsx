import React from 'react';
import { Box, Container, Paper, Typography, Button, Chip, Alert, Grid } from '@mui/material';
import { useThemeContext } from '../context/ThemeContext';
import bgImage from '../assets/pexels-scottwebb-1029624.jpg';
import CustomSnackbar from '../components/popup/CustomSnackbar';
import { useOutletContext } from 'react-router-dom';
import AIChatPanel from '../components/popup/AIChatPanel';
import RuleTransformer from '../components/tree/RuleTransformer';

/**
 * AI Page - Full page with TopBar and Sidebar layout
 * Provides AI chat functionality for WAF rules analysis
 */
const AIPage = () => {
    const [loaderOpen, setLoaderOpen] = React.useState(false);
    const [snackbar, setSnackbar] = React.useState({ open: false, message: '', severity: 'info' });
    const { darkTheme, getColor } = useThemeContext();
    const { data: rules, setData: setRules } = useOutletContext();

    const handleRulesLoaded = (loadedRules) => {
        setRules(loadedRules);
        setLoaderOpen(false);
        setSnackbar({ open: true, message: `Successfully loaded ${loadedRules.length} rules!`, severity: 'success' });
    };

    const handleCloseSnackbar = () => setSnackbar({ ...snackbar, open: false });

    const dependencyEdges = React.useMemo(() => {
        if (!rules || rules.length === 0) return [];
        const ruleTransformer = new RuleTransformer(rules);
        const result = ruleTransformer.transformRules();
        return result?.edges || [];
    }, [rules]);

    return (
        <Box sx={{ width: '100%', height: '100%', position: 'relative' }}>
            {/* Background Image */}
            <Box sx={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundImage: `url(${bgImage})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat',
                zIndex: 0
            }} />

            {/* Dark Overlay for Dark Mode */}
            {darkTheme && (
                <Box sx={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    width: '100vw',
                    height: '100vh',
                    background: 'rgba(0,0,0,0.55)',
                    zIndex: 1,
                    pointerEvents: 'none',
                }} />
            )}

            {/* Content Area */}
            <Box sx={{
                position: 'absolute',
                top: '24px',
                left: '30px',
                right: '20px',
                bottom: '20px',
                overflow: 'auto',
                zIndex: 2
            }}>
                <Container maxWidth="xl" sx={{
                    p: 2,
                    height: '100%',
                    position: 'relative',
                    '& .MuiPaper-root': {
                        background: darkTheme ? 'rgba(40,40,40,0.7)' : 'rgba(255, 255, 255, 0.8)',
                        color: getColor('barText'),
                        backdropFilter: 'blur(8px)',
                        borderRadius: 2,
                        border: `1px solid ${getColor('border')}`,
                        boxShadow: getColor('shadow'),
                        mb: 2,
                        position: 'relative',
                        '&:hover': {
                            background: darkTheme ? 'rgba(50,50,50,0.8)' : 'rgba(255, 255, 255, 0.9)'
                        }
                    }
                }}>
                    {/* Header Section */}
                    <Paper sx={{ p: 3, mb: 3 }}>
                        <Typography variant="h4" sx={{
                            color: getColor('barText'),
                            fontWeight: 'bold',
                            textShadow: darkTheme ? '0 0 10px rgba(0,0,0,0.3)' : undefined
                        }}>
                            AI Assistant
                        </Typography>
                        <Typography variant="body1" sx={{
                            color: getColor('barText'),
                            opacity: 0.8
                        }}>
                            Chat with AI about your WAF rules for insights and recommendations
                        </Typography>
                    </Paper>

                    {/* Rule status and loader */}
                    <Paper sx={{ p: 3, mb: 3 }}>
                        {rules.length === 0 ? (
                            <Box sx={{ textAlign: 'center', py: 4 }}>
                                <Typography variant="body1" sx={{ color: getColor('barText'), mb: 2 }}>
                                    No rules loaded yet
                                </Typography>
                                <Button
                                    variant="contained"
                                    onClick={() => setLoaderOpen(true)}
                                    sx={{
                                        background: 'linear-gradient(45deg, #1976d2, #2e7d32)',
                                        color: '#fff',
                                        '&:hover': {
                                            background: 'linear-gradient(45deg, #1565c0, #1b5e20)',
                                        },
                                    }}
                                >
                                    Load Rules
                                </Button>
                            </Box>
                        ) : (
                            <Box>
                                <Alert severity="success" sx={{ mb: 2 }}>
                                    <Typography variant="body1">
                                        <strong>{rules.length}</strong> rules loaded successfully
                                    </Typography>
                                </Alert>
                                <Typography variant="h6" sx={{ color: getColor('barText'), mb: 2 }}>
                                    Rule Types:
                                </Typography>
                                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
                                    {(() => {
                                        const ruleTypes = {};
                                        rules.forEach(rule => {
                                            const type = rule.Statement?.Type || 'Unknown';
                                            ruleTypes[type] = (ruleTypes[type] || 0) + 1;
                                        });
                                        return Object.entries(ruleTypes).map(([type, count]) => (
                                            <Chip
                                                key={type}
                                                label={`${type}: ${count}`}
                                                color="primary"
                                                variant="outlined"
                                                size="small"
                                            />
                                        ));
                                    })()}
                                </Box>
                            </Box>
                        )}
                    </Paper>

                    {/* AI Chat Panel */}
                    <AIChatPanel
                        rule={rules[0] || {}}
                        allRules={rules}
                        edges={dependencyEdges}
                        isAIPage={true}
                    />
                </Container>
            </Box>

            {/* Snackbar for notifications */}
            <CustomSnackbar
                open={snackbar.open}
                message={snackbar.message}
                severity={snackbar.severity}
                onClose={handleCloseSnackbar}
            />
        </Box>
    );
};

export default AIPage; 