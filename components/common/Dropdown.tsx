import React, { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDownIcon } from '../Icons';

interface DropdownOption<T> {
  value: T;
  label: string;
}

interface DropdownProps<T extends string | number> {
  options: ReadonlyArray<DropdownOption<T>>;
  value: T;
  onChange: (value: T) => void;
}

export function Dropdown<T extends string | number>({ options, value, onChange }: DropdownProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number; width: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find(opt => opt.value === value);

  // Calculate and set menu position
  useLayoutEffect(() => {
    if (isOpen && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setMenuPosition({
        top: rect.bottom,
        left: rect.left,
        width: rect.width,
      });
    }
  }, [isOpen]);

  // Handle closing on click outside and scroll
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        isOpen &&
        triggerRef.current && !triggerRef.current.contains(event.target as Node) &&
        menuRef.current && !menuRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    
    const handleScroll = () => {
      if (isOpen) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      window.addEventListener('scroll', handleScroll, true);
    }
    
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener('scroll', handleScroll, true);
    };
  }, [isOpen]);

  const handleSelect = (selectedValue: T) => {
    onChange(selectedValue);
    setIsOpen(false);
  };
  
  const Menu = menuPosition ? (
    <div 
        ref={menuRef}
        style={{ 
            position: 'fixed', 
            top: `${menuPosition.top + 4}px`, // Add a 4px gap
            left: `${menuPosition.left}px`, 
            width: `${menuPosition.width}px`,
        }}
        className="z-50 bg-white dark:bg-gray-800 shadow-lg rounded-md max-h-60 overflow-auto border border-gray-200 dark:border-gray-700 ring-1 ring-black ring-opacity-5"
    >
        <ul className="py-1" role="listbox">
            {options.map(option => (
              <li
                key={String(option.value)}
                onClick={() => handleSelect(option.value)}
                className={`px-3 py-2 text-sm cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 ${value === option.value ? 'font-semibold bg-gray-100 dark:bg-gray-700 text-blue-600 dark:text-blue-400' : 'text-gray-900 dark:text-gray-200'}`}
                role="option"
                aria-selected={value === option.value}
              >
                {option.label}
              </li>
            ))}
        </ul>
    </div>
  ) : null;

  return (
    <div className="relative w-full">
        <button
          ref={triggerRef}
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="w-full flex justify-between items-center text-left pl-3 pr-2 py-2.5 text-sm border border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-100 dark:focus:ring-offset-gray-900 focus:ring-blue-500 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200"
          aria-haspopup="true"
          aria-expanded={isOpen}
        >
          <span className="truncate">{selectedOption?.label}</span>
          <ChevronDownIcon className={`h-5 w-5 text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
        </button>
        {isOpen && menuPosition && createPortal(Menu, document.body)}
      </div>
  );
}