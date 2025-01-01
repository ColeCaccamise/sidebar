'use client';

import { Menu, MenuButton, MenuItems } from '@headlessui/react';
import DropdownMenuItem from '@/components/ui/dropdown-menu-item';
import { ChevronDownIcon } from '@radix-ui/react-icons';
import Divider from './divider';

export default function Dropdown({
  children,
  menuItems,
  showIcon = true,
  position = 'left',
  top = true,
  dropdownContent,
}: {
  children: React.ReactNode;
  menuItems?: Array<{
    id?: string;
    icon?: React.ReactNode;
    label?: string;
    href?: string;
    kbd?: string;
    handleClick?: () => void;
    divider?: boolean;
    disabled?: boolean;
    destructive?: boolean;
    tooltip?: string;
  }>;
  showIcon?: boolean;
  position?: 'left' | 'right';
  top?: boolean;
  dropdownContent?: React.ReactNode;
}) {
  return (
    <div className="relative w-full">
      <Menu as="div" className="relative inline-block w-full text-left">
        <MenuButton className="transition-effect flex w-full items-center gap-2 whitespace-nowrap hover:text-typography-strong">
          {children} {showIcon && <ChevronDownIcon className="h-4 w-4" />}
        </MenuButton>

        <MenuItems
          transition
          className={`absolute ${position === 'left' ? 'left-0' : 'right-0'} ${
            top ? 'mt-2' : 'bottom-full mb-2'
          } min-w-56 origin-${top ? 'top' : 'bottom'}-${position} focus:outline-non group z-50 whitespace-nowrap rounded-lg border border-stroke-weak bg-fill-solid p-1 shadow-lg`}
        >
          {dropdownContent && <div className="p-2">{dropdownContent}</div>}
          {menuItems?.map((item, index) => (
            <div key={item.id || index}>
              {item.divider ? (
                <Divider className="-mx-1 my-1 h-[1px] w-[calc(100%+0.5rem)]" />
              ) : (
                <DropdownMenuItem
                  icon={item.icon}
                  label={item.label}
                  kbd={item.kbd}
                  href={item.href}
                  handleClick={item.handleClick}
                  disabled={item.disabled}
                  destructive={item.destructive}
                  tooltip={item.tooltip}
                />
              )}
            </div>
          ))}
        </MenuItems>
      </Menu>
    </div>
  );
}
