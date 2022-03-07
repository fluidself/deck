import React, { useState, useMemo } from 'react';
import { Modal, Box, Typography, Button, Autocomplete, TextField } from '@mui/material';

const Option = ({ children, data: { label, logo, symbol }, ...props }) => {
  const { onMouseMove, onMouseOver, ...rest } = props.innerProps;
  const newProps = Object.assign(props, { innerProps: rest });

  return (
    <components.Option {...newProps} style={{ padding: 0, zIndex: 105 }}>
      <div className="flex items-center h-24">
        <div
          className="w-9 h-9 rounded-full bg-black bg-no-repeat bg-contain bg-center mx-4"
          style={{ backgroundImage: logo ? `url(${logo})` : undefined }}
        />
        <div>
          <div>{label}</div>
          <div>{symbol}</div>
        </div>
      </div>
    </components.Option>
  );
};

const TOP_LIST = [
  {
    label: 'Ethereum',
    value: 'ethereum',
    symbol: 'ETH',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/0/05/Ethereum_logo_2014.svg',
  },
  {
    label: 'Lit Genesis Gate',
    logo: 'https://litgateway.com/favicon.png',
    value: '0xA3D109E28589D2AbC15991B57Ce5ca461Ad8e026',
    symbol: 'LITGATE',
    standard: 'ERC721',
  },
  {
    label: 'Art Blocks',
    logo: 'https://lh3.googleusercontent.com/sdPql8yt3eT5qmQfbCoU8a1I6aMNsqQEj6D1fMTuw101XKILNmzp7QVsdkGff2T39MgcHT-Aha18cWBqjCdhzRWzBw=s120',
    value: '0x059edd72cd353df5106d2b9cc5ab83a52287ac3a',
    symbol: 'BLOCKS',
    standard: 'ERC721',
  },
];

const TokenSelect = props => {
  const { tokenList, onSelect } = props;
  // console.log(tokenList);

  const [modalIsOpen, setModalIsOpen] = useState(false);
  const [selectedToken, setSelectedToken] = useState(null);

  const tokenSelectBoxRows = useMemo(() => {
    return [
      {
        label: 'Ethereum',
        value: 'ethereum',
        symbol: 'ETH',
        logo: 'https://upload.wikimedia.org/wikipedia/commons/0/05/Ethereum_logo_2014.svg',
      },
      ...tokenList.map(t => ({
        label: t.name,
        value: t.address,
        standard: t.standard,
        logo: t.logoURI,
        symbol: t.symbol,
      })),
    ];
  }, [tokenList]);

  const handleSelect = () => {
    onSelect(selectedToken);
    setModalIsOpen(false);
  };

  return (
    <Box>
      <Button size={'large'} sx={{ paddingY: 1.5 }} variant="outlined" color="inherit" onClick={() => setModalIsOpen(true)}>
        Search for a token/NFT
      </Button>

      <Modal open={modalIsOpen} onClose={() => setModalIsOpen(false)} aria-describedby="token-select-modal-description">
        <Box
          sx={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            maxWidth: 'lg',
            bgcolor: 'background.paper',
            border: '1px solid white',
            p: 4,
          }}
        >
          <Typography variant="div" id="token-select-modal-description" sx={{ mt: 2, width: 400 }}>
            <Box>
              <label>Top Tokens/NFTS</label>
              <Box sx={{ display: 'flex', marginY: 1 }}>
                {TOP_LIST.map((t, i) => (
                  <Box
                    key={t.symbol}
                    onClick={() => setSelectedToken(t)}
                    sx={{
                      paddingX: 1,
                      paddingY: '0.5px',
                      marginRight: 2,
                      display: 'flex',
                      alignItems: 'center',
                      cursor: 'pointer',
                      border: t && t['symbol'] && selectedToken && t['symbol'] === selectedToken['symbol'] ? 2 : 1,
                      backgroundColor:
                        t && t['symbol'] && selectedToken && t['symbol'] === selectedToken['symbol'] ? 'white' : 'black',
                      color: t && t['symbol'] && selectedToken && t['symbol'] === selectedToken['symbol'] ? 'black' : 'white',
                    }}
                  >
                    <Box
                      sx={{
                        width: 16,
                        height: 16,
                        borderRadius: '50%',
                        backgroundRepeat: 'no-repeat',
                        backgroundSize: 'contain',
                        backgroundPosition: 'center',
                        backgroundImage: t.logo ? `url(${t.logo})` : undefined,
                        marginRight: 1,
                        backgroundColor:
                          t && t['symbol'] && selectedToken && t['symbol'] === selectedToken['symbol'] ? 'white' : 'black',
                      }}
                    />
                    <Box>{t.symbol}</Box>
                  </Box>
                ))}
              </Box>
            </Box>
            <Box my={4}>
              <label>Search</label>
              {/* <Creatable
              filterOption={createFilter({ ignoreAccents: false })}
              classNamePrefix="react-select"
              components={{ Option, MenuList: WindowedMenuList }}
              isClearable
              isSearchable
              defaultValue={''}
              options={tokenSelectBoxRows}
              styles={{ menuPortal: base => ({ ...base, zIndex: 9999 }) }}
              menuPortalTarget={document.body}
              onChange={setSelectedToken}
            /> */}
              <Autocomplete
                options={tokenSelectBoxRows}
                onChange={setSelectedToken}
                renderInput={params => <TextField {...params} label="Select..." />}
                disableListWrap
              />
            </Box>

            <Button variant="outlined" color="inherit" size={'large'} disabled={!selectedToken} onClick={handleSelect}>
              Select
            </Button>
          </Typography>
        </Box>
      </Modal>
    </Box>
  );
};

export default TokenSelect;
