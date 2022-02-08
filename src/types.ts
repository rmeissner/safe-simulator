import { BigNumberish } from "ethers"

export interface MetaTransaction {
    to: string,
    value: string,
    data: string,
    operation: number,
}

export interface MultisigTransaction extends MetaTransaction {
    safe: string,
    safeTxGas: string,
    baseGas: string,
    gasPrice: string,
    gasToken: string,
    refundReceiver: string,
    nonce: number,
    safeTxHash: string
}

export interface SafeInfo {
    address: string,
    owners: string[],
    modules: string[],
    nonce: number,
    chainId: BigNumberish
}

export type Logger = (message?: any, ...optionalParams: any[]) => void

export interface Analyzer {
    handleStep(data: StepData): void
}

export interface StepData {
    account: {
        nonce: bigint;
        balance: bigint;
        stateRoot: Buffer;
        codeHash: Buffer;
    };
    address: Buffer;
    codeAddress: Buffer;
    depth: bigint;
    gasLeft: bigint;
    gasRefund: bigint;
    memory: Buffer;
    memoryWordCount: bigint;
    opcode: {
        name: string;
        fee: number;
    };
    pc: bigint;
    returnStack: Buffer[];
    stack: Buffer[];
};

export interface EvmConnector {
    request(data: { method: string, params: any[] }): Promise<any>
    unlockAccount(address: string): Promise<void>
    registerAnalyzer(analyzer: Analyzer): void
    unregisterAnalyzer(analyzer: Analyzer): void
}