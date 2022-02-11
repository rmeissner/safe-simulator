import axios from 'axios'

interface Page<T> {
    results: T[]
}

interface EventSignature {
    text_signature: string
    hex_signature: string
}

interface FunctionSignature {
    text_signature: string
    hex_signature: string
}

const apiUrl = "https://www.4byte.directory/"

export const loadFunctionSignatures = async(selector: string): Promise<string[]> => {
    const resp = await axios.get<Page<FunctionSignature>>(`${apiUrl}/api/v1/signatures/?hex_signature=${selector}`)
    if (resp.status !== 200) throw Error("Request failed")
    return resp.data.results.reverse().map((s) => "function " + s.text_signature)
}

export const loadEventSignatures = async(topic: string): Promise<string[]> => {
    const resp = await axios.get<Page<EventSignature>>(`${apiUrl}/api/v1/event-signatures/?hex_signature=${topic}`)
    if (resp.status !== 200) throw Error("Request failed")
    return resp.data.results.reverse().map((s) => "event " + s.text_signature)
}