//import Ganache, { JsonRpcPayload, JsonRpcResponse } = require("ganache-core");
import { EvmConnector } from "..";
import promisify from "util.promisify"
import { Analyzer } from "../types";

export class GanacheCoreConnector implements EvmConnector {
    //private sendPromisify: (arg: JsonRpcPayload) => Promise<JsonRpcResponse | undefined>
    private sendPromisify: (arg: any) => Promise<any | undefined>

    constructor(private provider: any /* Ganache.Provider */) {
        this.sendPromisify = promisify(this.provider.send.bind(this.provider))
    }

    async unlockAccount(address: string): Promise<void> {
        await this.request({
            method: "evm_unlockUnknownAccount",
            params: [address]
        })
    }

    async request(data: { method: string; params: any[]; }): Promise<any> {
        const request = { jsonrpc: "2.0", id: Math.random().toString(35), method: data.method, params: data.params }
        const resp = await this.sendPromisify(request)
        if (resp?.error) {
            throw Error(resp?.error)
        }
        return resp?.result

    }

    registerAnalyzer(analyzer: Analyzer): void {
        const vm = this.provider.manager.state.blockchain.vm
        vm.on('step', function (data: any) {
            analyzer.handleStep(data)
        })
    }
    unregisterAnalyzer(analyzer: Analyzer): void {
        const vm = this.provider.manager.state.blockchain.vm
        vm.removeAllListeners()
    }
}