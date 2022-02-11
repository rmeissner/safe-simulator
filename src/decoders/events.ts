import { ethers } from "ethers";
import { Result } from "ethers/lib/utils";

export interface DecodingResult {
    signature: string,
    decoded: Result
}

export const decodeLog = async(log: ethers.providers.Log, signaturesProvider: (topic: string) => Promise<string[]>): Promise<DecodingResult[]> => {
    if (log.topics.length === 0) throw Error("No topics provided")
    const signatures = await signaturesProvider(log.topics[0])
    const results: DecodingResult[] = []
    for (const signature of signatures) {
        try {
            const iface = new ethers.utils.Interface([signature])
            const event = iface.getEvent(log.topics[0])
            let signatureWithIndexed = "event " + event.name + "("
            event.inputs.forEach((input, index) => {
                if (index > 0) {
                    signatureWithIndexed += ","
                }
                signatureWithIndexed += input.baseType
                if (index < log.topics.length - 1) {
                    signatureWithIndexed += " indexed"
                }
            })
            signatureWithIndexed += ")"
            const ifaceIndexed = new ethers.utils.Interface([signatureWithIndexed])
            const decoded = ifaceIndexed.decodeEventLog(log.topics[0], log.data, log.topics)
            results.push({ signature: signatureWithIndexed, decoded })
        } catch (e) {
            // Ignore, cannot decode data
        }
    }
    return results
}