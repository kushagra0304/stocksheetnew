'use client';

import { useState, useEffect, useRef } from 'react';

interface AutocompleteInputProps {
  label: string;
  id: string;
  value: string;
  onChange: (value: string) => void;
  optionsEndpoint: string;
  placeholder?: string;
  required?: boolean;
  refreshKey?: number;
}

export default function AutocompleteInput({
  label,
  id,
  value,
  onChange,
  optionsEndpoint,
  placeholder,
  required = false,
  refreshKey = 0,
}: AutocompleteInputProps) {
  const [options, setOptions] = useState<string[]>([]);
  const [filteredOptions, setFilteredOptions] = useState<string[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Fetch existing options
    const fetchOptions = async () => {
      try {
        setLoading(true);
        const response = await fetch(`${optionsEndpoint}?field=${id}`);
        const data = await response.json();
        if (data.success) {
          setOptions(data.data || []);
          setFilteredOptions(data.data || []);
        }
      } catch (error) {
        console.error('Error fetching options:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchOptions();
  }, [optionsEndpoint, id, refreshKey]);

  useEffect(() => {
    // Filter options based on input value
    if (value) {
      const filtered = options.filter((opt) =>
        opt.toLowerCase().includes(value.toLowerCase())
      );
      setFilteredOptions(filtered);
    } else {
      setFilteredOptions(options);
    }
  }, [value, options]);

  useEffect(() => {
    // Close dropdown when clicking outside
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (option: string) => {
    onChange(option);
    setShowDropdown(false);
    inputRef.current?.blur();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
    setShowDropdown(true);
  };

  const handleInputFocus = () => {
    setShowDropdown(true);
  };

  const canAddNew = value && !options.includes(value) && filteredOptions.length === 0;

  return (
    <div className="relative">
      <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1">
        {label}
      </label>
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          id={id}
          required={required}
          value={value}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 placeholder:text-gray-400"
          placeholder={placeholder || `Enter ${label.toLowerCase()}`}
          list={`${id}-datalist`}
        />
        {showDropdown && (filteredOptions.length > 0 || canAddNew) && (
          <div
            ref={dropdownRef}
            className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto"
          >
            {filteredOptions.map((option, index) => (
              <button
                key={index}
                type="button"
                onClick={() => handleSelect(option)}
                className="w-full text-left px-4 py-2 hover:bg-blue-50 focus:bg-blue-50 focus:outline-none text-gray-900"
              >
                {option}
              </button>
            ))}
            {canAddNew && (
              <button
                type="button"
                onClick={() => handleSelect(value)}
                className="w-full text-left px-4 py-2 hover:bg-green-50 focus:bg-green-50 focus:outline-none text-gray-900 border-t border-gray-200"
              >
                <span className="text-green-600 font-medium">+ Add "{value}"</span>
              </button>
            )}
          </div>
        )}
      </div>
      {loading && (
        <p className="mt-1 text-xs text-gray-500">Loading options...</p>
      )}
    </div>
  );
}

