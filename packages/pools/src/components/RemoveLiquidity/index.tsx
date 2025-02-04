/* eslint-disable max-lines */
import { Box, Button, Loader, NumberOptions, Text, TextInput, TransactionCompleted } from '@honeycomb-finance/core';
import {
  MixPanelEvents,
  ROUTER_ADDRESS,
  useChainId,
  useLibrary,
  useMixpanel,
  usePangolinWeb3,
  useTranslation,
  wrappedCurrency,
} from '@honeycomb-finance/shared';
import {
  ApprovalState,
  useApproveCallbackHook,
  useGetHederaTokenNotAssociated,
  useHederaTokenAssociated,
  useTransactionDeadline,
  useUserSlippageTolerance,
  useWalletModalToggle,
} from '@honeycomb-finance/state-hooks';
import { Currency, Pair, Percent } from '@pangolindex/sdk';
import React, { useCallback, useEffect, useState } from 'react';
import { useRemoveLiquidityHook } from 'src/hooks/wallet/hooks';
import { Field, useBurnStateAtom } from 'src/state/burn/atom';
import { useBurnActionHandlers, useBurnState, useDerivedBurnInfo } from 'src/state/burn/hooks';
import { ButtonWrapper, RemoveWrapper } from './styleds';

interface RemoveLiquidityProps {
  currencyA?: Currency;
  currencyB?: Currency;
  // this prop will be used if user move away from first step
  onLoading?: (value: boolean) => void;
  // percetage is the percetage removed
  onComplete?: (percetage: number) => void;
}

const RemoveLiquidity = ({ currencyA, currencyB, onLoading, onComplete }: RemoveLiquidityProps) => {
  const { account } = usePangolinWeb3();
  const chainId = useChainId();
  const { library } = useLibrary();

  const useApproveCallback = useApproveCallbackHook[chainId];
  const useRemoveLiquidity = useRemoveLiquidityHook[chainId];
  // toggle wallet when disconnected
  const toggleWalletModal = useWalletModalToggle();

  const { resetBurnState } = useBurnStateAtom();

  const wrappedCurrencyA = wrappedCurrency(currencyA, chainId);
  const wrappedCurrencyB = wrappedCurrency(currencyB, chainId);

  const pairAddress = wrappedCurrencyA && wrappedCurrencyB ? Pair.getAddress(wrappedCurrencyA, wrappedCurrencyB) : '';

  const { independentField, typedValue } = useBurnState(pairAddress);
  const { pair, parsedAmounts, error, userLiquidity } = useDerivedBurnInfo(
    currencyA ?? undefined,
    currencyB ?? undefined,
  );

  const notAssociateTokens = useGetHederaTokenNotAssociated(pair?.tokens);
  // here we get all not associated pair tokens
  // but we associate one token at a time
  // so we get first token from array and ask user to associate
  // once user associate the token, that token will be removed from `notAssociateTokens`
  // and second token will become first and it goes on till that array gets empty
  const {
    associate: onAssociate,
    isLoading: isLoadingAssociate,
    hederaAssociated: isHederaTokenAssociated,
  } = useHederaTokenAssociated(notAssociateTokens?.[0]?.address, notAssociateTokens?.[0]?.symbol);

  const { removeLiquidity, onAttemptToApprove, signatureData, setSignatureData } = useRemoveLiquidity(pair as Pair);
  const { onUserInput: _onUserInput } = useBurnActionHandlers();
  const isValid = !error;

  // state for pending and submitted txn views
  const [attempting, setAttempting] = useState<boolean>(false);
  const [hash, setHash] = useState<string | undefined>();
  const deadline = useTransactionDeadline();
  const [allowedSlippage] = useUserSlippageTolerance();

  const formattedAmounts = {
    [Field.LIQUIDITY_PERCENT]: parsedAmounts[Field.LIQUIDITY_PERCENT].equalTo('0')
      ? '0'
      : parsedAmounts[Field.LIQUIDITY_PERCENT].lessThan(new Percent('1', '100'))
      ? '<1'
      : parsedAmounts[Field.LIQUIDITY_PERCENT].toFixed(0),
    [Field.LIQUIDITY]:
      independentField === Field.LIQUIDITY ? typedValue : parsedAmounts[Field.LIQUIDITY]?.toExact() ?? '',
  };

  // allowance handling
  // const [signatureData, setSignatureData] = useState<{ v: number; r: string; s: string; deadline: number } | null>(
  //   null,
  // );
  const [approval, approveCallback] = useApproveCallback(
    chainId,
    parsedAmounts[Field.LIQUIDITY],
    ROUTER_ADDRESS[chainId],
  );
  const { t } = useTranslation();
  const [percetage, setPercetage] = useState(100);

  useEffect(() => {
    _onUserInput(Field.LIQUIDITY_PERCENT, `100`, pairAddress);
  }, [_onUserInput]);

  useEffect(() => {
    if (onLoading) {
      onLoading(attempting);
    }
  }, [attempting]);

  const onChangePercentage = (value: number) => {
    _onUserInput(Field.LIQUIDITY_PERCENT, `${value}`, pairAddress);
  };

  // wrapped onUserInput to clear signatures
  const onUserInput = useCallback(
    (_typedValue: string) => {
      setSignatureData(null);
      _onUserInput(Field.LIQUIDITY, _typedValue, pairAddress);
      setPercetage(0);
    },
    [_onUserInput],
  );

  const mixpanel = useMixpanel();

  // on change the amount we need to change the steper
  useEffect(() => {
    setPercetage(Number(parsedAmounts[Field.LIQUIDITY_PERCENT].toFixed(0)) / 25);
  }, [parsedAmounts]);

  // reset signature when change percentage
  useEffect(() => {
    setSignatureData(null);
  }, [percetage]);

  async function onRemove() {
    if (!chainId || !library || !account || !deadline) throw new Error(t('error.missingDependencies'));

    try {
      setAttempting(true);
      const removeData = {
        parsedAmounts,
        deadline,
        allowedSlippage,
        approval,
      };

      const response = await removeLiquidity(removeData);

      setHash(response?.hash);

      if (onComplete) {
        onComplete(percetage);
      }

      mixpanel.track(MixPanelEvents.REMOVE_LIQUIDITY, {
        chainId: chainId,
        tokenA: currencyA?.symbol,
        tokenB: currencyB?.symbol,
        tokenA_Address: wrappedCurrencyA?.address,
        tokenB_Address: wrappedCurrencyB?.address,
      });
      resetBurnState({ pairAddress });
    } catch (err) {
      const _err = err as any;

      console.error(_err);
    } finally {
      setAttempting(false);
      setSignatureData(null);
    }
  }

  function getApproveButtonVariant() {
    if (approval === ApprovalState.APPROVED || signatureData !== null) {
      return 'confirm';
    }
    return 'primary';
  }

  function getApproveButtonText() {
    if (approval === ApprovalState.PENDING) {
      return t('removeLiquidity.approving');
    } else if (approval === ApprovalState.APPROVED || signatureData !== null) {
      return t('removeLiquidity.approved');
    }
    return t('removeLiquidity.approve');
  }

  function wrappedOnDismiss() {
    setHash(undefined);
    setAttempting(false);
  }

  const renderButton = () => {
    if (!account) {
      return (
        <Button variant="primary" onClick={toggleWalletModal} height="46px">
          {t('removeLiquidity.connectWallet')}
        </Button>
      );
    }

    if (!isHederaTokenAssociated && notAssociateTokens?.length > 0) {
      return (
        <Button variant="primary" isDisabled={Boolean(isLoadingAssociate)} onClick={onAssociate}>
          {isLoadingAssociate
            ? `${t('pool.associating')}`
            : `${t('pool.associate')} ` + notAssociateTokens?.[0]?.symbol}
        </Button>
      );
    } else {
      return (
        <ButtonWrapper>
          <Box mr="5px" width="100%">
            <Button
              variant={getApproveButtonVariant()}
              onClick={() => {
                onAttemptToApprove({ parsedAmounts, deadline, approveCallback });
              }}
              isDisabled={approval !== ApprovalState.NOT_APPROVED || signatureData !== null}
              loading={attempting && !hash}
              loadingText={t('removeLiquidity.approving')}
              height="46px"
            >
              {getApproveButtonText()}
            </Button>
          </Box>

          <Box width="100%">
            <Button
              variant="primary"
              isDisabled={!isValid || (signatureData === null && approval !== ApprovalState.APPROVED)}
              onClick={onRemove}
              loading={attempting && !hash}
              loadingText={t('migratePage.loading')}
              height="46px"
            >
              {error || t('removeLiquidity.remove')}
            </Button>
          </Box>
        </ButtonWrapper>
      );
    }
  };

  return (
    <RemoveWrapper>
      {!attempting && !hash && (
        <>
          <Box flex={1}>
            <Box>
              <Box display="flex" flexDirection="column">
                <TextInput
                  value={formattedAmounts[Field.LIQUIDITY]}
                  addonAfter={
                    <Box display="flex" alignItems="center">
                      <Text color="text4" fontSize={[24, 18]}>
                        PGL
                      </Text>
                    </Box>
                  }
                  onChange={(value: any) => {
                    onUserInput(value);
                  }}
                  fontSize={24}
                  isNumeric={true}
                  placeholder="0.00"
                  addonLabel={
                    account && (
                      <Text color="text2" fontWeight={500} fontSize={14}>
                        {!!userLiquidity
                          ? t('currencyInputPanel.balance') +
                            userLiquidity?.toFixed(Math.min(2, userLiquidity.token.decimals))
                          : '-'}
                      </Text>
                    )
                  }
                />

                <Box my="5px">
                  <NumberOptions
                    onChange={(value) => {
                      setPercetage(value);
                      onChangePercentage(value * 25);
                    }}
                    currentValue={percetage}
                    variant="step"
                    isPercentage={true}
                  />
                </Box>
              </Box>
            </Box>

            {/* <Box>
              <ContentBox>
                <Stat
                  title={tokenA?.symbol}
                  stat={`${formattedAmounts[Field.CURRENCY_A] || '-'}`}
                  titlePosition="top"
                  titleFontSize={14}
                  statFontSize={16}
                  titleColor="text4"
                  statAlign="center"
                />

                <Stat
                  title={tokenB?.symbol}
                  stat={`${formattedAmounts[Field.CURRENCY_B] || '-'}`}
                  titlePosition="top"
                  titleFontSize={14}
                  statFontSize={16}
                  titleColor="text4"
                  statAlign="center"
                />
              </ContentBox>
            </Box> */}
          </Box>
          <Box mt={0}>{renderButton()}</Box>
        </>
      )}

      {attempting && !hash && <Loader size={100} label={`${t('removeLiquidity.removingLiquidity')}...`} />}
      {hash && (
        <TransactionCompleted
          onButtonClick={wrappedOnDismiss}
          buttonText={t('transactionConfirmation.close')}
          submitText={t('removeLiquidity.removedLiquidity')}
          isShowButtton={true}
        />
      )}
    </RemoveWrapper>
  );
};
export default RemoveLiquidity;
/* eslint-enable max-lines */
