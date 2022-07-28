import React, { useContext } from 'react';
import { ThemeContext } from 'styled-components';
import CircleTick from 'src/assets/images/circleTick.svg';
import { Box, Button, Text } from 'src/components';
import { CloseIcon } from 'src/theme/components';
import { Root } from './styled';

export interface TransactionCompletedProps {
  onClose?: () => void;
  submitText?: string;
  showCloseIcon?: boolean;
  isShowButtton?: boolean;
  onButtonClick?: () => void;
  buttonText?: string;
}

const TransactionCompleted = ({
  onClose,
  submitText,
  showCloseIcon,
  isShowButtton,
  onButtonClick,
  buttonText,
}: TransactionCompletedProps) => {
  const theme = useContext(ThemeContext);
  return (
    <Root>
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
