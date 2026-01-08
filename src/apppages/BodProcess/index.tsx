import { useTheme } from "@/context/ThemeContext";
import { useEffect, useState } from "react";
import { bodProcessGetApiCall, bodProcessIndividualApiCall } from "./bodProcessConst";
import Loader from "@/components/Loader";
import { useLocalStorage } from "@/hooks/useLocalListner";
import { BodProcessRow, ValidationModalState } from "@/types/bodProcessTypes";

const BodProcess = () => {
  const { colors } = useTheme();

  const [bodPrcessApiData, setBodProcessApiData] = useState<BodProcessRow[]>([]);
  const [flattenArray, setFalttenArray] = useState<string[]>([]);
  const [checkedRows, setCheckedRows] = useState<boolean[]>([]);
  const [loading, setLoading] = useState(false);
  const [userId] = useLocalStorage('userId', null);
  const [userType] = useLocalStorage('userType', null);


  const [validationModal, setValidationModal] = useState<ValidationModalState>({
    isOpen: false,
    message: '',
    type: 'E'
  });

  useEffect(() => {
    if (userId && userType) {
      setLoading(true); // 🔹 Start loader before API call
      bodProcessGetApiCall(
        (data) => {
          setBodProcessApiData(data);
          setCheckedRows(Array(data.length).fill(false));
          setLoading(false); // 🔹 Stop loader after data received
        },
        userId,
        userType,
        setLoading
      );


    } else {

    }
  }, [userId, userType]);



  useEffect(() => {
    const keys = [...new Set(bodPrcessApiData?.flatMap(Object.keys) ?? [])];
    setFalttenArray(keys);
  }, [bodPrcessApiData]);

  const handleCheckboxChange = (rowIndex: number) => {
    setCheckedRows((prev) =>
      prev.map((val, i) => (i === rowIndex ? !val : val))
    );

  };

  // Utility function for formatting
  const formatDateTime = (value: string) => {
    if (!value) return "";

    const dateObj = new Date(value);
    if (isNaN(dateObj.getTime())) return value; // fallback if not valid

    const date = dateObj.toLocaleDateString("en-GB"); // DD/MM/YYYY
    const time = dateObj
      .toLocaleTimeString("en-GB", {
        hour12: false,
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      })
      .replace(/:/g, "-"); // HH-MM-SS

    return `date:- ${date}\ntime :- ${time}`;
  };


  const handleValidationClose = () => {
    setValidationModal(prev => ({ ...prev, isOpen: false }));
  };

  const showValidationMessage = (message: string, type: 'M' | 'S' | 'E' | 'D' = 'E') => {
    setValidationModal({
      isOpen: true,
      message,
      type
    });
  }

  const runClickHandler = (row: BodProcessRow) => {
    bodProcessIndividualApiCall(row.ProcessName, showValidationMessage, setLoading, userId, userType)
  }





  return (
    <div
      style={{
        background: colors?.background || "#f0f0f0",
        color: colors?.text || "#000",
        minHeight: "100vh",
        padding: "20px",
      }}
      className="w-full"
    >

      <div className="border-b border-grey-500 flex items-center gap-5">
        <button
          className="px-4 py-2 text-sm rounded-t-lg font-bold mt-2"
          style={{ backgroundColor: "white" }}
        >
          Bod Process
        </button>
      </div>

      {loading &&
        <div className="fixed inset-0 flex items-center justify-center backdrop-blur-sm z-50">
          <Loader />
        </div>
      }
      <div className="mt-4 overflow-x-auto"> {/* Scrollable for mobile */}
        <h1>Bod Process</h1>
        <table
          className="min-w-full text-sm border-collapse whitespace-nowrap"
          style={{
            border: `1px solid ${colors?.color1 || "#ccc"}`,
            backgroundColor: colors.textInputBackground,
          }}
        >
          <thead>
            <tr>
              <th
                className="px-2 py-1 text-left"
                style={{
                  border: `1px solid ${colors?.color1 || "#ccc"}`,
                  background: colors?.primary || "#eee",
                }}
              >
                Action
              </th>

              {flattenArray.map((header, index) => (
                <th
                  key={index}
                  className="px-2 py-1 text-left"
                  style={{
                    border: `1px solid ${colors?.color1 || "#ccc"}`,
                    background: colors?.primary || "#eee",
                  }}
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {bodPrcessApiData.map((row, rowIndex) => (
              <tr key={rowIndex} className="hover:bg-gray-100">
                {/* Action column */}
                <td
                  className="px-2 py-1"
                  style={{
                    border: `1px solid ${colors?.color1 || "#ccc"}`,
                  }}
                >
                  <div className="flex items-center gap-2">
                    <button
                      className={`px-2 py-1 text-xs rounded text-white ${checkedRows[rowIndex]
                        ? "bg-blue-500 hover:bg-blue-600"
                        : "bg-gray-400 cursor-not-allowed"
                        }`}
                      disabled={!checkedRows[rowIndex]}
                      onClick={() => runClickHandler(row)}
                    >
                      Run
                    </button>
                    {/* <input
                      type="checkbox"
                      checked={checkedRows[rowIndex] || false}
                      onChange={() => handleCheckboxChange(rowIndex)}
                    /> */}
                    <label htmlFor={`bod-checkbox-${rowIndex}`} className="sr-only">
                      Select {row.ProcessName || `Process ${rowIndex + 1}`}
                    </label>

                    <input
                      id={`bod-checkbox-${rowIndex}`}
                      type="checkbox"
                      checked={checkedRows[rowIndex] || false}
                      onChange={() => handleCheckboxChange(rowIndex)}
                    />
                  </div>
                </td>

                {/* Dynamic data columns */}
                {flattenArray.map((header, colIndex) => (
                  <td
                    key={colIndex}
                    className="px-2 py-1 whitespace-pre-line" // keeps \n formatting
                    style={{
                      border: `1px solid ${colors?.color1 || "#ccc"}`,
                    }}
                  >
                    {header === "LastUpdated"
                      ? formatDateTime(row[header])
                      : row[header] ?? ""}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {validationModal.isOpen && (
        <div className="fixed inset-0 flex items-center justify-center z-[200]" style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}>
          <div className="bg-white rounded-lg p-6 w-full max-w-[400px] shadow-xl">
            <h4 className="text-xl font-semibold mb-4">
              {validationModal.type === 'M' ? 'Confirmation' : 'Message'}
            </h4>
            <p className="text-gray-600 mb-6">{validationModal.message}</p>
            <div className="flex justify-end gap-4">
              {validationModal.type === 'M' && (
                <button
                  onClick={handleValidationClose}
                  className="bg-gray-300 hover:bg-gray-400 text-gray-800 px-4 py-2 rounded-md"
                >
                  No
                </button>
              )}
              <button
                onClick={handleValidationClose}
                className={`${validationModal.type === 'M'
                  ? 'bg-blue-500 hover:bg-blue-600'
                  : 'bg-green-500 hover:bg-green-600'
                  } text-white px-4 py-2 rounded-md`}
              >
                {validationModal.type === 'M' ? 'Yes' : 'OK'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BodProcess;
