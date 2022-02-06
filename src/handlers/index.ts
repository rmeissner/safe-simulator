import { BigNumber, ethers } from "ethers"
import { StepHandler } from "../analyzer"
import { parseCall, parseDelegateCall, parseReturn, parseStorage } from "../parsers"
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
    
    results(): void {
        console.log(JSON.stringify(this.storageChanges, undefined, " "))
    }
}

export interface CallElement {
    type: string
    meta: any
    returnData?: string
    depth: BigNumber
    parent?: CallElement
    children: CallElement[]
}

export class CallHandler implements StepHandler {

    readonly calls: Map<string, any[]> = new Map()
    readonly roots: CallElement[] = []
    private currentCall?: CallElement
    private previousStep?: StepData

    addCall(address: Buffer, data: any) {
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
            current.meta.returnData = this.getReturnData()
            this.currentCall = current?.parent
            current.parent = undefined
        }
        this.previousStep = data
        if (data.opcode.name === "CALL") {
            const parent = current
            const element: CallElement = {
                type: data.opcode.name,
                meta: parseCall(data),
                depth: BigNumber.from(data.depth),
                parent,
                children: []
            }
            parent?.children.push(element)
            if (!parent) {
                this.roots.push(element)
            }
            this.addCall(data.address, element.meta)
            this.currentCall = element
        } else if (data.opcode.name === "DELEGATECALL") {
            const parent = current
            const element: CallElement = {
                type: data.opcode.name,
                meta: parseDelegateCall(data),
                depth: BigNumber.from(data.depth),
                parent,
                children: []
            }
            parent?.children.push(element)
            if (!parent) {
                this.roots.push(element)
            }
            this.currentCall = element
        }
    }

    results(): void {
        console.log(JSON.stringify(this.roots, undefined, " "))
        console.log(JSON.stringify(this.calls, undefined, " "))
    }
}