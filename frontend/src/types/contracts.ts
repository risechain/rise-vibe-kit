export interface ContractEventArgs {
  user?: string;
  userId?: string;
  message?: string;
  msgId?: string | number;
  karma?: string | number;
  [key: string]: unknown;
}

export interface ContractEvent {
  address: string;
  topics: string[];
  data: string;
  transactionHash: string;
  blockNumber: string | null;
  logIndex?: number;
  timestamp?: Date;
  decoded?: boolean;
  eventName?: string;
  args?: ContractEventArgs;
  error?: string;
}

export interface TransactionResult {
  hash?: string;
  transactionHash?: string;
  txHash?: string;
  receipt?: {
    blockNumber: number;
    gasUsed: bigint;
    status?: 'success' | 'reverted';
    [key: string]: unknown;
  };
  gasUsed?: bigint | string;
  blockNumber?: number;
}