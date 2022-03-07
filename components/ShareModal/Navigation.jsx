import React from 'react';
import { Box, Button } from '@mui/material';
import { ArrowBack, ArrowForward } from '@mui/icons-material';

const Navigation = props => {
  const { backward, forward } = props;

  return (
    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
      {backward ? (
        <Button variant="outlined" onClick={backward.onClick} size="large" color="inherit" startIcon={<ArrowBack />}>
          {backward?.label ?? 'Back'}
        </Button>
      ) : null}

      {forward ? (
        <Button
          onClick={forward.onClick}
          variant="outlined"
          size="large"
          color="inherit"
          disabled={forward.disabled}
          endIcon={<ArrowForward />}
        >
          {forward.label ?? 'Next'}
        </Button>
      ) : null}
    </Box>
  );
};

export default Navigation;
