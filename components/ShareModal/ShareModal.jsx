import React, { useState, useEffect } from 'react';
import { IconX } from '@tabler/icons';
import { toast } from 'react-toastify';
import LitJsSdk from 'lit-js-sdk';
import { AbleToAccess, WhichWallet, AssetWallet, DAOMembers, AccessCreated, SelectTokens, ChoosePOAP } from './ShareModalSteps';
import UnsavedPopup from './UnsavedPopup';

const ModalComponents = {
  ableToAccess: AbleToAccess,
  whichWallet: WhichWallet,
  assetWallet: AssetWallet,
  DAOMembers: DAOMembers,
  accessCreated: AccessCreated,
  selectTokens: SelectTokens,
  choosePOAP: ChoosePOAP,
};

const ShareModal = props => {
  const {
    onClose = () => false,
    showStep,
    deckToShare = '',
    deckName = '',
    processingAccess,
    onAccessControlConditionsSelected,
  } = props;

  const [activeStep, setActiveStep] = useState(showStep || 'ableToAccess');
  const [tokenList, setTokenList] = useState([]);
  const [error, setError] = useState(null);
  const [showUnsavedPopup, setShowUnsavedPopup] = useState(false);

  useEffect(() => {
    const getTokens = async () => {
      // get token list and cache it
      const tokens = await LitJsSdk.getTokenList();
      setTokenList(tokens);
    };

    getTokens();
  }, []);

  useEffect(() => {
    if (error) {
      toast.error(`${error.title} - ${error.details}`);
    }
  }, [error]);

  const ModalComponent = props => {
    const { type } = props;

    let Component = ModalComponents[type];

    return (
      <Component
        {...props}
        deckToShare={deckToShare}
        deckName={deckName}
        processingAccess={processingAccess}
        onAccessControlConditionsSelected={onAccessControlConditionsSelected}
        tokenList={tokenList}
        setError={setError}
        onClose={onClose}
      />
    );
  };

  const handleClose = () => {
    if (!['ableToAccess', 'accessCreated'].includes(activeStep)) {
      setShowUnsavedPopup(true);
    } else {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-20 overflow-y-auto">
      <div className="fixed inset-0 bg-black opacity-30" onClick={handleClose} />
      <div className="flex items-center justify-center h-screen p-6">
        <div className="z-30 flex flex-col w-full h-full max-w-full bg-background border overflow-x-hidden overflow-y-scroll no-scrollbar border-gray-500 sm:max-h-[540px] sm:w-[740px] py-2 px-4 text-gray-100">
          <div className="flex flex-row justify-between items-center">
            <span></span>
            <button onClick={handleClose} className="mr-[-4px]">
              <IconX size={20} />
            </button>
          </div>
          <div className="mt-4">
            <div className="w-[654px] mx-auto">
              <ModalComponent type={activeStep} setActiveStep={setActiveStep} />
            </div>
            <UnsavedPopup open={showUnsavedPopup} onClose={onClose} onCancel={() => setShowUnsavedPopup(false)} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ShareModal;
