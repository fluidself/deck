import type { NextPage } from 'next';
import Head from 'next/head';
import { useState } from 'react';
import { Container, Box, Stack, Typography, Button } from '@mui/material';
// import Navbar from '../components/Navbar';
import { ShareModal } from '../components/ShareModal';

const Home: NextPage = () => {
  const [open, setOpen] = useState<boolean>(false);
  const [selectedConditions, setSelectedConditions] = useState(null);

  return (
    <>
      <Head>
        <title>DECK</title>
        <meta name="description" content="Decentralized and Encrypted Collaborative Knowledge" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <Container>
        {/* <Navbar /> */}
        <Box component="main" sx={{ mt: 28, p: 2, border: 1, borderColor: 'text.secondary' }}>
          <Typography component="h1" mb={4}>
            Decentralized and Encrypted Collaborative Knowledge
          </Typography>
          <Stack spacing={2} sx={{ width: '15%' }}>
            <Button variant="outlined" color="inherit">
              Connect wallet
            </Button>
            <Button variant="outlined" color="inherit" onClick={() => setOpen(true)}>
              Open Modal
            </Button>
          </Stack>
          {open && (
            <ShareModal
              onClose={() => setOpen(false)}
              onAccessControlConditionsSelected={(acc: any) => {
                console.log('Access control conditions selected: ', acc);
                setSelectedConditions(acc);
                setOpen(false);
              }}
              // showStep={'whatToDo'}
              showStep={'ableToAccess'}
            />
          )}

          {selectedConditions ? (
            <>
              <h3>Selected conditions: </h3>
              <pre>{JSON.stringify(selectedConditions, null, 2)}</pre>
            </>
          ) : null}
        </Box>
      </Container>
    </>
  );
};

export default Home;
