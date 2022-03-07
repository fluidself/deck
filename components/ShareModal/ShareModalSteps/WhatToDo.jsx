import React from 'react';
import { Box, Link } from '@mui/material';
import LockIcon from '@mui/icons-material/Lock';

const WhatToDo = ({ setActiveStep, sharingItems, onlyAllowCopySharingLink, copyToClipboard, copyLinkText }) => {
  return (
    <Box>
      <h3>What would you like to do?</h3>
      <Box sx={{ display: 'flex', flexWrap: 'flex', justifyContent: 'center', width: 1 }}>
        {!onlyAllowCopySharingLink ? (
          <Box
            sx={{ marginTop: 1, paddingY: 2, width: 1, border: 1, borderColor: 'text.secondary', cursor: 'pointer' }}
            onClick={() => setActiveStep('ableToAccess')}
          >
            <Box sx={{ textAlign: 'center' }}>Create Requirement</Box>
            <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
              <LockIcon sx={{ fontSize: 52, marginY: 2 }} />
              <Box>Lock this content with an existing token, NFT, or contract</Box>
            </Box>
          </Box>
        ) : null}

        {sharingItems.length === 1 && (sharingItems[0].accessControlConditions || onlyAllowCopySharingLink) ? (
          <Box
            sx={{ marginTop: 1, width: 1, border: 1, borderColor: 'text.secondary', cursor: 'pointer' }}
            onClick={copyToClipboard}
          >
            <Box>Share</Box>
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                border: 1,
                borderColor: 'text.secondary',
                cursor: 'pointer',
              }}
            >
              <Link component="button" color="inherit" onClick={copyToClipboard}>
                Click to copy link
              </Link>
              <Box>{copyLinkText || 'Only authorized wallets can open the file'}</Box>
            </Box>
          </Box>
        ) : null}
      </Box>
    </Box>
  );
};

export default WhatToDo;
