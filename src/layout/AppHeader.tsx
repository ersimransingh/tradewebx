"use client";
import NotificationDropdown from "@/components/header/NotificationDropdown";
import UserDropdown from "@/components/header/UserDropdown";
import { useSidebar } from "@/context/SidebarContext";
import { ThemeType, useTheme } from "@/context/ThemeContext";
import { setTableStyle } from "@/redux/features/common/commonSlice";
import Image from "next/image";
import Link from "next/link";
import React, { useState, useEffect, useRef } from "react";
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import Select, { StylesConfig } from "react-select";
import { HiMenuAlt2 } from "react-icons/hi";
import { IoClose } from "react-icons/io5";

/* ---------- TYPES ---------- */
type ThemeOption = {
  value: ThemeType;
  label: string;
};

const AppHeader: React.FC = () => {
  const dispatch = useAppDispatch();
  const { theme, setTheme, availableThemes, colors, fonts } = useTheme();
  const [isApplicationMenuOpen, setApplicationMenuOpen] = useState(false);
  const { companyLogo, companyName, companyInfo } = useAppSelector((state) => state.common);
  const { isExpanded, isMobileOpen, toggleSidebar, toggleMobileSidebar } = useSidebar();
  const handleToggle = () => {
    if (window.innerWidth >= 991) {
      toggleSidebar();
    } else {
      toggleMobileSidebar();
    }
  };

  const toggleApplicationMenu = () => {
    setApplicationMenuOpen(!isApplicationMenuOpen);
  };
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === "k") {
        event.preventDefault();
        inputRef.current?.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  // Helper function to format theme name for display
  const formatThemeName = (theme: string) => {
    return theme
      .split(/(?=[A-Z])/)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const themeOptions : ThemeOption[] = availableThemes.map((themeName) => ({
    value: themeName,
    label: formatThemeName(themeName),
  }));

  const customStyles: StylesConfig<ThemeOption, false> = {
    control: (provided) => ({
      ...provided,
      backgroundColor: colors.textInputBackground,
      borderColor: colors.textInputBorder,
      minHeight: '32px',
      height: '32px',
      width: '160px',
      fontSize: '0.875rem',
      boxShadow: 'none',
      '&:hover': {
        borderColor: colors.textInputBorder,
      },
    }),
    valueContainer: (provided) => ({
      ...provided,
      height: '32px',
      padding: '0 8px',
    }),
    input: (provided) => ({
      ...provided,
      margin: '0px',
      color: colors.textInputText,
    }),
    indicatorsContainer: (provided) => ({
      ...provided,
      height: '32px',
    }),
    singleValue: (provided) => ({
      ...provided,
      color: colors.textInputText,
    }),
    menu: (provided) => ({
      ...provided,
      backgroundColor: colors.background,
      zIndex: 9999,
    }),
    option: (provided, state) => ({
      ...provided,
      backgroundColor: state.isSelected
        ? colors.primary
        : state.isFocused
          ? colors.background
          : colors.background,
      color: state.isSelected ? '#fff' : colors.text,
      cursor: 'pointer',
      fontSize: '0.875rem',
      ':active': {
        backgroundColor: colors.primary,
      },
    }),
  };

  return (
    <header
      className="sticky top-0 flex w-full z-100 lg:border-b"
      style={{
        backgroundColor: colors?.background || '#f0f0f0',
        borderColor: colors?.color3 || '#000',
        fontFamily: fonts.sidebar
      }}
    >
      <div className="flex flex-col items-center justify-between grow lg:flex-row lg:px-6">
        <div
          className="flex items-center justify-between w-full gap-2 px-3 py-2 sm:gap-4 lg:justify-normal lg:border-b-0 lg:px-0 lg:py-2"

        >
          <button
            className="items-center justify-center w-9 h-9 rounded-lg z-99999 lg:flex lg:h-9 lg:w-9 lg:border"
            onClick={handleToggle}
            aria-label="Toggle sidebar navigation"
            aria-controls="app-sidebar"
            aria-expanded={isMobileOpen || isExpanded}
            aria-pressed={isMobileOpen || isExpanded}
            style={{
              color: colors.text,
              borderColor: colors.color3,
              backgroundColor: colors.background,
            }}
          >
            {isMobileOpen ? (
              <IoClose size={24} />
            ) : (
              <HiMenuAlt2 size={24} />
            )}
          </button>
          {companyLogo && (
            <Link className="lg:hidden" href="/dashboard">
              {companyInfo?.CompanyLogo && (
                <Image
                  src={companyInfo.CompanyLogo.startsWith('data:')
                    ? companyInfo.CompanyLogo
                    : `data:image/png;base64,${companyInfo.CompanyLogo}`}
                  alt="Company Logo"
                  width={64}
                  height={64}
                  className="h-6 w-auto object-contain"
                  priority
                />
              )}
            </Link>
          )}
          <div></div>


        </div>
        <div
          className={`${isApplicationMenuOpen ? "flex" : "hidden"} items-center justify-between w-full gap-4 px-5 py-2 lg:flex lg:justify-end lg:px-0`}
          style={{
            backgroundColor: colors.background,
          }}
        >
          <div className="flex items-center gap-2 2xsm:gap-3">
            <div className="relative">
              <Select<ThemeOption, false>
                aria-label="Theme selector"
                value={themeOptions.find(option => option.value === theme)}
                onChange={(option) => setTheme(option?.value as ThemeType)}
                options={themeOptions}
                styles={customStyles}
                isSearchable={false}
                components={{
                  IndicatorSeparator: () => null
                }}
              />
            </div>

            <UserDropdown />
          </div>
        </div>
      </div>
    </header>
  );
};

export default AppHeader;
