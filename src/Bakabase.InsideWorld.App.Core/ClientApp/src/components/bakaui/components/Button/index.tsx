import { Button } from '@nextui-org/react';
import type { ReactNode } from 'react';

interface IProps extends React.ComponentPropsWithoutRef<'button'>{
  size?: 'sm' | 'md' | 'lg';
  color: 'default' | 'primary' | 'secondary' | 'success' | 'danger' | 'warning';
  variant?: 'solid' | 'faded' | 'bordered' | 'light' | 'flat' | 'shadow';
  children: ReactNode;
  isIconOnly?: boolean;
}

export default (props: IProps) => {
  return (
    <Button
      {...props}
    />
  );
};
