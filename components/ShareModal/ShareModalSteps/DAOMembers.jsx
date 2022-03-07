import React, { useState } from 'react';
import { Box } from '@mui/material';
import InputWrapper from '../InputWrapper';
import ChainSelector from '../ChainSelector';
import Navigation from '../Navigation';

const DAOMembers = ({ setActiveStep, onAccessControlConditionsSelected }) => {
  const [DAOAddress, setDAOAddress] = useState('');
  const [chain, setChain] = useState(null);

  const handleSubmit = () => {
    const accessControlConditions = [
      {
        contractAddress: DAOAddress,
        standardContractType: 'MolochDAOv2.1',
        chain: chain.value,
        method: 'members',
        parameters: [':userAddress'],
        returnValueTest: {
          comparator: '=',
          value: 'true',
        },
      },
    ];
    onAccessControlConditionsSelected(accessControlConditions);
    setActiveStep('accessCreated');
  };

  return (
    <Box>
      <h3>Which DAO’s members should be able to access this asset?</h3>
      <Box mt={2}>
        <Box>
          <label>Select blockchain to check requirements against:</label>
          <ChainSelector chain={chain} setChain={setChain} />
        </Box>

        <Box mt={2}>
          <InputWrapper
            value={DAOAddress}
            label="Add DAO contract address"
            id="DAOAddress"
            autoFocus
            size="m"
            handleChange={value => setDAOAddress(value)}
          />
        </Box>
      </Box>
      <Box mt={2} fontSize={14}>
        Lit Gateway currently supports DAOs using the MolochDAOv2.1 contract (includes DAOhaus){' '}
      </Box>

      <Navigation
        backward={{ onClick: () => setActiveStep('ableToAccess') }}
        forward={{
          label: 'Create Requirement',
          onClick: handleSubmit,
          withoutIcon: true,
          disabled: !DAOAddress || !chain,
        }}
      />
    </Box>
  );
};

export default DAOMembers;
