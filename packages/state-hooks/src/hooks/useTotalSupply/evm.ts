import { BigNumber } from '@ethersproject/bignumber';
import { PNG, useTokenContract } from '@honeycomb-finance/shared';
import { ChainId, Token, TokenAmount } from '@pangolindex/sdk';
import { useSingleCallResult } from 'src/state';

// returns undefined if input token is undefined, or fails to get token contract,
// or contract total supply cannot be fetched
export function useTotalSupply(token?: Token): TokenAmount | undefined {
  const contract = useTokenContract(token?.address, false);

  const totalSupply: BigNumber = useSingleCallResult(contract, 'totalSupply')?.result?.[0];

  // Special case to handle PNG's proxy burnt total supply
  if (token?.equals(PNG[ChainId.AVALANCHE])) {
    return new TokenAmount(token, '230000000000000000000000000');
  }

  return token && totalSupply ? new TokenAmount(token, totalSupply.toString()) : undefined;
}
