/* eslint-disable max-lines */
import { Squid, RouteData as SquidRouteData } from '@0xsquid/sdk';
import { JsonRpcSigner } from '@ethersproject/providers';
import { parseUnits } from '@ethersproject/units';
import {
  LIFI_API_KEY,
  RANGO_API_KEY,
  SQUID_API,
  getSigner,
  useChainId,
  usePangolinWeb3,
  useTranslation,
} from '@honeycomb-finance/shared';
import { useCurrencyBalances } from '@honeycomb-finance/state-hooks';
import { LiFi, Route as LifiRoute } from '@lifi/sdk';
import {
  BRIDGES,
  Bridge,
  BridgeChain,
  BridgeCurrency,
  Chain,
  Currency,
  CurrencyAmount,
  LIFI as LIFIBridge,
  RANGO,
  SQUID,
  Token,
  TokenAmount,
} from '@pangolindex/sdk';
import { RangoClient, SwapResponse as RangoRoute } from 'rango-sdk-basic';
import React, { useCallback, useEffect, useState } from 'react';
import { BridgeState, ChainField, CurrencyField, TransactionStatus, useBridgeStateAtom } from './atom';
import { useBridgeChains } from './chains';
import { useBridgeCurrencies } from './currencies';
import { getRoutesProviders } from './providers';
import { BridgePrioritizations, GetRoutesProps, Route, SendTransaction } from './types';

export function useBridgeState(): BridgeState {
  const { bridgeState } = useBridgeStateAtom();
  return bridgeState;
}

export function useBridgeActionHandlers(): {
  onCurrencySelection: (field: CurrencyField, currency: BridgeCurrency) => void;
  onChainSelection: (field: ChainField, chain: Chain) => void;
  onSwitchTokens: () => void;
  onSelectRoute: (route: Route) => void;
  onSwitchChains: () => void;
  onUserInput: (field: CurrencyField, typedValue: string) => void;
  onChangeRecipient: (recipient: string | null) => void;
  onChangeRouteLoaderStatus: () => void;
  onClearTransactionData: (transactionStatus: TransactionStatus) => void;
} {
  const {
    selectRoute,
    selectCurrency,
    selectChain,
    switchCurrencies,
    switchChains,
    clearTransactionData,
    setRoutes,
    typeAmount,
    setRecipient,
    changeRouteLoaderStatus,
  } = useBridgeStateAtom();
  const { routes, routesLoaderStatus } = useBridgeState();

  const onSelectRoute = (route: Route) => {
    const selectedRouteIndex = routes.findIndex((r) => r === route);
    selectRoute({ selectedRoute: selectedRouteIndex });
  };

  const onCurrencySelection = useCallback(
    (field: CurrencyField, currency: BridgeCurrency) => {
      typeAmount({ field, typedValue: '0' });

      selectCurrency({
        field,
        currencyId: currency?.symbol || '',
      });
    },
    [selectCurrency, typeAmount],
  );

  const onChainSelection = useCallback(
    (field: ChainField, chain: Chain) => {
      selectCurrency({
        currencyId: '',
        field,
      });

      selectChain({
        field,
        chainId: chain ? chain.id : '',
      });
    },
    [selectChain, selectCurrency],
  );

  const onSwitchTokens = useCallback(() => {
    switchCurrencies();
  }, [switchCurrencies]);

  const onSwitchChains = useCallback(() => {
    switchChains();
  }, [switchChains]);

  const onClearTransactionData = useCallback(
    (transactionStatus?: TransactionStatus) => {
      clearTransactionData();
      if (transactionStatus === TransactionStatus.SUCCESS) {
        setRoutes({ routes: [], routesLoaderStatus: false });
      }
    },
    [clearTransactionData, setRoutes],
  );

  const onUserInput = useCallback(
    (field: CurrencyField, typedValue: string) => {
      typeAmount({ field, typedValue });
    },
    [typeAmount],
  );

  const onChangeRecipient = useCallback(
    (recipient: string | null) => {
      setRecipient({ recipient });
    },
    [setRecipient],
  );

  const onChangeRouteLoaderStatus = useCallback(() => {
    changeRouteLoaderStatus({ routesLoaderStatus: !routesLoaderStatus });
  }, [changeRouteLoaderStatus]);

  return {
    onSwitchTokens,
    onCurrencySelection,
    onChainSelection,
    onSwitchChains,
    onSelectRoute,
    onUserInput,
    onChangeRecipient,
    onChangeRouteLoaderStatus,
    onClearTransactionData,
  };
}

export function tryParseAmount(value?: string, currency?: BridgeCurrency): CurrencyAmount | undefined {
  if (!value || !currency) {
    return undefined;
  }
  try {
    const typedValueParsed = parseUnits(value, currency.decimals).toString();
    if (typedValueParsed && Number(typedValueParsed) !== 0) {
      return new TokenAmount(currency as Currency as Token, typedValueParsed);
    }
  } catch (error) {
    // should fail if the user specifies too many decimal places of precision (or maybe exceed max uint?)
    console.debug(`Failed to parse input amount: "${value}"`, error);
  }
  // necessary for all paths to return a value
  return undefined;
}

export function useDerivedBridgeInfo(): {
  currencies: { [field in CurrencyField]?: BridgeCurrency };
  chains: { [field in ChainField]?: BridgeChain };
  currencyBalances: { [field in CurrencyField]?: CurrencyAmount };
  parsedAmount: CurrencyAmount | undefined;
  inputError?: string;
  routes?: Route[];
  estimatedAmount?: CurrencyAmount;
  amountNet?: string;
  recipient?: string | null;
  routesLoaderStatus?: boolean;
  selectedRoute?: Route;
  transactionLoaderStatus: boolean;
  transactionStatus?: TransactionStatus;
  transactionError?: Error;
} {
  const { account } = usePangolinWeb3();
  const chainId = useChainId();
  const { t } = useTranslation();
  const [chainList, setChainList] = useState<BridgeChain[]>([]);
  const [currencyList, setCurrencyList] = useState<BridgeCurrency[]>([]);

  const chainHook = useBridgeChains();
  const currencyHook = useBridgeCurrencies();

  useEffect(() => {
    let data: BridgeCurrency[] = [];
    BRIDGES.map((bridge: Bridge) => {
      if (currencyHook?.[bridge.id]) {
        data = data
          ?.concat(currencyHook?.[bridge.id])
          ?.filter(
            (val, index, self) =>
              index === self.findIndex((t) => t?.symbol === val?.symbol && t?.chainId === val?.chainId),
          );
        setCurrencyList(data || []);
      }
    });
  }, [currencyHook?.[LIFIBridge.id], currencyHook?.[SQUID.id], currencyHook?.[RANGO.id]]);

  useEffect(() => {
    let data: BridgeChain[] = [];
    BRIDGES.map((bridge: Bridge) => {
      if (chainHook?.[bridge.id]) {
        data = data
          ?.concat(chainHook?.[bridge.id])
          ?.filter((val, index, self) => index === self.findIndex((t) => t?.chain_id === val?.chain_id));

        setChainList(data || []);
      }
    });
  }, [chainHook?.[LIFIBridge.id], chainHook?.[SQUID.id], chainHook?.[RANGO.id]]);

  const {
    typedValue,
    [CurrencyField.INPUT]: { currencyId: inputCurrencyId },
    [CurrencyField.OUTPUT]: { currencyId: outputCurrencyId },
    [ChainField.FROM]: { chainId: fromChainId },
    [ChainField.TO]: { chainId: toChainId },
    routes,
    recipient,
    routesLoaderStatus,
    transactionLoaderStatus,
    transactionStatus,
    transactionError,
  } = useBridgeState();

  const fromChain = fromChainId ? chainList?.find((x) => x.id === fromChainId) : undefined;
  const toChain = toChainId ? chainList?.find((x) => x.id === toChainId) : undefined;

  const inputCurrency =
    currencyList &&
    currencyList?.find(
      (x) => x?.symbol === inputCurrencyId && fromChain && x?.chainId === fromChain?.chain_id?.toString(),
    );
  const outputCurrency =
    currencyList &&
    currencyList?.find(
      (x) => x?.symbol === outputCurrencyId && toChainId && x?.chainId === toChain?.chain_id?.toString(),
    );

  const relevantTokenBalances = useCurrencyBalances(chainId, account ?? undefined, [
    inputCurrency ?? undefined,
    outputCurrency ?? undefined,
  ]);
  const currencyBalances = {
    [CurrencyField.INPUT]: relevantTokenBalances[0],
    [CurrencyField.OUTPUT]: relevantTokenBalances[1],
  };

  const parsedAmount = tryParseAmount(typedValue, inputCurrency ?? undefined);
  const selectedRoute = routes?.find((x: Route) => x.selected);
  const estimatedAmount = tryParseAmount(selectedRoute?.toAmount, outputCurrency ?? undefined);
  const amountNet = selectedRoute?.toAmountNet.toString();

  const currencies: { [field in CurrencyField]?: BridgeCurrency } = {
    [CurrencyField.INPUT]: inputCurrency ?? undefined,
    [CurrencyField.OUTPUT]: outputCurrency ?? undefined,
  };

  const chains: { [field in ChainField]?: BridgeChain } = {
    [ChainField.FROM]: fromChain ?? undefined,
    [ChainField.TO]: toChain ?? undefined,
  };

  let inputError: string | undefined;
  if (!account) {
    inputError = t('swapHooks.connectWallet');
  }

  if (!parsedAmount) {
    inputError = inputError ?? t('swapHooks.enterAmount');
  }

  if (!currencies[CurrencyField.INPUT] || !currencies[CurrencyField.OUTPUT]) {
    inputError = inputError ?? t('swapHooks.selectToken');
  }

  if (!chains[ChainField.FROM] || !chains[ChainField.TO]) {
    inputError = inputError ?? t('swapHooks.selectChain');
  }

  return {
    currencies,
    chains,
    currencyBalances,
    parsedAmount,
    inputError,
    routes,
    estimatedAmount,
    amountNet,
    recipient,
    routesLoaderStatus,
    selectedRoute,
    transactionLoaderStatus,
    transactionStatus,
    transactionError,
  };
}

export function useBridgeSwapActionHandlers(): {
  getRoutes: (props: GetRoutesProps) => void;
  sendTransaction: SendTransaction;
} {
  const { setRoutes, changeTransactionLoaderStatus, setTransactionError } = useBridgeStateAtom();
  const getRoutes = async (routesProps: GetRoutesProps) => {
    if (parseFloat(routesProps.amount) <= 0) {
      setRoutes({ routes: [], routesLoaderStatus: false });
    } else {
      const promises = Object.values(getRoutesProviders).map((getRoutes) => getRoutes(routesProps));
      const routes = (await Promise.allSettled(promises)).flatMap((p) => (p.status === 'fulfilled' ? p.value : []));

      // Show all providers recommended routes first and then sort based on the output amount
      const recommended = BridgePrioritizations.RECOMMENDED;
      const compareRoutes = (a: Route, b: Route) => {
        if (a.transactionType === recommended && b.transactionType !== recommended) return -1;
        else if (a.transactionType !== recommended && b.transactionType === recommended) return 1;
        else if (parseFloat(a.toAmount || '0') > parseFloat(b.toAmount || '0')) return -1;
        return 0;
      };

      setRoutes({
        routes: (routes.filter((x: Route | undefined) => !!x) as Route[]).sort(compareRoutes),
        routesLoaderStatus: false,
      });
    }
  };

  const sendTransactionLifi = async (library: any, selectedRoute?: Route, account?: string | null) => {
    changeTransactionLoaderStatus({ transactionLoaderStatus: true, transactionStatus: undefined });
    const lifi = new LiFi({
      integrator: 'pangolin',
      apiKey: LIFI_API_KEY,
    });

    const signer: JsonRpcSigner = await getSigner(library, account || '');
    // executing a route
    try {
      await lifi.executeRoute(signer as any, selectedRoute?.nativeRoute as LifiRoute);

      changeTransactionLoaderStatus({
        transactionLoaderStatus: false,
        transactionStatus: TransactionStatus.SUCCESS,
      });
    } catch (e: Error | unknown) {
      if (e) {
        changeTransactionLoaderStatus({
          transactionLoaderStatus: false,
          transactionStatus: TransactionStatus.FAILED,
        });
        setTransactionError({ transactionError: e as Error });
      } else {
        changeTransactionLoaderStatus({
          transactionLoaderStatus: false,
          transactionStatus: TransactionStatus.SUCCESS,
        });
      }
    }
  };

  const sendTransactionSquid = async (library: any, selectedRoute?: Route, account?: string | null) => {
    changeTransactionLoaderStatus({ transactionLoaderStatus: true, transactionStatus: undefined });
    const signer: JsonRpcSigner = await getSigner(library, account || '');
    const squidRoute = selectedRoute?.nativeRoute as SquidRouteData;
    const squid = new Squid({
      baseUrl: SQUID_API,
    });
    await squid.init();

    try {
      const tx = await squid.executeRoute({
        signer: signer as any,
        route: squidRoute,
      });
      await tx.wait();

      changeTransactionLoaderStatus({
        transactionLoaderStatus: false,
        transactionStatus: TransactionStatus.SUCCESS,
      });
    } catch (e: Error | unknown) {
      changeTransactionLoaderStatus({
        transactionLoaderStatus: false,
        transactionStatus: TransactionStatus.FAILED,
      });
      setTransactionError({ transactionError: e as Error });
    }
  };

  const sendTransactionRango = async (library: any, selectedRoute?: Route, account?: string | null) => {
    changeTransactionLoaderStatus({ transactionLoaderStatus: true, transactionStatus: undefined });
    const signer: JsonRpcSigner = await getSigner(library, account || '');
    const rangoRoute = selectedRoute?.nativeRoute as RangoRoute;
    const rango = new RangoClient(RANGO_API_KEY);
    try {
      await rango.executeEvmRoute(signer as any, rangoRoute);

      changeTransactionLoaderStatus({
        transactionLoaderStatus: false,
        transactionStatus: TransactionStatus.SUCCESS,
      });
    } catch (e: Error | unknown) {
      changeTransactionLoaderStatus({
        transactionLoaderStatus: false,
        transactionStatus: TransactionStatus.FAILED,
      });
      setTransactionError({ transactionError: e as Error });
    }
  };

  const sendTransaction: SendTransaction = {
    lifi: sendTransactionLifi,
    squid: sendTransactionSquid,
    rango: sendTransactionRango,
  };

  return {
    getRoutes,
    sendTransaction,
  };
}
