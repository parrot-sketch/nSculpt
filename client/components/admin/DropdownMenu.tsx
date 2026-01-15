'use client';

import { ReactNode, useState, useRef, useEffect } from 'react';
import { MoreVertical } from 'lucide-react';

interface DropdownMenuItem {
  label?: string;
  icon?: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  variant?: 'default' | 'danger' | 'warning';
  separator?: boolean;
}

interface DropdownMenuProps {
  items: DropdownMenuItem[];
  align?: 'left' | 'right';
}

export function DropdownMenu({ items, align = 'right' }: DropdownMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0, right: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        buttonRef.current?.contains(event.target as Node) ||
        menuRef.current?.contains(event.target as Node)
      ) {
        return;
      }
      setIsOpen(false);
    }

    if (isOpen) {
      // Calculate menu position
      if (buttonRef.current) {
        const rect = buttonRef.current.getBoundingClientRect();
        setMenuPosition({
          top: rect.bottom + 4,
          left: align === 'left' ? rect.left : 0,
          right: align === 'right' ? window.innerWidth - rect.right : 0,
        });
      }
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, align]);

  const handleItemClick = (item: DropdownMenuItem) => {
    if (!item.disabled && item.onClick) {
      item.onClick();
      setIsOpen(false);
    }
  };

  const getItemStyles = (variant: string = 'default') => {
    const baseStyles = 'flex items-center gap-2 px-4 py-2 text-sm transition-colors';
    
    switch (variant) {
      case 'danger':
        return `${baseStyles} text-red-600 hover:bg-red-50`;
      case 'warning':
        return `${baseStyles} text-yellow-600 hover:bg-yellow-50`;
      default:
        return `${baseStyles} text-neutral-700 hover:bg-neutral-50`;
    }
  };

  return (
    <>
      <div className="relative inline-block">
        <button
          ref={buttonRef}
          onClick={() => setIsOpen(!isOpen)}
          className="p-2 text-neutral-500 hover:text-neutral-700 hover:bg-neutral-100 rounded-lg transition-colors"
          aria-label="More options"
        >
          <MoreVertical className="w-4 h-4" />
        </button>
      </div>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          
          {/* Menu - Fixed positioning, doesn't affect table layout */}
          <div
            ref={menuRef}
            className="fixed z-50 w-56 bg-white rounded-lg shadow-xl border border-neutral-200 py-1"
            style={{
              top: `${menuPosition.top}px`,
              ...(align === 'right' 
                ? { right: `${menuPosition.right}px` }
                : { left: `${menuPosition.left}px` }
              ),
            }}
          >
            {items.map((item, index) => {
              if (item.separator) {
                return <div key={`separator-${index}`} className="border-t border-neutral-200 my-1" />;
              }

              if (!item.label || !item.onClick) {
                return null;
              }

              return (
                <button
                  key={index}
                  onClick={() => handleItemClick(item)}
                  disabled={item.disabled}
                  className={`w-full text-left ${getItemStyles(item.variant)} ${
                    item.disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                  }`}
                >
                  {item.icon && <span className="w-4 h-4">{item.icon}</span>}
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        </>
      )}
    </>
  );
}

