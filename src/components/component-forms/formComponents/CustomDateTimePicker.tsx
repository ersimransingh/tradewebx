import React, { useState } from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import moment from 'moment';
import { FiCalendar, FiClock, FiChevronDown } from 'react-icons/fi';

interface CustomDateTimePickerProps {
  selected: Date | null;
  onChange: (date: Date | null) => void;
  disabled?: boolean;
  className?: string;
  placeholderText?: string;
  id?: string;
  name?: string;
  onBlur?: () => void;
  showTimeSelect?: boolean;
  timeFormat?: string;
  timeIntervals?: number;
  dateFormat?: string;
  minDate?: Date;
  maxDate?: Date;
  inputId?: string;
  ariaRequired?: boolean;
  ariaInvalid?: boolean;
  ariaDisabled?: boolean;
  ariaDescribedBy?: string;
}

const CustomDateTimePicker: React.FC<CustomDateTimePickerProps> = ({
  selected,
  onChange,
  disabled = false,
  className = '',
  placeholderText = 'Select Date & Time',
  id,
  // name,
  onBlur,
  // showTimeSelect = true,
  // timeFormat = 'HH:mm',
  timeIntervals = 5,
  // dateFormat = 'dd/MM/yyyy HH:mm',
  minDate,
  maxDate,
  inputId,
  ariaRequired,
  ariaInvalid,
  ariaDisabled,
  ariaDescribedBy
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const years = [];
  const currentYear = moment().year();
  for (let year = 1990; year <= currentYear + 10; year++) {
    years.push(year);
  }

  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];

  const generateTimeOptions = () => {
    const times = [];
    for (let hour = 0; hour < 24; hour++) {
      for (let minute = 0; minute < 60; minute += timeIntervals) {
        const timeString = moment({ hour, minute }).format('HH:mm');
        times.push(timeString);
      }
    }
    return times;
  };

  const timeOptions = generateTimeOptions();

  const handleTimeSelect = (time: string) => {
    if (selected) {
      const [hours, minutes] = time.split(':').map(Number);
      const newDate = moment(selected).set({ hours, minutes }).toDate();
      onChange(newDate);
    }
  };

  return (
    <div className="relative">
      <div 
        className={`
          w-full pl-10 pr-3 py-1 border rounded-md relative
          focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500
          text-[14px]
          ${disabled ? 'bg-gray-100 cursor-not-allowed opacity-60' : 'bg-white'}
          ${className}
        `}
        style={{height:"30px"}}
        onClick={() => !disabled && setIsOpen(!isOpen)}
      >
        <input
          id={inputId ?? id}
          aria-required={ariaRequired}
          aria-invalid={ariaInvalid}
          aria-disabled={ariaDisabled}
          aria-describedby={ariaDescribedBy}
          type="text"
          className="w-full focus:border-none focus:ring-0 focus:ring-offset-0 focus:outline-none bg-transparent placeholder-gray-400 cursor-pointer text-[14px]"
          placeholder={placeholderText}
          value={selected ? moment(selected).format('DD/MM/YYYY HH:mm') : ''}
          readOnly
          disabled={disabled}
        />
        <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 flex items-center gap-1">
          <FiCalendar className="h-4 w-4" />
        </div>
        <FiChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
      </div>

      {isOpen && !disabled && (
        <div className="absolute top-full left-0 mt-1 z-50 bg-white border border-gray-200 rounded-lg shadow-lg text-[14px]">
          <div className="flex flex-row">
            {/* Calendar Section */}
            <div className="p-4 border-r border-gray-200">
              <DatePicker
                selected={selected}
                onChange={(date: Date | null) => {
                  if (date) {
                    // Preserve the existing time when date changes
                    const existingTime = selected ? moment(selected) : moment().startOf('hour');
                    const newDate = moment(date)
                      .set({
                        hour: existingTime.hours(),
                        minute: existingTime.minutes()
                      })
                      .toDate();
                    onChange(newDate);
                  } else {
                    onChange(null);
                  }
                }}
                inline
                showYearDropdown
                showMonthDropdown
                dropdownMode="select"
                minDate={minDate}
                maxDate={maxDate}
                renderCustomHeader={({
                  date,
                  changeYear,
                  changeMonth,
                  decreaseMonth,
                  increaseMonth,
                  prevMonthButtonDisabled,
                  nextMonthButtonDisabled,
                }) => (
                  <div className="m-2 flex justify-center gap-2 items-center">
                    <button 
                      onClick={decreaseMonth} 
                      disabled={prevMonthButtonDisabled}
                      className="bg-none border-none cursor-pointer text-base disabled:opacity-30 p-1 rounded hover:bg-gray-100 transition-colors"
                      type="button"
                    >
                      {"<"}
                    </button>
                    
                    <select
                      value={moment(date).year()}
                      onChange={({ target: { value } }) => changeYear(Number(value))}
                      className="px-2 py-1 rounded border border-gray-300 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white text-[14px]"
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
                      className="px-2 py-1 rounded border border-gray-300 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white text-[14px]"
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
                      className="bg-none border-none cursor-pointer text-base disabled:opacity-30 p-1 rounded hover:bg-gray-100 transition-colors"
                      type="button"
                    >
                      {">"}
                    </button>
                  </div>
                )}
              />
            </div>

            {/* Time Picker Section */}
            <div className="p-4 w-48">
              <div className="text-[14px] font-medium text-gray-700 mb-3 flex items-center gap-2">
                <FiClock className="h-4 w-4" />
                Select Time
              </div>
              <div className="max-h-64 overflow-y-auto">
                {timeOptions.map((time) => (
                  <button
                    key={time}
                    type="button"
                    className={`w-full text-left px-3 py-2 text-sm rounded hover:bg-blue-50 transition-colors ${
                      selected && moment(selected).format('HH:mm') === time 
                        ? 'bg-blue-500 text-white hover:bg-blue-600' 
                        : 'text-gray-700'
                    }`}
                    onClick={() => handleTimeSelect(time)}
                  >
                    {time}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Footer with action buttons */}
          <div className="flex justify-end gap-2 p-3 border-t border-gray-200">
            <button
              type="button"
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
              onClick={() => setIsOpen(false)}
            >
              Cancel
            </button>
            <button
              type="button"
              className="px-4 py-2 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
              onClick={() => {
                setIsOpen(false)
                onBlur();
            }}
            >
              Apply
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomDateTimePicker;