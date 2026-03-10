"use client";
import React, { useState, useEffect } from 'react';
import Select from 'react-select';
import CreatableSelect from "react-select/creatable";
import { ActionMeta, InputActionMeta, StylesConfig } from 'react-select';

interface DropdownOption {
  value: string;
  label: string;
}

interface CustomDropdownProps {
  options: DropdownOption[];
  value?: DropdownOption | null;
  onChange: (value: DropdownOption | null) => void;
  placeholder?: string;
  isLoading?: boolean;
  isDisabled?: boolean;
  isCreatable?: boolean;
  error?: string;
  colors?: {
    text?: string;
    background?: string;
    primary?: string;
    buttonText?: string;
    color3?: string;
    cardBackground?: string;
  };
  onMenuOpen?: () => void;
  onCreateOption?: (inputValue: string) => void;
  resetOnOpen?: boolean;
}

const CommonCustomDropdown: React.FC<CustomDropdownProps> = ({
  options = [],
  value = null,
  onChange,
  placeholder = "Select...",
  isLoading = false,
  isDisabled = false,
  isCreatable = false,
  error,
  colors = {},
  onMenuOpen,
  onCreateOption,
  resetOnOpen = false,
}) => {
  const [visibleOptions, setVisibleOptions] = useState<DropdownOption[]>(options.slice(0, 50));
  const [searchText, setSearchText] = useState('');

  useEffect(() => {
    if (searchText) {
      const filtered = options.filter(opt =>
        opt.label.toLowerCase().includes(searchText.toLowerCase()) ||
        opt.value.toLowerCase().includes(searchText.toLowerCase())
      );
      setVisibleOptions(filtered.slice(0, 50));
    } else {
      setVisibleOptions(options.slice(0, 50));
    }
  }, [searchText, options]);

  const handleInputChange = (selected: DropdownOption | null, _actionMeta: ActionMeta<DropdownOption>) => {
    onChange(selected);
  };

  const handleInputTextChange = (inputValue: string, actionMeta: InputActionMeta) => {
    if (actionMeta.action === 'input-change') {
      setSearchText(inputValue);
    }
  };

  const onMenuScrollToBottom = () => {
    const currentLength = visibleOptions.length;
    const filteredOptions = searchText
      ? options.filter(opt =>
        opt.label.toLowerCase().includes(searchText.toLowerCase()) ||
        opt.value.toLowerCase().includes(searchText.toLowerCase())
      )
      : options;

    if (currentLength < filteredOptions.length) {
      const additionalOptions = filteredOptions.slice(currentLength, currentLength + 50);
      setVisibleOptions(prev => [...prev, ...additionalOptions]);
    }
  };

  const customStyles: StylesConfig<DropdownOption, false> = {
    control: (provided, state) => ({
      ...provided,
      backgroundColor: colors.cardBackground || '#ffffff',
      borderColor: error
        ? '#dc2626'
        : state.isFocused
          ? colors.primary || '#2563eb'
          : colors.color3 || '#d1d5db',
      boxShadow: state.isFocused
        ? `0 0 0 1px ${colors.primary || '#2563eb'}`
        : 'none',
      '&:hover': {
        borderColor: error
          ? '#dc2626'
          : colors.primary || '#2563eb',
      },
      minHeight: '38px',
    }),
    option: (provided, state) => ({
      ...provided,
      backgroundColor: state.isSelected
        ? colors.primary || '#2563eb'
        : state.isFocused
          ? (colors.cardBackground ? `${colors.cardBackground}80` : '#f3f4f6')
          : colors.cardBackground || '#ffffff',
      color: state.isSelected
        ? colors.buttonText || '#ffffff'
        : colors.text || '#333333',
      '&:active': {
        backgroundColor: colors.primary || '#2563eb',
        color: colors.buttonText || '#ffffff',
      },
    }),
    menu: (provided) => ({
      ...provided,
      backgroundColor: colors.cardBackground || '#ffffff',
      zIndex: 9999,
    }),
    singleValue: (provided) => ({
      ...provided,
      color: colors.text || '#333333',
    }),
    input: (provided) => ({
      ...provided,
      color: colors.text || '#333333',
    }),
    placeholder: (provided) => ({
      ...provided,
      color: colors.text ? `${colors.text}80` : '#999999',
    }),
  };

  const SelectComponent = isCreatable ? CreatableSelect : Select;

  return (
    <div className="w-full max-w-md">
      <SelectComponent
        aria-label={placeholder || "Select option"}
        options={visibleOptions}
        value={value}
        onChange={handleInputChange}
        onInputChange={handleInputTextChange}
        onMenuScrollToBottom={onMenuScrollToBottom}
        placeholder={placeholder}
        isLoading={isLoading}
        isDisabled={isDisabled}
        className="react-select-container"
        classNamePrefix="react-select"
        menuPortalTarget={typeof document !== "undefined" ? document.body : null}
        menuShouldBlockScroll={true}
        menuPlacement="auto"
        styles={{
          ...customStyles,
          menuPortal: base => ({
            ...base,
            zIndex: 9999999999
          })
        }}
        filterOption={() => true} // Custom filtering handled manually
        onMenuOpen={() => {
          if (resetOnOpen) {
            setVisibleOptions(options.slice(0, 50));
            setSearchText('');
          }
          if (onMenuOpen) {
            onMenuOpen();
          }
        }}
        {...(isCreatable ? { onCreateOption } : {}) as any}
        isValidNewOption={isCreatable ? undefined : () => false}
        onBlur={() => {
          setVisibleOptions(options.slice(0, 50));
          setSearchText('');
        }}
      />
      {error && (
        <span className="text-red-500 text-sm mt-1">{error}</span>
      )}
    </div>
  );
};

export default CommonCustomDropdown;
