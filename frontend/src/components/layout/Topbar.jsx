import React, { useState, useRef, useEffect } from 'react';
import { AppBar, Box, TextField, Button, Typography, Stack, Divider, Tooltip } from '@mui/material';
import { useThemeContext } from '../../context/ThemeContext';
import IconButton from '@mui/material/IconButton';
import ReportIcon from '@mui/icons-material/Report';
import Badge from '@mui/material/Badge';
import DownloadIcon from '@mui/icons-material/Download';
import FileUploadIcon from '@mui/icons-material/FileUpload';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import ImageIcon from '@mui/icons-material/Image';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import LinearScaleIcon from '@mui/icons-material/LinearScale';
import RemoveIcon from '@mui/icons-material/Remove';
import WavesIcon from '@mui/icons-material/Waves';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import LightModeIcon from '@mui/icons-material/LightMode';
import SearchIcon from '@mui/icons-material/Search';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';

/**
 * TopBar component renders the top navigation bar with search, toggles, and action buttons.
 * Handles search, theme toggles, and export actions.
 */
const TopBar = ({
    searchTerm,
    setSearchTerm,
    setLoaderPopupOpen,
    aclDetails,
    warningCount,
    onExportPdf,
    onExportImage,
    onWarnings,
    isDebugger,
    onExportVectorPdf,
    isFlowChartReady = false,
    onExportSvg,
    showArrows,
    setShowArrows,
    dottedLines,
    setDottedLines,
    animatedLines,
    setAnimatedLines,
    viewType,
    setViewType,
    treeSetup,
    setTreeSetup,
    orderBy,
    setOrderBy,
    rules,
    treeStyle,
    setTreeStyle,
    orderDirection,
    setOrderDirection
}) => {
    console.log('[TopBar] Render with props:', {
        searchTerm,
        aclDetails,
        warningCount
    });

    const { darkTheme, setDarkTheme } = useThemeContext();
    const [searchOpen, setSearchOpen] = useState(false);
    const searchRef = useRef();

    useEffect(() => {
        function handleClickOutside(event) {
            if (searchRef.current && !searchRef.current.contains(event.target)) {
                setSearchOpen(false);
            }
        }
        if (searchOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        } else {
            document.removeEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [searchOpen]);

    // Dynamically generate order options from rules, fallback to default
    let orderOptions = ['Name', 'Priority', 'Statement', 'Action'];
    if (rules && Array.isArray(rules) && rules.length > 0) {
        orderOptions = Object.keys(rules[0]);
    }

    /**
     * Handles the click event for the file load button.
     */
    const handleFileButtonClick = () => {
        console.log('[TopBar] File button clicked');
        setLoaderPopupOpen(true);
    };

    /**
     * Handles changes in the search input field.
     */
    const handleSearchChange = (event) => {
        console.log('[TopBar] Search changed:', event.target.value);
        setSearchTerm(event.target.value);
    };

    /**
     * Handles the click event for the warnings button.
     */
    const handleWarningsClick = () => {
        console.log('[TopBar] Warnings clicked');
        onWarnings();
    };

    /**
     * Handles the click event for the PDF export button.
     */
    const handleExportPdf = () => {
        console.log('[TopBar] Export PDF clicked');
        onExportPdf();
    };

    /**
     * Handles the click event for the image export button.
     */
    const handleExportImage = () => {
        console.log('[TopBar] Export Image clicked');
        onExportImage();
    };

    return (
        <AppBar
            position="fixed"
            sx={{
                backgroundColor: darkTheme ? 'rgba(34, 34, 34, 0.95)' : 'rgba(255, 255, 255, 0.95)',
                color: darkTheme ? '#fff' : '#333',
                borderBottom: '1px solid',
                borderColor: darkTheme ? 'rgba(68, 68, 68, 0.5)' : 'rgba(221, 221, 221, 0.5)',
                width: 'auto',
                left: '80px',
                right: '80px',
                borderRadius: '8px 8px 0 0',
                m: 1,
                boxShadow: darkTheme ? '0 4px 6px rgba(0, 0, 0, 0.3)' : '0 4px 6px rgba(0, 0, 0, 0.1)',
                backdropFilter: 'blur(10px)',
                zIndex: 1201,
                '& .MuiButton-outlined': {
                    borderColor: darkTheme ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 0, 0, 0.3)',
                    color: darkTheme ? '#fff' : '#333',
                    fontWeight: 500,
                    '&:hover': {
                        borderColor: darkTheme ? 'rgba(255, 255, 255, 0.5)' : 'rgba(0, 0, 0, 0.5)',
                        backgroundColor: 'transparent'
                    }
                },
                '& .MuiIconButton-root': {
                    color: darkTheme ? '#fff' : '#333',
                    '&:hover': {
                        backgroundColor: darkTheme ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)'
                    }
                }
            }}
        >
            <Box
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: { xs: '4px 4px', sm: '8px 16px' },
                    flexWrap: 'wrap',
                    gap: 1,
                    minHeight: 64,
                }}
            >
                <Stack direction="row" alignItems="center" spacing={1} divider={<Divider orientation="vertical" flexItem />} sx={{ flex: 1, flexWrap: 'wrap', gap: 1 }}>
                    {/* Group 1: Title and dropdowns */}
                    <Stack direction="row" alignItems="center" spacing={1}>
                        <Typography variant="h6" sx={{ fontSize: '1.1rem', color: 'inherit', minWidth: 120 }}>
                            {aclDetails?.aclName || 'WAF Rules'}
                    </Typography>
                        <Select
                        size="small"
                            value={viewType}
                            onChange={e => setViewType(e.target.value)}
                        sx={{
                                minWidth: 110,
                                background: darkTheme ? '#222' : '#fff',
                                color: darkTheme ? '#fff' : '#333',
                                border: darkTheme ? '1px solid #444' : '1px solid #ccc',
                                '.MuiOutlinedInput-notchedOutline': {
                                    borderColor: darkTheme ? '#444' : '#ccc',
                                },
                                '& .MuiSvgIcon-root': {
                                    color: darkTheme ? '#fff' : '#333',
                                },
                            }}
                        >
                            <MenuItem value="tree">Tree</MenuItem>
                            <MenuItem value="table">Table</MenuItem>
                            <MenuItem value="card">Card</MenuItem>
                        </Select>
                        {viewType === 'tree' && (
                            <Select
                                size="small"
                                value={treeStyle}
                                onChange={e => {
                                    console.log('[TopBar] treeStyle changed:', e.target.value);
                                    setTreeStyle(e.target.value);
                                }}
                                sx={{
                                    minWidth: 110,
                                    background: darkTheme ? '#222' : '#fff',
                                    color: darkTheme ? '#fff' : '#333',
                                    border: darkTheme ? '1px solid #444' : '1px solid #ccc',
                                    '.MuiOutlinedInput-notchedOutline': {
                                        borderColor: darkTheme ? '#444' : '#ccc',
                                    },
                                    '& .MuiSvgIcon-root': {
                                        color: darkTheme ? '#fff' : '#333',
                                },
                                }}
                            >
                                <MenuItem value="dependency">Dependency</MenuItem>
                                <MenuItem value="radial">Radial</MenuItem>
                                <MenuItem value="angled">Angled</MenuItem>
                            </Select>
                        )}
                        {viewType !== 'tree' && (
                            <>
                                <Select
                                    size="small"
                                    value={orderBy}
                                    onChange={e => setOrderBy(e.target.value)}
                                    sx={{
                                        minWidth: 140,
                                        background: darkTheme ? '#222' : '#fff',
                                        color: darkTheme ? '#fff' : '#333',
                                        border: darkTheme ? '1px solid #444' : '1px solid #ccc',
                                        '.MuiOutlinedInput-notchedOutline': {
                                            borderColor: darkTheme ? '#444' : '#ccc',
                                        },
                                        '& .MuiSvgIcon-root': {
                                            color: darkTheme ? '#fff' : '#333',
                            },
                        }}
                                >
                                    {orderOptions.map(opt => (
                                        <MenuItem value={opt}>{opt}</MenuItem>
                                    ))}
                                </Select>
                                <Tooltip title={orderDirection === 'asc' ? 'Ascending' : 'Descending'}>
                                    <IconButton onClick={() => setOrderDirection(orderDirection === 'asc' ? 'desc' : 'asc')} size="small">
                                        {orderDirection === 'asc' ? <ArrowUpwardIcon /> : <ArrowDownwardIcon />}
                                    </IconButton>
                                </Tooltip>
                            </>
                        )}
                    </Stack>
                    {/* Group 2: Search and view controls */}
                    <Stack direction="row" alignItems="center" spacing={1}>
                        {/* Collapsible Search */}
                        <Box ref={searchRef} sx={{ display: 'flex', alignItems: 'center' }}>
                            {searchOpen ? (
                                <TextField
                                    size="small"
                                    autoFocus
                                    placeholder="Search..."
                                    value={searchTerm}
                                    onChange={handleSearchChange}
                                    onBlur={() => setSearchOpen(false)}
                                    sx={{ width: 200, transition: 'width 0.3s' }}
                                />
                            ) : (
                                <Tooltip title="Search">
                                    <IconButton onClick={() => setSearchOpen(true)}>
                                        <SearchIcon />
                                    </IconButton>
                                </Tooltip>
                            )}
                        </Box>
                    <Tooltip title={showArrows ? "Hide Arrows" : "Show Arrows"}>
                            <IconButton onClick={() => setShowArrows(!showArrows)}>
                            {showArrows ? <VisibilityIcon /> : <VisibilityOffIcon />}
                        </IconButton>
                    </Tooltip>
                    <Tooltip title={dottedLines ? "Use Solid Lines" : "Use Dotted Lines"}>
                            <IconButton onClick={() => setDottedLines(!dottedLines)}>
                            {dottedLines ? <LinearScaleIcon /> : <RemoveIcon />}
                        </IconButton>
                    </Tooltip>
                    <Tooltip title={animatedLines ? "Disable Animation" : "Enable Animation"}>
                            <IconButton onClick={() => setAnimatedLines(!animatedLines)}>
                            <WavesIcon color={animatedLines ? "primary" : "inherit"} />
                        </IconButton>
                    </Tooltip>
                    </Stack>
                    {/* Group 3: Action buttons */}
                    <Stack direction="row" alignItems="center" spacing={1}>
                        <Button variant="outlined" startIcon={<FileUploadIcon />} onClick={handleFileButtonClick} sx={{ height: 40 }}>
                        Load Rules
                    </Button>
                        <IconButton onClick={handleExportPdf}>
                        <PictureAsPdfIcon />
                    </IconButton>
                        <IconButton onClick={handleExportImage}>
                        <ImageIcon />
                    </IconButton>
                        <IconButton onClick={handleWarningsClick}>
                        <Badge badgeContent={warningCount || 0} color="warning">
                            <ReportIcon />
                        </Badge>
                    </IconButton>
                        {/* Dark mode toggle */}
                        <Tooltip title={darkTheme ? 'Light Mode' : 'Dark Mode'}>
                            <IconButton onClick={() => setDarkTheme(!darkTheme)}>
                                {darkTheme ? <LightModeIcon /> : <DarkModeIcon />}
                            </IconButton>
                        </Tooltip>
                    </Stack>
                </Stack>
            </Box>
        </AppBar>
    );
};

export default TopBar;