import { Box } from '@honeycomb-finance/core';
import styled from 'styled-components';

export const DataBox = styled(Box)`
  align-items: center;
  justify-content: space-between;
  display: flex;
  margin: 5px 0px 5px 0px;
`;

export const Divider = styled(Box)`
  height: 1px;
  background-color: ${({ theme }) => theme.swapWidget?.secondary};
  margin: 10px 0px 10px 0px;
  width: 100%;
`;
