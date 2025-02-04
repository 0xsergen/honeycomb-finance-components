import React, { useContext } from 'react';
import { ThemeContext } from 'styled-components';
import CircleTick from 'src/assets/images/circleTick.svg';
import { Box } from '../Box';
import { BoxProps } from '../Box/Box';
import { Button } from '../Button';
import { CloseIcon } from '../CloseIcon';
import { Text } from '../Text';
import { Root } from './styled';

export interface TransactionCompletedProps {
  onClose?: () => void;
  submitText?: string;
  showCloseIcon?: boolean;
  isShowButtton?: boolean;
  onButtonClick?: () => void;
  buttonText?: string;
  rootStyle?: BoxProps;
}

const TransactionCompleted = ({
  onClose,
  submitText,
  showCloseIcon,
  isShowButtton,
  onButtonClick,
  buttonText,
  rootStyle,
}: TransactionCompletedProps) => {
  const theme = useContext(ThemeContext);
  return (
    <Root {...rootStyle}>
      {showCloseIcon && (
        <Box display="flex" justifyContent="flex-end">
          <CloseIcon onClick={() => onClose && onClose()} color={theme.text4} />
        </Box>
      )}

      <Box display="flex" flexDirection="column" justifyContent="center" alignItems="center" flex={1} paddingY={'20px'}>
        <Box display="flex" alignItems="center" mb={10}>
          <img src={CircleTick} alt="circle-tick" />
        </Box>
        {submitText && (
          <Text fontWeight={500} fontSize={16} color="text1" textAlign="center">
            {submitText}
          </Text>
        )}
      </Box>
      {isShowButtton && (
        <Button variant="primary" onClick={onButtonClick}>
          {buttonText}
        </Button>
      )}
    </Root>
  );
};
export default TransactionCompleted;
