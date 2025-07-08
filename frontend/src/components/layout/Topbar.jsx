import React, { useState, useRef, useEffect } from 'react';
import { AppBar, Box, TextField, Button, Typography, Stack, Divider, Tooltip } from '@mui/material';
import { useThemeContext } from '../../context/ThemeContext';
import IconButton from '@mui/material/IconButton';
import ReportIcon from '@mui/icons-material/Report';
import Badge from '@mui/material/Badge';
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
const Topbar = ({
    searchTerm,
    setSearchTerm,
    setLoaderPopupOpen,
    aclDetails,
    warningCount,
    onExportPdf,
    onExportImage,
    onWarnings,
    showArrows,
    setShowArrows,
    dottedLines,
    setDottedLines,
    animatedLines,
    setAnimatedLines,
    viewType,
    setViewType,
    orderBy,
    setOrderBy,
    rules,
    treeStyle,
    setTreeStyle,
    orderDirection,
    setOrderDirection,
    nodesPerRow,
    setNodesPerRow
}) => {
    // console.log('[TopBar] Render with props:', {
    //     searchTerm,
    //     aclDetails,
    //     warningCount
    // });

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
    // Fallback orderBy if not in options
    const validOrderBy = orderOptions.includes(orderBy) ? orderBy : orderOptions[0];

    /**
     * Handles the click event for the file load button.
     */
    const handleFileButtonClick = () => {
        // console.log('[TopBar] File button clicked');
        setLoaderPopupOpen(true);
    };

    /**
     * Handles changes in the search input field.
     */
    const handleSearchChange = (event) => {
        // console.log('[TopBar] Search changed:', event.target.value);
        setSearchTerm(event.target.value);
    };

    /**
     * Handles the click event for the warnings button.
     */
    const handleWarningsClick = () => {
        // console.log('[TopBar] Warnings clicked');
        onWarnings();
    };

    /**
     * Handles the click event for the PDF export button.
     */
    const handleExportPdf = () => {
        // console.log('[TopBar] Export PDF clicked');
        onExportPdf();
    };

    /**
     * Handles the click event for the image export button.
     */
    const handleExportImage = () => {
        // console.log('[TopBar] Export Image clicked');
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
                minHeight: 56,
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
                    justifyContent: 'flex-start',
                    padding: { xs: '2px 2px', sm: '4px 8px' },
                    gap: 1,
                    minHeight: 48,
                    width: '100%',
                    overflowX: 'auto',
                    flexWrap: 'nowrap',
                    whiteSpace: 'nowrap',
                }}
            >
                {/* Title */}
                <Typography variant="h6" sx={{ fontSize: '1.05rem', color: 'inherit', minWidth: 90, mr: 1, flexShrink: 0 }}>
                    {aclDetails?.aclName || 'WAF Rules'}
                </Typography>
                {/* View dropdown */}
                <Select
                    size="small"
                    value={viewType}
                    onChange={e => setViewType(e.target.value)}
                    sx={{ minWidth: 110, maxWidth: 130, background: darkTheme ? '#222' : '#fff', color: darkTheme ? '#fff' : '#333', border: darkTheme ? '1px solid #444' : '1px solid #ccc', mx: 0.5, flexShrink: 0 }}
                >
                    <MenuItem value="tree">Tree (Dependency)</MenuItem>
                    <MenuItem value="radial">Radial</MenuItem>
                    <MenuItem value="angled">Angled</MenuItem>
                    <MenuItem value="inspector">Inspector</MenuItem>
                </Select>
                {/* Order dropdown */}
                <Select
                    size="small"
                    value={orderBy}
                    onChange={e => setOrderBy(e.target.value)}
                    sx={{ minWidth: 90, maxWidth: 110, mx: 0.5, flexShrink: 0 }}
                >
                    <MenuItem value="number">Number</MenuItem>
                    <MenuItem value="dependency">Dependency</MenuItem>
                </Select>
                {/* Nodes per row dropdown */}
                <Select
                    size="small"
                    value={nodesPerRow}
                    onChange={e => setNodesPerRow(Number(e.target.value))}
                    sx={{ minWidth: 70, maxWidth: 90, mx: 0.5, flexShrink: 0 }}
                >
                    {Array.from({length: 15}, (_, i) => i + 2).map(val => (
                        <MenuItem key={val} value={val}>{val}</MenuItem>
                    ))}
                </Select>
                {/* Search */}
                <Box ref={searchRef} sx={{ display: 'flex', alignItems: 'center', mx: 0.5, flexShrink: 0 }}>
                    {searchOpen ? (
                        <TextField
                            size="small"
                            autoFocus
                            placeholder="Search..."
                            value={searchTerm}
                            onChange={handleSearchChange}
                            onBlur={() => setSearchOpen(false)}
                            onKeyDown={e => {
                                if (e.key === 'Enter') setSearchOpen(false);
                            }}
                            sx={{ width: 120, minWidth: 80, maxWidth: 140, transition: 'width 0.3s', mx: 0.5 }}
                        />
                    ) : (
                        <Tooltip title="Search">
                            <IconButton onClick={() => setSearchOpen(true)} size="small">
                                <SearchIcon />
                            </IconButton>
                        </Tooltip>
                    )}
                </Box>
                {/* Arrows toggle */}
                <Tooltip title={showArrows ? "Hide Arrows" : "Show Arrows"}>
                    <IconButton onClick={() => setShowArrows(!showArrows)} size="small">
                        {showArrows ? <VisibilityIcon /> : <VisibilityOffIcon />}
                    </IconButton>
                </Tooltip>
                {/* Dotted lines toggle */}
                <Tooltip title={dottedLines ? "Use Solid Lines" : "Use Dotted Lines"}>
                    <IconButton onClick={() => setDottedLines(!dottedLines)} size="small">
                        {dottedLines ? <LinearScaleIcon /> : <RemoveIcon />}
                    </IconButton>
                </Tooltip>
                {/* Animated lines toggle */}
                <Tooltip title={animatedLines ? "Disable Animation" : "Enable Animation"}>
                    <IconButton onClick={() => setAnimatedLines(!animatedLines)} size="small">
                        <WavesIcon color={animatedLines ? "primary" : "inherit"} />
                    </IconButton>
                </Tooltip>
                {/* Load Rules */}
                <Button variant="outlined" startIcon={<FileUploadIcon />} onClick={handleFileButtonClick} sx={{ height: 36, minWidth: 90, mx: 0.5, flexShrink: 0 }}>
                    Load Rules
                </Button>
                {/* Export PDF */}
                <IconButton onClick={handleExportPdf} size="small">
                    <PictureAsPdfIcon />
                </IconButton>
                {/* Export Image */}
                <IconButton onClick={handleExportImage} size="small">
                    <ImageIcon />
                </IconButton>
                {/* Warnings */}
                <IconButton onClick={handleWarningsClick} size="small">
                    <Badge badgeContent={warningCount || 0} color="warning">
                        <ReportIcon />
                    </Badge>
                </IconButton>
                {/* Dark mode toggle */}
                <Tooltip title={darkTheme ? 'Light Mode' : 'Dark Mode'}>
                    <IconButton onClick={() => setDarkTheme(!darkTheme)} size="small">
                        {darkTheme ? <LightModeIcon /> : <DarkModeIcon />}
                    </IconButton>
                </Tooltip>
            </Box>
        </AppBar>
    );
};

export default Topbar;