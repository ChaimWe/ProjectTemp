import React, { createContext, useContext, useState, useEffect } from 'react';

const DataSourceContext = createContext();

export function DataSourceProvider({ children }) {
  const [awsMode, setAwsMode] = useState(true); // Default to AWS mode
  const [aclData, setAclData] = useState(null);
  const [albData, setAlbData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // On mount, check backend for AWS credentials
    fetch('/api/aws-credentials-status')
      .then(res => res.json())
      .then(data => {
        setAwsMode(!!data.hasCredentials);
        setLoading(false);
      })
      .catch(() => {
        setAwsMode(false);
        setLoading(false);
      });
  }, []);

  // When a JSON is uploaded, switch to JSON mode
  const handleAclUpload = (data) => {
    setAclData(data);
    setAwsMode(false);
  };
  const handleAlbUpload = (data) => {
    setAlbData(data);
    setAwsMode(false);
  };
  const clearAclData = () => setAclData(null);
  const clearAlbData = () => setAlbData(null);

  return (
    <DataSourceContext.Provider value={{
      awsMode,
      aclData,
      albData,
      setAclData: handleAclUpload,
      setAlbData: handleAlbUpload,
      clearAclData,
      clearAlbData,
      loading
    }}>
      {children}
    </DataSourceContext.Provider>
  );
}

export function useDataSource() {
  return useContext(DataSourceContext);
} 