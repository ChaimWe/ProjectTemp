import React, { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  CircularProgress,
  Box,
  Select,
  MenuItem,
  FormControl,
  InputLabel
} from "@mui/material";
import UploadJsonButton from "./UploadJsonButton";
import { fetchAclDetail, fetchAclsNames } from './api';
import { useThemeContext } from '../../context/ThemeContext';

/**
 * RulesLoaderPopup component handles uploading and loading rules from a JSON file.
 * Shows a popup for file selection and error handling.
 */
const RulesLoaderPopup = ({ open, onRulesReceived, onClose }) => {
  const [step, setStep] = useState("initial");
  const [selectedRegion, setSelectedRegion] = useState("");
  const [aclNames, setAclNames] = useState([]);
  const [loading, setLoading] = useState(false);
  const { getColor } = useThemeContext();
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' });

  // Array of AWS WAF supported regions with code and display name
  const regions = [
    { code: "global", name: "Global (CloudFront)" },
    { code: "us-east-1", name: "US East (N. Virginia)" },
    { code: "us-east-2", name: "US East (Ohio)" },
    { code: "us-west-1", name: "US West (N. California)" },
    { code: "us-west-2", name: "US West (Oregon)" },
    { code: "ap-south-1", name: "Asia Pacific (Mumbai)" },
    { code: "ap-northeast-3", name: "Asia Pacific (Osaka)" },
    { code: "ap-northeast-2", name: "Asia Pacific (Seoul)" },
    { code: "ap-southeast-1", name: "Asia Pacific (Singapore)" },
    { code: "ap-southeast-2", name: "Asia Pacific (Sydney)" },
    { code: "ap-northeast-1", name: "Asia Pacific (Tokyo)" },
    { code: "ca-central-1", name: "Canada (Central)" },
    { code: "eu-central-1", name: "Europe (Frankfurt)" },
    { code: "eu-west-1", name: "Europe (Ireland)" },
    { code: "eu-west-2", name: "Europe (London)" },
    { code: "eu-west-3", name: "Europe (Paris)" },
    { code: "eu-north-1", name: "Europe (Stockholm)" },
    { code: "sa-east-1", name: "South America (Sao Paulo)" }
  ];

  /**
   * Handles the upload and parsing of the JSON file.
   */
  const handleJsonUpload = (jsonData) => {
    try {
      let parsed = jsonData;
      if (typeof jsonData === 'string') parsed = JSON.parse(jsonData);
      onRulesReceived(parsed);
      onClose();
    } catch (e) {
      setSnackbar({ open: true, message: 'Invalid JSON file', severity: 'error' });
      setLoading(false);
    }
  };

  const handleFetchFromServer = () => {
    setStep("regionSelection");
  };

  const handleRegionSelect = async (region) => {
    if (!region) return;
    setSelectedRegion(region);
    setLoading(true);
    try {
      const data = await fetchAclsNames(region);
      setAclNames(data);
      setStep("aclSelection");
    } catch (error) {
      setSnackbar({ open: true, message: 'Error fetching ACL names', severity: 'error' });
      setLoading(false);
    }
  };

  const handleAclSelect = async (aclName) => {
    setLoading(true);
    try {
      const data = await fetchAclDetail(selectedRegion, aclName);
      onRulesReceived(data);
      onClose();
    } catch (error) {
      setSnackbar({ open: true, message: 'Error fetching ACL details', severity: 'error' });
      setLoading(false);
    }
  };

  const renderContent = () => {
    if (loading) {
      return (
        <Box sx={{ display: "flex", justifyContent: "center", my: 2, width: "100%" }}>
          <CircularProgress />
        </Box>
      );
    }
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, alignItems: 'center', mt: 2 }}>
        {step === "initial" && (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2, alignItems: "center", mt: 2 }}>
            <Button variant="contained" onClick={handleFetchFromServer} style={{ width: '200px' }}>
              Fetch from Server
            </Button>
            <UploadJsonButton onJsonUpload={handleJsonUpload} />
          </Box>
        )}
        {step === "regionSelection" && (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 2 }}>
            <DialogTitle>Select Region</DialogTitle>
            <Select
              value={selectedRegion}
              onChange={(e) => setSelectedRegion(e.target.value)}
              displayEmpty
              fullWidth
            >
              <MenuItem value="" disabled>
                Select Region
              </MenuItem>
              {regions.map((region) => (
                <MenuItem key={region.code} value={region.code}>
                  {region.name}
                </MenuItem>
              ))}
            </Select>
            <Button
              variant="contained"
              onClick={() => handleRegionSelect(selectedRegion)}
              disabled={!selectedRegion}
              fullWidth
            >
              Select
            </Button>
          </Box>
        )}
        {step === "aclSelection" && (
          <Box>
            <DialogTitle textAlign={'center'}>Select ACL</DialogTitle>
            <List>
              {aclNames.length > 0 ? aclNames.map((acl) => (
                <ListItem key={acl} disablePadding>
                  <ListItemButton onClick={() => handleAclSelect(acl)}>
                    <ListItemText primary={acl} />
                  </ListItemButton>
                </ListItem>
              )) : <ListItem><ListItemText style={{ textAlign: 'center' }} primary="No ACLs found" /></ListItem>}
            </List>
          </Box>
        )}
      </Box>
    );
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      paper={{ style: { width: "500px", maxWidth: "500px" } }}
    >
      <DialogTitle textAlign="center">Load Rules</DialogTitle>
      <DialogContent>{renderContent()}</DialogContent>
      {step !== "initial" && (
        <DialogActions>
          <Button
            onClick={() => {
              setStep("initial");
              setAclNames([]);
            }}
          >
            Back
          </Button>
          <Button onClick={onClose}>Cancel</Button>
        </DialogActions>
      )}
      {/* Snackbar for errors */}
      {snackbar.open && (
        <Box sx={{ position: 'fixed', bottom: 20, left: 20, zIndex: 9999 }}>
          <div style={{
            background: getColor('barBackground'),
            color: getColor('barText'),
            border: `1px solid ${getColor('border')}`,
            borderRadius: 8,
            padding: '8px 16px',
            boxShadow: getColor('shadow'),
            fontWeight: 500
          }}>
            {snackbar.message}
          </div>
        </Box>
      )}
    </Dialog>
  );
};

export default RulesLoaderPopup;