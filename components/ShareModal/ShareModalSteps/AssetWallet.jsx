import React, { useState, useMemo } from 'react';
import { Box, Autocomplete, Link, TextField } from '@mui/material';

import InputWrapper from '../InputWrapper';
import ChainSelector from '../ChainSelector';
import Navigation from '../Navigation';

const AssetWallet = ({ setActiveStep, onAccessControlConditionsSelected, tokenList }) => {
  const [tokenId, setTokenId] = useState('');
  const [chain, setChain] = useState(null);
  const [selectedToken, setSelectedToken] = useState(null);

  const tokenSelectBoxRows = useMemo(() => {
    return tokenList
      .filter(t => t.standard?.toLowerCase() === 'erc721')
      .map(t => ({
        label: t.name,
        value: t.address,
      }));
  }, [tokenList]);

  const handleSubmit = () => {
    const accessControlConditions = [
      {
        contractAddress: selectedToken.value,
        standardContractType: 'ERC721',
        chain: chain.value,
        method: 'ownerOf',
        parameters: [tokenId],
        returnValueTest: {
          comparator: '=',
          value: ':userAddress',
        },
      },
    ];
    onAccessControlConditionsSelected(accessControlConditions);
    setActiveStep('accessCreated');
  };

  return (
    <Box>
      <Box>
        <h3>Which asset does a wallet need to own to access this?</h3>
        <Link
          component="button"
          color="inherit"
          fontFamily="inherit"
          fontSize="inherit"
          onClick={() => setActiveStep('whichWallet')}
        >
          Grant Access to Wallet or Blockchain Domain
        </Link>
      </Box>
      <Box mt={2}>
        <Box mt={2}>
          <label>Select blockchain</label>
          <ChainSelector chain={chain} setChain={setChain} />
        </Box>
        <Box mt={2}>
          <label>Select token or enter contract address</label>
          {/* <Creatable
            isClearable
            isSearchable
            defaultValue={""}
            options={tokenSelectBoxRows}
            onChange={(value) => setSelectedToken(value)}
          /> */}
          <Autocomplete
            options={tokenSelectBoxRows}
            onChange={value => setSelectedToken(value)}
            renderInput={params => <TextField {...params} />}
          />
        </Box>
        <InputWrapper
          value={tokenId}
          label="Add Token ID"
          id="tokenId"
          size="m"
          handleChange={value => setTokenId(value)}
          mt={2}
        />
      </Box>
      <Navigation
        backward={{ onClick: () => setActiveStep('ableToAccess') }}
        forward={{
          label: 'Create Requirement',
          onClick: handleSubmit,
          withoutIcon: true,
          disabled: !tokenId || !chain,
        }}
      />
    </Box>
  );
};

export default AssetWallet;
