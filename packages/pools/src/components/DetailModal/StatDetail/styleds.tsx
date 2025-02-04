import styled from 'styled-components';

export const StateContainer = styled.div`
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  display: grid;
  width: 100%;
  align-items: start;
  margin-top: 12px;

  @media screen and (max-width: 1024px) {
    grid-template-columns: 1fr;
    align-items: stretch;
  }

  ${({ theme }) => theme.mediaWidth.upToSmall`
    grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
    grid-column-gap: 6px;
    grid-row-gap:6px;
  `};
  ${({ theme }) => theme.mediaWidth.upToMedium`
    grid-template-columns: repeat(3, 1fr);
    align-items: start;
  `};
`;

export const AnalyticsLink = styled.a`
  display: flex;
  align-items: center;
  padding: 0px 0px 0px 4px;
  border-radius: 4px;

  svg {
    height: 16px;
  }

  path {
    fill: ${({ theme }) => theme.text1};
  }

  &:hover,
  &focus {
    path {
      fill: ${({ theme }) => theme.yellow1};
    }
  }
`;
