import { ethers } from "ethers";

export interface StorageChange {
    slot: string,
    value: string
}

export interface DecodedStorageChange extends StorageChange {
    slotName?: string,
    valueDecoded?: any
}

const decode = (type: string, value: string): string => {
    return ethers.utils.defaultAbiCoder.decode([type], "0x" + value.slice(2).padStart(64, "0"))[0].toString()
} 

export const decodeSafeStorageChange = (storageChange: StorageChange): DecodedStorageChange => {
    const cleanSlot = ethers.utils.hexStripZeros(storageChange.slot)
    switch (cleanSlot) {
        case "0x":
            return {
                slotName: "singleton",
                valueDecoded: decode("address", storageChange.value),
                ...storageChange
            }
        case "0x3":
            return {
                slotName: "ownerCount",
                valueDecoded: decode("uint256", storageChange.value),
                ...storageChange
            }
        case "0x4":
            return {
                slotName: "threshold",
                valueDecoded: decode("uint256", storageChange.value),
                ...storageChange
            }
        case "0x5":
            return {
                slotName: "nonce",
                valueDecoded: decode("uint256", storageChange.value),
                ...storageChange
            }
        case "0x6":
            return {
                slotName: "domainSeparator",
                valueDecoded: decode("bytes32", storageChange.value),
                ...storageChange
            }
        case "0x4a204f620c8c5ccdca3fd54d003badd85ba500436a431f0cbda4f558c93c34c8":
            return {
                slotName: "guard",
                valueDecoded: decode("address", storageChange.value),
                ...storageChange
            }
        case "0x6c9a6c4a39284e37ed1cf53d337577d14212a4870fb976a4366c693b939918d5":
            return {
                slotName: "fallback handler",
                valueDecoded: decode("address", storageChange.value),
                ...storageChange
            }
        default:
            return storageChange
    }
}