
require('dotenv').config()

import axios from 'axios'
import { ethers } from 'ethers'
import { exit } from 'process'
import { HandlerAnalyzer, StepHandler } from '../src/analyzer'
import { CallHandler, StorageHandler } from '../src/handlers'
import { SafeInfoProvider } from '../src/info'
import { Simulator } from '../src/simulator'
import { MultisigTransaction } from "../src/types"

async function run(): Promise<void> {
    const verbose: boolean = process.env.VERBOSE === "true"
    const nodeUrl = process.env.NODE_URL
    const network = process.env.NETWORK!!
    const serviceUrl = process.env.SERVICE_URL!!
    const safeTxHash = process.env.SAFE_TX_HASH!!
    const simulator = new Simulator(nodeUrl || network)
    const provider = new ethers.providers.Web3Provider(simulator.provider as any)
    const infoProvider = new SafeInfoProvider(provider)
    const safeTx = await axios.get<MultisigTransaction>(`${serviceUrl}/api/v1/multisig-transactions/${safeTxHash}`)
    console.log(safeTx.data)
    const safeInfo = await infoProvider.loadInfo(safeTx.data.safe)
    console.log("Safe Information", safeInfo)

    const callHandler = new CallHandler()
    const storageHandler = new StorageHandler()
    const handlers: StepHandler[] = [ 
        callHandler,
        storageHandler
    ]
    const analyzer = new HandlerAnalyzer(handlers)
    const txHash = await simulator.simulateMultiSigTransaction(safeInfo, safeTx.data, analyzer)
    console.log(JSON.stringify(callHandler.roots, undefined, " "))
    console.log(callHandler.calls)
    console.log(storageHandler.storageChanges)
    const txReceipt = await provider.getTransactionReceipt(txHash)
    console.log("logs", txReceipt.logs)
    console.log("Done")
}

run()
    .catch((e) => { 
        console.error(e)
        exit(1) 
    })
    .then(() => { exit(0) })