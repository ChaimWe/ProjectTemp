import React from 'react';
import { AppBar, Box, TextField, Button, Typography, Stack } from '@mui/material';
import { useThemeContext } from '../../context/ThemeContext';
import IconButton from '@mui/material/IconButton';
import ReportIcon from '@mui/icons-material/Report';
import Badge from '@mui/material/Badge';
import DownloadIcon from '@mui/icons-material/Download';
import FileUploadIcon from '@mui/icons-material/FileUpload';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import ImageIcon from '@mui/icons-material/Image';

const TopBar = ({
    searchTerm,
    setSearchTerm,
    setLoaderPopupOpen,
    aclDetails,
    warningCount,
    onExportPdf,
    onExportImage,
    onWarnings
}) => {
    console.log('[TopBar] Render with props:', {
        searchTerm,
        aclDetails,
        warningCount
    });

    const { theme, toggleTheme } = useThemeContext();

    const handleFileButtonClick = () => {
        console.log('[TopBar] File button clicked');
        setLoaderPopupOpen(true);
    };

    const handleSearchChange = (event) => {
        console.log('[TopBar] Search changed:', event.target.value);
        setSearchTerm(event.target.value);
    };

    const handleWarningsClick = () => {
        console.log('[TopBar] Warnings clicked');
        onWarnings();
    };

    const handleExportPdf = () => {
        console.log('[TopBar] Export PDF clicked');
        onExportPdf();
    };

    const handleExportImage = () => {
        console.log('[TopBar] Export Image clicked');
        onExportImage();
    };

    return (
        <AppBar
            position="absolute"
            sx={{
                backgroundColor: theme === 'light' ? '#f5f5f5' : '#333',
                color: theme === 'light' ? '#333' : '#fff',
                boxShadow: 'none',
                borderBottom: '1px solid',
                borderColor: theme === 'light' ? '#ddd' : '#444',
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
                    <Typography variant="h6" sx={{ fontSize: '1.1rem' }}>
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
                                backgroundColor: theme === 'light' ? '#fff' : '#444',
                            },
                        }}
                    />
                </Box>

                <Stack direction="row" spacing={1}>
                    <Button
                        variant="outlined"
                        startIcon={<FileUploadIcon />}
                        onClick={handleFileButtonClick}
                        sx={{
                            borderColor: theme === 'light' ? '#666' : '#999',
                            color: theme === 'light' ? '#666' : '#fff',
                            '&:hover': {
                                borderColor: theme === 'light' ? '#333' : '#fff',
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
                            borderColor: theme === 'light' ? '#666' : '#999',
                            color: theme === 'light' ? '#666' : '#fff',
                            '&:hover': {
                                borderColor: theme === 'light' ? '#333' : '#fff',
                                backgroundColor: 'transparent',
                            },
                        }}
                    >
                        Export Rules
                    </Button>

                    <IconButton
                        onClick={handleExportPdf}
                        sx={{
                            color: theme === 'light' ? '#666' : '#fff',
                            '&:hover': { color: theme === 'light' ? '#333' : '#ccc' },
                        }}
                    >
                        <PictureAsPdfIcon />
                    </IconButton>

                    <IconButton
                        onClick={handleExportImage}
                        sx={{
                            color: theme === 'light' ? '#666' : '#fff',
                            '&:hover': { color: theme === 'light' ? '#333' : '#ccc' },
                        }}
                    >
                        <ImageIcon />
                    </IconButton>

                    <IconButton
                        onClick={handleWarningsClick}
                        sx={{
                            color: theme === 'light' ? '#666' : '#fff',
                            '&:hover': { color: theme === 'light' ? '#333' : '#ccc' },
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