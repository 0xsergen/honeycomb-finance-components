# Pangolin Sar Single Stake
Components to interact with Pangolin's Sunshine and Rainbows Single Stake contracts, [see more about Sunshine and Rainbows](https://blog.pangolin.exchange/pangolin-launches-sunshine-and-rainbows-the-ultimate-staking-algorithm-for-sticky-liquidity-80a099515bea).

## Installation
`yarn add @honeycomb-finance/sar`

or

`npm install @honeycomb-finance/sar`

### Install below dependancies as its peer dependancies

```
react
react-dom
@pangolindex/sdk
```

## Getting Start
In your main file wrap your app with `HoneycombProvider` and `Web3ReactProvider`:

_Use version **6.0.9** of `@web3-react/core` package._

```tsx
import { HoneycombProvider } from '@honeycomb-finance/honeycomb-provider';
import { NetworkContextName, useActiveWeb3React } from '@honeycomb-finance/shared';
import { Web3ReactProvider, createWeb3ReactRoot } from '@web3-react/core';
import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import App from './App';

const Web3ProviderNetwork = createWeb3ReactRoot(NetworkContextName);

function getLibrary(provider: any): Web3Provider {
  try {
    const library = new Web3Provider(provider, 'any');
    library.pollingInterval = 15000;
    return library;
  } catch (error) {
    return provider;
  }
}

// library -> web3.js provider
// chainId -> chain id with which user is connected
// account -> user's connected wallet address
// theme -> optional ( refer Theme guide to customize it )
ReactDOM.render(
  <React.StrictMode>
    <Web3ReactProvider getLibrary={getLibrary}>
      <Web3ProviderNetwork getLibrary={getLibrary}>
        <HoneycombProvider library={library} chainId={chainId} account={account} theme={theme}>
          <App />
        </HoneycombProvider>
      </Web3ProviderNetwork>
    </Web3ReactProvider>
  </React.StrictMode>,
  document.getElementById('root'),
);
```

## Story Book

1. do `yarn storybook` to start the storybook
2. now connect to http://localhost:6006 to see the components

## Development

1. `yarn install`
2. `yarn dev` and keep that terminal running

or see the [README file](/monorepo/README.md) in monorepo to run the example app.

## Components

### SarManageWidget
This component is used to manage a position, stake more tokens or unstake, claim rewards or compound pending rewards to position.

![SarManageWidget component](docs/SarManageWidget.png)

### SarNFTPortfolio
This component is used to see the nfts/postions from a connected account.

![SarNFTPortfolio component](docs/SarNFTPortfolio.png)

### SarStakeWidget
This component is used to create a new position.

![SarNFTPortfolio component](docs/SarStakeWidget.png)
