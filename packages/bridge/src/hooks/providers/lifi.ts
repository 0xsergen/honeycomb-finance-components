import { parseUnits } from '@ethersproject/units';
import { LIFI_API_KEY, calculateTransactionTime } from '@honeycomb-finance/shared';
import { LiFi, LifiStep as PureLifiStep, RouteOptions, RoutesRequest } from '@lifi/sdk';
import { Currency, LIFI as LIFIBridge, Token, TokenAmount } from '@pangolindex/sdk';
import { BridgePrioritizations, GetRoutes, GetRoutesProps, Route } from '../types';

function isLifiStep(value: any): value is PureLifiStep {
  return value && value.type === 'lifi' && Array.isArray(value.includedSteps);
}

export const getLiFiRoutes: GetRoutes = async ({
  amount,
  slipLimit,
  fromChain,
  toChain,
  fromAddress,
  fromCurrency,
  toCurrency,
}: // recipient
GetRoutesProps) => {
  const parsedAmount = parseUnits(amount, fromCurrency?.decimals).toString();

  const lifi = new LiFi({
    integrator: 'pangolin',
    apiKey: LIFI_API_KEY,
  });

  const routeOptions: RouteOptions = {
    slippage: parseFloat(slipLimit) / 100,
    allowSwitchChain: false,
    integrator: 'pangolin',
    fee: 0.03,
  };

  const routesRequest: RoutesRequest = {
    fromChainId: (fromChain?.chain_id as number) || 1,
    fromAmount: parsedAmount,
    fromAddress: fromAddress || undefined,
    toAddress: fromAddress || undefined,
    fromTokenAddress: fromCurrency?.address || '',
    toChainId: (toChain?.chain_id as number) || 1,
    toTokenAddress: toCurrency?.address || '',
    options: routeOptions,
  };

  let routesResponse;
  try {
    routesResponse = await lifi.getRoutes(routesRequest);
  } catch (error) {
    routesResponse = {};
  }
  const routes = routesResponse?.routes || [];
  const lifiRoutes: Route[] = routes?.map((route) => {
    return {
      nativeRoute: route,
      bridgeType: LIFIBridge,
      waitingTime: calculateTransactionTime(
        route?.steps?.reduce((prevValue, currenctValue) => {
          return prevValue + currenctValue?.estimate?.executionDuration;
        }, 0),
      ),
      toToken: toCurrency?.symbol || '',
      toAmount: new TokenAmount(toCurrency as Currency as Token, route?.toAmount).toFixed(4),
      toAmountNet: new TokenAmount(toCurrency as Currency as Token, route?.toAmountMin).toFixed(4),
      toAmountUSD: `${route?.toAmountUSD} USD`,
      gasCostUSD: route?.gasCostUSD,
      steps: route?.steps?.map((step: any) => {
        return {
          bridge: LIFIBridge,
          type: step?.type,
          ...(isLifiStep(step) && {
            includedSteps: step?.includedSteps.map((subStep: any) => {
              return {
                type: subStep?.type,
                integrator: subStep.tool,
                action: {
                  toToken: subStep?.action?.toToken?.symbol,
                },
                estimate: {
                  toAmount: new TokenAmount(subStep?.action?.toToken as Token, subStep?.estimate?.toAmount).toFixed(4),
                },
              };
            }),
          }),
          action: {
            toToken: step?.action?.toToken?.symbol,
          },
          estimate: {
            toAmount: new TokenAmount(step?.action?.toToken as Token, step?.estimate?.toAmount).toFixed(4),
          },
        };
      }),
      transactionType:
        route?.tags && route?.tags.length > 0
          ? BridgePrioritizations[route?.tags?.[0].toUpperCase()]
          : BridgePrioritizations.NORMAL,
      selected: false,
    };
  });
  return lifiRoutes;
};
