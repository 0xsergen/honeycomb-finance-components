import { Box, Loader, Text } from '@honeycomb-finance/core';
import { MixPanelEvents, useMixpanel, usePangolinWeb3, useTranslation } from '@honeycomb-finance/shared';
import { useShowBalancesManager } from '@honeycomb-finance/state-hooks';
import { ALL_CHAINS, Chain } from '@pangolindex/sdk';
import React, { useCallback } from 'react';
import Scrollbars from 'react-custom-scrollbars';
import { useGetChainsBalances } from 'src/hooks';
import ToggleBalanceButton from './ToggleBalanceButton';
import { ChainCard, Frame, PortfolioHeader, PortfolioRoot } from './styleds';

const Portfolio: React.FC = () => {
  const { account } = usePangolinWeb3();
  const { t } = useTranslation();
  const { data: balances, isRefetching, isLoading } = useGetChainsBalances();
  const [showBalances, setShowBalances] = useShowBalancesManager();

  const mixpanel = useMixpanel();

  const handleShowBalances = useCallback(() => {
    setShowBalances(!showBalances);
    mixpanel.track(!showBalances ? MixPanelEvents.HIDE_BALANCES : MixPanelEvents.SHOW_BALANCES, {
      widget: 'portfolio',
    });
  }, [showBalances]);

  const renderChain = (chain: Chain, balance: number, key: number) => {
    const balanceFormatted = balance.toLocaleString(undefined, { maximumFractionDigits: 2, minimumFractionDigits: 2 });
    return (
      <ChainCard key={key}>
        <img width="48px" height="48px" src={chain?.logo} alt={'Chain logo'} />
        <Box height="100%" display="flex" justifyContent="center" flexDirection="column">
          <Text fontSize={14} color="text1">
            {chain.name}
          </Text>
          {showBalances ? (
            <Text fontSize={14} color="text13">
              ${balanceFormatted}
            </Text>
          ) : (
            <Box display="flex" flexDirection="row">
              {[...Array(4)].map((_value, _key) => (
                <Text color="text13" fontSize={14} fontWeight={700} key={_key}>
                  *
                </Text>
              ))}
            </Box>
          )}
        </Box>
      </ChainCard>
    );
  };

  const renderTotalBalance = () => {
    if (showBalances) {
      return (
        <Text fontSize={18} color="text1" fontWeight={600}>
          $
          {balances
            ? balances.total.toLocaleString(undefined, { maximumFractionDigits: 2, minimumFractionDigits: 2 })
            : 0}
        </Text>
      );
    }
    return (
      <Text color="text13" fontSize={18} fontWeight={700}>
        *
      </Text>
    );
  };

  return (
    <PortfolioRoot>
      <PortfolioHeader>
        <Text fontSize={['16px', '16px', '24px']} color="text1" fontWeight={600} style={{ flexGrow: 1 }}>
          {t('portfolio.portfolioAllChain')}
        </Text>
        <ToggleBalanceButton showBalances={showBalances} handleShowBalances={handleShowBalances} />
      </PortfolioHeader>
      <Box display="flex" flexGrow={1} width="100%" alignItems="center" flexDirection="column">
        {!account ? (
          <Text fontSize={20} color="text1" textAlign="center">
            {t('portfolio.connectToseePortfolio')}
          </Text>
        ) : isRefetching || isLoading || !balances ? (
          <Loader size={100} />
        ) : (
          <>
            <Box
              padding={10}
              borderRadius={4}
              display="flex"
              marginBottom={15}
              alignItems="center"
              bgColor="bg6"
              flexWrap="wrap"
              width="100%"
              style={{ boxSizing: 'border-box' }}
            >
              <Text fontSize={18} color="text1" style={{ flexGrow: 1, minWidth: '200px' }}>
                {t('portfolio.totalAmountInvested')}
              </Text>
              {renderTotalBalance()}
            </Box>
            <Box width="100%" height="100%">
              {Object.values(balances.chains).length > 0 ? (
                <Scrollbars style={{ width: '100%', height: '100%', minHeight: '140px' }}>
                  <Frame>
                    {Object.keys(balances.chains).map((chainID, key) => {
                      const chain = ALL_CHAINS.find((value) => value.symbol.toLowerCase() == chainID.toLowerCase());
                      const balance = balances.chains[chainID] as number; // if exist chain key exist balance

                      if (chain) {
                        return renderChain(chain, balance, key);
                      }
                      return null;
                    })}
                  </Frame>
                </Scrollbars>
              ) : (
                <Text fontSize={18} color="text1" textAlign="center">
                  {t('portfolio.balanceNotFound')}
                </Text>
              )}
            </Box>
          </>
        )}
      </Box>
    </PortfolioRoot>
  );
};

export default Portfolio;
