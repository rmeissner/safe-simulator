import { BigNumberish } from "ethers"

export interface CheckResult {
    id: CheckId
    data?: CheckData
}

export interface CheckData {
    group: string
    message: any
}

export type CheckId = "info" | "unknown_delegatecall" | "target_self" | "delegatecall" | "change_safe_storage" | "check_error"

export interface Check {
    perform(info: SafeInfo, target: Target): Promise<CheckResult[]>
}

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

export interface SafeSnapContext {
    type: "safesnap",
    proposalHash?: string, 
    nonces: string[]
}

export type ModuleContext = SafeSnapContext

export interface ModuleTarget {
    type: "module",
    safe: string,
    module: string,
    context?: ModuleContext,
    txs: MetaTransaction[]
}

export interface MultisigTarget {
    type: "multisig",
    safe: string,
    tx: MultisigTransaction
}

export type Target = ModuleTarget | MultisigTarget

export interface SafeInfo {
    address: string,
    owners: string[],
    modules: string[],
    nonce: number,
    chainId: BigNumberish
}