import { Box, Button, Loader, Text, Visible } from '@honeycomb-finance/core';
import { ElixirVaults } from '@honeycomb-finance/elixirvaults';
import { BIG_INT_ZERO, useChainId, useDebounce, useTranslation } from '@honeycomb-finance/shared';
import React, { useCallback, useMemo, useState } from 'react';
import AddLiquidity from 'src/components/AddLiquidity';
import DetailModal from 'src/components/DetailModal';
import PoolList from 'src/components/PoolList';
import PositionCard from 'src/components/PositionCard';
import PositionList from 'src/components/PositionList';
import { SortingType } from 'src/components/PositionList/types';
import Sidebar from 'src/components/Sidebar';
import { MenuType } from 'src/components/Sidebar/types';
import { useMintActionHandlers } from 'src/state/mint/hooks';
import { useGetUserPositionsHook } from 'src/state/wallet/hooks';
import { PositionDetails } from 'src/state/wallet/types';
import { Cards, Content, GridContainer, Link, MobileHeader, PageWrapper } from './styles';

const Elixir = () => {
  const { t } = useTranslation();
  const chainId = useChainId();
  const useGetUserPositions = useGetUserPositionsHook[chainId];
  const { positions, loading: positionsLoading } = useGetUserPositions();
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortBy, setSortBy] = useState<string>('');
  const debouncedSearchQuery = useDebounce(searchQuery, 250);
  const [activeMenu, setMenu] = useState<string>(MenuType.topPools);
  const [detailModalIsOpen, setDetailModalIsOpen] = useState<boolean>(false);
  const [addLiquidityIsOpen, setAddLiquidityIsOpen] = useState<boolean>(false);
  const [selectedPositionTokenId, setSelectedPositionTokenId] = useState<string | undefined>(undefined);
  const menuItems: Array<{ label: string; value: string }> = Object.keys(MenuType).map((key) => ({
    label: t(`elixir.menuTypes.${MenuType[key]}`),
    value: MenuType[key],
  }));

  const handleSearch = useCallback((value) => {
    setSearchQuery(value.trim());
  }, []);

  const sort = (positions: PositionDetails[]) => {
    if (sortBy === SortingType.liquidity) {
      const sortedPositions = [...positions].sort(function (info_a, info_b) {
        return info_a?.liquidity?.gte(info_b?.liquidity ?? BIG_INT_ZERO) ? -1 : 1;
      });
      return sortedPositions;
    } else if (sortBy === SortingType.apr) {
      const sortedPositions = [...positions].sort((a, b) => (b?.fee ?? 0) - (a?.fee ?? 0));
      return sortedPositions;
    }
  };

  const [openPositions, closedPositions] = useMemo(() => {
    return (
      positions?.reduce<[PositionDetails[], PositionDetails[]]>(
        (acc, p) => {
          acc[p.liquidity?.isZero() ? 1 : 0].push(p);
          return acc;
        },
        [[], []],
      ) ?? [[], []]
    );
  }, [positions]);

  /**
   * It filters positions based on the active menu
   */
  const filteredPositions = useMemo(() => {
    if (activeMenu === MenuType.allPositions) {
      return [...openPositions, ...closedPositions];
    } else if (activeMenu === MenuType.openPositions) {
      return openPositions;
    } else {
      return closedPositions;
    }
  }, [activeMenu, closedPositions, openPositions]);

  /**
   * It sorts and filters the active menu positions based on the search query and the sorting type
   */
  const finalPositions = useMemo(() => {
    let positions: PositionDetails[] = filteredPositions;
    if (searchQuery) {
      positions = filteredPositions.filter((position) => {
        return (
          (position?.token0?.symbol || '').toUpperCase().includes(debouncedSearchQuery.toUpperCase()) ||
          (position?.token1?.symbol || '').toUpperCase().includes(debouncedSearchQuery.toUpperCase())
        );
      });
    }

    if (sortBy) {
      positions = sort(positions) ?? positions;
    }

    return positions;
  }, [filteredPositions, debouncedSearchQuery, sortBy]);

  const selectedPosition = useMemo(() => {
    if (!finalPositions) {
      // If finalPositions is undefined, there's no selected position
      return undefined;
    } else {
      // If the selected position no longer exists in the final positions, clear the selection
      const selectedPositionExists = finalPositions.some(
        (position) => position.tokenId.toString() === selectedPositionTokenId,
      );

      if (!selectedPositionExists) {
        return undefined;
      } else {
        // If selectedPosition still exists but its data might have changed
        // Find the new data from finalPositions and update selectedPosition
        const newSelectedPosition = finalPositions.find(
          (position) => position.tokenId.toString() === selectedPositionTokenId,
        );

        if (newSelectedPosition) {
          return newSelectedPosition;
        }
      }
    }
  }, [finalPositions, selectedPositionTokenId]); // selectedPositionTokenId is a new state you'll need to create.

  const handleSetMenu = useCallback(
    (value: string) => {
      setMenu(value);
    },
    [setMenu],
  );

  const onChangeDetailModalStatus = useCallback(
    (position: PositionDetails | undefined) => {
      setDetailModalIsOpen(!detailModalIsOpen);
      setSelectedPositionTokenId(position?.tokenId.toString());
    },
    [detailModalIsOpen],
  );

  const onChangeAddLiquidityStatus = useCallback(() => {
    setAddLiquidityIsOpen(!addLiquidityIsOpen);
  }, [addLiquidityIsOpen]);

  const { onResetMintState } = useMintActionHandlers(undefined);

  return (
    <PageWrapper>
      <Visible upToSmall>
        <Link fontSize={14} color="white" cursor="pointer" as="a" href="/#/pool/standard">
          {t('elixir.checkClassicFarms')}
        </Link>
      </Visible>
      <GridContainer>
        <Box display="flex" position={'relative'} height="100%">
          <Sidebar
            changeAddLiquidityModalStatus={onChangeAddLiquidityStatus}
            activeMenu={activeMenu}
            setMenu={handleSetMenu}
            menuItems={menuItems}
          />
          <Content>
            <Visible upToSmall>
              <MobileHeader>
                <Text color="color11" fontSize={[32, 28]} fontWeight={500}>
                  {t('elixir.sidebar.title')}
                </Text>
                <Button onClick={onChangeAddLiquidityStatus} padding="4px 6px" variant="primary">
                  {t('common.addLiquidity')}
                </Button>
              </MobileHeader>
            </Visible>

            {activeMenu === MenuType.topPools && (
              <PoolList setMenu={handleSetMenu} activeMenu={activeMenu} menuItems={menuItems} />
            )}
            {activeMenu === MenuType.elixirVaults && (
              <ElixirVaults setMenu={handleSetMenu} activeMenu={activeMenu} menuItems={menuItems} />
            )}
            {activeMenu !== MenuType.topPools && activeMenu !== MenuType.elixirVaults && (
              <>
                {positionsLoading ? (
                  <Loader height={'auto'} size={100} />
                ) : (
                  <PositionList
                    setMenu={handleSetMenu}
                    activeMenu={activeMenu}
                    menuItems={menuItems}
                    handleSearch={handleSearch}
                    onChangeSortBy={setSortBy}
                    sortBy={sortBy}
                    searchQuery={searchQuery}
                    isLoading={false}
                    doesNotPoolExist={finalPositions?.length === 0}
                  >
                    <Cards>
                      {finalPositions.map((position) => (
                        <PositionCard
                          key={position.tokenId.toString()}
                          token0={position.token0}
                          token1={position.token1}
                          feeAmount={position.fee}
                          tokenId={position.tokenId}
                          liquidity={position.liquidity}
                          tickLower={position.tickLower}
                          tickUpper={position.tickUpper}
                          onClick={() => {
                            onChangeDetailModalStatus(position);
                          }}
                        />
                      ))}
                    </Cards>
                  </PositionList>
                )}
              </>
            )}
          </Content>
        </Box>
      </GridContainer>
      <DetailModal
        isOpen={detailModalIsOpen}
        position={selectedPosition}
        onClose={() => {
          onChangeDetailModalStatus(undefined);
          onResetMintState();
        }}
      />
      {addLiquidityIsOpen && <AddLiquidity isOpen={addLiquidityIsOpen} onClose={onChangeAddLiquidityStatus} />}
    </PageWrapper>
  );
};
export { Elixir };
