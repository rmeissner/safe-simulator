
require('dotenv').config()

import axios from 'axios'
import fs from 'fs'
import { ethers } from 'ethers'
import Ganache from 'ganache-core'
import { exit } from 'process'
import { HandlerAnalyzer, StepHandler } from '../src/analyzer'
import { CallHandler, StorageHandler } from '../src/handlers'
import { SafeInfoProvider } from '../src/info'
import { GanacheCoreConnector, GanacheV7Connector } from '../src/connectors'
import { Simulator } from '../src/simulator'
import { MultisigTransaction } from "../src/types"
import { decodeLog } from '../src/decoders/events'
import { decodeFunctionData } from '../src/decoders/functions'
import { decodeSafeStorageChange } from '../src/decoders/storages'
import { loadEventSignatures, loadFunctionSignatures } from '../src/decoders/4byte'

const loadSafeTx = async(): Promise<MultisigTransaction> => {
    const safeTxFile = process.env.SAFE_TX_FILE
    if (safeTxFile) {
        return JSON.parse(fs.readFileSync(safeTxFile, "utf-8"))
    }
    const safeTxHash = process.env.SAFE_TX_HASH
    if (safeTxHash) {
        const serviceUrl = process.env.SERVICE_URL
        if (!serviceUrl) throw Error("Require service URL to load tx by hash")
        const resp = await axios.get<MultisigTransaction>(`${serviceUrl}/api/v1/multisig-transactions/${safeTxHash}`)
        return resp.data
    }
    throw Error("Missing Safe tx information")
}

async function run(): Promise<void> {
    const verbose: boolean = process.env.VERBOSE === "true"
    const nodeUrl = process.env.NODE_URL
    const network = process.env.NETWORK!!
    const options: any = { dbPath: "/", fork: nodeUrl || network, gasLimit: 100_000_000, gasPrice: "0x0", vmErrorsOnRPCResponse: false, logging: { quiet: !verbose, verbose: verbose, debug: verbose } }
    const ganache = Ganache.provider(options)
    const connector = new GanacheCoreConnector(ganache)
    const simulator = new Simulator(connector, console.log)
    const provider = new ethers.providers.Web3Provider(connector as any)
    const infoProvider = new SafeInfoProvider(provider, console.log)
    const safeTx = await loadSafeTx()
    
    console.log(safeTx)
    const safeInfo = await infoProvider.loadInfo(safeTx.safe)
    console.log("Safe Information", safeInfo)

    const callHandler = new CallHandler()
    const storageHandler = new StorageHandler()
    const handlers: StepHandler[] = [
        callHandler,
        storageHandler
    ]
    const analyzer = new HandlerAnalyzer(handlers)
    const txHash = await simulator.simulateMultiSigTransaction(safeInfo, safeTx, analyzer)
    const txReceipt = await provider.getTransactionReceipt(txHash)
    console.log(JSON.stringify(callHandler.roots, undefined, " "))
    console.log("\n")
    console.log(`Storage changes on Safe ${safeTx.safe}:`)
    const safeStorageChanges = storageHandler.storageChanges.get(safeTx.safe)
    if (safeStorageChanges) {
        console.log("")
        safeStorageChanges.forEach((change) => console.log(decodeSafeStorageChange(change)))
    }
    console.log("\n")
    console.log("Other Storage Changes:")
    for (const [address, changes] of storageHandler.storageChanges) {
        if (address === safeTx.safe) continue
        console.log("")
        console.log("On", address)
        changes.forEach((change) => console.log(change))
    }
    console.log()
    console.log("\n")
    console.log(`Calls from Safe ${safeTx.safe}:`)
    const safeCalls = callHandler.calls.get(safeTx.safe)
    if (safeCalls) {
        console.log("")
        let i = 1
        for (const call of safeCalls) {
            const decodedData = await decodeFunctionData(call.data, loadFunctionSignatures)
            console.log(`Call ${i++}`)
            console.log(call)
            if (decodedData.length > 0) {
                console.log("Decoded data:")
                console.log(decodedData[0])
            }
            console.log("")
        }
    }
    console.log("")
    console.log("Other Calls:")
    for (const [caller, calls] of callHandler.calls.entries()) {
        if (caller === safeTx.safe) continue
        console.log("")
        console.log("From", caller)
        let i = 1
        for (const call of calls) {
            console.log(`Call ${i++}`)
            const decodedData = await decodeFunctionData(call.data, loadFunctionSignatures)
            console.log(call)
            if (decodedData.length > 0) {
                console.log("Decoded data:")
                console.log(decodedData[0])
            }
            console.log("")
        }
    }
    console.log("")
    console.log("Transaction Events:")
    for (const log of txReceipt.logs) {
        console.log("")
        const decodedData = await decodeLog(log, loadEventSignatures)
        if (decodedData.length === 0) {
            console.log("Unknown event:")
            console.log(log)
        } else {
            console.log("Decoded event:")
            console.log(`Emitted by ${log.address}`)
            console.log(decodedData[0])
        }
    }
    console.log("\n")
    console.log("Transaction Status:", txReceipt.status !== 0 ? "Success" : "Failed")
    console.log("Done")
}

run()
    .catch((e) => {
        console.error(e)
        exit(1)
    })
    .then(() => { exit(0) })