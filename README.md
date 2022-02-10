## Safe Simulator Lib

[![npm version](https://badge.fury.io/js/@rmeissner%2Fsafe-simulator.svg)](https://www.npmjs.com/package/@rmeissner/safe-simulator)

### Usage

- Install library
```sh
yarn add @rmeissner/safe-simulator
```

- Create simulator with connector
```js
// Use 'ganache' for Ganache v7 version or 'ganache-core' for legacy Ganache 
import Ganache from 'ganache'
import Simulator, { GanacheV7Connector } from '@rmeissner/safe-simulator'

const ganacheOptions = { fork: "mainnet" }
const network = Ganache.provider(ganacheOptions)

// GanacheCoreConnector needs to be used for legacy Ganache
const connector = new GanacheV7Connector()
const simulator = new Simulator(connector)
```

- Create analyzer with handlers
```js
import { HandlerAnalyzer, CallHandler, StorageHandler } from '@rmeissner/safe-simulator'

const callHandler = new CallHandler()
const storageHandler = new StorageHandler()
const handlers = [
    callHandler,
    storageHandler
]
const analyzer = new HandlerAnalyzer(handlers)
```

- Simulate transaction
```js
import { MultisigTransaction } from '@rmeissner/safe-simulator'
// This can be loaded via the SafeInfoProvider
const safeInfo: SafeInfo = {
    // ...
}

// This can be loaded from the Safe transaction service
const safeTx: MultisigTransaction = {
    // ...
}

const txHash = await simulator.simulateMultiSigTransaction(safeInfo, safeTx, analyzer)
```

- Get results
```js
// Complete call trace
const callTree = callHandler.roots
// Calls per address
const calls = callHandler.calls
// Storage changes per address
const storageChanges = storageHandler.storageChange
```

### Run example

[Check Example code](./examples/simulation.ts)

- Install dependencies
```sh
yarn
```

- Run example using GanacheV7
```sh
cp .env.example .env
yarn example
```