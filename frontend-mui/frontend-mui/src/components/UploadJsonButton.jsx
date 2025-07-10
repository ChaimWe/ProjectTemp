import React from 'react';
import { Button } from '@mui/material';

export default function UploadJsonButton({ onJsonLoaded, label = 'Upload JSON' }) {
  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const json = JSON.parse(e.target.result);
        onJsonLoaded(json);
      } catch (err) {
        alert('Invalid JSON file.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <Button
      variant="outlined"
      component="label"
      sx={{ mr: 2 }}
    >
      {label}
      <input
        type="file"
        accept="application/json"
        hidden
        onChange={handleFileChange}
      />
    </Button>
  );
} 