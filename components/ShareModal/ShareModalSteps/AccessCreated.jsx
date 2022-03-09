import React, { useEffect } from 'react';
import { Box, Link } from '@mui/material';
import FireIcon from '../icons';

const AccessCreated = ({ copyToClipboard, setRequirementCreated, copyLinkText }) => {
  useEffect(() => {
    setRequirementCreated(true);
  }, []);

  return (
    <Box>
      <Box typography="subtitle" fontSize={20}>
        Your requirements have been successfully added to the Lit Protocol!
      </Box>
      <FireIcon />

      <Box sx={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', width: 1 }}>
        <Box sx={{ margin: 2, width: 1 }} onClick={copyToClipboard}>
          <Link component="button" color="inherit" onClick={copyToClipboard}>
            Click to copy link
          </Link>
          <Box>{copyLinkText || 'Only authorized users will be granted access.'}</Box>
        </Box>
      </Box>
    </Box>
  );
};

export default AccessCreated;
