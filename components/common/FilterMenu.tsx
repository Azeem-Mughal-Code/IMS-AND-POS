import React, { useState, useRef, useEffect } from 'react';
import { FilterIcon, ChevronDownIcon } from '../Icons';

interface FilterMenuProps {
  children: React.ReactNode;
  activeFilterCount: number;
}

export const FilterMenu: React.FC<FilterMenuProps> = ({ children, activeFilterCount }) => {
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [wrapperRef]);
  
  return (
      <div className="relative" ref={wrapperRef}>
          <button
              onClick={() => setIsOpen(!isOpen)}
              className="relative inline-flex items-center justify-center px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-100 dark:focus:ring-offset-gray-800 focus:ring-blue-500"
          >
              <FilterIcon />
              <span className="ml-2 hidden sm:block">Filters</span>
              {activeFilterCount > 0 && (
                  <div className="absolute -top-1.5 -right-1.5 px-1.5 py-0.5 bg-blue-600 text-white text-xs rounded-full">
                      {activeFilterCount}
                  </div>
              )}
          </button>
          {isOpen && (
              <div className="origin-top-right absolute right-0 mt-2 w-72 rounded-md shadow-lg bg-white dark:bg-gray-800 ring-1 ring-black dark:ring-gray-700 ring-opacity-5 z-20 focus:outline-none p-4"
                onClick={(e) => e.stopPropagation()}>
                  <div className="space-y-4">
                      {children}
                  </div>
              </div>
          )}
      </div>
  );
}

export const FilterSelectItem: React.FC<{
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}> = ({ label, value, onChange, options }) => {
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find(opt => opt.value === value);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [wrapperRef]);
  
  const handleSelect = (selectedValue: string) => {
    onChange(selectedValue);
    setIsOpen(false);
  };

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{label}</label>
      <div className="relative" ref={wrapperRef}>
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="w-full flex justify-between items-center text-left pl-3 pr-2 py-2 text-base border border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200"
        >
          <span className="truncate">{selectedOption?.label}</span>
          <ChevronDownIcon className={`h-5 w-5 text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
        </button>
        {isOpen && (
          <div className="absolute z-10 mt-1 w-full bg-white dark:bg-gray-700 shadow-lg rounded-md max-h-60 overflow-auto border border-gray-200 dark:border-gray-600">
            <ul className="py-1">
              {options.map(option => (
                <li
                  key={option.value}
                  onClick={() => handleSelect(option.value)}
                  className={`px-3 py-2 text-sm cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 ${value === option.value ? 'font-semibold text-blue-600 dark:text-blue-400' : 'text-gray-700 dark:text-gray-200'}`}
                >
                  {option.label}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};
