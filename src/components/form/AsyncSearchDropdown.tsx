"use client";
import React, { useState, useEffect, useCallback } from "react";
import Select from "react-select";
import debounce from "lodash.debounce";
import { FormElement } from "../FormCreator";

interface AsyncSearchDropdownProps {
  item: FormElement;
  value: any;
  onChange: (value: any) => void;
  colors: any;
  formData: FormElement[][];
  formValues: any;
  handleFormChange: (values: any) => void;
  fetchDependentOptions: (
    item: FormElement,
    parentValue: string | Record<string, any>,
    searchQuery?: string
  ) => Promise<any[]>;
  isHorizontal?: boolean;
  isDisabled?: boolean;
}

const AsyncSearchDropdown: React.FC<AsyncSearchDropdownProps> = ({
  item,
  value,
  onChange,
  colors,
  formValues,
  handleFormChange,
  fetchDependentOptions,
  isHorizontal = false,
  isDisabled = false,
}) => {


  const [options, setOptions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const minSearchLength = item.dynamicSearch?.minSearchLength || 3;
  const debounceMs = item.dynamicSearch?.debounceMs || 400;

  // ✅ Compute dependency values
  const dependencyValues = (() => {
    if (!item.dependsOn) return {};
    if (Array.isArray(item.dependsOn.field)) {
      return item.dependsOn.field.reduce((acc, f) => {
        acc[f] = formValues[f];
        return acc;
      }, {} as Record<string, any>);
    } else {
      return { [item.dependsOn.field]: formValues[item.dependsOn.field] };
    }
  })();

  /**
   * ✅ Fetch options (used for initial + search fetch)
   */
  const loadOptions = useCallback(
    async (searchQuery: string = "") => {
      // Skip if dependency not satisfied
      if (
        item.dependsOn &&
        ((typeof dependencyValues === "string" && !dependencyValues) ||
          (typeof dependencyValues === "object" &&
            Object.values(dependencyValues).some((val) => !val)))
      ) {
        setOptions([]);
        return;
      }

      setIsLoading(true);
      try {
        const opts = await fetchDependentOptions(item, dependencyValues, searchQuery);
        setOptions(Array.isArray(opts) ? opts : []);
      } catch (err) {
        console.error("Error fetching options:", err);
        setOptions([]);
      } finally {
        setIsLoading(false);
      }
    },
    [item, dependencyValues, fetchDependentOptions]
  );

  /**
   * 🔄 Reload options when dependency changes
   */
  useEffect(() => {
    setOptions([]);
    if (value) {
      // const newValues = { ...formValues, [item.wKey as string]: undefined };
      // handleFormChange(newValues);
      // onChange(undefined);
    }
    loadOptions(""); 
  }, [JSON.stringify(dependencyValues)]);

  /**
   * 🚀 Initial fetch on mount
   */
  useEffect(() => {
    loadOptions("")
  }, []);

  /**
   * 🔍 Debounced search handler (only fires when query length >= minSearchLength)
   */
  const handleSearch = useCallback(
    debounce(async (query: string) => {
      const trimmed = query.trim();
      if (!trimmed) {
        // ✅ empty string → show default options
        await loadOptions("");
        return;
      }

      if (trimmed.length >= minSearchLength) {
        // ✅ only fetch if meets minimum length
        await loadOptions(trimmed);
      }
      // else → do nothing (don’t fetch)
    }, debounceMs),
    [loadOptions, minSearchLength, debounceMs]
  );

  /**
   * ✅ Handle selection change
   */
  const handleChange = (selected: any) => {
    const newValues = { ...formValues };
    newValues[item.wKey as string] = selected?.value ?? undefined;
    onChange(selected?.value);
    handleFormChange(newValues);
  };

  const selectedOption = options.find(
    (opt) => String(opt.value) === String(value)
  );

  return (
    <div className={isHorizontal ? "mb-2" : "mb-4"}>
      <label
        id={`label-${item.name}`}
        className={`block text-sm mb-1 ${
          isHorizontal ? "font-bold" : "font-medium"
        }`}
        style={{ color: colors.text }}
      >
        {item.label}
        {isLoading && (
          <span className="ml-2 inline-block animate-pulse text-xs">
            Loading...
          </span>
        )}
      </label>

      <Select
        inputId={`input-${item.name}`}
        aria-labelledby={`label-${item.name}`}
        aria-label={item.label || "Search dropdown"}
        key={item.wKey as string}
        value={selectedOption || null}
        options={options}
        isLoading={isLoading}
        isDisabled={isDisabled}
        isClearable={true}
        placeholder={value || "Search..."}
        noOptionsMessage={() =>
          isLoading ? "Loading..." : "No results found"
        }
        onInputChange={(inputValue, { action }) => {
          if (action === "input-change") handleSearch(inputValue);
          return inputValue;
        }}
        onChange={handleChange}
        styles={{
          control: (base) => ({
            ...base,
            borderColor: colors.textInputBorder,
            backgroundColor: colors.textInputBackground,
          }),
          option: (base, state) => ({
            ...base,
            backgroundColor: state.isFocused
              ? colors.primary
              : colors.textInputBackground,
            color: state.isFocused ? colors.buttonText : colors.textInputText,
          }),
        }}
      />
    </div>
  );
};

export default AsyncSearchDropdown;
