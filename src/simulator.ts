import { ethers } from "ethers"
import { EvmConnector } from "."
import { safeInterface } from "./contracts"
import { Analyzer, Logger, MultisigTransaction, SafeInfo } from "./types"

export class Simulator {

    private logger?: Logger

    constructor(private connector: EvmConnector, logger?: Logger) {
        this.logger = logger
    }

    private async getHashForCurrentNonce(safeInfo: SafeInfo, transaction: MultisigTransaction) {
        return await this.connector.request({
            method: "eth_call",
            params: [{
                to: safeInfo.address,
                data: safeInterface.encodeFunctionData("getTransactionHash", [
                    transaction.to,
                    transaction.value,
                    transaction.data || "0x",
                    transaction.operation,
                    transaction.safeTxGas,
                    transaction.baseGas,
                    transaction.gasPrice,
                    transaction.gasToken,
                    transaction.refundReceiver,
                    safeInfo.nonce
                ])
            }, "latest"]
        })
    }

    async simulateMultiSigTransaction(safeInfo: SafeInfo, transaction: MultisigTransaction, analyzer?: Analyzer): Promise<string> {
        this.logger?.("Simulate Multisig Transaction")
        const approveHash = await this.getHashForCurrentNonce(safeInfo, transaction)
        for (const owner of safeInfo.owners) {
            this.logger?.("Prepare", owner)
            await this.connector.unlockAccount(owner)
            await this.connector.request({
                method: "eth_sendTransaction",
                params: [{
                    to: safeInfo.address,
                    data: safeInterface.encodeFunctionData("approveHash", [approveHash]),
                    gas: ethers.BigNumber.from(100_000_000).toHexString(),
                    from: owner
                }]
            })
        }
        const signatures = "0x" + safeInfo.owners
            .map(owner => owner.toLowerCase())
            .sort()
            .map((owner) => `000000000000000000000000${owner.slice(2)}000000000000000000000000000000000000000000000000000000000000000001`)
            .join("")
        this.logger?.("Signatures: " + signatures)
        if (analyzer) this.connector.registerAnalyzer(analyzer);
        const ethTxHash = await this.connector.request({
            method: "eth_sendTransaction", params: [{
                to: safeInfo.address,
                data: safeInterface.encodeFunctionData("execTransaction", [
                    transaction.to,
                    transaction.value,
                    transaction.data || "0x",
                    transaction.operation,
                    transaction.safeTxGas,
                    transaction.baseGas,
                    transaction.gasPrice,
                    transaction.gasToken,
                    transaction.refundReceiver,
                    signatures
                ]),
                from: safeInfo.owners[0],
                gas: ethers.BigNumber.from(100_000_000).toHexString()
            }]
        })
        if (analyzer) this.connector.unregisterAnalyzer(analyzer)
        return ethTxHash
    }
}