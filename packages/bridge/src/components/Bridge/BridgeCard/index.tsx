/* eslint-disable max-lines */
import { Box, Button, Collapsed, DropdownMenu, Loader, SlippageInput, Text } from '@honeycomb-finance/core';
import {
  checkAddressNetworkBaseMapping,
  maxAmountSpend,
  useActiveWeb3React,
  useChainId,
  useDebounce,
  useLibrary,
  useTranslation,
} from '@honeycomb-finance/shared';
import { useWalletModalToggle } from '@honeycomb-finance/state-hooks';
import { injected } from '@honeycomb-finance/wallet-connectors';
import { changeNetwork, useWalletState } from '@honeycomb-finance/walletmodal'; // TODO FIx in future to bridge package works standalone from walletmodal
import {
  BRIDGES,
  Bridge,
  BridgeChain,
  BridgeCurrency,
  Chain,
  CurrencyAmount,
  LIFI as LIFIBridge,
  NetworkType,
  RANGO,
  SQUID,
  // THORSWAP,
} from '@pangolindex/sdk';
import React, { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { ChevronDown, ChevronRight, RefreshCcw, X } from 'react-feather';
import { MultiValue } from 'react-select';
import { ThemeContext } from 'styled-components';
import CircleTick from 'src/assets/circleTick.svg';
import ErrorTick from 'src/assets/errorTick.svg';
import SelectBridgeCurrencyDrawer from 'src/components/SelectBridgeCurrencyDrawer';
import SelectChainDrawer from 'src/components/SelectChainDrawer';
import { useBridgeActionHandlers, useBridgeSwapActionHandlers, useDerivedBridgeInfo } from 'src/hooks';
import { ChainField, CurrencyField, TransactionStatus } from 'src/hooks/atom';
import { useBridgeChains } from 'src/hooks/chains';
import { useBridgeCurrencies } from 'src/hooks/currencies';
import BridgeInputsWidget from '../BridgeInputsWidget';
import {
  ArrowWrapper,
  BottomText,
  CardWrapper,
  CloseCircle,
  FilterBox,
  FilterInputHeader,
  TransactionText,
  Wrapper,
} from './styles';
import { BridgeCardProps } from './types';

type Option = {
  label: string;
  value: string;
};

const BridgeCard: React.FC<BridgeCardProps> = (props) => {
  const {
    account,
    fromChain,
    toChain,
    inputCurrency,
    outputCurrency,
    recipient,
    slippageTolerance,
    getRoutes,
    setSlippageTolerance,
  } = props;

  const toggleWalletModal = useWalletModalToggle();
  const theme = useContext(ThemeContext);

  const bridges = BRIDGES.map((bridge: Bridge) => ({ label: bridge.name, value: bridge.id }));
  const { activate, deactivate, connector } = useActiveWeb3React();

  const [isChainDrawerOpen, setIsChainDrawerOpen] = useState(false);
  const [isCurrencyDrawerOpen, setIsCurrencyDrawerOpen] = useState(false);
  const [activeBridges, setActiveBridges] = useState<MultiValue<Option>>(bridges);
  const { t } = useTranslation();
  const {
    currencyBalances,
    parsedAmount,
    estimatedAmount,
    amountNet,
    selectedRoute,
    transactionLoaderStatus,
    transactionError,
    transactionStatus,
  } = useDerivedBridgeInfo();

  const chainHook = useBridgeChains();
  const currencyHook = useBridgeCurrencies();
  const sdkChainId = useChainId();
  const [drawerType, setDrawerType] = useState(ChainField.FROM);

  const { wallets } = useWalletState(); // TODO FIX

  const { library } = useLibrary();

  const { sendTransaction } = useBridgeSwapActionHandlers();

  const isToAddress = checkAddressNetworkBaseMapping[toChain?.network_type || NetworkType.EVM];

  const onSendTransaction = useCallback(() => {
    selectedRoute?.bridgeType?.id && sendTransaction[selectedRoute?.bridgeType?.id](library, selectedRoute, account);
  }, [selectedRoute]);

  const onChangeTokenDrawerStatus = useCallback(() => {
    setIsCurrencyDrawerOpen(!isCurrencyDrawerOpen);
  }, [isCurrencyDrawerOpen]);

  const onChangeChainDrawerStatus = useCallback(() => {
    setIsChainDrawerOpen(!isChainDrawerOpen);
  }, [isChainDrawerOpen]);

  const {
    onSwitchTokens,
    onSwitchChains,
    onCurrencySelection,
    onChainSelection,
    onUserInput,
    onChangeRecipient,
    onChangeRouteLoaderStatus,
    onClearTransactionData,
  } = useBridgeActionHandlers();

  const maxAmountInput: CurrencyAmount | undefined = maxAmountSpend(sdkChainId, currencyBalances[CurrencyField.INPUT]);

  const debouncedAmountValue = useDebounce(parsedAmount?.toExact(), 1500);

  const allBridgeCurrencies = useMemo(() => {
    if (currencyHook && activeBridges) {
      let data: BridgeCurrency[] = [];
      Object.entries(currencyHook).forEach(([key, value]) => {
        if (activeBridges.some((bridge) => bridge.value === key)) {
          data = data
            ?.concat(value)
            ?.filter(
              (val, index, self) =>
                index === self.findIndex((t) => t?.symbol === val?.symbol && t?.chainId === val?.chainId),
            );
        }
      });
      return data;
    }
  }, [currencyHook?.[LIFIBridge.id], currencyHook?.[SQUID.id], activeBridges]);

  const inputCurrencyList = useMemo(() => {
    const data = allBridgeCurrencies?.filter((val) => val?.chainId === fromChain?.chain_id?.toString());
    return data;
  }, [fromChain, allBridgeCurrencies]);

  const outputCurrencyList = useMemo(() => {
    const data = allBridgeCurrencies?.filter((val) => val?.chainId === toChain?.chain_id?.toString());
    return data;
  }, [toChain, allBridgeCurrencies]);

  const chainList = useMemo(() => {
    if (activeBridges) {
      let data: BridgeChain[] = [];
      activeBridges.forEach((bridge: Option) => {
        data = data
          ?.concat(chainHook[bridge.value])
          ?.filter((val, index, self) => index === self.findIndex((t) => t?.chain_id === val?.chain_id));
      });

      if (activeBridges.length === 0) {
        data = [];
      }
      return data;
    }
  }, [activeBridges, chainHook?.[LIFIBridge.id], chainHook?.[SQUID.id], chainHook?.[RANGO.id]]);

  useEffect(() => {
    if (
      debouncedAmountValue &&
      inputCurrency &&
      outputCurrency &&
      toChain &&
      (toChain?.network_type === NetworkType.EVM || isToAddress(recipient, toChain))
    ) {
      onChangeRouteLoaderStatus();
      getRoutes({
        amount: debouncedAmountValue,
        slipLimit: slippageTolerance,
        fromChain,
        toChain,
        fromAddress: account,
        fromCurrency: inputCurrency,
        toCurrency: outputCurrency,
        recipient,
      });
    }
  }, [debouncedAmountValue, slippageTolerance, inputCurrency, outputCurrency, recipient, account]);

  const changeAmount = useCallback(
    (field: CurrencyField, amount: string) => {
      onUserInput(field, amount);
    },
    [onUserInput],
  );

  const handleMaxInput = useCallback(() => {
    maxAmountInput && changeAmount(CurrencyField.INPUT, maxAmountInput?.toExact());
  }, [maxAmountInput, changeAmount]);

  const onCurrencySelect = useCallback(
    (currency: BridgeCurrency) => {
      onCurrencySelection(drawerType === ChainField.FROM ? CurrencyField.INPUT : CurrencyField.OUTPUT, currency);
    },
    [drawerType, onCurrencySelection],
  );

  const onChainSelect = useCallback(
    (chain: Chain) => {
      onChainSelection(drawerType, chain);
    },
    [drawerType, onChainSelection],
  );

  const changeRecipient = useCallback(
    (recipient: string) => {
      onChangeRecipient(recipient);
    },
    [onChangeRecipient],
  );

  return (
    <Wrapper>
      {transactionLoaderStatus && (
        <CardWrapper>
          <Loader height={'auto'} label={t('bridge.bridgeCard.loader.labels.waitingReceivingChain')} size={100} />
          <BottomText>{t('bridge.bridgeCard.loader.bottomText')}</BottomText>
        </CardWrapper>
      )}
      {transactionStatus === TransactionStatus.FAILED && (
        <CardWrapper>
          <CloseCircle
            onClick={() => {
              onClearTransactionData(transactionStatus);
            }}
          >
            <X color={theme.bridge?.loaderCloseIconColor} size={10} />
          </CloseCircle>
          <Box flex="1" display="flex" alignItems="center" flexDirection={'column'} justifyContent={'center'}>
            <img src={ErrorTick} alt="error-tick" />
            {transactionError && <TransactionText>{transactionError.message}</TransactionText>}
          </Box>
        </CardWrapper>
      )}
      {transactionStatus === TransactionStatus.SUCCESS && (
        <CardWrapper>
          <CloseCircle
            onClick={() => {
              onClearTransactionData(transactionStatus);
            }}
          >
            <X color={theme.bridge?.loaderCloseIconColor} size={10} />
          </CloseCircle>
          <Box flex="1" display="flex" alignItems="center" flexDirection={'column'} justifyContent={'center'}>
            <img src={CircleTick} alt="circle-tick" />
            <TransactionText>{t('bridge.bridgeCard.transactionSucceeded')}</TransactionText>
          </Box>
        </CardWrapper>
      )}
      <Text fontSize={24} fontWeight={700} color={'bridge.text'} pb={30}>
        {t('bridge.bridgeCard.title')}
      </Text>
      <BridgeInputsWidget
        onChangeTokenDrawerStatus={() => {
          setDrawerType(ChainField.FROM);
          onChangeTokenDrawerStatus();
        }}
        onChangeChainDrawerStatus={() => {
          setDrawerType(ChainField.FROM);
          onChangeChainDrawerStatus();
        }}
        onChangeAmount={(amount) => {
          changeAmount(CurrencyField.INPUT, amount);
        }}
        maxAmountInput={maxAmountInput}
        amount={parsedAmount}
        handleMaxInput={handleMaxInput}
        title={t('bridge.bridgeTransfer.from')}
        inputDisabled={false}
        chain={fromChain}
        currency={inputCurrency}
      />
      <Box display={'flex'} justifyContent={'center'} alignContent={'center'} marginY={20}>
        <ArrowWrapper
          clickable={toChain?.network_type === NetworkType.EVM}
          onClick={() => {
            if (toChain?.network_type === NetworkType.EVM) {
              onSwitchTokens();
              onSwitchChains();
            }
          }}
        >
          <RefreshCcw size="16" color={theme.bridge?.text} />
        </ArrowWrapper>
      </Box>
      <BridgeInputsWidget
        onChangeTokenDrawerStatus={() => {
          setDrawerType(ChainField.TO);
          onChangeTokenDrawerStatus();
        }}
        onChangeChainDrawerStatus={() => {
          setDrawerType(ChainField.TO);
          onChangeChainDrawerStatus();
        }}
        title={t('bridge.bridgeTransfer.to')}
        onChangeRecipient={changeRecipient}
        recipient={recipient}
        inputDisabled={true}
        amount={estimatedAmount}
        amountNet={amountNet}
        chain={toChain}
        currency={outputCurrency}
      />
      <Box marginY={30}>
        {!account ? (
          <Button variant="primary" onClick={toggleWalletModal}>
            {t('earn.connectWallet')}
          </Button>
        ) : sdkChainId !== fromChain?.chain_id ? (
          <Button
            variant="primary"
            onClick={() => {
              fromChain &&
                changeNetwork({
                  chain: fromChain as Chain,
                  wallets: Object.values(wallets),
                  activate,
                  deactivate,
                  connector: connector ?? injected,
                }); // TODO FIX
            }}
            isDisabled={!fromChain || (toChain?.network_type === NetworkType.EVM && !recipient)}
          >
            {fromChain ? t('bridge.bridgeCard.switchChain') : t('bridge.bridgeCard.selectChain')}
          </Button>
        ) : (
          <Button
            variant="primary"
            onClick={() => {
              onSendTransaction();
            }}
            isDisabled={!selectedRoute}
          >
            {t('bridge.bridgeCard.swap')}
          </Button>
        )}
      </Box>
      <Box display={'flex'} flexDirection={'column'} justifyContent={'center'}>
        <Collapsed
          collapse={
            <Box display={'flex'} flexDirection={'row'} justifyContent={'center'} alignItems={'center'}>
              <Text fontSize={16} fontWeight={500} color={'bridge.text'}>
                {t('bridge.bridgeCard.advancedOptions')}
              </Text>
              <ChevronDown size={16} color={theme.bridge?.text} />
            </Box>
          }
          expand={
            <Box display={'flex'} flexDirection={'row'} justifyContent={'center'} alignItems={'center'}>
              <Text fontSize={16} fontWeight={500} color={'bridge.text'}>
                {t('bridge.bridgeCard.advancedOptions')}
              </Text>
              <ChevronRight size={16} color={theme.bridge?.text} />
            </Box>
          }
        >
          <FilterBox>
            <FilterInputHeader>{t('bridge.bridgeCard.filter.slippage')}</FilterInputHeader>
            <SlippageInput
              showTitle={false}
              expertMode={false}
              slippageTolerance={slippageTolerance}
              setSlippageTolerance={setSlippageTolerance}
            />
          </FilterBox>
          <FilterBox>
            <FilterInputHeader>{t('bridge.bridgeCard.filter.bridges')}</FilterInputHeader>
            <DropdownMenu
              options={bridges}
              defaultValue={activeBridges}
              isMulti={true}
              menuPlacement={'top'}
              onSelect={(value) => {
                setActiveBridges(value as MultiValue<Option>);
              }}
            />
          </FilterBox>
        </Collapsed>
      </Box>
      {isChainDrawerOpen && (
        <SelectChainDrawer
          isOpen={isChainDrawerOpen}
          // We can't show non-evm chains here. Because we don't have non-evm chain wallet integration yet. (in Bridge wise.)
          chains={
            drawerType === ChainField.FROM ? chainList?.filter((x) => x.network_type === NetworkType.EVM) : chainList
          }
          onClose={onChangeChainDrawerStatus}
          onChainSelect={onChainSelect}
          selectedChain={drawerType === ChainField.FROM ? fromChain : toChain}
          otherSelectedChain={drawerType === ChainField.TO ? toChain : fromChain}
        />
      )}
      {isCurrencyDrawerOpen && (
        <SelectBridgeCurrencyDrawer
          isOpen={isCurrencyDrawerOpen}
          bridgeCurrencies={drawerType === ChainField.FROM ? inputCurrencyList : outputCurrencyList}
          onClose={() => {
            onChangeTokenDrawerStatus();
          }}
          onCurrencySelect={onCurrencySelect}
          selectedCurrency={drawerType === ChainField.FROM ? inputCurrency : outputCurrency}
          otherSelectedCurrency={drawerType === ChainField.TO ? outputCurrency : inputCurrency}
        />
      )}
    </Wrapper>
  );
};

export default BridgeCard;
