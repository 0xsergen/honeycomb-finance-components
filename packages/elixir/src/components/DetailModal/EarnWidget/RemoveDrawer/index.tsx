import { Drawer } from '@honeycomb-finance/core';
import { useTranslation } from '@honeycomb-finance/shared';
import React from 'react';
import Remove from '../Remove';
import { RemoveDrawerProps } from './types';

const RemoveDrawer: React.FC<RemoveDrawerProps> = (props) => {
  const { t } = useTranslation();
  const { isOpen, onClose, position } = props;
  return (
    <Drawer title={t('common.remove')} isOpen={isOpen} onClose={onClose}>
      <Remove position={position} />
    </Drawer>
  );
};
export default RemoveDrawer;
