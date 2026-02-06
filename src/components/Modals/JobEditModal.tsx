import React, { useEffect, useId, useState } from 'react';
import AccessibleModal from '@/components/a11y/AccessibleModal';
import { useTheme } from '@/context/ThemeContext';
import Select from 'react-select';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import { toast } from 'react-toastify';
import moment from 'moment';
import apiService from '@/utils/apiService';
import { BASE_URL, PATH_URL } from '@/utils/constants';
import { getLocalStorage } from '@/utils/helper';

interface JobEditModalProps {
    isOpen: boolean;
    onClose: () => void;
    jobData: any;
    onSave: (updatedData: any) => void;
}

const occurrenceOptions = [
    { value: 'OneTime', label: 'OneTime' },
    { value: 'Daily', label: 'Daily' },
    { value: 'Weekly', label: 'Weekly' },
    { value: 'Monthly', label: 'Monthly' },
    { value: 'Interval', label: 'Interval' }
];

const isActiveOptions = [
    { value: 'Yes', label: 'Yes' },
    { value: 'No', label: 'No' }
];

const JobEditModal: React.FC<JobEditModalProps> = ({ isOpen, onClose, jobData, onSave }) => {
    const titleId = useId();
    const descriptionId = useId();
    const { colors } = useTheme();

    const [occurrence, setOccurrence] = useState<any>(null);
    const [intervalMinutes, setIntervalMinutes] = useState<string>('');
    const [jobDescription, setJobDescription] = useState<string>('');
    const [startTime, setStartTime] = useState<Date | null>(null);
    const [endTime, setEndTime] = useState<Date | null>(null);
    const [isActive, setIsActive] = useState<any>(null);

    const [alertEmailID, setAlertEmailID] = useState<string>('');
    const [emailParamCode, setEmailParamCode] = useState<any>(null);
    const [emailParamOptions, setEmailParamOptions] = useState<any[]>([]);

    useEffect(() => {
        if (isOpen && jobData) {
            setOccurrence(occurrenceOptions.find(opt => opt.value === jobData.Occurrence) || null);
            setIntervalMinutes(jobData.IntervalMinutes || '');
            setJobDescription(jobData.JobDescription || '');
            
            // Parse Times - assuming HH:mm:ss format or similar
            const parseTime = (timeStr: string) => {
                if (!timeStr) return null;
                const date = moment(timeStr, ["HH:mm:ss", "HH:mm"]).toDate();
                 // If invalid date (e.g. empty), return null
                 return isNaN(date.getTime()) ? null : date;
            };

            setStartTime(parseTime(jobData.StartTime));
            setEndTime(parseTime(jobData.EndTime));
            
            setIsActive(isActiveOptions.find(opt => opt.value === (jobData.IsActive || 'Yes')) || isActiveOptions[0]);
            
            setAlertEmailID(jobData.AlertEmailID || '');
         }
    }, [isOpen, jobData]);

    useEffect(() => {
        if (isOpen) {
            const fetchOptions = async () => {
                try {
                    const xmlData = `<dsXml>
                        <J_Ui>"ActionName":"JobSchedule","Option":"EmailParamCode"</J_Ui>
                        <Sql></Sql>
                        <X_Filter></X_Filter>
                        <X_Filter_Multiple></X_Filter_Multiple>
                        <J_Api>"UserId":"${getLocalStorage('userId')}", "UserType":"${getLocalStorage('userType')}"</J_Api>
                    </dsXml>`;
                    const response = await apiService.postWithAuth(BASE_URL + PATH_URL, xmlData);
                    if (response.data && response.data.success) {
                         const data = response.data.data.rs0 || [];
                         const options = data.map((item: any) => ({
                             value: item.Value, 
                             label: item.DisplayName 
                         }));
                         setEmailParamOptions(options);

                         if (jobData?.EmailParamCode) {
                             const found = options.find((opt: any) => opt.value === jobData.EmailParamCode);
                             setEmailParamCode(found || null);
                         }
                    }
                } catch (e) {
                    console.error("Error fetching email param options", e);
                }
            };
            fetchOptions();
        }
    }, [isOpen]); // We depend on isOpen. jobData is used inside but we can just let it re-run if isOpen changes.

    const handleSave = () => {
        // Validation
        if (occurrence?.value === 'Interval') {
             const minutes = parseInt(intervalMinutes);
             if (isNaN(minutes) || minutes < 1 || minutes > 60) {
                 toast.error("Interval Minutes must be between 1 and 60.");
                 return;
             }
        }

        const payload = {
            ...jobData,
            Occurrence: occurrence?.value,
            IntervalMinutes: intervalMinutes,
            JobDescription: jobDescription,
            StartTime: startTime ? moment(startTime).format("HH:mm:ss") : '',
            EndTime: endTime ? moment(endTime).format("HH:mm:ss") : '',
            IsActive: isActive?.value,
            AlertEmailID: alertEmailID,
            EmailParamCode: emailParamCode?.value
        };

        onSave(payload);
        onClose();
    };

    return (
        <AccessibleModal
            isOpen={isOpen}
            onDismiss={onClose}
            labelledBy={titleId}
            describedBy={descriptionId}
            role="dialog"
            className="bg-white p-6 shadow-theme-lg max-w-lg w-full rounded-lg"
            closeOnOverlayClick={false}
        >
            <div className="flex justify-between items-center mb-6">
                <h2 id={titleId} className="text-xl font-bold" style={{ color: colors.text }}>
                    Edit Job ({jobData?.JobID})
                </h2>
                <button onClick={onClose} className="text-gray-500 hover:text-gray-700 font-bold text-xl">
                    ✕
                </button>
            </div>

            <div id={descriptionId} className="space-y-4">
                 <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Job Description</label>
                    <textarea
                        value={jobDescription}
                        onChange={(e) => setJobDescription(e.target.value)}
                        className="w-full p-2 border border-gray-300 rounded text-sm min-h-[80px]"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Occurrence</label>
                    <Select
                        options={occurrenceOptions}
                        value={occurrence}
                        onChange={setOccurrence}
                        className="text-sm"
                        menuPortalTarget={document.body} 
                         styles={{ menuPortal: base => ({ ...base, zIndex: 9999 }) }}
                    />
                </div>

                {occurrence?.value === 'Interval' && (
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Interval Minutes (1-60)</label>
                         <input
                            type="number"
                            min="1"
                            max="60"
                            value={intervalMinutes}
                            onChange={(e) => setIntervalMinutes(e.target.value)}
                            className="w-full p-2 border border-gray-300 rounded text-sm"
                        />
                    </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                    <div>
                         <label className="block text-sm font-medium text-gray-700 mb-1">Alert Email ID</label>
                         <input
                            type="text"
                            value={alertEmailID}
                            onChange={(e) => setAlertEmailID(e.target.value)}
                            className="w-full p-2 border border-gray-300 rounded text-sm"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Email Param Code</label>
                        <Select
                            options={emailParamOptions}
                            value={emailParamCode}
                            onChange={setEmailParamCode}
                            className="text-sm"
                            menuPortalTarget={document.body}
                            styles={{ menuPortal: base => ({ ...base, zIndex: 9999 }) }}
                            isClearable
                        />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
                        <DatePicker
                            selected={startTime}
                            onChange={(date: Date | null) => setStartTime(date)}
                            showTimeSelect
                            showTimeSelectOnly
                            timeIntervals={15}
                            timeCaption="Time"
                            dateFormat="HH:mm"
                            className="w-full p-2 border border-gray-300 rounded text-sm"
                        />
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
                        <DatePicker
                            selected={endTime}
                            onChange={(date: Date | null) => setEndTime(date)}
                            showTimeSelect
                            showTimeSelectOnly
                            timeIntervals={15}
                            timeCaption="Time"
                            dateFormat="HH:mm"
                             className="w-full p-2 border border-gray-300 rounded text-sm"
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Is Active</label>
                     <Select
                        options={isActiveOptions}
                        value={isActive}
                        onChange={setIsActive}
                        className="text-sm"
                         menuPortalTarget={document.body}
                        styles={{ menuPortal: base => ({ ...base, zIndex: 9999 }) }}
                    />
                </div>

                <div className="flex justify-end gap-2 mt-6">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 text-sm font-medium"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm font-medium"
                    >
                        Save
                    </button>
                </div>
            </div>
        </AccessibleModal>
    );
};

export default JobEditModal;
