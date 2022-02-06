import { Analyzer, StepData } from "./types"

export interface StepHandler {
    handle(data: StepData): void
}

export class HandlerAnalyzer implements Analyzer {

    constructor(readonly handlers: StepHandler[]) {}

    handleStep(data: StepData) {
        for(const handler of this.handlers) {
            handler.handle(data)
        }
    }
}