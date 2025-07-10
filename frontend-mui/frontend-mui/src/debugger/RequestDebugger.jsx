import React, { useState, useMemo } from 'react';
import {
    Box,
    Button,
    Container,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    TextField,
    Typography,
    Stack,
    Divider,
    Paper,
    Switch,
    IconButton,
    FormControlLabel,
    Alert,
    Chip
} from '@mui/material';
import SecurityIcon from '@mui/icons-material/Security';
import BugReportIcon from '@mui/icons-material/BugReport';
import { useDataSource } from '../context/DataSourceContext';

// Minimal, modernized RequestDebugger for both WAF (ACL) and ALB rules
const RequestDebugger = () => {
    const { aclData, albData } = useDataSource();
    const [mode, setMode] = useState('both'); // 'waf', 'alb', 'both'
    const [request, setRequest] = useState({
        method: 'GET',
        path: '/',
        queryParams: '',
        headers: [{ name: 'User-Agent', value: 'Mozilla/5.0' }],
        body: ''
    });
    const [results, setResults] = useState(null);
    const [stepMode, setStepMode] = useState(false);
    const [currentRuleIndex, setCurrentRuleIndex] = useState(0);

    // Show which files are loaded
    const aclLoaded = !!aclData;
    const albLoaded = !!albData;

    // Detect WAF vs ALB
    const wafRules = useMemo(() => aclData?.Rules?.filter(r => r.Statement || r.Action) || [], [aclData]);
    const albRules = useMemo(() => albData?.Rules?.filter(r => r.Conditions || r.Actions) || [], [albData]);

    // Combine rules for evaluation
    const combinedRules = useMemo(() => {
        if (mode === 'both') return [...wafRules, ...albRules];
        if (mode === 'waf') return wafRules;
        if (mode === 'alb') return albRules;
        return [];
    }, [mode, wafRules, albRules]);

    // Simulate rule evaluation (stub: replace with real logic as needed)
    const evaluateRules = () => {
        // For demo: just list which rules would match based on path substring
        const matches = combinedRules.filter(rule => {
            if (rule.Statement?.ByteMatchStatement?.SearchString) {
                return request.path.includes(rule.Statement.ByteMatchStatement.SearchString);
            }
            if (rule.Conditions) {
                return rule.Conditions.some(cond =>
                    cond.Values?.some(val => request.path.includes(val))
                );
            }
            return false;
        });
        setResults(matches);
    };

    return (
        <Container maxWidth="md" sx={{ py: 4 }}>
            <Paper sx={{ p: 3, mb: 3 }}>
                <Stack direction="row" spacing={2} alignItems="center" mb={2}>
                    <BugReportIcon color="primary" />
                    <Typography variant="h5">Request Debugger</Typography>
                    <FormControl size="small">
                        <InputLabel>Mode</InputLabel>
                        <Select value={mode} label="Mode" onChange={e => setMode(e.target.value)}>
                            <MenuItem value="waf" disabled={!aclLoaded}>WAF/ACL</MenuItem>
                            <MenuItem value="alb" disabled={!albLoaded}>ALB</MenuItem>
                            <MenuItem value="both" disabled={!(aclLoaded && albLoaded)}>Both</MenuItem>
                        </Select>
                    </FormControl>
                    <Typography variant="caption" sx={{ ml: 2 }}>
                        {aclLoaded ? 'ACL loaded' : 'No ACL'} | {albLoaded ? 'ALB loaded' : 'No ALB'}
                    </Typography>
                </Stack>
                <Divider sx={{ mb: 2 }} />
                <Stack spacing={2}>
                    <TextField
                        label="Path"
                        value={request.path}
                        onChange={e => setRequest(r => ({ ...r, path: e.target.value }))}
                        fullWidth
                    />
                    <TextField
                        label="Query Params"
                        value={request.queryParams}
                        onChange={e => setRequest(r => ({ ...r, queryParams: e.target.value }))}
                        fullWidth
                    />
                    <TextField
                        label="Headers (JSON)"
                        value={JSON.stringify(request.headers)}
                        onChange={e => {
                            try {
                                setRequest(r => ({ ...r, headers: JSON.parse(e.target.value) }));
                            } catch {}
                        }}
                        fullWidth
                    />
                    <TextField
                        label="Body"
                        value={request.body}
                        onChange={e => setRequest(r => ({ ...r, body: e.target.value }))}
                        fullWidth
                        multiline
                        minRows={2}
                    />
                    <Stack direction="row" spacing={2}>
                        <Button variant="contained" onClick={evaluateRules} disabled={combinedRules.length === 0}>Test Request</Button>
                        <FormControlLabel
                            control={<Switch checked={stepMode} onChange={e => setStepMode(e.target.checked)} />}
                            label="Step-by-step"
                        />
                    </Stack>
                </Stack>
            </Paper>
            {results && (
                <Paper sx={{ p: 3 }}>
                    <Typography variant="h6" mb={2}>Matched Rules</Typography>
                    {results.length === 0 ? (
                        <Alert severity="info">No rules matched this request.</Alert>
                    ) : (
                        <Stack spacing={1}>
                            {results.map((rule, idx) => (
                                <Chip key={idx} label={rule.Name || rule.name || rule.id} color="primary" />
                            ))}
                        </Stack>
                    )}
                </Paper>
            )}
        </Container>
    );
};

export default RequestDebugger; 