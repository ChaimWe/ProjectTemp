import * as React from 'react';
import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import Toolbar from '@mui/material/Toolbar';
import { useTheme } from '@mui/material/styles';
import Chip from '@mui/material/Chip';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import { useDataSource } from '../context/DataSourceContext';
import Select from '@mui/material/Select';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import { useThemeContext } from '../context/ThemeContext';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import logoLight from '../assets/1002079229-removebg-preview.png';
import logoDark from '../assets/1002079229-removebg-preview-modified.png';
import Button from '@mui/material/Button';
import DownloadIcon from '@mui/icons-material/Download';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';

export default function Topbar({ title = 'WAF Visualization Tool', viewMode, setViewMode, ruleSet, setRuleSet }) {
  const theme = useTheme();
  const { darkTheme } = useThemeContext();
  const { awsMode, setAclData, setAlbData, aclData, albData, clearAclData, clearAlbData } = useDataSource();
  // Logo selection
  const [uploadMenuAnchor, setUploadMenuAnchor] = React.useState(null);
  const uploadMenuOpen = Boolean(uploadMenuAnchor);
  const handleUploadMenuOpen = (event) => setUploadMenuAnchor(event.currentTarget);
  const handleUploadMenuClose = () => setUploadMenuAnchor(null);
  const aclInputRef = React.useRef();
  const albInputRef = React.useRef();
  const handleAclUploadClick = () => {
    handleUploadMenuClose();
    setTimeout(() => {
      aclInputRef.current.click();
    }, 100);
  };
  const handleAlbUploadClick = () => {
    handleUploadMenuClose();
    setTimeout(() => {
      albInputRef.current.click();
    }, 100);
  };
  const handleFileChange = (type, e) => {
    const file = e.target.files[0];
    if (!file) return;
    console.log(`[UPLOAD] File selected for ${type.toUpperCase()}:`, file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const jsonData = JSON.parse(event.target.result);
        console.log(`[UPLOAD] File read for ${type.toUpperCase()}:`, file.name, jsonData);
        handleUpload(type, jsonData, file.name);
      } catch (error) {
        console.error(`[UPLOAD] Error reading JSON file for ${type.toUpperCase()}:`, error);
      }
    };
    reader.readAsText(file);
  };

  // Upload handler
  const handleUpload = (type, data, name) => {
    console.log(`[UPLOAD] Setting data in context for ${type.toUpperCase()}:`, name, data);
    if (type === 'acl') { setAclData(data); }
    else { setAlbData(data); }
  };

  return (
    <AppBar
      position="fixed"
      sx={{
        width: { sm: `calc(100% - 240px)` },
        ml: { sm: `240px` },
        backgroundColor: theme.palette.background.paper,
        color: theme.palette.text.primary,
        zIndex: theme.zIndex.drawer + 1,
        boxShadow: theme.shadows[2],
      }}
      elevation={1}
    >
      <Toolbar sx={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', minHeight: 56, gap: 2, flexWrap: 'nowrap' }}>
        {/* All controls on one line */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flex: 1 }}>
          {/* Upload Data Dropdown */}
          <Box>
            <Button
              variant="outlined"
              size="small"
              onClick={handleUploadMenuOpen}
              sx={{ minWidth: 140 }}
            >
              {(aclData || albData) ? 'Replace Data' : 'Upload Data'}
            </Button>
            {/* Hidden file inputs always present in DOM */}
            <input
              type="file"
              accept="application/json"
              ref={aclInputRef}
              onChange={e => handleFileChange('acl', e)}
              style={{ display: 'none' }}
            />
            <input
              type="file"
              accept="application/json"
              ref={albInputRef}
              onChange={e => handleFileChange('alb', e)}
              style={{ display: 'none' }}
            />
            <Menu anchorEl={uploadMenuAnchor} open={uploadMenuOpen} onClose={handleUploadMenuClose}>
              <MenuItem onClick={handleAclUploadClick}>Upload ACL/WAF JSON</MenuItem>
              <MenuItem onClick={handleAlbUploadClick}>Upload ALB JSON</MenuItem>
            </Menu>
          </Box>
          {(aclData) && <Chip label="ACL Loaded" color="primary" size="small" sx={{ fontWeight: 500, letterSpacing: 0.5 }} />}
          {(albData) && <Chip label="ALB Loaded" color="success" size="small" sx={{ fontWeight: 500, letterSpacing: 0.5 }} />}
          <Chip label="JSON Mode" color="info" size="small" sx={{ fontWeight: 500, letterSpacing: 0.5 }} />
        </Box>
        {/* Right: Utilities */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Tooltip title="Export">
            <IconButton size="small">
              <DownloadIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Help / Legend">
            <IconButton size="small">
              <HelpOutlineIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Toolbar>
    </AppBar>
  );
} 