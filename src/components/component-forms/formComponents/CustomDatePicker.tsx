import React from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import moment from 'moment';
import { FiCalendar } from 'react-icons/fi';

interface CustomDatePickerProps {
  selected: Date | null;
  onChange: (date: Date | null) => void;
  disabled?: boolean;
  className?: string;
  placeholder?: string;
  id?: string;
  name?: string;
  onBlur?: () => void;
  inputId?: string;
  ariaRequired?: boolean;
  ariaInvalid?: boolean;
  ariaDisabled?: boolean;
  ariaDescribedBy?: string;
  style?: React.CSSProperties;
}

const CustomDatePicker: React.FC<CustomDatePickerProps> = ({
  selected,
  onChange,
  disabled = false,
  className = '',
  placeholder = 'Select Date',
  id,
  name,
  onBlur,
  inputId,
  ariaRequired,
  ariaInvalid,
  ariaDisabled,
  ariaDescribedBy,
  style
}) => {
  
  // Generate years array using moment
  const years = [];
  const currentYear = moment().year();
  for (let year = 1990; year <= currentYear; year++) {
    years.push(year);
  }

  const months = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  return (
    <div 
     className={`
          w-full pl-10 pr-3 py-1 border rounded-md relative
          focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500
          text-[14px]
          ${disabled ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'}
          ${className}
        `}
        style={{height:"30px", ...style}}
    >
      <DatePicker
        id={inputId ?? id}        
        name={name}
        aria-required={ariaRequired as any}   
        aria-invalid={ariaInvalid as any}     
        aria-disabled={ariaDisabled as any}   
        aria-describedby={ariaDescribedBy as any} 
        selected={selected}
        onBlur={onBlur}
        onChange={onChange}
        disabled={disabled}
        className={`focus:border-none focus:ring-0 focus:ring-offset-0 focus:outline-none text-[14px] w-[120px]`}
        placeholderText={placeholder}
        dateFormat="dd/MM/yyyy"
        showYearDropdown
        showMonthDropdown
        dropdownMode="select"
        popperClassName="!z-[99999]"
        popperProps={{
          strategy: "fixed",
        }}
        renderCustomHeader={({
          date,
          changeYear,
          changeMonth,
          decreaseMonth,
          increaseMonth,
          prevMonthButtonDisabled,
          nextMonthButtonDisabled,
        }) => (
          <div className="m-2 flex justify-center gap-2 text-[14px]">
            <button 
              onClick={decreaseMonth} 
              disabled={prevMonthButtonDisabled}
              className="bg-none border-none cursor-pointer text-base disabled:opacity-50"
            >
              {"<"}
            </button>
            <select
              value={moment(date).year()}
              onChange={({ target: { value } }) => changeYear(Number(value))}
              className="px-1 py-0.5 rounded border border-gray-300 text-[14px]"
            >
              {years.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>

            <select
              value={months[moment(date).month()]}
              onChange={({ target: { value } }) =>
                changeMonth(months.indexOf(value))
              }
              className="px-1 py-0.5 rounded border border-gray-300 text-[14px]"
            >
              {months.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>

            <button 
              onClick={increaseMonth} 
              disabled={nextMonthButtonDisabled}
              className="bg-none border-none cursor-pointer text-base disabled:opacity-50"
            >
              {">"}
            </button>
          </div>
        )}
      />
      <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
        <FiCalendar className="h-4 w-4" />
      </div>
    </div>
  );
};

export default CustomDatePicker;