import * as React from 'react';
import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import { useTheme } from '@mui/material/styles';
import Chip from '@mui/material/Chip';
import UploadJsonButton from './upload/UploadJsonButton';
import { useDataSource } from '../context/DataSourceContext';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';

export default function Topbar({ title = 'WAF Visualization Tool', viewMode, setViewMode }) {
  const theme = useTheme();
  const { awsMode, setAclData, setAlbData, aclData, albData, clearAclData, clearAlbData } = useDataSource();
  const [aclFileName, setAclFileName] = React.useState(null);
  const [albFileName, setAlbFileName] = React.useState(null);

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
      <Toolbar sx={{ display: 'flex', justifyContent: 'space-between' }}>
        <Typography variant="h6" noWrap component="div">
          {title}
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <ToggleButtonGroup
            value={viewMode}
            exclusive
            onChange={(_, val) => val && setViewMode(val)}
            size="small"
            sx={{ mr: 2 }}
          >
            <ToggleButton value="tree">Tree</ToggleButton>
            <ToggleButton value="inspector">Inspector</ToggleButton>
          </ToggleButtonGroup>
          {!awsMode && (
            <>
              <UploadJsonButton
                label={aclFileName ? 'Replace ACL/WAF JSON' : 'Upload ACL/WAF JSON'}
                onJsonUpload={(data, name) => { setAclData(data); setAclFileName(name); }}
                loadedFileName={aclFileName}
              />
              <UploadJsonButton
                label={albFileName ? 'Replace ALB JSON' : 'Upload ALB JSON'}
                onJsonUpload={(data, name) => { setAlbData(data); setAlbFileName(name); }}
                loadedFileName={albFileName}
              />
              <Chip label="JSON Mode" color="info" size="small" />
            </>
          )}
        </Box>
      </Toolbar>
    </AppBar>
  );
} 