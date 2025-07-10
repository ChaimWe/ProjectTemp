import React, { useState, useEffect } from 'react';
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
    Table,
    TableHead,
    TableBody,
    TableRow,
    TableCell,
    Paper,
    Grid,
    Switch,
    IconButton,
    FormControlLabel,
    Accordion,
    AccordionSummary,
    AccordionDetails,
    Alert,
    Chip,
    Fab
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import BugReportIcon from '@mui/icons-material/BugReport';
import VpnKeyIcon from '@mui/icons-material/VpnKey';
import SecurityIcon from '@mui/icons-material/Security';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import CustomSnackbar from '../components/popup/CustomSnackbar';
import bgImage from '../assets/pexels-scottwebb-1029624.jpg';
import { useThemeContext } from '../context/ThemeContext';
import UploadJsonButton from '../components/upload/UploadJsonButton';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import InputAdornment from '@mui/material/InputAdornment';
import BlockIcon from '@mui/icons-material/Block';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RemoveRedEyeIcon from '@mui/icons-material/RemoveRedEye';
import RedoIcon from '@mui/icons-material/Redo';
import Tooltip from '@mui/material/Tooltip';
import Link from '@mui/material/Link';

/**
 * RequestDebugger component for testing AWS WAF rules.
 * This component allows users to:
 * 1. Construct HTTP requests with custom headers, paths, and query parameters
 * 2. Send test requests to an endpoint
 * 3. See which WAF rules would be triggered by the request
 * 4. View detailed information about rule matches
 */
const RequestDebugger = ({ rules = [], albRules = [] }) => {
    // Print a sample of the rules for debugging
    if (Array.isArray(rules)) {
        console.log('[RequestDebugger] Sample rules:', rules.slice(0, 3));
        console.log('[RequestDebugger] All rules:', rules);
    }
    
    // Filter out falsy or empty rules
    const safeRules = Array.isArray(rules) ? rules.filter(r => r && Object.keys(r).length > 0) : [];
    if (safeRules.length > 0) {
        console.log('[RequestDebugger] First safe rule:', safeRules[0]);
    }
    
    const [loading, setLoading] = useState(false);
    const [testResults, setTestResults] = useState(null);
    const [stepMode, setStepMode] = useState(false);
    const [currentRuleIndex, setCurrentRuleIndex] = useState(0);
    const [ruleHistory, setRuleHistory] = useState([]);
    const [triggeredLabels, setTriggeredLabels] = useState(new Set());
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' });
    const [currentRequestState, setCurrentRequestState] = useState(null);

    // Request configuration state
    const [requestConfig, setRequestConfig] = useState({
        method: 'GET',
        path: '/',
        queryParams: '',
        headers: [{ name: 'User-Agent', value: 'Mozilla/5.0' }],
        body: '',
        requestNumber: 1  // Add this line
    });

    // Search and loader state
    const [searchTerm, setSearchTerm] = useState('');
    const [loaderPopupOpen, setLoaderPopupOpen] = useState(false);
    const [warningCount, setWarningCount] = useState(0);
    const [loadedRules, setLoadedRules] = useState([]);

    const { darkTheme, getColor } = useThemeContext();

    const [mode, setMode] = useState('both'); // 'waf', 'alb', 'both'

    // Combine passed rules with loaded rules
    const allRules = [...safeRules, ...loadedRules];
    const effectiveRules = allRules.filter(r => r && Object.keys(r).length > 0);

    // ALB rules
    const [albLoadedRules, setAlbLoadedRules] = useState([]);
    const effectiveAlbRules = [...albRules, ...albLoadedRules].filter(r => r && Object.keys(r).length > 0);

    // For step-by-step mode, combine rules if mode is 'both'
    const combinedRules = mode === 'both'
        ? [
            ...effectiveRules.map(r => ({ ...r, _ruleset: 'WAF' })),
            ...effectiveAlbRules.map(r => ({ ...r, _ruleset: 'ALB' }))
        ]
        : mode === 'waf'
            ? effectiveRules.map(r => ({ ...r, _ruleset: 'WAF' }))
            : effectiveAlbRules.map(r => ({ ...r, _ruleset: 'ALB' }));

    // Fallback UI if no rules are loaded
    if (!effectiveRules.length && !effectiveAlbRules.length) {
        return (
            <Box sx={{ width: '100%', height: '100%', position: 'relative' }}>
                {/* Background */}
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
                
                {/* Dark overlay for dark mode */}
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
                
                {/* Content area */}
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
                        <Paper sx={{ p: 4, textAlign: 'center' }}>
                            <SecurityIcon sx={{ fontSize: 64, color: '#1976d2', mb: 2 }} />
                            <Typography variant="h4" sx={{ 
                                color: getColor('barText'),
                                textShadow: darkTheme ? '0 0 10px rgba(0,0,0,0.3)' : undefined,
                                mb: 2
                            }}>
                                No Rules Loaded
                            </Typography>
                            <Typography variant="body1" sx={{ 
                                color: getColor('barText'),
                                mb: 3,
                                maxWidth: '600px',
                                margin: '0 auto'
                            }}>
                                To start testing and debugging your WAF rules, you need to load them first. 
                                You can either load rules from the Visualization view or upload them directly here.
                            </Typography>
                            
                            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
                                <Button
                                    variant="contained"
                                    startIcon={<UploadFileIcon />}
                                    onClick={() => setLoaderPopupOpen(true)}
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
                                <Button
                                    variant="outlined"
                                    onClick={() => navigate('/app/visualization')}
                                    sx={{
                                        borderColor: getColor('border'),
                                        color: getColor('barText'),
                                        '&:hover': {
                                            borderColor: '#1976d2',
                                            backgroundColor: 'rgba(25, 118, 210, 0.05)',
                                        },
                                    }}
                                >
                                    Go to Visualization
                                </Button>
                            </Box>
                        </Paper>
                    </Container>
                </Box>
            </Box>
        );
    }

    // Reset rule evaluation state
    const resetRuleEvaluation = () => {
        setCurrentRuleIndex(0);
        setRuleHistory([]);
        setTriggeredLabels(new Set());
        setCurrentRequestState(null);
    };

    // Add a header field
    const addHeader = () => {
        setRequestConfig({
            ...requestConfig,
            headers: [...requestConfig.headers, { name: '', value: '' }]
        });
    };

    // Remove a header field
    const removeHeader = (index) => {
        const newHeaders = [...requestConfig.headers];
        newHeaders.splice(index, 1);
        setRequestConfig({
            ...requestConfig,
            headers: newHeaders
        });
    };

    // Update header field
    const updateHeader = (index, field, value) => {
        const newHeaders = [...requestConfig.headers];
        newHeaders[index][field] = value;
        setRequestConfig({
            ...requestConfig,
            headers: newHeaders
        });
    };

    // Handle form field changes
    const handleChange = (field, value) => {
        setRequestConfig({
            ...requestConfig,
            [field]: value
        });
    };

    // Display a snackbar message
    const showMessage = (message, severity = 'info') => {
        setSnackbar({
            open: true,
            message,
            severity
        });
    };

    // Close snackbar
    const handleCloseSnackbar = () => {
        setSnackbar({
            ...snackbar,
            open: false
        });
    };

    // Simulate sending the request and evaluating against WAF/ALB rules
    const testRequest = async () => {
        setLoading(true);

        try {
            // Convert our request config to a format that matches the AWS WAF evaluation format
            const testRequestObj = {
                uri: requestConfig.path,
                method: requestConfig.method,
                headers: requestConfig.headers.reduce((obj, header) => {
                    if (header.name && header.value) {
                        obj[header.name.toLowerCase()] = [{ value: header.value }];
                    }
                    return obj;
                }, {}),
                queryString: requestConfig.queryParams || '',
                body: requestConfig.body || '',
                requestNumber: requestConfig.requestNumber || 1
            };

            if (stepMode) {
                // Reset the rule evaluation state
                resetRuleEvaluation();

                // Initialize the request state to track modifications
                const initialRequestState = {
                    ...testRequestObj,
                    addedLabels: [],
                    addedHeaders: [],
                    actions: []
                };
                setCurrentRequestState(initialRequestState);

                // Start with the first rule in combinedRules
                const firstRule = combinedRules[0];
                if (firstRule) {
                    try {
                        const initialLabels = new Set();
                        const result = simulateRuleEvaluation(testRequestObj, firstRule, initialLabels);
                        setRuleHistory([{
                            rule: firstRule,
                            result: result,
                            index: 0
                        }]);

                        // Update the request state with any changes from the first rule match
                        if (result && result.matched) {
                            const updatedRequest = updateRequestState(initialRequestState, result, firstRule);
                            setCurrentRequestState(updatedRequest);

                            // Add labels if the rule matched and has labels
                            if (firstRule.RuleLabels && Array.isArray(firstRule.RuleLabels)) {
                                const newLabels = new Set();
                                firstRule.RuleLabels.forEach(label => {
                                    if (label && label.Name) {
                                        newLabels.add(label.Name);
                                    }
                                });
                                setTriggeredLabels(newLabels);
                            }
                        }

                        setCurrentRuleIndex(0);
                    } catch (error) {
                        console.error('Error evaluating first rule:', error);
                        showMessage('Error in step-by-step evaluation: ' + error.message, 'error');
                    }
                } else {
                    showMessage('No rules to evaluate', 'warning');
                }

                showMessage('Step-by-step mode started. Rules will be evaluated one by one.');
            } else {
                // Full mode - evaluate all rules at once
                let wafResults = { matchedRules: [], labelsGenerated: [] };
                let albResults = { matchedRules: [], labelsGenerated: [] };
                if (mode === 'waf' || mode === 'both') {
                    wafResults = evaluateRulesAgainstRequest(testRequestObj, effectiveRules);
                }
                if (mode === 'alb' || mode === 'both') {
                    albResults = evaluateRulesAgainstRequest(testRequestObj, effectiveAlbRules);
                }
                setTestResults({
                    request: testRequestObj,
                    waf: wafResults,
                    alb: albResults,
                    timestamp: new Date().toISOString(),
                });
                const totalMatches = (wafResults.matchedRules?.length || 0) + (albResults.matchedRules?.length || 0);
                showMessage(`Request evaluated. Found ${totalMatches} rule matches.`,
                    totalMatches > 0 ? 'warning' : 'success');
            }
        } catch (error) {
            console.error('Error testing request:', error);
            showMessage('Failed to evaluate request against rules', 'error');
        } finally {
            setLoading(false);
        }
    };

    // Evaluate rules against a request (client-side simulation)
    const evaluateRulesAgainstRequest = (request, rulesArray) => {
        if (!rulesArray || !Array.isArray(rulesArray) || rulesArray.length === 0) {
            console.warn('[RequestDebugger] No rules to evaluate');
            return { matchedRules: [], labelsGenerated: [] };
        }
        const matchedRules = [];
        const labelsGenerated = new Set();
        rulesArray.forEach(rule => {
            // ALB rule detection: has Conditions
            if (rule.Conditions) {
                if (matchAlbRule(request, rule)) {
                    matchedRules.push({ rule, result: { matched: true, details: { type: 'ALBMatch' }, actions: rule.Actions, labelsGenerated: (rule.RuleLabels||[]).map(l=>l.Name) } });
                    if (rule.RuleLabels) rule.RuleLabels.forEach(l => labelsGenerated.add(l.Name));
                }
                return;
            }
            // WAF rule (default)
            const matchResult = simulateRuleEvaluation(request, rule, labelsGenerated);
            if (matchResult.matched) {
                if (matchResult.details?.type === 'RateBased') {
                    matchedRules.push({ rule: rule, result: matchResult });
                } else if (matchResult.details?.type !== 'RateBased') {
                    matchedRules.push({ rule: rule, result: matchResult });
                }
                if (matchResult.labelsGenerated) {
                    matchResult.labelsGenerated.forEach(label => labelsGenerated.add(label));
                }
            }
        });
        return { matchedRules, labelsGenerated };
    };

    // Simulate rule evaluation against a request
    const simulateRuleEvaluation = (request, rule, existingLabels) => {
        if (!rule) {
            console.warn('[RequestDebugger] No rule provided for evaluation');
            return { matched: false, labelsGenerated: [], ruleName: 'Unknown' };
        }
        let matched = false;
        let matchDetails = {};
        let actions = [];
        // Initialize labelsGenerated as a Set to collect labels
        const labelsGenerated = new Set();
        try {
            // Managed Rule Group stub/warning
            if (rule.Statement && rule.Statement.ManagedRuleGroupStatement) {
                matched = true; // Assume it could match for simulation
                matchDetails = {
                    type: 'ManagedRuleGroup',
                    vendorName: rule.Statement.ManagedRuleGroupStatement.VendorName,
                    name: rule.Statement.ManagedRuleGroupStatement.Name,
                    note: 'This is a managed rule group. Actual AWS logic is not simulated. Result is a stub.'
                };
            } else if (rule.OverrideAction && !rule.Action) {
                // This is a managed rule reference with an override action
                // We don't automatically assume managed rules match
                matched = false;

                // Only if we have specific simulation criteria for managed rules
                if (rule.Statement && rule.Statement.ManagedRuleGroupStatement) {
                    // Implement actual matching logic for managed rules
                    // This would depend on the specific managed rule and request properties
                    // For now, it will only match if the rule contains specific conditions

                    // Example: Check if there's a SQLi or XSS pattern in the request
                    if (rule.Statement.ManagedRuleGroupStatement.Name?.includes('SQLi') ||
                        rule.Statement.ManagedRuleGroupStatement.Name?.includes('XSS')) {

                        // Look for SQLi patterns in parameters, headers, or body
                        const hasSuspiciousPattern = Object.values(request.queryParams || {}).some(value =>
                            typeof value === 'string' && (
                                value.includes('SELECT') ||
                                value.includes('INSERT') ||
                                value.includes('UPDATE') ||
                                value.includes('DELETE') ||
                                value.includes('DROP') ||
                                value.includes('<script>') ||
                                value.includes('javascript:')
                            )
                        );

                        matched = hasSuspiciousPattern;
                    }
                }

                matchDetails = {
                    type: 'ManagedRuleGroup',
                    note: matched ? 'Managed rule matched based on detected patterns' : 'Managed rule did not match',
                    overrideAction: Object.keys(rule.OverrideAction)[0]
                };
            } else if (rule.Statement) {
                // Process different statement types
                const statementType = getStatementType(rule.Statement);

                switch (statementType) {
                    case 'ByteMatchStatement':
                        matched = evaluateByteMatchStatement(rule.Statement.ByteMatchStatement, request);
                        if (matched) {
                            matchDetails = {
                                type: 'ByteMatch',
                                ...matched
                            };
                        }
                        break;

                    case 'SqliMatchStatement':
                        matched = evaluateSqliMatchStatement(rule.Statement.SqliMatchStatement, request);
                        if (matched) {
                            matchDetails = {
                                type: 'SqliMatch',
                                ...matched
                            };
                        }
                        break;

                    case 'XssMatchStatement':
                        matched = evaluateXssMatchStatement(rule.Statement.XssMatchStatement, request);
                        if (matched) {
                            matchDetails = {
                                type: 'XssMatch',
                                ...matched
                            };
                        }
                        break;

                    case 'GeoMatchStatement':
                        matched = evaluateGeoMatchStatement(rule.Statement.GeoMatchStatement, request);
                        if (matched) {
                            matchDetails = {
                                type: 'GeoMatch',
                                ...matched
                            };
                        }
                        break;

                    case 'IPSetReferenceStatement':
                        matched = evaluateIPSetReferenceStatement(rule.Statement.IPSetReferenceStatement, request);
                        if (matched) {
                            matchDetails = {
                                type: 'IPSetReference',
                                ...matched
                            };
                        }
                        break;

                    case 'RegexPatternSetReferenceStatement':
                        matched = evaluateRegexPatternSetReferenceStatement(rule.Statement.RegexPatternSetReferenceStatement, request);
                        if (matched) {
                            matchDetails = {
                                type: 'RegexPatternSetReference',
                                ...matched
                            };
                        }
                        break;

                    case 'SizeConstraintStatement':
                        matched = evaluateSizeConstraintStatement(rule.Statement.SizeConstraintStatement, request);
                        if (matched) {
                            matchDetails = {
                                type: 'SizeConstraint',
                                ...matched
                            };
                        }
                        break;

                    case 'RateBasedStatement':
                        const rateResult = evaluateRateBasedStatement(rule.Statement.RateBasedStatement, request, existingLabels);
                        if (rateResult) {
                            matched = true;
                            matchDetails = {
                                type: 'RateBased',
                                ...rateResult
                            };
                        }
                        break;

                    case 'ManagedRuleGroupStatement':
                        // For simulation, we'll assume managed rule groups might match
                        matched = true;
                        matchDetails = {
                            type: 'ManagedRuleGroup',
                            vendorName: rule.Statement.ManagedRuleGroupStatement.VendorName,
                            name: rule.Statement.ManagedRuleGroupStatement.Name,
                            note: 'Managed rule groups are assumed to potentially match for simulation purposes'
                        };
                        break;

                    case 'LabelMatchStatement':
                        const labelKey = rule.Statement.LabelMatchStatement.Key;
                        matched = existingLabels.has(labelKey);
                        if (matched) {
                            matchDetails = {
                                type: 'LabelMatch',
                                labelKey,
                                scope: rule.Statement.LabelMatchStatement.Scope || 'LABEL'
                            };
                        }
                        break;

                    case 'AndStatement':
                        const andStatements = rule.Statement.AndStatement.Statements || [];
                        matched = andStatements.length > 0;
                        const andSubResults = [];

                        for (const stmt of andStatements) {
                            const subRule = { ...rule, Statement: stmt };
                            const subResult = simulateRuleEvaluation(request, subRule, existingLabels);

                            if (!subResult.matched) {
                                matched = false;
                            }

                            andSubResults.push(subResult);
                        }

                        if (matched) {
                            matchDetails = {
                                type: 'And',
                                operator: 'AND',
                                subResults: andSubResults
                            };
                        }
                        break;

                    case 'OrStatement':
                        const orStatements = rule.Statement.OrStatement.Statements || [];
                        matched = false;
                        const orSubResults = [];

                        for (const stmt of orStatements) {
                            const subRule = { ...rule, Statement: stmt };
                            const subResult = simulateRuleEvaluation(request, subRule, existingLabels);

                            if (subResult.matched) {
                                matched = true;
                            }

                            orSubResults.push(subResult);
                        }

                        if (matched) {
                            matchDetails = {
                                type: 'Or',
                                operator: 'OR',
                                subResults: orSubResults
                            };
                        }
                        break;

                    case 'NotStatement':
                        if (rule.Statement.NotStatement && rule.Statement.NotStatement.Statement) {
                            const subRule = { ...rule, Statement: rule.Statement.NotStatement.Statement };
                            const subResult = simulateRuleEvaluation(request, subRule, existingLabels);

                            // NOT statement matches when the inner statement does not match
                            matched = !subResult.matched;

                            if (matched) {
                                matchDetails = {
                                    type: 'Not',
                                    operator: 'NOT',
                                    innerStatement: subResult
                                };
                            }
                        }
                        break;

                    default:
                        console.warn(`[RequestDebugger] Unsupported statement type: ${statementType}`);
                        matched = false;
                }
            }
        } catch (error) {
            console.error('Error evaluating rule:', error);
            matched = false;
        }

        // If matched, determine what actions are taken
        if (matched) {
            // Check for labels being added - only add labels for rate limit rules if the limit is exceeded
            if (rule.RuleLabels && rule.RuleLabels.length > 0) {
                // For rate limit rules, only add labels if the rate limit is exceeded
                if (matchDetails.type === 'RateBased' && !matchDetails.rateExceeded) {
                    // Don't add labels for counting-only matches
                    return {
                        matched: true,
                        details: matchDetails,
                        actions: [{
                            type: 'action',
                            action: 'Count'
                        }],
                        labelsGenerated: []
                    };
                }

                // Add labels for other rule types or when rate limit is exceeded
                rule.RuleLabels.forEach(label => {
                    if (label && label.Name) {
                        labelsGenerated.add(label.Name);
                    }
                });

                actions.push({
                    type: 'labels',
                    labels: rule.RuleLabels.map(label => label.Name)
                });
            }

            // Process different action types
            if (rule.Action) {
                const actionType = Object.keys(rule.Action)[0];
                actions.push({
                    type: 'action',
                    action: actionType
                });

                // Handle specific action types
                switch (actionType) {
                    case 'Allow':
                        // Nothing special for Allow
                        break;

                    case 'Block':
                        // Add custom response if present
                        if (rule.Action.Block?.CustomResponse) {
                            actions.push({
                                type: 'customResponse',
                                responseCode: rule.Action.Block.CustomResponse.ResponseCode,
                                bodyKey: rule.Action.Block.CustomResponse.CustomResponseBodyKey,
                                headers: rule.Action.Block.CustomResponse.ResponseHeaders
                            });
                        }
                        break;

                    case 'Count':
                        // Add custom request handling if present
                        if (rule.Action.Count?.CustomRequestHandling?.InsertHeaders) {
                            actions.push({
                                type: 'headers',
                                headers: rule.Action.Count.CustomRequestHandling.InsertHeaders.map(h => ({
                                    name: h.Name,
                                    value: h.Value
                                }))
                            });
                        }
                        break;

                    case 'CAPTCHA':
                        actions.push({
                            type: 'captcha',
                            config: rule.Action.CAPTCHA,
                            immunityTime: rule.Action.CAPTCHA?.ImmunityTimeProperty?.ImmunityTime
                        });
                        break;

                    case 'Challenge':
                        actions.push({
                            type: 'challenge',
                            config: rule.Action.Challenge,
                            immunityTime: rule.Action.Challenge?.ImmunityTimeProperty?.ImmunityTime
                        });
                        break;
                }
            } else if (rule.OverrideAction) {
                // Handle override actions for managed rule groups
                const overrideType = Object.keys(rule.OverrideAction)[0];
                actions.push({
                    type: 'override',
                    action: overrideType
                });
            }
        }

        const result = {
            matched,
            details: matchDetails,
            actions,
            labelsGenerated: Array.from(labelsGenerated)
        };

        return result;
    };

    // Helper function to determine the statement type
    const getStatementType = (statement) => {
        if (!statement) return 'Unknown';

        // Check for each possible statement type
        const statementTypes = [
            'ByteMatchStatement',
            'SqliMatchStatement',
            'XssMatchStatement',
            'GeoMatchStatement',
            'IPSetReferenceStatement',
            'RegexPatternSetReferenceStatement',
            'SizeConstraintStatement',
            'RateBasedStatement',
            'ManagedRuleGroupStatement',
            'LabelMatchStatement',
            'AndStatement',
            'OrStatement',
            'NotStatement',
            'RegexMatchStatement' // Legacy but included for compatibility
        ];

        for (const type of statementTypes) {
            if (statement[type]) {
                return type;
            }
        }

        return 'Unknown';
    };

    // Helper functions to evaluate different statement types

    // ByteMatchStatement evaluation
    const evaluateByteMatchStatement = (statement, request) => {
        if (!statement) return false;

        const matchValue = statement.SearchString ||
            (statement.SearchStringBase64 ? atob(statement.SearchStringBase64) : null);

        if (!matchValue) return false;

        const constraint = statement.PositionalConstraint || 'CONTAINS';

        // Extract the field to match against
        const field = getFieldValue(statement.FieldToMatch, request);

        if (!field.value) return false;

        // Apply text transformations if specified
        let transformedValue = field.value;
        if (statement.TextTransformations && statement.TextTransformations.length > 0) {
            // Sort by priority (lower number = higher priority)
            const sortedTransformations = [...statement.TextTransformations]
                .sort((a, b) => a.Priority - b.Priority);

            // Apply transformations in priority order
            for (const transform of sortedTransformations) {
                transformedValue = applyTextTransformation(transformedValue, transform.Type);
            }
        }

        const matched = checkStringMatch(transformedValue, matchValue, constraint);

        if (matched) {
            return {
                field: field.name,
                value: field.value,
                transformedValue: transformedValue !== field.value ? transformedValue : undefined,
                constraint,
                matchValue
            };
        }

        return false;
    };

    // SqliMatchStatement evaluation
    const evaluateSqliMatchStatement = (statement, request) => {
        if (!statement) return false;

        // Extract the field to match against
        const field = getFieldValue(statement.FieldToMatch, request);

        if (!field.value) return false;

        // Apply text transformations if specified
        let transformedValue = field.value;
        if (statement.TextTransformations && statement.TextTransformations.length > 0) {
            // Sort by priority (lower number = higher priority)
            const sortedTransformations = [...statement.TextTransformations]
                .sort((a, b) => a.Priority - b.Priority);

            // Apply transformations in priority order
            for (const transform of sortedTransformations) {
                transformedValue = applyTextTransformation(transformedValue, transform.Type);
            }
        }

        // Simple SQLi detection - check for common SQLi patterns
        // In a real system, this would use sophisticated detection logic
        const sqlInjectionPatterns = [
            /'\s*OR\s*'1'\s*=\s*'1/i,
            /'\s*OR\s*1\s*=\s*1/i,
            /'\s*OR\s*'\s*'='/i,
            /'\s*OR\s*1\s*=/i,
            /'\s*;\s*DROP\s+TABLE/i,
            /UNION\s+SELECT/i,
            /UNION\s+ALL\s+SELECT/i,
            /SELECT\s+.*\s+FROM/i,
            /INSERT\s+INTO/i,
            /UPDATE\s+.*\s+SET/i,
            /DELETE\s+FROM/i,
            /--/,
            /\/\*/,
            /SLEEP\s*\(/i,
            /BENCHMARK\s*\(/i
        ];

        const matched = sqlInjectionPatterns.some(pattern => pattern.test(transformedValue));

        if (matched) {
            return {
                field: field.name,
                value: field.value,
                transformedValue: transformedValue !== field.value ? transformedValue : undefined,
                sensitiveDataFiltered: true // Don't show the actual SQL pattern that matched for security
            };
        }

        return false;
    };

    // XssMatchStatement evaluation
    const evaluateXssMatchStatement = (statement, request) => {
        if (!statement) return false;

        // Extract the field to match against
        const field = getFieldValue(statement.FieldToMatch, request);

        if (!field.value) return false;

        // Apply text transformations if specified
        let transformedValue = field.value;
        if (statement.TextTransformations && statement.TextTransformations.length > 0) {
            // Sort by priority (lower number = higher priority)
            const sortedTransformations = [...statement.TextTransformations]
                .sort((a, b) => a.Priority - b.Priority);

            // Apply transformations in priority order
            for (const transform of sortedTransformations) {
                transformedValue = applyTextTransformation(transformedValue, transform.Type);
            }
        }

        // Simple XSS detection - check for common XSS patterns
        // In a real system, this would use sophisticated detection logic
        const xssPatterns = [
            /<script[^>]*>.*?<\/script>/i,
            /javascript:/i,
            /onerror=/i,
            /onload=/i,
            /onclick=/i,
            /onmouseover=/i,
            /onmouseout=/i,
            /onkeypress=/i,
            /onkeydown=/i,
            /onkeyup=/i,
            /onfocus=/i,
            /onblur=/i,
            /onsubmit=/i,
            /onchange=/i,
            /eval\s*\(/i,
            /document\.cookie/i,
            /document\.location/i,
            /alert\s*\(/i,
            /document\.write/i,
            /document\.domain/i
        ];

        const matched = xssPatterns.some(pattern => pattern.test(transformedValue));

        if (matched) {
            return {
                field: field.name,
                value: field.value,
                transformedValue: transformedValue !== field.value ? transformedValue : undefined,
                sensitiveDataFiltered: true // Don't show the actual XSS pattern that matched for security
            };
        }

        return false;
    };

    // GeoMatchStatement evaluation
    const evaluateGeoMatchStatement = (statement, request) => {
        if (!statement || !statement.CountryCodes || !statement.CountryCodes.length) {
            return false;
        }

        // In a real implementation, this would look at the IP address and determine the country
        // For simulation purposes, we'll assume a random match based on the number of countries
        const simulatedMatch = Math.random() < (statement.CountryCodes.length / 200);

        if (simulatedMatch) {
            const randomCountryIndex = Math.floor(Math.random() * statement.CountryCodes.length);
            const matchedCountry = statement.CountryCodes[randomCountryIndex];

            return {
                matchedCountry,
                countryList: statement.CountryCodes
            };
        }

        return false;
    };

    // IPSetReferenceStatement evaluation
    const evaluateIPSetReferenceStatement = (statement, request) => {
        if (!statement || !statement.ARN) {
            return false;
        }

        // Instead of random matching, check for specific IP patterns in source IP
        // Assuming we might have a source IP in the headers
        let sourceIp = '127.0.0.1'; // default local IP

        if (request.headers && request.headers['x-forwarded-for']) {
            sourceIp = request.headers['x-forwarded-for'][0].value;
        }

        // Check if IP is in private ranges (simplified check)
        const isPrivateIP =
            sourceIp.startsWith('10.') ||
            sourceIp.startsWith('192.168.') ||
            sourceIp.match(/^172\.(1[6-9]|2[0-9]|3[0-1])\./);

        // Only match if the ARN indicates a private IP set and the source IP is private
        const isPrivateIpSet = statement.ARN.toLowerCase().includes('private');
        const match = isPrivateIP && isPrivateIpSet;

        if (match) {
            return {
                ipSetArn: statement.ARN,
                matchedIp: sourceIp
            };
        }

        return false;
    };

    // RegexPatternSetReferenceStatement evaluation
    const evaluateRegexPatternSetReferenceStatement = (statement, request) => {
        if (!statement || !statement.ARN) {
            return false;
        }

        // Extract the field to match against
        const field = getFieldValue(statement.FieldToMatch, request);

        if (!field.value) return false;

        // Instead of random matching, check for specific regex patterns
        // For simulation, check if the ARN suggests what patterns it might contain
        let patternType = '';
        if (statement.ARN.toLowerCase().includes('sql')) {
            patternType = 'SQL';
        } else if (statement.ARN.toLowerCase().includes('xss')) {
            patternType = 'XSS';
        } else if (statement.ARN.toLowerCase().includes('path')) {
            patternType = 'PATH';
        }

        let matched = false;

        // Check if the field value contains patterns based on the type
        switch (patternType) {
            case 'SQL':
                matched = /select|insert|update|delete|drop|union/i.test(field.value);
                break;
            case 'XSS':
                matched = /<script|javascript:|onerror=|onload=/i.test(field.value);
                break;
            case 'PATH':
                matched = /\.\.\/|\/etc\/|\/var\/www\//i.test(field.value);
                break;
            default:
                // For unknown pattern types, don't match
                matched = false;
        }

        if (matched) {
            return {
                field: field.name,
                value: field.value,
                regexSetArn: statement.ARN,
                matchedPattern: patternType
            };
        }

        return false;
    };

    // SizeConstraintStatement evaluation
    const evaluateSizeConstraintStatement = (statement, request) => {
        if (!statement) return false;

        // Extract the field to measure
        const field = getFieldValue(statement.FieldToMatch, request);

        if (!field.value) return false;

        let size = field.value.length;
        let comparisonOperator = statement.ComparisonOperator;
        let size_constraint = statement.Size;

        // Evaluate the constraint based on the comparison operator
        let matched = false;
        switch (comparisonOperator) {
            case 'EQ':  // Equal
                matched = size === size_constraint;
                break;
            case 'NE':  // Not equal
                matched = size !== size_constraint;
                break;
            case 'LE':  // Less than or equal
                matched = size <= size_constraint;
                break;
            case 'LT':  // Less than
                matched = size < size_constraint;
                break;
            case 'GE':  // Greater than or equal
                matched = size >= size_constraint;
                break;
            case 'GT':  // Greater than
                matched = size > size_constraint;
                break;
            default:
                matched = false;
        }

        if (matched) {
            return {
                field: field.name,
                actualSize: size,
                comparisonOperator,
                constraintSize: size_constraint
            };
        }

        return false;
    };

    // RateBasedStatement evaluation - for simulation only
    const evaluateRateBasedStatement = (statement, request, existingLabels) => {
        if (!statement || !statement.Limit) {
            return false;
        }

        // Get the request number from the request
        const requestNumber = request.requestNumber || 1;
        const limit = statement.Limit;
        const evaluationWindow = statement.EvaluationWindowSec || 300; // Default to 5 minutes

        // For simulation purposes, we'll consider the rate limit exceeded if the request number is greater than the limit
        const rateExceeded = requestNumber > limit;

        // If there's a scope-down statement, evaluate it
        if (statement.ScopeDownStatement) {
            const subRule = { Statement: statement.ScopeDownStatement };
            const scopeResult = simulateRuleEvaluation(request, subRule, existingLabels);

            // Only match if the scope-down statement matches
            if (!scopeResult.matched) {
                return false;
            }

            return {
                aggregateKeyType: statement.AggregateKeyType || 'IP',
                limit: limit,
                evaluationWindow: evaluationWindow,
                requestNumber: requestNumber,
                rateExceeded: rateExceeded,
                scopeDownMatched: true,
                note: rateExceeded
                    ? `Rate limit exceeded: ${requestNumber} requests in ${evaluationWindow}s window (limit: ${limit})`
                    : `Request counted: ${requestNumber} requests in ${evaluationWindow}s window (limit: ${limit})`
            };
        }

        // If no scope-down statement, always count the request
        return {
            aggregateKeyType: statement.AggregateKeyType || 'IP',
            limit: limit,
            evaluationWindow: evaluationWindow,
            requestNumber: requestNumber,
            rateExceeded: rateExceeded,
            scopeDownMatched: true,
            note: rateExceeded
                ? `Rate limit exceeded: ${requestNumber} requests in ${evaluationWindow}s window (limit: ${limit})`
                : `Request counted: ${requestNumber} requests in ${evaluationWindow}s window (limit: ${limit})`
        };
    };

    // Helper function to extract field values based on field type
    const getFieldValue = (fieldToMatch, request) => {
        if (!fieldToMatch) return { name: 'Unknown', value: null };

        // Check each field type
        if (fieldToMatch.UriPath) {
            return { name: 'UriPath', value: request.uri };
        }

        if (fieldToMatch.QueryString) {
            return { name: 'QueryString', value: request.queryString };
        }

        if (fieldToMatch.Method) {
            return { name: 'Method', value: request.method };
        }

        if (fieldToMatch.Body) {
            return { name: 'Body', value: request.body };
        }

        if (fieldToMatch.SingleHeader && fieldToMatch.SingleHeader.Name) {
            const headerName = fieldToMatch.SingleHeader.Name.toLowerCase();
            const headerValue = request.headers[headerName]?.[0]?.value;
            return {
                name: `Header:${headerName}`,
                value: headerValue
            };
        }

        if (fieldToMatch.SingleQueryArgument && fieldToMatch.SingleQueryArgument.Name) {
            const paramName = fieldToMatch.SingleQueryArgument.Name;
            const paramValue = getQueryParameterValue(request.queryString, paramName);
            return {
                name: `QueryParam:${paramName}`,
                value: paramValue
            };
        }

        if (fieldToMatch.AllQueryArguments) {
            // For AllQueryArguments, return all query parameters as a joined string
            const queryParams = parseQueryString(request.queryString);
            const allValues = Object.values(queryParams).join('&');
            return { name: 'AllQueryArguments', value: allValues, params: queryParams };
        }

        if (fieldToMatch.Headers) {
            // For Headers match, it gets complex - for simulation, we'll just use all headers
            const headerNames = Object.keys(request.headers);
            const headerValues = headerNames.map(name =>
                request.headers[name]?.[0]?.value || '').join(',');
            return { name: 'Headers', value: headerValues };
        }

        if (fieldToMatch.Cookies) {
            // For simulation, we'll assume some basic cookies if the Cookie header exists
            const cookieHeader = request.headers['cookie']?.[0]?.value;
            return { name: 'Cookies', value: cookieHeader || '' };
        }

        if (fieldToMatch.JA3Fingerprint) {
            // JA3 fingerprint would be in the ja3 header in our simulated environment
            const ja3Value = request.headers['ja3']?.[0]?.value;
            return { name: 'JA3Fingerprint', value: ja3Value };
        }

        if (fieldToMatch.JsonBody) {
            // For JsonBody, we'll try to parse the body as JSON
            try {
                if (!request.body) return { name: 'JsonBody', value: null };

                // In our simulation, we're treating body as already parsed
                return { name: 'JsonBody', value: request.body };
            } catch (e) {
                return { name: 'JsonBody', value: null, error: 'Invalid JSON' };
            }
        }

        return { name: 'Unknown', value: null };
    };

    // Apply various text transformations as specified in WAF rules
    const applyTextTransformation = (text, transformType) => {
        if (!text) return text;

        switch (transformType) {
            case 'NONE':
                return text;

            case 'LOWERCASE':
                return text.toLowerCase();

            case 'UPPERCASE':
                return text.toUpperCase();

            case 'URL_DECODE':
                try {
                    return decodeURIComponent(text);
                } catch (e) {
                    return text;
                }

            case 'HTML_ENTITY_DECODE':
                // Simple HTML entity decoding
                return text
                    .replace(/&amp;/g, '&')
                    .replace(/&lt;/g, '<')
                    .replace(/&gt;/g, '>')
                    .replace(/&quot;/g, '"')
                    .replace(/&#39;/g, "'")
                    .replace(/&#x([0-9a-f]+);/gi, (_, hex) =>
                        String.fromCharCode(parseInt(hex, 16)))
                    .replace(/&#(\d+);/g, (_, dec) =>
                        String.fromCharCode(parseInt(dec, 10)));

            case 'COMPRESS_WHITE_SPACE':
                return text.replace(/\s+/g, ' ').trim();

            case 'CMD_LINE':
                // Simplistic command line normalization
                return text
                    .replace(/["']/g, '') // Remove quotes
                    .replace(/\\\\/g, '\\') // Convert \\ to \
                    .replace(/\\ /g, ' '); // Convert \ followed by space to space

            case 'BASE64_DECODE':
                try {
                    return atob(text);
                } catch (e) {
                    return text;
                }

            case 'HEX_DECODE':
                // Simple hex decoding
                if (/^[0-9A-Fa-f]+$/.test(text) && text.length % 2 === 0) {
                    try {
                        let result = '';
                        for (let i = 0; i < text.length; i += 2) {
                            result += String.fromCharCode(parseInt(text.substr(i, 2), 16));
                        }
                        return result;
                    } catch (e) {
                        return text;
                    }
                }
                return text;

            case 'BASE64_DECODE_EXT':
                // Extended base64 decoding with URL-safe chars
                try {
                    const encoded = text
                        .replace(/-/g, '+')
                        .replace(/_/g, '/');
                    return atob(encoded);
                } catch (e) {
                    return text;
                }

            default:
                return text;
        }
    };

    // Helper function to update the request state based on rule match results
    const updateRequestState = (currentRequest, result, rule) => {
        if (!result.matched) return currentRequest;

        const updatedRequest = { ...currentRequest };

        // Add any labels from the rule
        if (rule.RuleLabels && rule.RuleLabels.length > 0) {
            const newLabels = rule.RuleLabels.map(label => ({
                name: label.Name,
                addedByRule: rule.Name,
                priority: rule.Priority
            }));
            updatedRequest.addedLabels = [...updatedRequest.addedLabels, ...newLabels];
        }

        // Add any headers inserted by the rule - only for Action.Count with CustomRequestHandling
        if (rule.Action?.Count?.CustomRequestHandling?.InsertHeaders) {
            const newHeaders = rule.Action.Count.CustomRequestHandling.InsertHeaders.map(header => ({
                name: header.Name,
                value: header.Value,
                addedByRule: rule.Name,
                priority: rule.Priority
            }));
            updatedRequest.addedHeaders = [...updatedRequest.addedHeaders, ...newHeaders];
        }

        // Record the action taken - handle both Action and OverrideAction
        let actionType = 'Unknown';
        let actionDetails = null;

        // Special handling for rate limit rules
        if (result.details?.type === 'RateBased') {
            actionType = 'action';
            actionDetails = {
                action: 'Count',
                requestNumber: result.details.requestNumber,
                limit: result.details.limit,
                evaluationWindow: result.details.evaluationWindow
            };
        } else if (rule.Action) {
            actionType = Object.keys(rule.Action)[0] || 'Unknown';
            actionDetails = rule.Action[actionType];
        } else if (rule.OverrideAction) {
            actionType = `Override:${Object.keys(rule.OverrideAction)[0] || 'Unknown'}`;
            actionDetails = rule.OverrideAction[Object.keys(rule.OverrideAction)[0]];
        }

        updatedRequest.actions.push({
            type: actionType,
            action: actionDetails?.action || actionType,
            rule: rule.Name,
            priority: rule.Priority,
            details: actionDetails
        });

        return updatedRequest;
    };

    // Step to the next rule
    const stepToNextRule = () => {
        if (!combinedRules || currentRuleIndex >= combinedRules.length - 1) {
            showMessage('You have reached the end of the rule set', 'info');
            return;
        }
        const nextIndex = currentRuleIndex + 1;
        const nextRule = combinedRules[nextIndex];
        // Convert request config to the format needed for evaluation
        const testRequestObj = {
            uri: requestConfig.path,
            method: requestConfig.method,
            headers: requestConfig.headers.reduce((obj, header) => {
                if (header.name && header.value) {
                    obj[header.name.toLowerCase()] = [{ value: header.value }];
                }
                return obj;
            }, {}),
            queryString: requestConfig.queryParams || '',
            body: requestConfig.body || '',
            requestNumber: requestConfig.requestNumber || 1
        };
        const initialLabels = new Set();
        const result = simulateRuleEvaluation(testRequestObj, nextRule, initialLabels);
        setRuleHistory([...ruleHistory, {
            rule: nextRule,
            result: result,
            index: nextIndex
        }]);
        // Update the request state with any changes from the rule match
        if (result && result.matched) {
            const updatedRequest = updateRequestState(currentRequestState, result, nextRule);
            setCurrentRequestState(updatedRequest);
        }
        setCurrentRuleIndex(nextIndex);
    };

    // Step to the previous rule
    const stepToPreviousRule = () => {
        if (!combinedRules || currentRuleIndex === 0) {
            showMessage('You are at the first rule', 'info');
            return;
        }
        const prevIndex = currentRuleIndex - 1;
        setCurrentRuleIndex(prevIndex);
        setCurrentRequestState(null); // Optionally reset state or restore from history
    };

    // Helper function to get a specific query parameter value
    const getQueryParameterValue = (queryString, paramName) => {
        return parseQueryString(queryString)[paramName];
    };

    // Helper function to parse a query string into a key-value object
    const parseQueryString = (queryString) => {
        if (!queryString) return {};

        const params = {};
        const queryParts = queryString.split('&');

        queryParts.forEach(part => {
            const [name, value] = part.split('=');
            if (name) {
                params[decodeURIComponent(name)] = decodeURIComponent(value || '');
            }
        });

        return params;
    };

    // Helper function to check string matches based on positional constraint
    const checkStringMatch = (value, matchValue, constraint) => {
        if (!value || !matchValue) return false;

        switch (constraint) {
            case 'EXACTLY':
                return value === matchValue;
            case 'STARTS_WITH':
                return value.startsWith(matchValue);
            case 'ENDS_WITH':
                return value.endsWith(matchValue);
            case 'CONTAINS':
                return value.includes(matchValue);
            default:
                return false;
        }
    };

    // Render a summary of the match details
    const renderMatchSummary = (details, rule) => {
        if (!details) return 'No details available';
        // Show rule name/ID/type if available
        let header = '';
        if (rule) {
            header = `[${rule._ruleset || rule.type || ''}] Rule: ${rule.Name || rule.name || rule.id || 'Unknown'}\n`;
        }
        if (details.type) {
            switch (details.type) {
                case 'ByteMatch':
                    return `${header}${details.field} contains "${details.matchValue}"`;
                case 'SqliMatch':
                    return `${header}SQL injection pattern detected in ${details.field}`;
                case 'XssMatch':
                    return `${header}XSS pattern detected in ${details.field}`;
                case 'GeoMatch':
                    return `${header}IP from ${details.matchedCountry}`;
                case 'IPSetReference':
                    return `${header}IP matches set (${details.matchedIp})`;
                case 'RegexPatternSetReference':
                    return `${header}Regex pattern matched in ${details.field}`;
                case 'SizeConstraint':
                    return `${header}${details.field} size ${details.actualSize} ${details.comparisonOperator} ${details.constraintSize}`;
                case 'RateBased':
                    return `${header}Rate-based limit: ${details.limit} requests per ${details.evaluationWindow}s (Request #${details.requestNumber})`;
                case 'ManagedRuleGroup':
                    return `${header}${details.vendorName}:${details.name} managed rule group`;
                case 'LabelMatch':
                    return `${header}Label match: ${details.labelKey}`;
                case 'And':
                    return `${header}AND condition: All sub-conditions matched\n${details.subResults ? details.subResults.map((sub, i) => `  - ${renderMatchSummary(sub, rule)}`).join('\n') : ''}`;
                case 'Or':
                    return `${header}OR condition: At least one sub-condition matched\n${details.subResults ? details.subResults.map((sub, i) => `  - ${renderMatchSummary(sub, rule)}`).join('\n') : ''}`;
                case 'Not':
                    return `${header}NOT condition: Inner condition did not match\n${details.subResults ? details.subResults.map((sub, i) => `  - ${renderMatchSummary(sub, rule)}`).join('\n') : ''}`;
                default:
                    if (details.field) {
                        return `${header}${details.field} match`;
                    }
                    return `${header}Rule statement matched`;
            }
        }
        // Legacy format (for backward compatibility)
        if (details.field) {
            if (details.constraint && details.matchValue) {
                return `${header}${details.field} ${details.constraint} "${details.matchValue}"`;
            }
            if (details.regexPattern) {
                return `${header}${details.field} matches regex: ${details.regexPattern}`;
            }
            return `${header}${details.field} match`;
        }
        if (details.operator) {
            if (details.operator === 'AND') {
                return `${header}AND condition: All sub-conditions matched`;
            }
            if (details.operator === 'OR') {
                return `${header}OR condition: At least one sub-condition matched`;
            }
        }
        return `${header}Rule matched with unknown details`;
    };

    // Render detailed information about rule actions
    const renderRuleActions = (actions) => {
        if (!actions || !actions.length) {
            return <Typography variant="body2">No actions specified.</Typography>;
        }

        return (
            <Box>
                <Typography variant="subtitle2" gutterBottom>Actions Taken:</Typography>
                {actions.map((action, index) => {
                    // Handle regular action types
                    if (action.type === 'action') {
                        let chipColor = 'primary';
                        switch (action.action) {
                            case 'Allow': chipColor = 'success'; break;
                            case 'Block': chipColor = 'error'; break;
                            case 'Count': chipColor = 'info'; break;
                            case 'CAPTCHA':
                            case 'Challenge': chipColor = 'warning'; break;
                        }

                        return (
                            <Box key={index} sx={{ mb: 1 }}>
                                <Typography variant="body2">
                                    <strong>Rule Action:</strong>
                                </Typography>
                                <Box sx={{ ml: 2 }}>
                                    <Chip
                                        label={action.action}
                                        size="small"
                                        color={chipColor}
                                    />
                                </Box>
                            </Box>
                        );
                    }

                    // Handle specific action type cases
                    switch (action.type) {
                        case 'labels':
                            return (
                                <Box key={index} sx={{ mb: 1 }}>
                                    <Typography variant="body2">
                                        <strong>Labels Added:</strong>
                                    </Typography>
                                    <Box sx={{ ml: 2, display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                        {action.labels.map((label, idx) => (
                                            <Chip
                                                key={idx}
                                                label={label}
                                                size="small"
                                                color="secondary"
                                            />
                                        ))}
                                    </Box>
                                </Box>
                            );

                        case 'headers':
                            return (
                                <Box key={index} sx={{ mb: 1 }}>
                                    <Typography variant="body2">
                                        <strong>Headers Added:</strong>
                                    </Typography>
                                    <Box sx={{ ml: 2 }}>
                                        <Table size="small">
                                            <TableHead>
                                                <TableRow>
                                                    <TableCell sx={{ fontWeight: 'bold', p: 1 }}>Name</TableCell>
                                                    <TableCell sx={{ fontWeight: 'bold', p: 1 }}>Value</TableCell>
                                                </TableRow>
                                            </TableHead>
                                            <TableBody>
                                                {action.headers.map((header, idx) => (
                                                    <TableRow key={idx}>
                                                        <TableCell sx={{ p: 1 }}>{header.name}</TableCell>
                                                        <TableCell sx={{ p: 1 }}>{header.value}</TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </Box>
                                </Box>
                            );

                        case 'captcha':
                            return (
                                <Box key={index} sx={{ mb: 1 }}>
                                    <Typography variant="body2">
                                        <strong>CAPTCHA Challenge:</strong>
                                    </Typography>
                                    <Box sx={{ ml: 2 }}>
                                        <Chip
                                            label="CAPTCHA Required"
                                            size="small"
                                            color="warning"
                                            icon={<VpnKeyIcon fontSize="small" />}
                                        />
                                        {action.immunityTime && (
                                            <Typography variant="body2" sx={{ mt: 1 }}>
                                                Immunity Time: {action.immunityTime} seconds
                                            </Typography>
                                        )}
                                    </Box>
                                </Box>
                            );

                        case 'challenge':
                            return (
                                <Box key={index} sx={{ mb: 1 }}>
                                    <Typography variant="body2">
                                        <strong>Browser Challenge:</strong>
                                    </Typography>
                                    <Box sx={{ ml: 2 }}>
                                        <Chip
                                            label="Challenge Required"
                                            size="small"
                                            color="warning"
                                            icon={<SecurityIcon fontSize="small" />}
                                        />
                                        {action.immunityTime && (
                                            <Typography variant="body2" sx={{ mt: 1 }}>
                                                Immunity Time: {action.immunityTime} seconds
                                            </Typography>
                                        )}
                                    </Box>
                                </Box>
                            );

                        case 'customResponse':
                            return (
                                <Box key={index} sx={{ mb: 1 }}>
                                    <Typography variant="body2">
                                        <strong>Custom Response:</strong>
                                    </Typography>
                                    <Box sx={{ ml: 2 }}>
                                        <Typography variant="body2">
                                            Status Code: {action.responseCode || 403}
                                        </Typography>
                                        {action.bodyKey && (
                                            <Typography variant="body2">
                                                Body Key: {action.bodyKey}
                                            </Typography>
                                        )}
                                        {action.headers && action.headers.length > 0 && (
                                            <>
                                                <Typography variant="body2" sx={{ mt: 1 }}>
                                                    Response Headers:
                                                </Typography>
                                                <Table size="small">
                                                    <TableHead>
                                                        <TableRow>
                                                            <TableCell sx={{ fontWeight: 'bold', p: 1 }}>Name</TableCell>
                                                            <TableCell sx={{ fontWeight: 'bold', p: 1 }}>Value</TableCell>
                                                        </TableRow>
                                                    </TableHead>
                                                    <TableBody>
                                                        {action.headers.map((header, idx) => (
                                                            <TableRow key={idx}>
                                                                <TableCell sx={{ p: 1 }}>{header.name}</TableCell>
                                                                <TableCell sx={{ p: 1 }}>{header.value}</TableCell>
                                                            </TableRow>
                                                        ))}
                                                    </TableBody>
                                                </Table>
                                            </>
                                        )}
                                    </Box>
                                </Box>
                            );

                        default:
                            // Handle other action types and override actions
                            if (action.type.startsWith('Override:')) {
                                const overrideType = action.type.replace('Override:', '');
                                return (
                                    <Box key={index} sx={{ mb: 1 }}>
                                        <Typography variant="body2">
                                            <strong>Managed Rule Override:</strong>
                                        </Typography>
                                        <Box sx={{ ml: 2 }}>
                                            <Chip
                                                label={overrideType}
                                                size="small"
                                                color="default"
                                            />
                                        </Box>
                                    </Box>
                                );
                            }

                            return (
                                <Box key={index} sx={{ mb: 1 }}>
                                    <Typography variant="body2">
                                        <strong>Action Type: {action.type}</strong>
                                    </Typography>
                                </Box>
                            );
                    }
                })}
            </Box>
        );
    };

    // Function to render the current request state with modifications
    const renderCurrentRequest = (request) => {
        if (!request) return null;

        // Helper function to check if a rule is a rate limit rule and if it exceeded the limit
        const isRateLimitExceeded = (rule) => {
            if (!rule) return false;

            // Check if this is a rate limit rule
            const isRateLimitRule = rule.Statement &&
                (rule.Statement.RateBasedStatement ||
                    (rule.Statement.AndStatement && rule.Statement.AndStatement.Statements.some(s => s.RateBasedStatement)) ||
                    (rule.Statement.OrStatement && rule.Statement.OrStatement.Statements.some(s => s.RateBasedStatement)));

            if (!isRateLimitRule) return true; // Not a rate limit rule, so show its modifications

            // For rate limit rules, check if the limit was exceeded
            const rateResult = rule.Statement.RateBasedStatement ?
                evaluateRateBasedStatement(rule.Statement.RateBasedStatement, request, new Set()) :
                null;

            // If we can't determine the rate limit status, show the modifications
            if (!rateResult) return true;

            // Only show modifications if the rate limit was exceeded
            return rateResult.rateExceeded;
        };

        // Helper function to check if an action is a counting action
        const isCountingAction = (action) => {
            return action.type === 'action' && action.action === 'Count';
        };

        // Filter out labels from rate limit rules that haven't exceeded their limit
        const filteredLabels = request.addedLabels.filter(label => {
            const rule = effectiveRules.find(r => r.Name === label.addedByRule);
            return isRateLimitExceeded(rule);
        });

        // Filter out headers from rate limit rules that haven't exceeded their limit
        const filteredHeaders = request.addedHeaders.filter(header => {
            const rule = effectiveRules.find(r => r.Name === header.addedByRule);
            return isRateLimitExceeded(rule);
        });

        // Filter actions, but keep counting actions even if rate limit not exceeded
        const filteredActions = request.actions.filter(action => {
            const rule = effectiveRules.find(r => r.Name === action.rule);
            // Keep counting actions even if rate limit not exceeded
            if (isCountingAction(action)) return true;
            return isRateLimitExceeded(rule);
        });

        // Get the current rate limit status for display
        const getRateLimitStatus = (rule) => {
            if (!rule?.Statement?.RateBasedStatement) return null;
            return evaluateRateBasedStatement(rule.Statement.RateBasedStatement, request, new Set());
        };

        return (
            <Box>
                <Paper variant="outlined" sx={{ p: 2, mb: 3, background: darkTheme ? getColor('barBackground') : undefined, color: getColor('barText'), border: `1px solid ${getColor('border')}` }}>
                    <Typography variant="subtitle1" gutterBottom sx={{ color: getColor('barText') }}>
                        <strong>Current Request State</strong>
                    </Typography>

                    <Grid container spacing={2}>
                        <Grid item xs={12} md={6}>
                            <Box>
                                <Typography variant="body2" fontWeight="bold" color="primary">
                                    Base Request
                                </Typography>
                                <Box sx={{ ml: 2, mb: 2 }}>
                                    <Typography variant="body2">
                                        <strong>Method:</strong> {request.method}
                                    </Typography>
                                    <Typography variant="body2">
                                        <strong>Path:</strong> {request.uri}
                                    </Typography>
                                    {request.queryString && (
                                        <Typography variant="body2">
                                            <strong>Query:</strong> {request.queryString}
                                        </Typography>
                                    )}
                                    <Typography variant="body2" sx={{ mt: 1 }}>
                                        <strong>Original Headers:</strong>
                                    </Typography>
                                    <Box sx={{ ml: 2, fontFamily: 'monospace', fontSize: '0.85rem' }}>
                                        {Object.entries(request.headers).map(([name, values]) => (
                                            <Typography key={name} variant="body2">
                                                {name}: {values[0].value}
                                            </Typography>
                                        ))}
                                    </Box>
                                </Box>
                            </Box>
                        </Grid>

                        <Grid item xs={12} md={6}>
                            <Box>
                                <Typography variant="body2" fontWeight="bold" color="secondary">
                                    Modifications by Rules
                                </Typography>

                                {filteredLabels.length > 0 && (
                                    <Box sx={{ ml: 2, mb: 2 }}>
                                        <Typography variant="body2" color="secondary">
                                            <strong>Labels Added:</strong>
                                        </Typography>
                                        <Table size="small" sx={{ mt: 1 }}>
                                            <TableHead>
                                                <TableRow>
                                                    <TableCell sx={{ py: 1, px: 1 }}>Label</TableCell>
                                                    <TableCell sx={{ py: 1, px: 1 }}>Added by Rule</TableCell>
                                                    <TableCell sx={{ py: 1, px: 1 }}>Priority</TableCell>
                                                </TableRow>
                                            </TableHead>
                                            <TableBody>
                                                {filteredLabels.map((label, idx) => (
                                                    <TableRow key={idx} hover>
                                                        <TableCell sx={{ py: 1, px: 1 }}>
                                                            <Chip
                                                                label={label.name}
                                                                size="small"
                                                                color="info"
                                                                variant="outlined"
                                                            />
                                                        </TableCell>
                                                        <TableCell sx={{ py: 1, px: 1 }}>
                                                            <Typography variant="caption" fontWeight="medium">
                                                                {label.addedByRule}
                                                            </Typography>
                                                        </TableCell>
                                                        <TableCell sx={{ py: 1, px: 1 }}>
                                                            {label.priority}
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </Box>
                                )}

                                {filteredHeaders.length > 0 && (
                                    <Box sx={{ ml: 2, mb: 2 }}>
                                        <Typography variant="body2" color="secondary">
                                            <strong>Headers Added:</strong>
                                        </Typography>
                                        <Table size="small" sx={{ mt: 1 }}>
                                            <TableHead>
                                                <TableRow>
                                                    <TableCell sx={{ py: 1, px: 1 }}>Header</TableCell>
                                                    <TableCell sx={{ py: 1, px: 1 }}>Value</TableCell>
                                                    <TableCell sx={{ py: 1, px: 1 }}>Added by Rule</TableCell>
                                                    <TableCell sx={{ py: 1, px: 1 }}>Priority</TableCell>
                                                </TableRow>
                                            </TableHead>
                                            <TableBody>
                                                {filteredHeaders.map((header, idx) => (
                                                    <TableRow key={idx} hover>
                                                        <TableCell sx={{ py: 1, px: 1, fontFamily: 'monospace' }}>
                                                            {header.name}
                                                        </TableCell>
                                                        <TableCell sx={{ py: 1, px: 1, fontFamily: 'monospace' }}>
                                                            {header.value}
                                                        </TableCell>
                                                        <TableCell sx={{ py: 1, px: 1 }}>
                                                            <Typography variant="caption" fontWeight="medium">
                                                                {header.addedByRule}
                                                            </Typography>
                                                        </TableCell>
                                                        <TableCell sx={{ py: 1, px: 1 }}>
                                                            {header.priority}
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </Box>
                                )}

                                {filteredActions.length > 0 && (
                                    <Box sx={{ ml: 2 }}>
                                        <Typography variant="body2" color="secondary">
                                            <strong>Actions Taken:</strong>
                                        </Typography>
                                        <Table size="small" sx={{ mt: 1 }}>
                                            <TableHead>
                                                <TableRow>
                                                    <TableCell sx={{ py: 1, px: 1 }}>Action</TableCell>
                                                    <TableCell sx={{ py: 1, px: 1 }}>Applied by Rule</TableCell>
                                                    <TableCell sx={{ py: 1, px: 1 }}>Priority</TableCell>
                                                </TableRow>
                                            </TableHead>
                                            <TableBody>
                                                {filteredActions.map((action, idx) => {
                                                    let chipColor;
                                                    let actionLabel = action.type;

                                                    // Special handling for counting actions
                                                    if (isCountingAction(action)) {
                                                        const rule = effectiveRules.find(r => r.Name === action.rule);
                                                        const rateStatus = getRateLimitStatus(rule);
                                                        if (rateStatus) {
                                                            actionLabel = `Count (${rateStatus.requestNumber}/${rateStatus.limit} requests)`;
                                                        }
                                                    }

                                                    switch (action.type) {
                                                        case 'Block':
                                                            chipColor = 'error';
                                                            break;
                                                        case 'Allow':
                                                            chipColor = 'success';
                                                            break;
                                                        case 'Count':
                                                            chipColor = 'info';
                                                            break;
                                                        case 'CAPTCHA':
                                                        case 'Challenge':
                                                            chipColor = 'warning';
                                                            break;
                                                        default:
                                                            chipColor = 'default';
                                                    }

                                                    return (
                                                        <TableRow key={idx} hover>
                                                            <TableCell sx={{ py: 1, px: 1 }}>
                                                                <Chip
                                                                    label={actionLabel}
                                                                    color={chipColor}
                                                                    size="small"
                                                                />
                                                            </TableCell>
                                                            <TableCell sx={{ py: 1, px: 1 }}>
                                                                <Typography variant="caption" fontWeight="medium">
                                                                    {action.rule}
                                                                </Typography>
                                                            </TableCell>
                                                            <TableCell sx={{ py: 1, px: 1 }}>
                                                                {action.priority}
                                                            </TableCell>
                                                        </TableRow>
                                                    );
                                                })}
                                            </TableBody>
                                        </Table>
                                    </Box>
                                )}
                            </Box>
                        </Grid>
                    </Grid>
                </Paper>
            </Box>
        );
    };

    // Add a helper to explain why a rule matched
    function explainMatch(rule, result, request) {
        if (result.details?.type === 'ManagedRuleGroup') {
            return result.details.note;
        }
        if (result.details?.type === 'ByteMatch') {
            return `Matched on ${result.details.field} with value "${result.details.matchValue}"`;
        }
        if (result.details?.type === 'LabelMatch') {
            return `Matched label: ${result.details.labelKey}`;
        }
        if (result.details?.type === 'RateBased') {
            return `Rate limit check: ${result.details.requestNumber} requests (limit: ${result.details.limit})`;
        }
        if (result.details?.type === 'ALBMatch') {
            return 'Matched all ALB rule conditions.';
        }
        // Add more explanations as needed
        return 'Matched rule conditions.';
    }

    // Helper: summarize state changes for step-by-step mode
    function summarizeStepChanges(rule, result, request) {
        const changes = [];
        if (result.labelsGenerated && result.labelsGenerated.length > 0) {
            changes.push(`Labels added: ${result.labelsGenerated.join(', ')}`);
        }
        if (result.actions && result.actions.length > 0) {
            const actionList = result.actions.map(a => a.action || a.type).join(', ');
            changes.push(`Actions: ${actionList}`);
        }
        // Check for headers added
        if (result.actions) {
            const headerActions = result.actions.filter(a => a.type === 'headers');
            if (headerActions.length > 0) {
                const headerList = headerActions.map(h => h.headers.map(hh => `${hh.name}: ${hh.value}`).join(', ')).join(', ');
                changes.push(`Headers added: ${headerList}`);
            }
        }
        return changes.length > 0 ? changes : ['No state changes.'];
    }

    function parseRawHttpRequest(raw) {
        // Very basic HTTP request parser
        const lines = raw.split(/\r?\n/);
        const [method, path] = lines[0].split(' ');
        const headers = {};
        let i = 1;
        for (; i < lines.length; i++) {
            const line = lines[i];
            if (!line.trim()) break;
            const [k, ...v] = line.split(':');
            if (k && v) headers[k.trim().toLowerCase()] = [{ value: v.join(':').trim() }];
        }
        let body = lines.slice(i + 1).join('\n');
        // Parse query string
        let queryParams = '';
        let uri = path;
        if (path && path.includes('?')) {
            [uri, queryParams] = path.split('?');
        }
        return { method, path: uri, queryParams, headers, body };
    }

    const [importDialogOpen, setImportDialogOpen] = useState(false);
    const [importText, setImportText] = useState('');

    const [rateDialogOpen, setRateDialogOpen] = useState(false);
    const [rateSimCount, setRateSimCount] = useState(10);
    const [rateSimResults, setRateSimResults] = useState([]);

    function simulateRateLimitRequests(baseConfig, count) {
        const results = [];
        for (let i = 1; i <= count; i++) {
            const req = { ...baseConfig, requestNumber: i };
            const waf = evaluateRulesAgainstRequest(req, effectiveRules);
            const alb = evaluateRulesAgainstRequest(req, effectiveAlbRules);
            results.push({ n: i, waf, alb });
        }
        return results;
    }

    // Helper: summarize label flow for a rule
    function summarizeLabelFlow(rule, result, allRules) {
        if (!result.labelsGenerated || result.labelsGenerated.length === 0) return null;
        // Find rules that depend on these labels
        const dependents = [];
        for (const r of allRules) {
            if (r.Statement && r.Statement.LabelMatchStatement) {
                const key = r.Statement.LabelMatchStatement.Key;
                if (result.labelsGenerated.includes(key)) {
                    dependents.push(r.Name);
                }
            }
        }
        if (dependents.length === 0) return `Labels added: ${result.labelsGenerated.join(', ')}`;
        return `Labels added: ${result.labelsGenerated.join(', ')} → Used by: ${dependents.join(', ')}`;
    }

    // Helper: get main action for a rule
    function getMainAction(rule, result) {
        if (rule.Action) {
            const type = Object.keys(rule.Action)[0];
            return type;
        }
        if (result.actions && result.actions.length > 0) {
            return result.actions[0].action || result.actions[0].type;
        }
        if (rule.Actions && rule.Actions.length > 0) {
            return rule.Actions[0].Type || rule.Actions[0].type;
        }
        return 'Count';
    }

    // Helper: render action badge/icon
    function renderActionBadge(action) {
        switch ((action || '').toLowerCase()) {
            case 'block':
                return <span style={{ color: '#d32f2f', fontWeight: 700, marginRight: 8 }}><BlockIcon fontSize="small" /> BLOCK</span>;
            case 'allow':
                return <span style={{ color: '#388e3c', fontWeight: 700, marginRight: 8 }}><CheckCircleIcon fontSize="small" /> ALLOW</span>;
            case 'count':
                return <span style={{ color: '#1976d2', fontWeight: 700, marginRight: 8 }}><RemoveRedEyeIcon fontSize="small" /> COUNT</span>;
            case 'redirect':
                return <span style={{ color: '#ff9800', fontWeight: 700, marginRight: 8 }}><RedoIcon fontSize="small" /> REDIRECT</span>;
            case 'captcha':
                return <span style={{ color: '#fbc02d', fontWeight: 700, marginRight: 8 }}>CAPTCHA</span>;
            case 'challenge':
                return <span style={{ color: '#fbc02d', fontWeight: 700, marginRight: 8 }}>CHALLENGE</span>;
            default:
                return <span style={{ color: '#888', fontWeight: 700, marginRight: 8 }}>{(action || '').toUpperCase()}</span>;
        }
    }

    // --- ALB Rule Matcher ---
    function matchAlbRule(request, rule) {
        if (!rule || !rule.Conditions) return false;
        let allMatch = true;
        let unsupportedConditions = [];
        const conditionResults = rule.Conditions.map(condition => {
            switch (condition.Field) {
                case 'path-pattern': {
                    if (!condition.Values || !condition.Values.length) return { matched: true, type: 'path-pattern' };
                    const matched = condition.Values.some(pattern => {
                        const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
                        return regex.test(request.uri);
                    });
                    return { matched, type: 'path-pattern', values: condition.Values };
                }
                case 'host-header': {
                    if (!condition.Values || !condition.Values.length) return { matched: true, type: 'host-header' };
                    // Robust header parsing (case-insensitive)
                    let host = '';
                    if (request.headers) {
                        if (Array.isArray(request.headers.host)) {
                            host = request.headers.host[0]?.value || request.headers.host[0] || '';
                        } else if (typeof request.headers.host === 'string') {
                            host = request.headers.host;
                        } else if (typeof request.headers === 'object') {
                            // Try to find host header case-insensitively
                            for (const key in request.headers) {
                                if (key.toLowerCase() === 'host') {
                                    host = Array.isArray(request.headers[key]) ? request.headers[key][0]?.value || request.headers[key][0] : request.headers[key];
                                    break;
                                }
                            }
                        }
                    }
                    host = (host || '').toLowerCase();
                    const matched = condition.Values.some(val => host === val.toLowerCase());
                    return { matched, type: 'host-header', values: condition.Values };
                }
                case 'http-header': {
                    if (!condition.HttpHeaderConfig) return { matched: true, type: 'http-header' };
                    const headerName = condition.HttpHeaderConfig.HttpHeaderName.toLowerCase();
                    let headerValue = '';
                    if (request.headers) {
                        if (Array.isArray(request.headers[headerName])) {
                            headerValue = request.headers[headerName][0]?.value || request.headers[headerName][0] || '';
                        } else if (typeof request.headers[headerName] === 'string') {
                            headerValue = request.headers[headerName];
                        } else if (typeof request.headers === 'object') {
                            for (const key in request.headers) {
                                if (key.toLowerCase() === headerName) {
                                    headerValue = Array.isArray(request.headers[key]) ? request.headers[key][0]?.value || request.headers[key][0] : request.headers[key];
                                    break;
                                }
                            }
                        }
                    }
                    headerValue = (headerValue || '').toLowerCase();
                    const matched = condition.HttpHeaderConfig.Values.some(val => headerValue === val.toLowerCase());
                    return { matched, type: 'http-header', values: condition.HttpHeaderConfig.Values, headerName };
                }
                case 'http-request-method': {
                    if (!condition.Values || !condition.Values.length) return { matched: true, type: 'http-request-method' };
                    const matched = condition.Values.includes(request.method);
                    return { matched, type: 'http-request-method', values: condition.Values };
                }
                case 'query-string': {
                    if (!condition.Values || !condition.Values.length) return { matched: true, type: 'query-string' };
                    // Robust query string parsing
                    const queryString = request.queryString || '';
                    const matched = condition.Values.some(val => queryString === val);
                    return { matched, type: 'query-string', values: condition.Values };
                }
                case 'source-ip': {
                    if (!condition.Values || !condition.Values.length) return { matched: true, type: 'source-ip' };
                    const matched = condition.Values.includes(request.sourceIp);
                    return { matched, type: 'source-ip', values: condition.Values };
                }
                default:
                    unsupportedConditions.push(condition.Field);
                    return { matched: true, type: 'unsupported', field: condition.Field };
            }
        });
        allMatch = conditionResults.every(r => r.matched);
        // Attach unsupported conditions for UI feedback
        if (unsupportedConditions.length > 0) {
            allMatch = false; // Optionally, treat as non-match
        }
        return { matched: allMatch, conditionResults, unsupportedConditions };
    }
    // --- ALB Rule Matcher ---

    // Main UI render
    return (
        <Box sx={{ width: '100%', height: '100vh', position: 'relative', overflow: 'hidden' }}>
            {/* Background image */}
            <Box
                component="img"
                src={bgImage}
                alt="Background"
                sx={{
                    position: 'fixed',
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    zIndex: 0
                }}
            />
            
            {/* Dark overlay for dark mode */}
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
            
            {/* Content area, full-bleed */}
            <Box sx={{
                position: 'absolute',
                top: '64px',
                left: '80px',
                right: '20px',
                bottom: '20px',
                overflow: 'auto',
                zIndex: 2,
                width: 'auto',
                height: 'auto',
                p: 0,
                m: 0,
                background: darkTheme ? 'rgba(30,30,30,0.85)' : 'rgba(255,255,255,0.85)',
                color: getColor('barText'),
                borderRadius: 2,
                border: `1px solid ${getColor('border')}`,
                boxShadow: getColor('shadow'),
                backdropFilter: 'blur(8px)',
                '&::-webkit-scrollbar': {
                    width: '8px',
                },
                '&::-webkit-scrollbar-track': {
                    background: 'rgba(0,0,0,0.05)',
                    borderRadius: '4px',
                },
                '&::-webkit-scrollbar-thumb': {
                    background: 'linear-gradient(180deg, rgba(25, 118, 210, 0.4), rgba(46, 125, 50, 0.4))',
                    borderRadius: '4px',
                    '&:hover': {
                        background: 'linear-gradient(180deg, rgba(25, 118, 210, 0.6), rgba(46, 125, 50, 0.6))',
                    },
                },
            }}>
                {/* Mode Selector */}
                <Box sx={{ mb: 2, display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
                    <Tooltip title="Select which ruleset(s) to test against" arrow>
                        <Typography variant="subtitle1">Rule Set:</Typography>
                    </Tooltip>
                    <FormControl size="small">
                        <Select value={mode} onChange={e => setMode(e.target.value)} aria-label="Rule Set Selector">
                            <MenuItem value="waf">WAF</MenuItem>
                            <MenuItem value="alb">ALB</MenuItem>
                            <MenuItem value="both">Both</MenuItem>
                        </Select>
                    </FormControl>
                    <Tooltip title="Paste or upload a real HTTP request to auto-fill fields" arrow>
                        <Button variant="outlined" onClick={() => setImportDialogOpen(true)} sx={{ ml: 2 }} aria-label="Import HTTP Request">
                            Import HTTP Request
                        </Button>
                    </Tooltip>
                    <Tooltip title="(Coming soon) Import real traffic using your API key" arrow>
                        <span>
                            <Button variant="outlined" disabled sx={{ ml: 1 }} aria-label="Import from API">
                                Import from API (stub)
                            </Button>
                        </span>
                    </Tooltip>
                    <Tooltip title="Simulate a sequence of requests to test rate-based rules" arrow>
                        <Button variant="outlined" onClick={() => setRateDialogOpen(true)} sx={{ ml: 2 }} aria-label="Simulate Rate Limit">
                            Simulate Rate Limit
                        </Button>
                    </Tooltip>
                    <Tooltip title="AWS WAF/ALB Rule Schema Reference" arrow>
                        <Link href="https://docs.aws.amazon.com/waf/latest/developerguide/waf-rule-statements.html" target="_blank" rel="noopener" sx={{ ml: 2, fontWeight: 700 }}>
                            AWS Rule Docs ↗
                        </Link>
                    </Tooltip>
                </Box>
                {/* Import dialog */}
                <Dialog open={importDialogOpen} onClose={() => setImportDialogOpen(false)}>
                    <DialogTitle>Import HTTP Request</DialogTitle>
                    <DialogContent>
                        <TextField
                            label="Paste raw HTTP request here"
                            multiline
                            minRows={6}
                            value={importText}
                            onChange={e => setImportText(e.target.value)}
                            fullWidth
                            sx={{ mt: 1, minWidth: 400 }}
                        />
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={() => setImportDialogOpen(false)}>Cancel</Button>
                        <Button onClick={() => {
                            const parsed = parseRawHttpRequest(importText);
                            setRequestConfig(rc => ({ ...rc, ...parsed }));
                            setImportDialogOpen(false);
                        }} variant="contained">Import</Button>
                    </DialogActions>
                </Dialog>
                {/* Rate limit simulation dialog */}
                <Dialog open={rateDialogOpen} onClose={() => setRateDialogOpen(false)}>
                    <DialogTitle>Simulate Rate Limiting</DialogTitle>
                    <DialogContent>
                        <TextField
                            label="Number of Requests"
                            type="number"
                            value={rateSimCount}
                            onChange={e => setRateSimCount(Number(e.target.value))}
                            InputProps={{
                                endAdornment: <InputAdornment position="end">requests</InputAdornment>,
                                inputProps: { min: 1, max: 1000 }
                            }}
                            sx={{ mt: 1, minWidth: 200 }}
                        />
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={() => setRateDialogOpen(false)}>Cancel</Button>
                        <Button onClick={() => {
                            setRateSimResults(simulateRateLimitRequests(requestConfig, rateSimCount));
                            setRateDialogOpen(false);
                        }} variant="contained">Simulate</Button>
                    </DialogActions>
                </Dialog>
                {/* Rate limit simulation results table */}
                {rateSimResults.length > 0 && (
                    <Paper sx={{ mt: 3, p: 2, background: '#f8fafd', border: '1px solid #1976d2' }}>
                        <Typography variant="subtitle1" sx={{ color: '#1976d2', mb: 1 }}>Rate Limiting Simulation Results</Typography>
                        <Table size="small">
                            <TableHead>
                                <TableRow>
                                    <TableCell>Request #</TableCell>
                                    <TableCell>WAF Rate-Based Matches</TableCell>
                                    <TableCell>ALB Rate-Based Matches</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {rateSimResults.map(row => (
                                    <TableRow key={row.n}>
                                        <TableCell>{row.n}</TableCell>
                                        <TableCell>
                                            {row.waf.matchedRules.filter(m => m.result.details?.type === 'RateBased').length > 0
                                                ? <span style={{ color: '#d32f2f', fontWeight: 700 }}>Triggered</span>
                                                : <span style={{ color: '#888' }}>-</span>}
                                        </TableCell>
                                        <TableCell>
                                            {row.alb.matchedRules.filter(m => m.result.details?.type === 'RateBased').length > 0
                                                ? <span style={{ color: '#388e3c', fontWeight: 700 }}>Triggered</span>
                                                : <span style={{ color: '#888' }}>-</span>}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </Paper>
                )}
                {/* Request Configuration Form */}
                <Paper variant="outlined" sx={{ 
                    p: 3, 
                    mb: 3, 
                    background: darkTheme ? 'rgba(40,40,40,0.7)' : 'rgba(255,255,255,0.8)', 
                    color: getColor('barText'), 
                    border: `1px solid ${getColor('border')}`,
                    backdropFilter: 'blur(4px)',
                    '& .MuiFormControl-root': {
                        '& .MuiInputLabel-root': {
                            color: getColor('barText'),
                        },
                        '& .MuiOutlinedInput-root': {
                            backgroundColor: darkTheme ? 'rgba(20,20,20,0.6)' : 'rgba(255,255,255,0.7)',
                            '& fieldset': {
                                borderColor: getColor('border'),
                            },
                            '&:hover fieldset': {
                                borderColor: darkTheme ? '#1976d2' : '#1976d2',
                            },
                            '&.Mui-focused fieldset': {
                                borderColor: darkTheme ? '#2e7d32' : '#2e7d32',
                            },
                        },
                        '& .MuiInputBase-input': {
                            color: getColor('barText'),
                        },
                        '& .MuiSelect-select': {
                            color: getColor('barText'),
                        },
                    },
                    '& .MuiTypography-root': {
                        color: getColor('barText'),
                    },
                    '& .MuiFormControlLabel-root': {
                        '& .MuiFormControlLabel-label': {
                            color: getColor('barText'),
                        },
                    },
                    '& .MuiSwitch-root': {
                        '& .MuiSwitch-switchBase.Mui-checked': {
                            color: darkTheme ? '#1976d2' : '#1976d2',
                        },
                        '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                            backgroundColor: darkTheme ? '#2e7d32' : '#2e7d32',
                        },
                    },
                }}>
                    <Typography variant="h6" gutterBottom sx={{ color: getColor('barText') }}>
                        Test Request Configuration
                    </Typography>
                    <Grid container spacing={3}>
                        {/* Method and Path */}
                        <Grid item xs={12} sm={6}>
                            <FormControl fullWidth>
                                <InputLabel sx={{ color: getColor('barText') }}>Method</InputLabel>
                                <Select
                                    value={requestConfig.method}
                                    onChange={(e) => handleChange('method', e.target.value)}
                                    sx={{
                                        '& .MuiSelect-select': {
                                            color: getColor('barText'),
                                        },
                                        '& .MuiOutlinedInput-root': {
                                            backgroundColor: darkTheme ? getColor('background') : 'rgba(255,255,255,0.8)',
                                            '& fieldset': {
                                                borderColor: getColor('border'),
                                            },
                                            '&:hover fieldset': {
                                                borderColor: darkTheme ? '#1976d2' : '#1976d2',
                                            },
                                            '&.Mui-focused fieldset': {
                                                borderColor: darkTheme ? '#2e7d32' : '#2e7d32',
                                            },
                                        },
                                    }}
                                >
                                    <MenuItem value="GET">GET</MenuItem>
                                    <MenuItem value="POST">POST</MenuItem>
                                    <MenuItem value="PUT">PUT</MenuItem>
                                    <MenuItem value="DELETE">DELETE</MenuItem>
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                fullWidth
                                label="Path"
                                value={requestConfig.path}
                                onChange={(e) => handleChange('path', e.target.value)}
                                placeholder="/api/resource"
                                sx={{
                                    '& .MuiInputLabel-root': {
                                        color: getColor('barText'),
                                    },
                                    '& .MuiOutlinedInput-root': {
                                        backgroundColor: darkTheme ? getColor('background') : 'rgba(255,255,255,0.8)',
                                        '& fieldset': {
                                            borderColor: getColor('border'),
                                        },
                                        '&:hover fieldset': {
                                            borderColor: darkTheme ? '#1976d2' : '#1976d2',
                                        },
                                        '&.Mui-focused fieldset': {
                                            borderColor: darkTheme ? '#2e7d32' : '#2e7d32',
                                        },
                                    },
                                    '& .MuiInputBase-input': {
                                        color: getColor('barText'),
                                    },
                                }}
                            />
                        </Grid>

                        {/* Query Parameters */}
                        <Grid item xs={12}>
                            <TextField
                                fullWidth
                                label="Query Parameters"
                                value={requestConfig.queryParams}
                                onChange={(e) => handleChange('queryParams', e.target.value)}
                                placeholder="param1=value1&param2=value2"
                                sx={{
                                    '& .MuiInputLabel-root': {
                                        color: getColor('barText'),
                                    },
                                    '& .MuiOutlinedInput-root': {
                                        backgroundColor: darkTheme ? getColor('background') : 'rgba(255,255,255,0.8)',
                                        '& fieldset': {
                                            borderColor: getColor('border'),
                                        },
                                        '&:hover fieldset': {
                                            borderColor: darkTheme ? '#1976d2' : '#1976d2',
                                        },
                                        '&.Mui-focused fieldset': {
                                            borderColor: darkTheme ? '#2e7d32' : '#2e7d32',
                                        },
                                    },
                                    '& .MuiInputBase-input': {
                                        color: getColor('barText'),
                                    },
                                }}
                            />
                        </Grid>

                        {/* Headers */}
                        <Grid item xs={12}>
                            <Box sx={{ mb: 2 }}>
                                <Typography variant="subtitle2" gutterBottom sx={{ color: getColor('barText') }}>
                                    Headers
                                </Typography>
                                {(Array.isArray(requestConfig.headers) ? requestConfig.headers : []).map((header, index) => (
                                    <Box key={index} sx={{ display: 'flex', gap: 2, mb: 2 }}>
                                        <TextField
                                            label="Name"
                                            value={header.name}
                                            onChange={(e) => updateHeader(index, 'name', e.target.value)}
                                            size="small"
                                            sx={{
                                                '& .MuiInputLabel-root': {
                                                    color: getColor('barText'),
                                                },
                                                '& .MuiOutlinedInput-root': {
                                                    backgroundColor: darkTheme ? getColor('background') : 'rgba(255,255,255,0.8)',
                                                    '& fieldset': {
                                                        borderColor: getColor('border'),
                                                    },
                                                    '&:hover fieldset': {
                                                        borderColor: darkTheme ? '#1976d2' : '#1976d2',
                                                    },
                                                    '&.Mui-focused fieldset': {
                                                        borderColor: darkTheme ? '#2e7d32' : '#2e7d32',
                                                    },
                                                },
                                                '& .MuiInputBase-input': {
                                                    color: getColor('barText'),
                                                },
                                            }}
                                        />
                                        <TextField
                                            label="Value"
                                            value={header.value}
                                            onChange={(e) => updateHeader(index, 'value', e.target.value)}
                                            size="small"
                                            sx={{ 
                                                flex: 1,
                                                '& .MuiInputLabel-root': {
                                                    color: getColor('barText'),
                                                },
                                                '& .MuiOutlinedInput-root': {
                                                    backgroundColor: darkTheme ? getColor('background') : 'rgba(255,255,255,0.8)',
                                                    '& fieldset': {
                                                        borderColor: getColor('border'),
                                                    },
                                                    '&:hover fieldset': {
                                                        borderColor: darkTheme ? '#1976d2' : '#1976d2',
                                                    },
                                                    '&.Mui-focused fieldset': {
                                                        borderColor: darkTheme ? '#2e7d32' : '#2e7d32',
                                                    },
                                                },
                                                '& .MuiInputBase-input': {
                                                    color: getColor('barText'),
                                                },
                                            }}
                                        />
                                        <IconButton onClick={() => removeHeader(index)} color="error">
                                            <DeleteIcon />
                                        </IconButton>
                                    </Box>
                                ))}
                                <Button
                                    startIcon={<AddIcon />}
                                    onClick={addHeader}
                                    variant="outlined"
                                    size="small"
                                    sx={{
                                        borderColor: getColor('border'),
                                        color: getColor('barText'),
                                        '&:hover': {
                                            borderColor: darkTheme ? '#1976d2' : '#1976d2',
                                            backgroundColor: darkTheme ? 'rgba(25, 118, 210, 0.1)' : 'rgba(25, 118, 210, 0.05)',
                                        },
                                    }}
                                >
                                    Add Header
                                </Button>
                            </Box>
                        </Grid>

                        {/* Body */}
                        <Grid item xs={12}>
                            <TextField
                                fullWidth
                                label="Request Body"
                                value={requestConfig.body}
                                onChange={(e) => handleChange('body', e.target.value)}
                                multiline
                                rows={4}
                                sx={{
                                    '& .MuiInputLabel-root': {
                                        color: getColor('barText'),
                                    },
                                    '& .MuiOutlinedInput-root': {
                                        backgroundColor: darkTheme ? getColor('background') : 'rgba(255,255,255,0.8)',
                                        '& fieldset': {
                                            borderColor: getColor('border'),
                                        },
                                        '&:hover fieldset': {
                                            borderColor: darkTheme ? '#1976d2' : '#1976d2',
                                        },
                                        '&.Mui-focused fieldset': {
                                            borderColor: darkTheme ? '#2e7d32' : '#2e7d32',
                                        },
                                    },
                                    '& .MuiInputBase-input': {
                                        color: getColor('barText'),
                                    },
                                }}
                            />
                        </Grid>
                    </Grid>

                    {/* Test Controls */}
                    <Box sx={{ mt: 3, display: 'flex', gap: 2, alignItems: 'center' }}>
                        <Button
                            variant="contained"
                            onClick={testRequest}
                            disabled={loading}
                            startIcon={<BugReportIcon />}
                            sx={{
                                background: darkTheme ? 'linear-gradient(45deg, #1976d2, #2e7d32)' : 'linear-gradient(45deg, #1976d2, #2e7d32)',
                                color: '#ffffff',
                                '&:hover': {
                                    background: darkTheme ? 'linear-gradient(45deg, #1565c0, #1b5e20)' : 'linear-gradient(45deg, #1565c0, #1b5e20)',
                                },
                            }}
                        >
                            Test Request
                        </Button>
                        <FormControlLabel
                            control={
                                <Switch
                                    checked={stepMode}
                                    onChange={(e) => setStepMode(e.target.checked)}
                                    sx={{
                                        '& .MuiSwitch-switchBase.Mui-checked': {
                                            color: darkTheme ? '#1976d2' : '#1976d2',
                                        },
                                        '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                                            backgroundColor: darkTheme ? '#2e7d32' : '#2e7d32',
                                        },
                                    }}
                                />
                            }
                            label="Step-by-Step Mode"
                            sx={{
                                '& .MuiFormControlLabel-label': {
                                    color: getColor('barText'),
                                },
                            }}
                        />
                    </Box>
                </Paper>

                {/* Test Results */}
                {testResults && !stepMode && (
                    <Paper variant="outlined" sx={{ 
                        p: 3, 
                        background: darkTheme ? 'rgba(40,40,40,0.7)' : 'rgba(255,255,255,0.8)', 
                        color: getColor('barText'), 
                        border: `1px solid ${getColor('border')}`,
                        backdropFilter: 'blur(4px)',
                        '& .MuiTypography-root': {
                            color: getColor('barText'),
                        },
                        '& .MuiAccordion-root': {
                            backgroundColor: darkTheme ? 'rgba(20,20,20,0.6)' : 'rgba(255,255,255,0.7)',
                            color: getColor('barText'),
                            backdropFilter: 'blur(2px)',
                            '& .MuiAccordionSummary-root': {
                                color: getColor('barText'),
                            },
                            '& .MuiAccordionDetails-root': {
                                backgroundColor: darkTheme ? 'rgba(15,15,15,0.4)' : 'rgba(250,250,250,0.5)',
                            },
                        },
                    }}>
                        <Typography variant="h6" gutterBottom sx={{ color: getColor('barText') }}>
                            Test Results
                        </Typography>
                        {mode === 'waf' || mode === 'both' ? (
                            <Box sx={{ mb: 2 }}>
                                <Typography variant="subtitle2" sx={{ color: '#d32f2f', mb: 1 }}>WAF Rule Matches</Typography>
                                {testResults.waf.matchedRules.length === 0 ? (
                                    <Typography variant="body2">No WAF rules matched.</Typography>
                                ) : (
                                    testResults.waf.matchedRules.map((match, index) => (
                                        <Accordion key={index} defaultExpanded={index === 0} sx={index === 0 ? { border: '2px solid #1976d2', boxShadow: '0 0 8px #1976d2' } : {}}>
                                            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                                                <Typography sx={{ color: getColor('barText'), fontWeight: index === 0 ? 700 : 400 }}>
                                                    {index === 0 && <span style={{ color: '#1976d2', fontWeight: 700, marginRight: 8 }}>[WINNER]</span>}
                                                    Rule: {match.rule.Name} (Priority: {match.rule.Priority})
                                                </Typography>
                                            </AccordionSummary>
                                            <AccordionDetails>
                                                {/* Action badge */}
                                                {renderActionBadge(getMainAction(match.rule, match.result)) && (
                                                    <Tooltip title="Main action taken by this rule" arrow>
                                                        <span>{renderActionBadge(getMainAction(match.rule, match.result))}</span>
                                                    </Tooltip>
                                                )}
                                                <Tooltip title="Explanation of why this rule matched" arrow>
                                                    <Typography variant="body2" sx={{ mb: 1, color: '#1976d2' }}>{explainMatch(match.rule, match.result, testResults.request)}</Typography>
                                                </Tooltip>
                                                {/* Label flow summary */}
                                                {summarizeLabelFlow(match.rule, match.result, testResults.waf.matchedRules.map(m => m.rule)) && (
                                                    <Typography variant="body2" sx={{ mb: 1, color: '#1976d2' }}>{summarizeLabelFlow(match.rule, match.result, testResults.waf.matchedRules.map(m => m.rule))}</Typography>
                                                )}
                                                {renderMatchSummary(match.result, match.rule)}
                                                {renderRuleActions(match.rule.Action)}
                                                {match.unsupportedConditions && match.unsupportedConditions.length > 0 && (
                                                    <Alert severity="warning" sx={{ mb: 1 }}>
                                                        Unsupported ALB condition types: {match.unsupportedConditions.join(', ')}
                                                    </Alert>
                                                )}
                                            </AccordionDetails>
                                        </Accordion>
                                    ))
                                )}
                            </Box>
                        ) : null}
                        {mode === 'alb' || mode === 'both' ? (
                            <Box>
                                <Typography variant="subtitle2" sx={{ color: '#388e3c', mb: 1 }}>ALB Rule Matches</Typography>
                                {testResults.alb.matchedRules.length === 0 ? (
                                    <Typography variant="body2">No ALB rules matched.</Typography>
                                ) : (
                                    testResults.alb.matchedRules.map((match, index) => (
                                        <Accordion key={index} defaultExpanded={index === 0} sx={index === 0 ? { border: '2px solid #388e3c', boxShadow: '0 0 8px #388e3c' } : {}}>
                                            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                                                <Typography sx={{ color: getColor('barText'), fontWeight: index === 0 ? 700 : 400 }}>
                                                    {index === 0 && <span style={{ color: '#388e3c', fontWeight: 700, marginRight: 8 }}>[WINNER]</span>}
                                                    Rule: {match.rule.Name} (Priority: {match.rule.Priority})
                                                </Typography>
                                            </AccordionSummary>
                                            <AccordionDetails>
                                                {/* Action badge */}
                                                {renderActionBadge(getMainAction(match.rule, match.result))}
                                                <Typography variant="body2" sx={{ mb: 1, color: '#388e3c' }}>{explainMatch(match.rule, match.result, testResults.request)}</Typography>
                                                {/* Label flow summary */}
                                                {summarizeLabelFlow(match.rule, match.result, testResults.alb.matchedRules.map(m => m.rule)) && (
                                                    <Typography variant="body2" sx={{ mb: 1, color: '#388e3c' }}>{summarizeLabelFlow(match.rule, match.result, testResults.alb.matchedRules.map(m => m.rule))}</Typography>
                                                )}
                                                {renderMatchSummary(match.result, match.rule)}
                                                {renderRuleActions(match.rule.Action)}
                                                {match.unsupportedConditions && match.unsupportedConditions.length > 0 && (
                                                    <Alert severity="warning" sx={{ mb: 1 }}>
                                                        Unsupported ALB condition types: {match.unsupportedConditions.join(', ')}
                                                    </Alert>
                                                )}
                                            </AccordionDetails>
                                        </Accordion>
                                    ))
                                )}
                            </Box>
                        ) : null}
                    </Paper>
                )}

                {/* Step Mode UI */}
                {stepMode && currentRequestState && (
                    <>
                        <Box sx={{ mb: 2 }}>
                            <Typography variant="subtitle2">
                                {combinedRules[currentRuleIndex]?._ruleset} Rule {currentRuleIndex + 1} of {combinedRules.length}
                            </Typography>
                            <Typography variant="body2" sx={{ color: '#888' }}>
                                Rule Name: {combinedRules[currentRuleIndex]?.Name}
                            </Typography>
                            {/* State changes summary */}
                            {ruleHistory[currentRuleIndex] && (
                                <Paper sx={{ p: 2, mt: 1, mb: 1, background: '#f5faff', borderLeft: '4px solid #1976d2' }}>
                                    <Typography variant="body2" sx={{ color: '#1976d2', fontWeight: 700, mb: 1 }}>State Changes:</Typography>
                                    {summarizeStepChanges(combinedRules[currentRuleIndex], ruleHistory[currentRuleIndex].result, currentRequestState).map((line, idx) => (
                                        <Typography key={idx} variant="body2" sx={{ color: '#1976d2' }}>{line}</Typography>
                                    ))}
                                </Paper>
                            )}
                        </Box>
                        {renderCurrentRequest(currentRequestState)}
                        <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
                            <Button
                                onClick={stepToPreviousRule}
                                disabled={currentRuleIndex === 0}
                                startIcon={<NavigateNextIcon sx={{ transform: 'rotate(180deg)' }} />}
                                sx={{
                                    borderColor: getColor('border'),
                                    color: getColor('barText'),
                                    '&:hover': {
                                        borderColor: darkTheme ? '#1976d2' : '#1976d2',
                                        backgroundColor: darkTheme ? 'rgba(25, 118, 210, 0.1)' : 'rgba(25, 118, 210, 0.05)',
                                    },
                                }}
                                variant="outlined"
                            >
                                Previous Rule
                            </Button>
                            <Button
                                onClick={stepToNextRule}
                                disabled={currentRuleIndex >= combinedRules.length - 1}
                                endIcon={<NavigateNextIcon />}
                                sx={{
                                    borderColor: getColor('border'),
                                    color: getColor('barText'),
                                    '&:hover': {
                                        borderColor: darkTheme ? '#1976d2' : '#1976d2',
                                        backgroundColor: darkTheme ? 'rgba(25, 118, 210, 0.1)' : 'rgba(25, 118, 210, 0.05)',
                                    },
                                }}
                                variant="outlined"
                            >
                                Next Rule
                            </Button>
                        </Box>
                    </>
                )}

                {/* Snackbar for messages */}
                <CustomSnackbar
                    open={snackbar.open}
                    message={snackbar.message}
                    severity={snackbar.severity}
                    onClose={handleCloseSnackbar}
                />
            </Box>
        </Box>
    );
};

export default RequestDebugger;