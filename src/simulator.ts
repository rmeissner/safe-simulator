import { ethers } from "ethers"
import Ganache, { EthereumProvider } from "ganache"
import { safeInterface } from "./contracts"
import { Analyzer, Logger, MultisigTransaction, SafeInfo } from "./types"

export class Simulator {

    readonly provider: EthereumProvider
    private logger?: Logger

    constructor(nodeUrlOrNetworkName: string, logger?: Logger) {
        const options: any = { dbPath: "/", fork: nodeUrlOrNetworkName, gasLimit: 100_000_000, gasPrice: "0x0", logging: { quiet: true, verbose: false, debug: false } }
        this.provider = Ganache.provider(options)
        this.logger = logger
    }

    private async getHashForCurrentNonce(safeInfo: SafeInfo, transaction: MultisigTransaction) {
        return await this.provider.send("eth_call", [{
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
        }, "latest"])
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
        this.logger?.("Client", await this.provider.send("web3_clientVersion", []))
        const approveHash = await this.getHashForCurrentNonce(safeInfo, transaction)
        for (const owner of safeInfo.owners) {
            this.logger?.("Prepare", owner)
            await this.provider.send("evm_addAccount", [owner, ""])
            await this.provider.send("personal_unlockAccount", [owner, ""])
            await this.provider.request({method: "eth_sendTransaction", params: [{
                to: safeInfo.address,
                data: safeInterface.encodeFunctionData("approveHash", [approveHash]),
                gas: ethers.BigNumber.from(100_000_000).toHexString(),
                from: owner
            }]})
        }
        const signatures = "0x" + safeInfo.owners
            .map(owner => owner.toLowerCase())
            .sort()
            .map((owner) => `000000000000000000000000${owner.slice(2)}000000000000000000000000000000000000000000000000000000000000000001`)
            .join("")
        this.logger?.("Signatures: " + signatures)
        this.provider.on("ganache:vm:tx:step", (event) => {
            analyzer?.handleStep(event.data)
        });
        const ethTxHash = await this.provider.request({method: "eth_sendTransaction", params: [{
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
        }]})
        this.provider.clearListeners()
        return ethTxHash
    }
}