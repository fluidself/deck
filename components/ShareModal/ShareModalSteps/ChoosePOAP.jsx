import React, { useState } from 'react';
import Autocomplete from '@mui/material/Autocomplete';
import TextField from '@mui/material/TextField';

import InputWrapper from '../InputWrapper';
import Navigation from '../Navigation';

const matchConditionOptions = [
  {
    label: 'Equals POAP Name exactly',
    id: 'equals',
    value: '=',
  },
  {
    label: 'Contains POAP Name',
    id: 'contains',
    value: 'contains',
  },
];

const DAOMembers = ({ setActiveStep, onAccessControlConditionsSelected }) => {
  const [POAPName, setPOAPName] = useState('');
  const [matchCondition, setMatchCondition] = useState(null);

  const handleSubmit = () => {
    const chain = 'xdai';
    const accessControlConditions = [
      {
        contractAddress: '0x22C1f6050E56d2876009903609a2cC3fEf83B415',
        standardContractType: 'ERC721',
        chain,
        method: 'balanceOf',
        parameters: [':userAddress'],
        returnValueTest: {
          comparator: '>',
          value: '0',
        },
      },
      {
        contractAddress: '0x22C1f6050E56d2876009903609a2cC3fEf83B415',
        standardContractType: 'POAP',
        chain,
        method: 'tokenURI',
        parameters: [],
        returnValueTest: {
          comparator: matchCondition.value,
          value: POAPName,
        },
      },
    ];
    onAccessControlConditionsSelected(accessControlConditions);
    setActiveStep('accessCreated');
  };

  return (
    <div>
      <h4>Which POAP should be able to access this asset?</h4>
      <div className="mt-8 max-w-[396px]">
        <InputWrapper
          value={POAPName}
          label="POAP Name"
          id="POAPName"
          autoFocus
          size="m"
          handleChange={value => setPOAPName(value)}
        />
        <div className="mt-4">
          <label>Match Conditions</label>
          {/* <Select
            classNamePrefix="react-select"
            placeholder="Select one..."
            isClearable
            options={matchConditionOptions}
            value={matchCondition}
            // menuPortalTarget={document.body}
            onChange={(value) => setMatchCondition(value)}
          /> */}
          <Autocomplete
            options={matchConditionOptions}
            onChange={value => setMatchCondition(value)}
            renderInput={params => <TextField {...params} label="Select one..." />}
          />
        </div>
      </div>

      <Navigation
        backward={{ onClick: () => setActiveStep('ableToAccess') }}
        forward={{
          label: 'Create Requirement',
          onClick: handleSubmit,
          withoutIcon: true,
          disabled: !POAPName || !matchCondition,
        }}
      />
    </div>
  );
};

export default DAOMembers;