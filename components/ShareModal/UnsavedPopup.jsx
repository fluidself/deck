import React from 'react';
import { Button, Modal, Box } from '@mui/material';

const UnsavedPopup = props => {
  const { onClose, onCancel, open } = props;

  return (
    <Modal open={open} hideBackdrop={true}>
      <Box
        sx={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          maxWidth: 'xs',
          bgcolor: 'background.paper',
          border: '1px solid white',
          p: 4,
          zIndex: 10,
        }}
      >
        You have unsaved changes. Are you sure you want to exit?
        <Box sx={{ display: 'flex', justifyContent: 'space-between', marginTop: 2 }}>
          <Button variant="outlined" color="inherit" onClick={onCancel}>
            No, keep editing
          </Button>
          <Button variant="outlined" color="inherit" onClick={onClose}>
            Yes, exit
          </Button>
        </Box>
      </Box>
    </Modal>
  );
};

export default UnsavedPopup;
