import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Option } from '../../types';
import { ChevronUpDownIcon, XCircleIcon } from '@heroicons/react/20/solid';

interface SelectProps {
  label?: string;
  options: Option[];
  value: string; 
  onChange: (name: string, value: string) => void;
  name: string; 
  error?: string;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  id?: string;
  required?: boolean;
}

const Select: React.FC<SelectProps> = ({
  label,
  id,
  options,
  value,
  onChange,
  name,
  error,
  placeholder = 'Seleccionar...',
  disabled = false,
  className = '',
  required = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const selectRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const optionsListRef = useRef<HTMLUListElement>(null);

  const selectedOption = useMemo(() => options.find(option => option.value === value), [options, value]);
  const displayLabel = selectedOption ? selectedOption.label : placeholder;

  const filteredOptions = useMemo(() =>
    options.filter(option =>
      option.label.toLowerCase().includes(searchTerm.toLowerCase())
    ), [options, searchTerm]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (selectRef.current && !selectRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchTerm(''); 
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
      setHighlightedIndex(-1); 
    }
  }, [isOpen, searchTerm]);

   useEffect(() => {
    if (highlightedIndex >= 0 && highlightedIndex < filteredOptions.length && optionsListRef.current) {
      const optionElement = optionsListRef.current.children[highlightedIndex] as HTMLLIElement;
      optionElement?.scrollIntoView({ block: 'nearest' });
    }
  }, [highlightedIndex, filteredOptions]);

  const handleSelectOption = (option: Option) => {
    onChange(name, option.value);
    setSearchTerm('');
    setIsOpen(false);
  };
  
  const handleClearSelection = (event: React.MouseEvent) => {
    event.stopPropagation(); 
    onChange(name, ''); 
    setSearchTerm('');
    setIsOpen(false);
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLElement>) => { 
    if (disabled) return;

    switch (e.key) {
      case 'Enter':
      case ' ': 
        e.preventDefault();
        if (!isOpen) {
          setIsOpen(true);
        } else if (highlightedIndex >= 0 && highlightedIndex < filteredOptions.length) {
          handleSelectOption(filteredOptions[highlightedIndex]);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setSearchTerm('');
        break;
      case 'ArrowDown':
        e.preventDefault();
        if (!isOpen) setIsOpen(true);
        setHighlightedIndex(prev => (prev + 1) % filteredOptions.length);
        break;
      case 'ArrowUp':
        e.preventDefault();
        if (!isOpen) setIsOpen(true);
        setHighlightedIndex(prev => (prev - 1 + filteredOptions.length) % filteredOptions.length);
        break;
      default:
        // Allow typing to open if closed and start search
        if (!isOpen && e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
            setIsOpen(true);
        }
        break;
    }
  };
  
  const hasValue = value && selectedOption;

  return (
    <div className={`w-full ${className}`} ref={selectRef}>
      {label && (
        <label htmlFor={id || name} className="block text-sm font-medium text-text-secondary mb-1">
          {label}
        </label>
      )}
      <div className="relative">
        <button
          type="button"
          id={id || name}
          disabled={disabled}
          className={`
            form-input block w-full text-left sm:text-sm rounded-md
            bg-input-bg text-text-principal placeholder-text-secondary/70
            border-input-border focus:ring-primary focus:border-primary focus:outline-none
            disabled:bg-border-color disabled:text-text-secondary/70 disabled:cursor-not-allowed
            pl-3 pr-10 py-2
            ${error ? 'border-danger focus:ring-danger focus:border-danger' : ''}
          `}
          onClick={() => { if (!disabled) setIsOpen(!isOpen); }}
          onKeyDown={handleKeyDown}
          aria-haspopup="listbox"
          aria-expanded={isOpen}
          aria-labelledby={label ? `${id || name}-label` : undefined}
          aria-required={required}
        >
          <span className={`block truncate ${!hasValue ? 'text-text-secondary/80' : ''}`}>
            {displayLabel}
          </span>
          <span className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
            <ChevronUpDownIcon className="h-5 w-5 text-text-secondary" aria-hidden="true" />
          </span>
        </button>
         {hasValue && !disabled && (
            <button
                type="button"
                onClick={handleClearSelection}
                className="absolute inset-y-0 right-7 flex items-center pr-2 z-10" 
                aria-label="Limpiar selección"
            >
                <XCircleIcon className="h-5 w-5 text-text-secondary/70 hover:text-text-secondary" />
            </button>
        )}

        {isOpen && !disabled && (
          <div className="absolute z-10 mt-1 w-full bg-input-bg shadow-lg max-h-60 rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 dark:ring-white dark:ring-opacity-10 overflow-auto focus:outline-none sm:text-sm">
            <div className="p-2">
              <input
                ref={inputRef}
                type="text"
                className="form-input block w-full sm:text-sm rounded-md border-input-border focus:ring-primary focus:border-primary py-1.5 px-2 bg-input-bg text-text-principal placeholder-text-secondary/70"
                placeholder="Buscar..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => { 
                     // Prevent main handler from closing on Enter/Space if search input is focused
                     if (['Enter', 'ArrowDown', 'ArrowUp', 'Escape'].includes(e.key)) {
                        e.stopPropagation(); 
                        handleKeyDown(e); 
                     }
                }}
              />
            </div>
            <ul
              ref={optionsListRef}
              role="listbox"
              aria-activedescendant={highlightedIndex >=0 ? `option-${filteredOptions[highlightedIndex]?.value}` : undefined}
            >
              {filteredOptions.length === 0 && searchTerm ? (
                <li className="text-text-secondary px-4 py-2">No se encontraron opciones.</li>
              ) : (
                filteredOptions.map((option, index) => (
                  <li
                    key={option.value}
                    id={`option-${option.value}`}
                    className={`
                      cursor-default select-none relative py-2 pl-3 pr-9
                      ${index === highlightedIndex ? 'text-text-on-primary bg-primary' : 'text-text-principal'}
                      hover:bg-primary hover:text-text-on-primary
                    `}
                    onClick={() => handleSelectOption(option)}
                    onMouseEnter={() => setHighlightedIndex(index)}
                    role="option"
                    aria-selected={value === option.value}
                  >
                    <span className={`block truncate ${value === option.value ? 'font-semibold' : 'font-normal'}`}>
                      {option.label}
                    </span>
                  </li>
                ))
              )}
            </ul>
          </div>
        )}
      </div>
      {error && <p className="mt-1 text-xs text-danger">{error}</p>}
    </div>
  );
};

export default Select;