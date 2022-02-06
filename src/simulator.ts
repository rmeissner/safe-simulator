import { ethers } from "ethers"
import { EthereumProvider } from "ganache"
import { safeInterface } from "./contracts"
import { Analyzer, Logger, MultisigTransaction, SafeInfo } from "./types"

export class Simulator {

    private logger?: Logger

    constructor(private connector: EthereumProvider, logger?: Logger) {
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

    private async isNonceChange(storageSlot: string, storageBefore: string, storageAfter: string, usedNonce: number) {
        if (usedNonce < 0) return false
        // Nonce is stored at slot 5
        if (storageSlot !== "0x0000000000000000000000000000000000000000000000000000000000000005") return false
        const expectedOriginalNonce = ethers.BigNumber.from(storageBefore).toNumber()
        if (expectedOriginalNonce != usedNonce) {
            this.logger?.("Unexpected original nonce slot state (expected", usedNonce, "got", expectedOriginalNonce, ")")
            return false
        }
        const expectedNewNonce = ethers.BigNumber.from(storageAfter).toNumber()
        if (expectedNewNonce != (usedNonce + 1)) {
            this.logger?.("Unexpected new nonce slot state (expected", (usedNonce + 1), "got", expectedNewNonce, ")")
            return false
        }
        return true
    }

    async simulateMultiSigTransaction(safeInfo: SafeInfo, transaction: MultisigTransaction, analyzer?: Analyzer): Promise<string> {
        this.logger?.("Simulate Multisig Transaction")
        const approveHash = await this.getHashForCurrentNonce(safeInfo, transaction)
        for (const owner of safeInfo.owners) {
            this.logger?.("Prepare", owner)
            await this.connector.request({
                method: "evm_addAccount",
                params: [owner, ""]
            })
            await this.connector.request({
                method: "personal_unlockAccount",
                params: [owner, ""]
            })
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
        this.connector.on("ganache:vm:tx:step", (event) => {
            analyzer?.handleStep(event.data)
        });
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
        this.connector.clearListeners()
        return ethTxHash
    }
}