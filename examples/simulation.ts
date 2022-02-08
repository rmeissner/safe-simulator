
require('dotenv').config()

import axios from 'axios'
import { ethers } from 'ethers'
import Ganache from 'ganache-core'
import { exit } from 'process'
import { HandlerAnalyzer, StepHandler } from '../src/analyzer'
import { CallHandler, StorageHandler } from '../src/handlers'
import { SafeInfoProvider } from '../src/info'
import { GanacheCoreConnector, GanacheV7Connector } from '../src/connectors'
import { Simulator } from '../src/simulator'
import { MultisigTransaction } from "../src/types"

async function run(): Promise<void> {
    const verbose: boolean = process.env.VERBOSE === "true"
    const nodeUrl = process.env.NODE_URL
    const network = process.env.NETWORK!!
    const serviceUrl = process.env.SERVICE_URL!!
    const safeTxHash = process.env.SAFE_TX_HASH!!
    const options: any = { dbPath: "/", fork: nodeUrl || network, gasLimit: 100_000_000, gasPrice: "0x0", vmErrorsOnRPCResponse: false, logging: { quiet: !verbose, verbose: verbose, debug: verbose } }
    const ganache = Ganache.provider(options)
    const connector = new GanacheCoreConnector(ganache)
    const simulator = new Simulator(connector, console.log)
    const provider = new ethers.providers.Web3Provider(connector as any)
    const infoProvider = new SafeInfoProvider(provider, console.log)
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
    console.log("status", txReceipt.status)
    console.log("logs", txReceipt.logs)
    console.log("Done")
}

run()
    .catch((e) => { 
        console.error(e)
        exit(1) 
    })
    .then(() => { exit(0) })