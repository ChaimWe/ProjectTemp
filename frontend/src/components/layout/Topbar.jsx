import React from 'react';
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
    setAnimatedLines
}) => {
    console.log('[TopBar] Render with props:', {
        searchTerm,
        aclDetails,
        warningCount
    });

    const { darkTheme } = useThemeContext();

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
                    padding: '8px 16px',
                }}
            >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Typography variant="h6" sx={{ fontSize: '1.1rem', color: 'inherit' }}>
                        {aclDetails?.aclName || 'WAF Rules'} {/* Fallback text if aclDetails is null */}
                    </Typography>
                    <TextField
                        size="small"
                        placeholder="Search..."
                        value={searchTerm}
                        onChange={handleSearchChange}
                        sx={{
                            width: '200px',
                            '& .MuiOutlinedInput-root': {
                                backgroundColor: darkTheme ? 'rgba(68, 68, 68, 0.8)' : 'rgba(255, 255, 255, 0.8)',
                                color: darkTheme ? '#fff' : '#333',
                                '& fieldset': {
                                    borderColor: darkTheme ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.2)',
                                },
                                '&:hover fieldset': {
                                    borderColor: darkTheme ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 0, 0, 0.3)',
                                },
                                '&.Mui-focused fieldset': {
                                    borderColor: darkTheme ? 'rgba(255, 255, 255, 0.5)' : 'rgba(0, 0, 0, 0.5)',
                                },
                            },
                            '& .MuiInputBase-input::placeholder': {
                                color: darkTheme ? 'rgba(255, 255, 255, 0.5)' : 'rgba(0, 0, 0, 0.5)',
                            },
                        }}
                    />
                    <Divider orientation="vertical" flexItem sx={{ mx: 1, borderColor: darkTheme ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)' }} />
                    <Tooltip title={showArrows ? "Hide Arrows" : "Show Arrows"}>
                        <IconButton
                            onClick={() => setShowArrows(!showArrows)}
                            sx={{
                                color: darkTheme ? '#fff' : '#666',
                                '&:hover': { color: darkTheme ? '#ccc' : '#333' },
                            }}
                        >
                            {showArrows ? <VisibilityIcon /> : <VisibilityOffIcon />}
                        </IconButton>
                    </Tooltip>
                    <Tooltip title={dottedLines ? "Use Solid Lines" : "Use Dotted Lines"}>
                        <IconButton
                            onClick={() => setDottedLines(!dottedLines)}
                            sx={{
                                color: darkTheme ? '#fff' : '#666',
                                '&:hover': { color: darkTheme ? '#ccc' : '#333' },
                            }}
                        >
                            {dottedLines ? <LinearScaleIcon /> : <RemoveIcon />}
                        </IconButton>
                    </Tooltip>
                    <Tooltip title={animatedLines ? "Disable Animation" : "Enable Animation"}>
                        <IconButton
                            onClick={() => setAnimatedLines(!animatedLines)}
                            sx={{
                                color: darkTheme ? '#fff' : '#666',
                                '&:hover': { color: darkTheme ? '#ccc' : '#333' },
                            }}
                        >
                            <WavesIcon color={animatedLines ? "primary" : "inherit"} />
                        </IconButton>
                    </Tooltip>
                </Box>

                <Stack direction="row" spacing={1}>
                    <Button
                        variant="outlined"
                        startIcon={<FileUploadIcon />}
                        onClick={handleFileButtonClick}
                        sx={{
                            borderColor: darkTheme ? '#999' : '#666',
                            color: darkTheme ? '#fff' : '#666',
                            '&:hover': {
                                borderColor: darkTheme ? '#fff' : '#333',
                                backgroundColor: 'transparent',
                            },
                        }}
                    >
                        Load Rules
                    </Button>

                    <Button
                        variant="outlined"
                        startIcon={<DownloadIcon />}
                        onClick={handleFileButtonClick}
                        sx={{
                            borderColor: darkTheme ? '#999' : '#666',
                            color: darkTheme ? '#fff' : '#666',
                            '&:hover': {
                                borderColor: darkTheme ? '#fff' : '#333',
                                backgroundColor: 'transparent',
                            },
                        }}
                    >
                        Export Rules
                    </Button>

                    <IconButton
                        onClick={handleExportPdf}
                        sx={{
                            color: darkTheme ? '#fff' : '#666',
                            '&:hover': { color: darkTheme ? '#ccc' : '#333' },
                        }}
                    >
                        <PictureAsPdfIcon />
                    </IconButton>

                    <IconButton
                        onClick={handleExportImage}
                        sx={{
                            color: darkTheme ? '#fff' : '#666',
                            '&:hover': { color: darkTheme ? '#ccc' : '#333' },
                        }}
                    >
                        <ImageIcon />
                    </IconButton>

                    <IconButton
                        onClick={handleWarningsClick}
                        sx={{
                            color: darkTheme ? '#fff' : '#666',
                            '&:hover': { color: darkTheme ? '#ccc' : '#333' },
                        }}
                    >
                        <Badge badgeContent={warningCount || 0} color="warning">
                            <ReportIcon />
                        </Badge>
                    </IconButton>
                </Stack>
            </Box>
        </AppBar>
    );
};

export default TopBar;