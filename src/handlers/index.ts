import { BigNumber, ethers } from "ethers"
import { StepHandler } from "../analyzer"
import { CallParams, parseCall, parseDelegateCall, parseReturn, parseStorage } from "../parsers"
import { StepData } from "../types"

export class StorageHandler implements StepHandler {
    readonly storageChanges: Map<string, any[]> = new Map()
    handle(data: StepData) {
        if (data.opcode.name !== "SSTORE") return

        const address = ethers.utils.getAddress(ethers.utils.hexlify(data.address))
        const changes = this.storageChanges.get(address) || []
        changes.push(parseStorage(data))
        this.storageChanges.set(address, changes)
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
    private returnOpCodes = ["REVERT", "RETURN"]
    private lastReturnData?: { data: string, depth: BigNumber }

    addCall(address: Buffer, data: ExtendedCallParams) {
        const a = ethers.utils.getAddress(ethers.utils.hexlify(address))
        const calls = this.calls.get(a) || []
        calls.push(data)
        this.calls.set(a, calls)
    }

    checkReturnData(data: StepData) {
        if (this.returnOpCodes.indexOf(data.opcode.name) < 0)
            return undefined
        const returnData = parseReturn(data)
        if (!returnData)
            return undefined
        this.lastReturnData = {
            data: returnData,
            depth: BigNumber.from(data.depth)
        }
    }

    getReturnData(depth: BigNumber): string | undefined {
        if (!this.lastReturnData || !depth.add(1).eq(this.lastReturnData.depth)) return undefined
        return this.lastReturnData.data
    }

    handle(data: StepData) {
        const current = this.currentCall
        this.checkReturnData(data)
        if (current && BigNumber.from(data.depth) <= current.depth) {
            current.params.returnData = this.getReturnData(current.depth)
            current.params.depth = current.depth.toString()
            this.currentCall = current?.parent
            current.parent = undefined
            this.lastReturnData = undefined
        }
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