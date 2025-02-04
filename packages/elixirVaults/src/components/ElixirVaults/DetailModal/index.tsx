import { Box, Modal, Tabs } from '@honeycomb-finance/core';
import { useTranslation } from '@honeycomb-finance/shared';
import { Token } from '@pangolindex/sdk';
import React, { useContext, useState } from 'react';
import { useWindowSize } from 'react-use';
import { ThemeContext } from 'styled-components';
import EarnWidget from './EarnWidget';
import Header from './Header';
import { HeaderProps } from './Header/types';
import Join from './Join';
import DetailTab from './Tabs/DetailTab';
import {
  CustomTab,
  CustomTabList,
  CustomTabPanel,
  DesktopWrapper,
  DetailsWrapper,
  LeftSection,
  MobileWrapper,
  RightSection,
  Root,
} from './styles';
import { DetailModalProps } from './types';

const DetailModal: React.FC<DetailModalProps> = (props) => {
  const { height } = useWindowSize();
  const { isOpen, onClose, vault, stakingInfo } = props;
  const theme = useContext(ThemeContext);
  const { t } = useTranslation();
  const [tabIndex, setTabIndex] = useState(0);

  const headerArgs: HeaderProps = {
    token0: vault?.poolTokens[0] as Token,
    token1: vault?.poolTokens[1] as Token,
    stakeActive: stakingInfo ? true : false,
    statItems: [
      {
        title: 'Fees APR',
        stat: `${vault && vault?.feesApr}%`,
      },
      {
        title: 'Share Price',
        stat: `${vault && vault?.sharePrice}%`,
      },
    ],
    providers: vault?.strategyProvider,
    onClose,
  };

  const renderTabs = () => (
    <Tabs selectedIndex={tabIndex} onSelect={(index) => setTabIndex(index)}>
      <CustomTabList>
        <CustomTab>{t('votePage.details')}</CustomTab>
      </CustomTabList>
      <CustomTabPanel>
        <DetailTab vault={vault} />
      </CustomTabPanel>
    </Tabs>
  );

  return (
    <Modal isOpen={isOpen} onDismiss={onClose} overlayBG={theme.modalBG2} closeOnClickOutside={false}>
      <>
        <MobileWrapper>
          <Header {...headerArgs} />
          <Box p={10}>
            <Box mt={'20px'}>
              <Root>
                <Join vault={vault} stakingInfo={stakingInfo} />
              </Root>
            </Box>
            <Box mt={'20px'}>
              <Root>
                <EarnWidget vault={vault} stakingInfo={stakingInfo} />
              </Root>
            </Box>
            <Box mt={25}>{renderTabs()}</Box>
          </Box>
        </MobileWrapper>
        <DesktopWrapper style={{ maxHeight: height - 150 }}>
          <Header {...headerArgs} />
          <DetailsWrapper>
            <LeftSection>{renderTabs()}</LeftSection>
            <RightSection>
              <Root>
                <Join vault={vault} stakingInfo={stakingInfo} />
              </Root>
              <Root verticalPadding={'35px'}>
                <EarnWidget vault={vault} stakingInfo={stakingInfo} />
              </Root>
            </RightSection>
          </DetailsWrapper>
        </DesktopWrapper>
      </>
    </Modal>
  );
};

export default DetailModal;
