import { BigNumber } from '@ethersproject/bignumber';
import { formatUnits } from '@ethersproject/units';
import { Box, Button, Text, Tooltip } from '@honeycomb-finance/core';
import { PNG, useChainId, useTranslation } from '@honeycomb-finance/shared';
import { useUSDCPriceHook } from '@honeycomb-finance/state-hooks';
import numeral from 'numeral';
import React, { useCallback, useContext, useEffect, useState } from 'react';
import { ThemeContext } from 'styled-components';
import { useDerivativeSarCompoundHook } from 'src/hooks';
import { useSarStakeInfo } from 'src/hooks/evm';
import { Position } from 'src/hooks/types';
import ConfirmDrawer from '../ConfirmDrawer';
import { Options } from '../types';
import RewardsInfo from './RewardsInfo';
import { Root } from './styleds';
interface Props {
  selectedOption: Options;
  selectedPosition: Position | null;
  onChange: (value: Options) => void;
  onSelectPosition: (position: Position | null) => void;
}

export default function Compound({ selectedOption, selectedPosition, onChange, onSelectPosition }: Props) {
  const [openDrawer, setOpenDrawer] = useState(false);
  const chainId = useChainId();

  const useDerivativeSarCompound = useDerivativeSarCompoundHook[chainId];
  const { attempting, hash, compoundError, wrappedOnDismiss, onCompound } = useDerivativeSarCompound(selectedPosition);
  const { apr } = useSarStakeInfo();

  const theme = useContext(ThemeContext);

  const oldBalance = selectedPosition?.balance ?? BigNumber.from('0');
  const pendingRewards = selectedPosition?.pendingRewards ?? BigNumber.from('0');

  const png = PNG[chainId];
  const useUSDPrice = useUSDCPriceHook[chainId];
  const pngPrice = useUSDPrice(png);

  const positionDollarValue =
    pngPrice?.equalTo('0') || !pngPrice
      ? 0
      : parseFloat(formatUnits(oldBalance, png.decimals)) * Number(pngPrice.toFixed());

  const rewardsDollarValue =
    pngPrice?.equalTo('0') || !pngPrice
      ? 0
      : parseFloat(formatUnits(pendingRewards, png.decimals)) * Number(pngPrice?.toFixed());

  const { t } = useTranslation();

  const handleConfirmDismiss = useCallback(() => {
    setOpenDrawer(false);
    if (hash) {
      onSelectPosition(null);
    }
    wrappedOnDismiss();
  }, [hash, onSelectPosition]);

  useEffect(() => {
    if (openDrawer && !attempting && !hash && !compoundError) {
      handleConfirmDismiss();
    }
    if (!openDrawer && attempting) {
      setOpenDrawer(true);
    }
  }, [attempting]);

  // if changed the position and the drawer is open, close
  useEffect(() => {
    if (openDrawer) setOpenDrawer(false);
  }, [selectedPosition]);

  const renderButton = () => {
    let error: string | undefined;
    if (!selectedPosition) {
      error = t('sarStakeMore.choosePosition');
    } else if (oldBalance?.isZero() || pendingRewards.isZero()) {
      error = t('sarCompound.noRewards');
    }
    return (
      <Button variant="primary" onClick={onCompound} isDisabled={!!error}>
        {error ?? t('sarCompound.compound')}
      </Button>
    );
  };

  return (
    <Box>
      <Root>
        <RewardsInfo
          selectedOption={selectedOption}
          onChange={onChange}
          pendingRewards={formatUnits(pendingRewards.toString(), png.decimals)}
          selectedPosition={selectedPosition}
        />

        <Box display="grid" bgColor="color3" borderRadius="4px" padding="20px" style={{ gridGap: '20px' }}>
          <Box display="flex" justifyContent="space-between">
            <Box>
              <Text color="text2">{t('sarStake.dollarValue')}</Text>
              <Text color="text1" data-tip={Boolean(selectedPosition)} data-for="total-dollar-value-sar-compound">
                ${numeral(rewardsDollarValue).format('0.00a')}
              </Text>
              {selectedPosition && (
                <Tooltip id="total-dollar-value-sar-compound" effect="solid" backgroundColor={theme.primary}>
                  <Box width="max-content">
                    <Box display="flex" justifyContent="space-between" style={{ gap: '5px' }}>
                      <Text color="text6" fontSize="12px" fontWeight={500} textAlign="center">
                        {t('stakePage.totalStaked')}:
                      </Text>
                      <Text color="text6" fontSize="12px" fontWeight={500} textAlign="center">
                        ${numeral(positionDollarValue).format('0.00a')}
                      </Text>
                    </Box>
                    <Box display="flex" justifyContent="space-between" style={{ gap: '5px' }}>
                      <Text color="text6" fontSize="12px" fontWeight={500} textAlign="center">
                        {t('stakePage.total')}:
                      </Text>
                      <Text color="text6" fontSize="12px" fontWeight={500} textAlign="center">
                        ${numeral(positionDollarValue + rewardsDollarValue).format('0.00a')}
                      </Text>
                    </Box>
                  </Box>
                </Tooltip>
              )}
            </Box>
            <Box>
              <Text color="text2">{t('sarStake.averageAPR')}</Text>
              <Text color="text1">{(apr ?? '-').toString()}%</Text>
            </Box>
          </Box>
          <Text color="text1" fontWeight={400} fontSize="14px" textAlign="center">
            {t('sarCompound.description')}
          </Text>
        </Box>
        {renderButton()}
      </Root>

      <ConfirmDrawer
        isOpen={openDrawer && !!selectedPosition}
        onClose={handleConfirmDismiss}
        attemptingTxn={attempting}
        txHash={hash}
        errorMessage={compoundError}
        pendingMessage={t('sarCompound.pending')}
        successMessage={t('sarCompound.successSubmit')}
        confirmContent={null}
      />
    </Box>
  );
}
