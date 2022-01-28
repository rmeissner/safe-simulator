
require('dotenv').config()

import axios from 'axios'
import { SafeInfoProvider } from '../src/info'
import { Simulator } from '../src/simulator'
import { Check, CheckResult, MultisigTransaction } from "../src/types"

async function run(): Promise<void> {
    const verbose: boolean = process.env.VERBOSE === "true"
    const nodeUrl: string = process.env.NODE_URL!!
    const serviceUrl: string = process.env.SERVICE_URL!!
    const safeTxHash: string = process.env.SAFE_TX_HASH!!
    const infoProvider = new SafeInfoProvider(nodeUrl)
    const safeTx = await axios.get<MultisigTransaction>(`${serviceUrl}/api/v1/multisig-transactions/${safeTxHash}`)
    console.log(safeTx.data)
    const safeInfo = await infoProvider.loadInfo(safeTx.data.safe)
    console.log("Safe Information", safeInfo)


    const simulator = new Simulator(nodeUrl)
    const results: CheckResult[] = []
    await simulator.simulateMultiSigTransaction(safeInfo, safeTx.data, results)
    console.log({results})
}

run()