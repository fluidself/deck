type ReturnValueTest = {
  comparator: string;
  value: string;
};

export type BooleanCondition = {
  operator: 'and' | 'or';
};

export type AccessControlCondition = {
  contractAddress: string;
  chain: string;
  standardContractType: string;
  method: string;
  parameters: string[];
  returnValueTest: ReturnValueTest;
};

export type AuthSig = {
  sig: string;
  derivedVia: string;
  signedMessage: string;
  address: string;
};

export type ResourceId = {
  baseUrl: string;
  path: string;
  orgId: string;
  role: string;
  extraData: string;
};
