import React, { useState } from 'react';
import { Box, Link } from '@mui/material';
import LitJsSdk from 'lit-js-sdk';
import InputWrapper from '../InputWrapper';
import ChainSelector from '../ChainSelector';
import Navigation from '../Navigation';

const WhichWallet = ({ setActiveStep, onAccessControlConditionsSelected, setError }) => {
  const [walletAddress, setWalletAddress] = useState('');
  const [chain, setChain] = useState(null);

  const handleSubmit = async () => {
    let resolvedAddress = walletAddress;
    if (walletAddress.includes('.')) {
      // do domain name lookup
      resolvedAddress = await LitJsSdk.lookupNameServiceAddress({
        chain: chain.value,
        name: walletAddress,
      });
      if (!resolvedAddress) {
        console.log('failed to resolve ENS address');
        setError({
          title: 'Could not resolve ENS address',
          details: 'Try another wallet address',
        });
        return;
      }
    }
    const accessControlConditions = [
      {
        contractAddress: '',
        standardContractType: '',
        chain: chain.value,
        method: '',
        parameters: [':userAddress'],
        returnValueTest: {
          comparator: '=',
          value: resolvedAddress,
        },
      },
    ];
    onAccessControlConditionsSelected(accessControlConditions);
    setActiveStep('accessCreated');
  };

  return (
    <Box>
      <Box>
        <h3>Which wallet should be able to access this asset?</h3>
        <Link
          component="button"
          color="inherit"
          fontFamily="inherit"
          fontSize="inherit"
          onClick={() => setActiveStep('assetWallet')}
        >
          Grant Access on NFT Ownership
        </Link>
      </Box>
      <Box mt={2}>
        <div>
          <label>Select blockchain</label>
          <ChainSelector chain={chain} setChain={setChain} />
        </div>
        <InputWrapper
          value={walletAddress}
          label="Add Wallet Address or Blockchain Domain (e.g. ENS, UNS) here:"
          id="walletAddress"
          autoFocus
          size="m"
          handleChange={value => setWalletAddress(value)}
          mt={2}
        />
      </Box>

      <Navigation
        backward={{ onClick: () => setActiveStep('ableToAccess') }}
        forward={{
          label: 'Create Requirement',
          onClick: handleSubmit,
          withoutIcon: true,
          disabled: !walletAddress || !chain,
        }}
      />
    </Box>
  );
};

export default WhichWallet;
