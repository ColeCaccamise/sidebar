'use client';

import { Menu, MenuButton, MenuItems } from '@headlessui/react';
import DropdownMenuItem from '@/components/ui/dropdown-menu-item';
import { ChevronDownIcon, ChevronRightIcon } from '@radix-ui/react-icons';
import Divider from './divider';
import { cn } from '@/lib/utils';
import { useEffect, useRef } from 'react';

type DropdownItem = {
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
  subItems?: Array<DropdownItem>;
  className?: string;
};

export default function Dropdown({
  children,
  menuItems,
  showIcon = true,
  position = 'left',
  top = true,
  dropdownContent,
  className,
  open,
  onClose,
}: {
  children?: React.ReactNode;
  menuItems?: Array<DropdownItem>;
  showIcon?: boolean;
  position?: 'left' | 'right';
  top?: boolean;
  dropdownContent?: React.ReactNode;
  className?: string;
  open?: boolean;
  onClose?: () => void;
}) {
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        open
      ) {
        onClose?.();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open, onClose]);

  return (
    <div className={cn('relative w-full', className)} ref={dropdownRef}>
      <Menu as="div" className="relative inline-block w-full text-left">
        {({ close, open: menuOpen }) => (
          <>
            {children && (
              <MenuButton
                className="transition-effect flex w-full items-center gap-2 whitespace-nowrap hover:text-typography-strong"
                onClick={() => {
                  if (!menuOpen && !open) {
                    onClose?.();
                  }
                }}
              >
                {children} {showIcon && <ChevronDownIcon className="h-4 w-4" />}
              </MenuButton>
            )}

            {(open || menuOpen) && (
              <MenuItems
                static
                className={`absolute ${position === 'left' ? 'left-0' : 'right-0'} ${
                  top ? 'mt-2' : 'bottom-full mb-2'
                } min-w-56 origin-${top ? 'top' : 'bottom'}-${position} focus:outline-non group z-50 whitespace-nowrap rounded-lg border border-stroke-weak bg-fill-solid p-1 shadow-lg`}
              >
                {dropdownContent && (
                  <div className="p-2">{dropdownContent}</div>
                )}
                {menuItems?.map((item, index) => (
                  <div key={item.id || index}>
                    {item.divider ? (
                      <Divider className="-mx-1 my-1 h-[1px] w-[calc(100%+0.5rem)]" />
                    ) : item.subItems ? (
                      <Menu as="div" className="relative w-full">
                        {({ open: subMenuOpen }) => (
                          <>
                            <Menu.Button className="transition-effect flex w-full items-center justify-between gap-2 whitespace-nowrap rounded-md p-2 text-sm hover:bg-fill">
                              <div className="flex items-center gap-2">
                                {item.icon}
                                {item.label}
                              </div>
                              <ChevronRightIcon className="h-4 w-4" />
                            </Menu.Button>
                            {subMenuOpen && (
                              <MenuItems className="absolute left-full top-0 ml-1 min-w-48 origin-top-left rounded-lg border border-stroke-weak bg-fill-solid p-1 shadow-lg">
                                {item?.subItems?.map((subItem, subIndex) => (
                                  <DropdownMenuItem
                                    key={subItem.id || subIndex}
                                    icon={subItem.icon}
                                    label={subItem.label}
                                    kbd={subItem.kbd}
                                    href={subItem.href}
                                    handleClick={() => {
                                      subItem.handleClick?.();
                                      close();
                                      onClose?.();
                                    }}
                                    disabled={subItem.disabled}
                                    destructive={subItem.destructive}
                                    tooltip={subItem.tooltip}
                                  />
                                ))}
                              </MenuItems>
                            )}
                          </>
                        )}
                      </Menu>
                    ) : (
                      <DropdownMenuItem
                        icon={item.icon}
                        label={item.label}
                        kbd={item.kbd}
                        href={item.href}
                        handleClick={() => {
                          item.handleClick?.();
                          close();
                          onClose?.();
                        }}
                        disabled={item.disabled}
                        destructive={item.destructive}
                        tooltip={item.tooltip}
                      />
                    )}
                  </div>
                ))}
              </MenuItems>
            )}
          </>
        )}
      </Menu>
    </div>
  );
}
