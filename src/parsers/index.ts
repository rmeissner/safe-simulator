import { BigNumber, ethers } from "ethers"
import { StepData } from "../types"

const peekStack = (stack: Buffer[], position: number): Buffer => {
    const element = stack[stack.length - (position + 1)]
    // TODO: move to connector
    if ((element as any).words) {
        return (element as any).toBuffer()
    }
    return element
}

const loadMem = (memory: Buffer, location: number, size: number): Buffer => {
    return memory.slice(location, location + size)
}

export interface CallParams {
    gas: number,
    to: string,
    data: string,
    value: string
}

export interface StorageParams {
    slot: string,
    value: string
}

export const parseDelegateCall = (step: StepData): CallParams => {
    const gas = BigNumber.from(peekStack(step.stack, 0)).toNumber()
    const to = ethers.utils.getAddress(ethers.utils.hexlify(peekStack(step.stack, 1)))
    const dataLocation = BigNumber.from(peekStack(step.stack, 2)).toNumber()
    const dataSize = BigNumber.from(peekStack(step.stack, 3)).toNumber()
    const data = ethers.utils.hexlify(loadMem(step.memory, dataLocation, dataSize))
    return {
        gas,
        to,
        data,
        value: "0x0"
    }
}

export const parseCall = (step: StepData): CallParams => {
    const gas = BigNumber.from(peekStack(step.stack, 0)).toNumber()
    const to = ethers.utils.getAddress(ethers.utils.hexlify(peekStack(step.stack, 1)))
    const value = BigNumber.from(peekStack(step.stack, 2)).toHexString()
    const dataLocation = BigNumber.from(peekStack(step.stack, 3)).toNumber()
    const dataSize = BigNumber.from(peekStack(step.stack, 4)).toNumber()
    const data = ethers.utils.hexlify(loadMem(step.memory, dataLocation, dataSize))
    return {
        gas,
        to,
        value,
        data
    }
}

export const parseStorage = (step: StepData): StorageParams => {
    const slot = ethers.utils.hexlify(peekStack(step.stack, 0))
    const value = ethers.utils.hexlify(peekStack(step.stack, 1))
    return {
        slot,
        value
    }
}

export const parseReturn = (step: StepData) => {
    const dataLocation = BigNumber.from(peekStack(step.stack, 0)).toNumber()
    const dataSize = BigNumber.from(peekStack(step.stack, 1)).toNumber()
    const data = ethers.utils.hexlify(loadMem(step.memory, dataLocation, dataSize))
    return data
}