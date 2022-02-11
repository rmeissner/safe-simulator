
require('dotenv').config()

import { ethers } from 'ethers'
import Ganache from 'ganache'
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

async function run(): Promise<void> {
    const verbose: boolean = process.env.VERBOSE === "true"
    const nodeUrl = process.env.NODE_URL
    const network = process.env.NETWORK!!
    const serviceUrl = process.env.SERVICE_URL!!
    const safeTxHash = process.env.SAFE_TX_HASH!!
    const options: any = { dbPath: "/", fork: nodeUrl || network, gasLimit: 100_000_000, gasPrice: "0x0", vmErrorsOnRPCResponse: false, logging: { quiet: !verbose, verbose: verbose, debug: verbose } }
    const ganache = Ganache.provider(options)
    const connector = new GanacheV7Connector(ganache)
    const simulator = new Simulator(connector, console.log)
    const provider = new ethers.providers.Web3Provider(connector as any)
    const infoProvider = new SafeInfoProvider(provider, console.log)
    //const resp = await axios.get<MultisigTransaction>(`${serviceUrl}/api/v1/multisig-transactions/${safeTxHash}`)
    //const safeTx = resp.data
    
    // It is also possible to directly define the tx
    const safeTx: MultisigTransaction = {
        safe: "0xcd1883D83aEd27a87cC7572eb8F9855A0BdD944e",
        to: "0x40A2aCCbd92BCA938b02010E17A5b8929b49130D",
        value: "0",
        //data: new ethers.utils.Interface(["function withdraw() external"]).encodeFunctionData("withdraw", []),
        data: "0x8d80ff0a00000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000112006810e776880c02933d47db1b9fc05908e5386b9600000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000044095ea7b30000000000000000000000004f8ad938eba0cd19155a835f617317a6e788c8680000000000000000000000000000000000000000000000b8e7bfde5db9bbc000004f8ad938eba0cd19155a835f617317a6e788c86800000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000024b6b55f250000000000000000000000000000000000000000000000b8e7bfde5db9bbc0000000000000000000000000000000",
        operation: 1,
        nonce: 0,
        safeTxGas: "0",
        baseGas: "0",
        gasPrice: "0",
        gasToken: ethers.constants.AddressZero,
        refundReceiver: ethers.constants.AddressZero,
        safeTxHash: ""
    }
    
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