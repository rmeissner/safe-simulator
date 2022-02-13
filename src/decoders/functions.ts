import { ethers } from "ethers";
import { FunctionFragment, Result } from "ethers/lib/utils";

export interface FunctionDecodingResult {
    signature: string,
    decoded: Result
}

const calculateMaxLength = (func: FunctionFragment): number | undefined => {
    let maxLegth = 66
    for (const input of func.inputs) {
        // Tuples and arrays extend the length ... ignore
        if (!!input.components || !!input.arrayLength) return undefined
        maxLegth += 64
    }
    return maxLegth
}

export const decodeFunctionData = async(data: string, signaturesProvider: (selector: string) => Promise<string[]>): Promise<FunctionDecodingResult[]> => {
    if (!ethers.utils.isHexString(data) || data.length < 10) throw Error("Invalid data provided")
    const selector = data.slice(0, 10)
    const signatures = await signaturesProvider(selector)
    const results: FunctionDecodingResult[] = []
    for (const signature of signatures) {
        try {
            const iface = new ethers.utils.Interface([signature])
            const func = iface.getFunction(selector)
            const minLength = func.inputs.length * 64 + 10
            if (data.length < minLength) continue
            const maxLegth = calculateMaxLength(func)
            if (maxLegth && data.length > maxLegth) continue
            const decoded = iface.decodeFunctionData(selector, data)
            results.push({ signature, decoded })
        } catch (e) {
            // Ignore, cannot decode data
        }
    }
    return results
}