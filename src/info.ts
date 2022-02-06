import { ethers } from "ethers";
import { AddressOne, safeInterface } from "./contracts";
import { Logger, SafeInfo } from "./types";

export class SafeInfoProvider {
    readonly provider: ethers.providers.Provider
    private logger?: Logger

    static withNodeUrl(nodeUrl: string, logger?: Logger): SafeInfoProvider {
        return new this(new ethers.providers.JsonRpcProvider(nodeUrl), logger)
    }

    constructor(provider: ethers.providers.Provider, logger?: Logger) {
        this.provider = provider
        this.logger = logger
    }

    async loadInfo(safeAddress: string): Promise<SafeInfo> {
        const safe = new ethers.Contract(safeAddress, safeInterface, this.provider)
        let modules = []
        try {
            const modulePage = await safe.getModulesPaginated(AddressOne, 10)
            modules = modulePage[0]
        } catch (error) {
            this.logger?.(error)
            try {
                modules = await safe.getModules()
            } catch (error) {
                this.logger?.(error)
            }
        }
        const network = await this.provider.getNetwork()
        return {
            address: ethers.utils.getAddress(safeAddress),
            owners: await safe.getOwners(),
            modules,
            nonce: (await safe.nonce()).toNumber(),
            chainId: network.chainId
        }
    }
}