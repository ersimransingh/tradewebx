"use client";
import React, { useEffect, useState } from "react";
import AsyncSelect from "react-select/async";
import { StylesConfig } from "react-select";

interface OptionType {
  value: string;
  label: string;
}

interface AsyncSearchDropdownProps {
  value: OptionType | null;
  onChange: (value: OptionType | null) => void;

  /** API search function */
  loadOptions: (inputValue: string) => Promise<OptionType[]>;

  placeholder?: string;
  isDisabled?: boolean;
  ariaLabel?: string; 
  colors?: {
    text?: string;
    primary?: string;
    cardBackground?: string;
    color3?: string;
  };
}

const AsyncSearchDropdown: React.FC<AsyncSearchDropdownProps> = ({
  value,
  onChange,
  loadOptions,
  placeholder = "Search…",
  isDisabled = false,
  ariaLabel,
  colors = {},
}) => {
  const [defaultOptions, setDefaultOptions] = useState<OptionType[]>([]);
  const [isDefaultLoading, setIsDefaultLoading] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const fetchDefault = async () => {
      setIsDefaultLoading(true);
      try {
        const opts = await loadOptions("");
        if (isMounted) {
          setDefaultOptions(opts);
        }
      } finally {
        if (isMounted) {
          setIsDefaultLoading(false);
        }
      }
    };

    fetchDefault();

    return () => {
      isMounted = false;
    };
  }, [loadOptions]);

  const customStyles: StylesConfig<OptionType, false> = {
        control: (base) => ({
          ...base,
          backgroundColor: colors.cardBackground || "#fff",
          borderColor: colors.color3 || "#ccc",
          minHeight: "38px",
          boxShadow: "none",
          width: "300px",        
        }),
        menu: (base) => ({
          ...base,
          backgroundColor: colors.cardBackground || "#fff",
          zIndex: 9999,
        }),
        menuPortal: (base) => ({
          ...base,
          zIndex: 99999,
        }),
        valueContainer: (base) => ({
          ...base,
          width: "100%",             
        }),
        input: (base) => ({
          ...base,
          width: "300px!important",  
        }),
        singleValue: (base) => ({
          ...base,
          color: colors.text || "#333",
        }),
   };


  return (
    <AsyncSelect
      aria-label={ariaLabel ?? placeholder}
      cacheOptions
      defaultOptions={defaultOptions}
      loadOptions={loadOptions}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      styles={customStyles}
      isClearable
      isDisabled={isDisabled}
      isLoading={isDefaultLoading}
      className="react-select-container"
      classNamePrefix="react-select"
      menuPortalTarget={typeof document !== "undefined" ? document.body : null}
      menuShouldBlockScroll={true}
      menuPlacement="auto"
    />
  );
};

export default React.memo(AsyncSearchDropdown);
