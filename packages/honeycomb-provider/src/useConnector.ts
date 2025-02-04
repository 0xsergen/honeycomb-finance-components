import { Web3Provider } from '@ethersproject/providers';
import { IS_IN_IFRAME, MixPanelEvents, NetworkContextName, useMixpanel } from '@honeycomb-finance/shared';
import { useApplicationState, useUserAtom } from '@honeycomb-finance/state-hooks';
import { HashConnectEvents, gnosisSafe, hashconnectEvent } from '@honeycomb-finance/wallet-connectors';
import {
  HoneycombWallet,
  HoneycombWalletEvents,
  SUPPORTED_WALLETS,
  disconnectWallets,
  getWalletKey,
  gnosisSafeWallet,
  hashPack,
  honeycombWalletEvent,
  injectWallet,
  useWalletState,
} from '@honeycomb-finance/walletmodal';
import { AVALANCHE_MAINNET, ChainId } from '@pangolindex/sdk';
import { AbstractConnector } from '@web3-react/abstract-connector';
import { UnsupportedChainIdError, useWeb3React } from '@web3-react/core';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { isMobile } from 'react-device-detect';
import { useFirstMountState } from 'react-use';

interface Web3ReactContextInterface<T = any> {
  activate: (connector: AbstractConnector, onError?: (error: Error) => void, throwErrors?: boolean) => Promise<void>;
  setError: (error: Error) => void;
  deactivate: () => void;
  connector?: AbstractConnector;
  library?: T;
  chainId?: number;
  account?: null | string;
  active: boolean;
  error?: Error;
}

/**
 * This hook return the active web3-react context
 *
 * Is active network context or any context
 *
 * @returns return the active web3-react context
 */
export function useActiveWeb3React(): Web3ReactContextInterface<Web3Provider> & { chainId?: ChainId } {
  const context = useWeb3React<Web3Provider>();
  const contextNetwork = useWeb3React<Web3Provider>(NetworkContextName);
  return context.active ? context : contextNetwork;
}

/**
 * This function tries to activate an already connected wallet
 *
 * For desktop weh check if this is authourized, then active the wallet
 *
 * For mobile we can try activate without check, because mobile injects the wallet and it is already authorized
 *
 * @param tryToActive Identifies if are going to try to activate a wallet, true to try, false to not try
 */
export function useEagerConnect(tryToActive: boolean) {
  const { activate, active } = useWeb3React();

  const [tried, setTried] = useState(false);
  const [triedSafe, setTriedSafe] = useState<boolean>(!IS_IN_IFRAME);

  const isFirstRender = useFirstMountState();

  const { userState, updateWallet } = useUserAtom();
  const { setAvailableHashpack } = useApplicationState();

  // either previously used connector, or window.ethereum if exists (important for mobile)
  const previusWallet: HoneycombWallet | null = useMemo(() => {
    const wallet = userState.wallet;
    if (wallet) {
      return SUPPORTED_WALLETS[wallet];
    }
    return null;
  }, [userState]);

  const activateMobile = useCallback(async () => {
    if (window.ethereum) {
      try {
        async function onError(error: any) {
          if (error instanceof UnsupportedChainIdError) {
            try {
              await window?.ethereum?.request({
                method: 'wallet_switchEthereumChain',
                params: [{ chainId: `0x${AVALANCHE_MAINNET?.chain_id?.toString(16)}` }],
              });
              setTried(true);
            } catch (error) {
              try {
                await window?.ethereum?.request({
                  method: 'wallet_addEthereumChain',
                  params: [
                    {
                      chainName: AVALANCHE_MAINNET.name,
                      chainId: `0x${AVALANCHE_MAINNET?.chain_id?.toString(16)}`,
                      rpcUrls: [AVALANCHE_MAINNET.rpc_uri],
                      blockExplorerUrls: AVALANCHE_MAINNET.blockExplorerUrls,
                      iconUrls: AVALANCHE_MAINNET.logo,
                      nativeCurrency: AVALANCHE_MAINNET.nativeCurrency,
                    },
                  ],
                });
              } catch (error) {
                updateWallet(null);
                setTried(true);
              }
            }
          } else {
            updateWallet(null);
            setTried(true);
          }
        }
        await injectWallet.tryActivation({ activate, onError });
        setTried(true);
      } catch (error) {}
    } else {
      updateWallet(null);
      setTried(true);
    }
  }, [activate, updateWallet]);

  const eagerConnect = useCallback(async () => {
    if (!triedSafe && previusWallet === gnosisSafeWallet) {
      const loadedInSafe = await gnosisSafe.isSafeApp();
      if (loadedInSafe) {
        await gnosisSafeWallet.tryActivation({ activate, onError: async () => setTriedSafe(true) });
      } else {
        setTriedSafe(true);
      }
    } else if (previusWallet?.connector?.isAuthorized) {
      const isAuthorized = await previusWallet.connector.isAuthorized();
      if (isAuthorized) {
        await previusWallet.tryActivation({
          activate,
          onError: async () => {
            updateWallet(null);
            setTried(true);
          },
        });
      } else {
        updateWallet(null);
        setTried(true);
      }
    } else {
      updateWallet(null);
      setTried(true);
    }
  }, [activate, triedSafe, setTriedSafe, previusWallet, setTried, updateWallet]);

  useEffect(() => {
    // we need to skip the first render to get the values from atom local storage
    if (tried || !tryToActive || isFirstRender) return;

    if (isMobile) {
      activateMobile();
    } else {
      eagerConnect();
    }
  }, [activate, eagerConnect, activateMobile, tried, tryToActive, isFirstRender]); // intentionally only running on mount (make sure it's only mounted once :))

  // if the connection worked, wait until we get confirmation of that to flip the flag
  useEffect(() => {
    if (active || !tryToActive) {
      setTried(true);
    }
  }, [active, tryToActive]);

  // this is special case for hashpack wallet
  // we need to listen for
  // 1. hashpack wallet installed or not event and we are storing this boolean to redux so that
  // 2. if user open pangolin in dApp browser then we need to manually calls ACTIVATE_CONNECTOR
  // in walletModal we can re-render as value updates
  useEffect(() => {
    const emitterFn = (isHashpackAvailable: boolean) => {
      console.log('received hashpack emit event CHECK_EXTENSION in provider', isHashpackAvailable);
      setAvailableHashpack(true);
    };

    // Here when load in iframe  we need to internally activate connector to connect account
    const emitterFnForActivateConnector = (isIframeEventFound: boolean) => {
      console.log('received hashpack emit event ACTIVATE_CONNECTOR in provider', isIframeEventFound);
      hashPack.tryActivation({
        activate,
        onSuccess: () => {
          updateWallet('HASH_CONNECT');
        },
      });
    };

    if (tryToActive) {
      hashconnectEvent.on(HashConnectEvents.CHECK_EXTENSION, emitterFn);
      hashconnectEvent.once(HashConnectEvents.ACTIVATE_CONNECTOR, emitterFnForActivateConnector);
    }

    return () => {
      if (tryToActive) {
        console.log('removing hashpack CHECK_EXTENSION event listener');
        hashconnectEvent.off(HashConnectEvents.CHECK_EXTENSION, emitterFn);
        console.log('removing hashpack ACTIVATE_CONNECTOR event listener');
        hashconnectEvent.off(HashConnectEvents.ACTIVATE_CONNECTOR, emitterFnForActivateConnector);
      }
    };
  }, []);

  return tried;
}

/**
 * This hook configures a function for connection events from any wallet
 *
 * We do this so that we can have a single global function where we update the state
 * of the last connected wallet, deactivate a wallet if it is active and trigger the
 * mixpanel event of wallet connected
 */
export function useWalletUpdater() {
  const mixpanel = useMixpanel();
  const { wallets } = useWalletState();
  const { updateWallet } = useUserAtom();

  useEffect(() => {
    function onConnect(wallet: HoneycombWallet) {
      const walletKey = getWalletKey(wallet, wallets);
      console.debug('Wallet connected ', wallet);
      updateWallet(walletKey);

      mixpanel.track(MixPanelEvents.WALLET_CONNECT, {
        wallet_name: wallet?.name?.toLowerCase(),
        // local storage will always have a value as this event
        // triggered after we add a value in local storage
        ChainId: localStorage.getItem('lastConnectedChainId') ?? ChainId.AVALANCHE.toString(),
        source: 'pangolin-components',
      });

      disconnectWallets(Object.values(wallets));
    }

    console.debug('Setuping Wallet Events');
    honeycombWalletEvent.on(HoneycombWalletEvents.CONNECTED, onConnect);

    return () => {
      console.debug('Removing Wallet Events');
      honeycombWalletEvent.off(HoneycombWalletEvents.CONNECTED, onConnect);
    };
  }, [wallets]);
}
