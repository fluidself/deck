import React, { useState, useEffect } from 'react';
import { Modal, Box, Typography, Snackbar, Alert, IconButton } from '@mui/material';
import { Close } from '@mui/icons-material';
import LitJsSdk from 'lit-js-sdk';

import {
  WhatToDo,
  AbleToAccess,
  WhichWallet,
  AssetWallet,
  DAOMembers,
  AccessCreated,
  SelectTokens,
  ChoosePOAP,
  // RecentRequirement,
  // CurrentRequirements,
} from './ShareModalSteps';
import UnsavedPopup from './UnsavedPopup';

const ModalComponents = {
  whatToDo: WhatToDo,
  ableToAccess: AbleToAccess,
  whichWallet: WhichWallet,
  assetWallet: AssetWallet,
  DAOMembers: DAOMembers,
  accessCreated: AccessCreated,
  selectTokens: SelectTokens,
  choosePOAP: ChoosePOAP,
  // recentRequirement: RecentRequirement,
  // currentRequirements: CurrentRequirements,
};

const ShareModal = props => {
  const {
    onClose = () => false,
    onBack = () => false,
    sharingItems = [],
    showStep,
    onAccessControlConditionsSelected,
    getSharingLink,
    onlyAllowCopySharingLink,
    copyLinkText,
    myWalletAddress,
  } = props;

  //console.log("rendering ShareModal and sharingItems is", sharingItems);

  const [showingSnackbar, setShowingSnackbar] = useState(false);
  const [activeStep, setActiveStep] = useState(showStep || 'whatToDo');
  const [tokenList, setTokenList] = useState([]);
  const [requirementCreated, setRequirementCreated] = useState(false);
  const [error, setError] = useState(null);
  const [openErrorSnackbar, setOpenErrorSnackbar] = useState(null);
  const [showUnsavedPopup, setShowUnsavedPopup] = useState(false);

  useEffect(() => {
    const go = async () => {
      // get token list and cache it
      const tokens = await LitJsSdk.getTokenList();
      setTokenList(tokens);
    };
    go();
  }, []);

  // useEffect(() => {
  //   if (activeStep !== "accessCreated") {
  //     setShowUnsavedPopup(true);
  //   }
  // }, [activeStep])

  useEffect(() => {
    setOpenErrorSnackbar(true);
  }, [error]);

  // console.log('accessControlConditions', accessControlConditions)

  const copyToClipboard = async () => {
    const fileUrl = getSharingLink(sharingItems[0]);
    await navigator.clipboard.writeText(fileUrl);
    setShowingSnackbar(true);
    setTimeout(() => setShowingSnackbar(false), 5000);
  };

  let totalAccessControlConditions = 1;
  if (sharingItems.length === 1) {
    if (sharingItems[0].additionalAccessControlConditions) {
      totalAccessControlConditions += sharingItems[0].additionalAccessControlConditions.length;
    }
  }

  const ModalComponent = props => {
    const { type } = props;

    let Component = ModalComponents[type];

    return (
      <Component
        {...props}
        onMainBack={onBack}
        sharingItems={sharingItems}
        copyToClipboard={copyToClipboard}
        onAccessControlConditionsSelected={onAccessControlConditionsSelected}
        tokenList={tokenList}
        onlyAllowCopySharingLink={onlyAllowCopySharingLink}
        copyLinkText={copyLinkText}
        setRequirementCreated={setRequirementCreated}
        requirementCreated={requirementCreated}
        setError={setError}
        myWalletAddress={myWalletAddress}
      />
    );
  };

  // const title = sharingItems.length > 1 ? `${sharingItems.length} Files` : sharingItems?.[0]?.name ?? '';
  let title = '';
  if (sharingItems.length > 0) {
    title = sharingItems.length > 1 ? `${sharingItems.length} Files` : `${sharingItems.length} File` ?? '';
  }

  const handleClose = () => {
    if (!['whatToDo', 'ableToAccess'].includes(activeStep)) {
      setShowUnsavedPopup(true);
    } else {
      onClose();
    }
  };

  return (
    <Modal open={true} onClose={onClose} aria-labelledby="modal-modal-title" aria-describedby="modal-modal-description">
      <Box
        sx={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          maxWidth: 'lg',
          bgcolor: 'background.paper',
          border: 1,
          borderColor: 'text.secondary',
          px: 3,
          pt: 1,
          pb: 3,
        }}
      >
        <Typography
          id="modal-modal-title"
          component="div"
          sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
        >
          <span>{title}</span>
          <IconButton onClick={handleClose} sx={{ marginRight: '-14px' }}>
            <Close />
          </IconButton>
        </Typography>
        <Typography variant="div" id="modal-modal-description" mt={2}>
          {error ? (
            <div>
              <div style={{ height: '24px' }} />
              <Snackbar open={openErrorSnackbar} autoHideDuration={5000}>
                <Alert severity={'error'}>
                  {error.title} - {error.details}
                </Alert>
              </Snackbar>
            </div>
          ) : null}
          <Box sx={{ width: 650 }}>
            <ModalComponent type={activeStep} setActiveStep={setActiveStep} />
            <Snackbar open={showingSnackbar} autoHideDuration={3000} message={'Copied!'} />
          </Box>
          <UnsavedPopup open={showUnsavedPopup} onClose={onClose} onCancel={() => setShowUnsavedPopup(false)} />
        </Typography>
      </Box>
    </Modal>
  );
};

export default ShareModal;
