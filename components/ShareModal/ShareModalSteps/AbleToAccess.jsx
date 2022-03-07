import React from 'react';
import { Box } from '@mui/material';
import { WalletIcon, TokenIcon, DAOIcon, POAPIcon } from '../icons';

const TypeButton = props => {
  const { type, icon, title, onClick } = props;

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        paddingY: 1,
        width: 180,
        height: 148,
        border: 1,
        borderColor: 'text.secondary',
        cursor: 'pointer',
      }}
      onClick={() => onClick(type)}
    >
      {icon}
      <Box sx={{ marginBottom: 1, textAlign: 'center' }}>{title}</Box>
    </Box>
  );
};

const ITEMS = [
  {
    type: 'whichWallet',
    icon: <WalletIcon />,
    title: 'An Individual Wallet',
  },
  {
    type: 'selectTokens',
    icon: <TokenIcon />,
    title: 'A Group of Token or NFT Owners',
  },
  {
    type: 'DAOMembers',
    icon: <DAOIcon />,
    title: 'DAO Members',
  },
  {
    type: 'choosePOAP',
    icon: <POAPIcon />,
    title: 'POAP Collectors',
  },
];

const AbleToAccess = props => {
  const { setActiveStep } = props;

  return (
    <Box mb={2}>
      <h3>Who should be able to access this asset?</h3>
      <Box sx={{ display: 'grid', gridTemplateColumns: '180px 180px', gap: 2, justifyContent: 'center', marginTop: 6 }}>
        {ITEMS.map((item, i) => (
          <TypeButton key={i} {...item} onClick={setActiveStep} />
        ))}
      </Box>
    </Box>
  );
};

export default AbleToAccess;
