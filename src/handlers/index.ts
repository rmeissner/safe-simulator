import { BigNumber, ethers } from "ethers"
import { StepHandler } from "../analyzer"
import { CallParams, parseCall, parseDelegateCall, parseReturn, parseStorage } from "../parsers"
import { StepData } from "../types"

export class StorageHandler implements StepHandler {
    readonly storageChanges: Map<string, any[]> = new Map()
    handle(data: StepData) {
        if(data.opcode.name !== "SSTORE") return 
        
        const address = ethers.utils.getAddress(ethers.utils.hexlify(data.address))
        if(!this.storageChanges[address]) {
            this.storageChanges[address] = []
        }
        this.storageChanges[address].push(
            parseStorage(data)
        )
    }
}

export interface ExtendedCallParams extends CallParams {
    returnData?: string,
    depth?: string
}

export interface CallElement {
    type: string
    params: ExtendedCallParams
    depth: BigNumber
    parent?: CallElement
    children: CallElement[]
}

export class CallHandler implements StepHandler {

    readonly calls: Map<string, ExtendedCallParams[]> = new Map()
    readonly roots: CallElement[] = []
    private parseFunctions: Record<string, (data: StepData) => CallParams> = {
        "CALL": parseCall,
        "DELEGATECALL": parseDelegateCall,
    }
    private currentCall?: CallElement
    private previousStep?: StepData

    addCall(address: Buffer, data: ExtendedCallParams) {
        const a = ethers.utils.getAddress(ethers.utils.hexlify(address))
        if(!this.calls[a]) {
            this.calls[a] = []
        }
        this.calls[a].push(data)
    }

    getReturnData(): string | undefined {
        if (this.previousStep?.opcode.name === "RETURN")
            return parseReturn(this.previousStep)
        if (this.previousStep?.opcode.name === "REVERT")
            return parseReturn(this.previousStep)
        return undefined
    }

    handle(data: StepData) {
        const current = this.currentCall
        if(current && BigNumber.from(data.depth) <= current.depth) {
            current.params.returnData = this.getReturnData()
            current.params.depth = current.depth.toString()
            this.currentCall = current?.parent
            current.parent = undefined
        }
        this.previousStep = data
        const parseFunction = this.parseFunctions[data.opcode.name]
        if (!parseFunction) return
        const parent = current
        const element: CallElement = {
            type: data.opcode.name,
            params: parseFunction(data),
            depth: BigNumber.from(data.depth),
            parent,
            children: []
        }
        parent?.children.push(element)
        if (!parent) {
            this.roots.push(element)
        }
        if (element.type === "CALL") {
            this.addCall(data.address, element.params)
        }
        this.currentCall = element
    }
}