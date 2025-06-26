"use client";
import React, { useState, useEffect } from 'react';
import Select from 'react-select';
import { useTheme } from '@/context/ThemeContext';
import { FormElement } from '../FormCreator';

interface CustomDropdownProps {
  item: FormElement;
  value: any;
  onChange: (value: any) => void;
  options: Array<{ label: string; value: string }>;
  isLoading: boolean;
  colors: any;
  formData: FormElement[][];
  handleFormChange: (values: any) => void;
  formValues: any;
  isHorizontal?: boolean;
}

const CustomDropdown: React.FC<CustomDropdownProps> = ({
  item,
  value,
  onChange,
  options,
  isLoading,
  colors,
  formData,
  handleFormChange,
  formValues,
  isHorizontal = false
}) => {
  // State for scroll-to-load functionality
  const [visibleOptions, setVisibleOptions] = useState(options.slice(0, 50));
  const [searchText, setSearchText] = useState('');

  useEffect(() => {
    if (options.length > 0) {
      const filtered = options.filter(opt =>
        opt.label.toLowerCase().includes(searchText.toLowerCase()) ||
        opt.value.toLowerCase().includes(searchText.toLowerCase())
      );
      setVisibleOptions(filtered.slice(0, 50));
    }
  }, [searchText, options]);

  const onMenuScrollToBottom = () => {
    const currentLength = visibleOptions.length;
    if (currentLength < options.length) {
      const additionalOptions = options.slice(currentLength, currentLength + 50);
      setVisibleOptions(prev => [...prev, ...additionalOptions]);
    }
  };

  const selectedOption = item.isMultiple
    ? visibleOptions.filter(opt =>
      Array.isArray(value)
        ? value.includes(String(opt.value))
        : false
    )
    : visibleOptions.find(opt =>
      String(opt.value) === String(value)
    );

  const handleChange = (selected: any) => {
    if (selected) {
      if (item.isMultiple) {
        const selectedValues = Array.isArray(selected)
          ? selected.map(opt => opt.value)
          : [selected.value];
        onChange(selectedValues);
      } else {
        onChange(selected.value);
      }

      // Handle dependent fields
      const newValues = { ...formValues };
      if (item.isMultiple) {
        newValues[item.wKey as string] = Array.isArray(selected)
          ? selected.map(opt => opt.value)
          : [selected.value];
      } else {
        newValues[item.wKey as string] = selected.value;
      }

      formData.flat().forEach(dependentItem => {
        if (dependentItem.dependsOn) {
          const dependsOnField = dependentItem.dependsOn.field;
          const isDependent = Array.isArray(dependsOnField)
            ? dependsOnField.includes(item.wKey as string)
            : dependsOnField === item.wKey;

          if (isDependent) {
            newValues[dependentItem.wKey as string] = undefined;
          }
        }
      });

      handleFormChange(newValues);
    } else {
      onChange(item.isMultiple ? [] : undefined);

      const newValues = { ...formValues };
      newValues[item.wKey as string] = item.isMultiple ? [] : undefined;

      formData.flat().forEach(dependentItem => {
        if (dependentItem.dependsOn) {
          const dependsOnField = dependentItem.dependsOn.field;
          const isDependent = Array.isArray(dependsOnField)
            ? dependsOnField.includes(item.wKey as string)
            : dependsOnField === item.wKey;

          if (isDependent) {
            newValues[dependentItem.wKey as string] = undefined;
          }
        }
      });

      handleFormChange(newValues);
    }
  };

  return (
    <div className={isHorizontal ? "mb-2" : "mb-4"}>
      <label className={`block text-sm mb-1 ${isHorizontal ? 'font-bold' : 'font-medium'}`} style={{ color: colors.text }}>
        {item.label}
        {isLoading && <span className="ml-2 inline-block animate-pulse">Loading...</span>}
      </label>
      <Select
        options={visibleOptions}
        value={selectedOption}
        isMulti={item.isMultiple}
        closeMenuOnSelect={!item.isMultiple}
        blurInputOnSelect={!item.isMultiple}
        onChange={handleChange}
        onInputChange={(inputValue, { action }) => {
          if (action === 'input-change') setSearchText(inputValue);
          return inputValue;
        }}
        onMenuScrollToBottom={onMenuScrollToBottom}
        isDisabled={isLoading}
        placeholder={isLoading ? "Loading options..." : "Select..."}
        className="react-select-container"
        classNamePrefix="react-select"
        filterOption={() => true} // Bypass default filtering since we're handling it
        styles={{
          control: (base) => ({
            ...base,
            borderColor: colors.textInputBorder,
            backgroundColor: colors.textInputBackground,
            boxShadow: isLoading ? `0 0 0 1px ${colors.primary}` : base.boxShadow,
            minWidth: isHorizontal ? '250px' : 'auto',
          }),
          singleValue: (base) => ({
            ...base,
            color: colors.textInputText,
          }),
          option: (base, state) => ({
            ...base,
            backgroundColor: state.isFocused ? colors.primary : colors.textInputBackground,
            color: state.isFocused ? colors.buttonText : colors.textInputText,


          }),
          ...(isHorizontal && {
            menu: (base) => ({
              ...base,
              minWidth: '250px',
              width: 'max-content',
              maxWidth: '400px',
            }),
          }),
          menuList: (base) => ({
            ...base,
            maxHeight: '200px',
          }),
          multiValue: (base) => ({
            ...base,
            backgroundColor: colors.primary,
          }),
          multiValueLabel: (base) => ({
            ...base,
            color: colors.buttonText,
          }),
          multiValueRemove: (base) => ({
            ...base,
            color: colors.buttonText,
            ':hover': {
              backgroundColor: colors.primary,
              color: colors.buttonText,
            },
          }),
        }}
      />
      {isLoading && (
        <div className="mt-1 text-xs text-right" style={{ color: colors.primary }}>
          Fetching options...
        </div>
      )}
    </div>
  );
};

export default CustomDropdown;