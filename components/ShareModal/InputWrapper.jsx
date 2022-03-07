import React from 'react';
import { Box, IconButton, TextField, Typography } from '@mui/material';
import { Close } from '@mui/icons-material';

const InputWrapper = ({
  type = 'text',
  id,
  label,
  error,
  value,
  handleChange = () => false,
  readOnly = false,
  autoFocus = false,
  placeholder,
  size,
  clearable = false,
  onClear = () => false,
  ...props
}) => {
  const getState = () => {
    if (error) {
      return 'alert';
    }
    return undefined;
  };
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column' }} {...props}>
      {label && <label htmlFor={id}>{label}</label>}
      <Box sx={{ display: 'relative', w: 1 }}>
        {clearable && (
          <IconButton
            size="s"
            sx={{ display: 'absolute', right: 10, bottom: '31%', zIndex: 'tooltip', cursor: 'pointer' }}
            onClick={onClear}
          >
            <Close />
          </IconButton>
        )}
        <TextField
          readOnly={readOnly}
          type={type}
          id={id}
          state={getState()}
          value={value}
          onChange={event => handleChange(event.target.value)}
          autoFocus={autoFocus}
          placeholder={placeholder}
          size={size}
          fullWidth
        />
      </Box>
      {error && <Typography sx={{ color: 'error.main', paddingLeft: 2, marginTop: 1 }}>{error}</Typography>}
    </Box>
  );
};

export default InputWrapper;
