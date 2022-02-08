//import { EthereumProvider } from "ganache";
import { EvmConnector } from "..";
import { Analyzer } from "../types";

export class GanacheV7Connector implements EvmConnector {

    constructor(private provider: any /* EthereumProvider */) {}

    request(data: { method: string; params: any[]; }): Promise<any> {
        return this.provider.request(data as any)
    }

    async unlockAccount(address: string): Promise<void> {
        await this.request({
            method: "evm_addAccount",
            params: [address, ""]
        })
        await this.request({
            method: "personal_unlockAccount",
            params: [address, ""]
        })
    }

    registerAnalyzer(analyzer: Analyzer): void {
        this.provider.on("ganache:vm:tx:step", (step) => {
            analyzer.handleStep(step.data)
        })
    }
    unregisterAnalyzer(analyzer: Analyzer): void {
        this.provider.clearListeners()
    }
}