import { useTheme } from "@/context/ThemeContext";
import React, { FC } from "react";

interface InputProps {
  type?: "text" | "number" | "email" | "password" | "date" | "time" | string;
  id?: string;
  name?: string;
  placeholder?: string;
  defaultValue?: string | number;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onPaste?: (e: React.ClipboardEvent<HTMLInputElement>) => void;
  className?: string;
  min?: string;
  max?: string;
  step?: number;
  disabled?: boolean;
  success?: boolean;
  error?: boolean;
  hint?: string;
  value?: string | number | readonly string[];
  autoComplete?: string;
  dynamicSelectedThemeApply?: boolean;
}

const Input: FC<InputProps> = ({
  type = "text",
  id,
  name,
  placeholder,
  defaultValue,
  onChange,
  onPaste,
  className = "",
  min,
  max,
  step,
  disabled = false,
  success = false,
  error = false,
  hint,
  value,
  autoComplete,
  dynamicSelectedThemeApply = false
}) => {
  const { colors } = useTheme();

  // Base classes
  let inputClasses = `h-11 w-full rounded-lg border appearance-none px-4 py-2.5 text-sm shadow-theme-xs placeholder:text-gray-400 focus:outline-hidden focus:ring-3 ${className}`;

  // Apply dynamic theme colors if enabled
  const dynamicStyles = dynamicSelectedThemeApply ? {
    borderColor: colors.textInputBorder,
    backgroundColor: colors.textInputBackground,
    color: colors.textInputText
  } : undefined;

  // State-based classes
  if (disabled) {
    inputClasses += ` cursor-not-allowed bg-gray-100 text-gray-500 border-gray-300 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700`;
  } else if (error) {
    inputClasses += ` border-error-500 text-error-800 focus:ring-error-500/10 dark:border-error-500 dark:text-error-400`;
  } else if (success) {
    inputClasses += ` border-success-400 text-success-500 focus:ring-success-500/10 dark:border-success-500 dark:text-success-400`;
  } else if (!dynamicSelectedThemeApply) {
    // Default styling when dynamic theme is not applied
    inputClasses += ` bg-transparent text-gray-800 border-gray-300 focus:border-brand-300 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90`;
  }
  // No else needed here - dynamic theme uses inline styles

  return (
    <div className="relative">
      <input
        aria-label="Enter values"
        type={type}
        id={id}
        name={name}
        placeholder={placeholder}
        onChange={onChange}
        onPaste={onPaste}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        className={inputClasses}
        style={dynamicStyles} // This applies the dynamic colors
        autoComplete={autoComplete}
        {...(value !== undefined
          ? { value }
          : defaultValue !== undefined
            ? { defaultValue }
            : {})}
      />

      {hint && (
        <p className={`mt-1.5 text-xs ${error ? "text-error-500" :
            success ? "text-success-500" :
              "text-gray-500"
          }`}>
          {hint}
        </p>
      )}
    </div>
  );
};

export default Input;
