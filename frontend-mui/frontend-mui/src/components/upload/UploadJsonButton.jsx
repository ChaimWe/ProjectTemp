import React, { useRef } from "react";
import { Button, Typography, Box } from "@mui/material";

const UploadJsonButton = ({ onJsonUpload, label = "Upload JSON", loadedFileName = null, fullWidth = true, variant = "contained" }) => {
  const fileInputRef = useRef(null);

  const handleButtonClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const jsonData = JSON.parse(event.target.result);
        onJsonUpload(jsonData, file.name);
      } catch (error) {
        console.error("Error reading JSON file:", error);
      }
    };
    reader.readAsText(file);
  };

  return (
    <Box>
      <Button variant={variant} onClick={handleButtonClick} style={{ width: '200px' }} >
        {label}
      </Button>
      <input
        type="file"
        accept="application/json"
        ref={fileInputRef}
        onChange={handleFileChange}
        style={{ display: "none" }}
      />
      {loadedFileName && (
        <Typography variant="caption" sx={{ ml: 1 }}>
          Loaded: {loadedFileName}
        </Typography>
      )}
    </Box>
  );
};

export default UploadJsonButton; 