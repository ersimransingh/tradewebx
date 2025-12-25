import { useTheme } from "@/context/ThemeContext";
import { editableColumns, getApiConfigData, getRowBgColor, viewLogApiCall } from "./apiChecker";
import { useEffect, useState } from "react";
import { Dialog, DialogPanel, DialogTitle } from "@headlessui/react";
import { toast } from "react-toastify";
import apiService from "@/utils/apiService";
import { BASE_URL, PATH_URL } from "@/utils/constants";
import { useLocalStorage } from "@/hooks/useLocalListner";
import Loader from "@/components/Loader";
import { activeFlag, apiCallingTypes, ApiConfigurationRow, apiContentTypes, EditModalState, LogHeader } from "@/types/apiConfigurationTypes";
import { FiEdit } from "react-icons/fi";
import { HiOutlineDocumentText } from "react-icons/hi";

const ApiConfiguration = () => {
  const { colors } = useTheme();
  const [apiConfigData, setApiConfigData] = useState<ApiConfigurationRow[]>([]);
  const [uniqueKeys, setUniqueKeys] = useState<string[]>([]);
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [editableRow, setEditableRow] = useState<ApiConfigurationRow>({});
  const [viewLogServiceName, setViewLogServiceName] = useState<string>("");
  const [viewLogServiceNameApiData, setViewLogServiceNameApiData] = useState<any>(
    []
  );
  const [modalOpen, setModalOpen] = useState<any>(false);
  const [selectedText, setSelectedText] = useState<string | null>(null);

  // 🔹 New state for long-text edit modal
  const [editModal, setEditModal] = useState<EditModalState | null>(
    null
  );

  const [loading, setLoading] = useState(false);      // ✅ for first load + save
  const [logLoading, setLogLoading] = useState(false); // ✅ for view log
  const [viewLogHeader, setViewLogHeader] = useState<LogHeader | null>(null);

  const [userId] = useLocalStorage('userId', null);

  useEffect(() => {
    if (userId) {
      setLoading(true);
      getApiConfigData(setApiConfigData, userId,setLoading)
        .finally(() => setLoading(false)); // ✅ hide loader when done
    } else {
      console.log("userId or userType is null, skipping API call");
    }
  }, [userId]);

  useEffect(() => {
    const keys = Array.from(
      new Set(apiConfigData.flatMap((obj) => Object.keys(obj || {})))
    );
    setUniqueKeys(keys);
  }, [apiConfigData]);

  useEffect(() => {
    if (viewLogServiceName) {
      setLogLoading(true);
      viewLogApiCall(
        setModalOpen,
        viewLogServiceName,
        setViewLogServiceNameApiData,
        userId,
        setViewLogServiceName
      ).finally(() => setLogLoading(false)); // ✅ hide loader when done
    }
  }, [viewLogServiceName]);

  const VISIBLE_COL_COUNT = 6;
  const visibleKeys = uniqueKeys.slice(0, VISIBLE_COL_COUNT);

  const handleEdit = (rowIndex: number) => {
    // setEditIndex(rowIndex);
    // setEditableRow({ ...apiConfigData[rowIndex] });
    setEditIndex(rowIndex);
  setEditableRow({ ...apiConfigData[rowIndex] });
  setEditModal({ key: "__ALL__", value: "" }); // open modal
  };

  console.log(colors,'colorss api setting');


  const handleInputChange = (key: string, value: string) => {
    setEditableRow((prev: any) => ({
      ...prev,
      [key]: value
    }));
  };


  const DEFAULT_GRID_BG = "#eaf3ff";
const DEFAULT_GRID_BORDER = "#b6d4fe";
const DEFAULT_GRID_HEADER = "#dbeafe";

const isDefaultThemeGrid = colors?.color1 === "#fffef9";

const gridBorderColor = isDefaultThemeGrid
  ? DEFAULT_GRID_BORDER
  : colors?.color1;

const gridBgColor = isDefaultThemeGrid
  ? DEFAULT_GRID_BG
  : colors?.textInputBackground;

const gridHeaderBg = isDefaultThemeGrid
  ? DEFAULT_GRID_HEADER
  : colors?.primary;


  
  const handleSave = async() => {
    setLoading(true);
    const updated = [...apiConfigData];
    if (editIndex !== null) {
      updated[editIndex] = editableRow;
    }
    setApiConfigData(updated);
    setEditIndex(null);
  
    // ✅ Log values
    console.log(Object.entries(editableRow).map((ele) => ele[1]), "editTableRow");

    const formatTime = (time: string) => {
      if (!time) return "";
      const parts = time.replace(/[-:]/g, "").padEnd(6, "0"); // remove separators & pad with zeros
      if (parts.length >= 6) {
        return parts.slice(0, 6); // ensure exactly 6 digits
      }
      return parts.padEnd(6, "0");
    };

    const RemoveDouble = (data: string) => {
      if (!data) return "";
      return data.replace("<<Requestid>>", "~~Requestid!!");
    };

    const ReplaceFields = (data: string) => {
      if (!data) return "";
      // Match <<Field1>>, <<Field2>> etc. and replace dynamically
      return data.replace(/<<Field(\d+)>>/g, (_, num) => `~~Field${num}!!`);
    };
    
  
    const normalizedRow = { ...editableRow };

    // ✅ ensure default fallbacks when empty
    if (normalizedRow.AutoAPIStartTime) {
      normalizedRow.AutoAPIStartTime = formatTime(normalizedRow.AutoAPIStartTime);
    } else {
      normalizedRow.AutoAPIStartTime = "090000";
    }
    if (normalizedRow.AutoAPIEndTime) {
      normalizedRow.AutoAPIEndTime = formatTime(normalizedRow.AutoAPIEndTime);
    } else {
      normalizedRow.AutoAPIEndTime = "210000";
    }

    if (normalizedRow.CallBackUrl || normalizedRow.APIUrl || normalizedRow.ParameterSetting) {
      normalizedRow.APIUrl = RemoveDouble(normalizedRow.APIUrl)
      normalizedRow.CallBackUrl = RemoveDouble(normalizedRow.CallBackUrl); // ✅ FIXED here
      normalizedRow.ParameterSetting = ReplaceFields(normalizedRow.ParameterSetting)
    }
  
    // ✅ Build XML string properly
    const data = `
      <dsXml>
        <J_Ui>"ActionName":"APISETTING", "Option":"EDIT","RequestFrom":"W"</J_Ui>
        <Sql></Sql>
        <X_Data>
        ${Object.entries(normalizedRow)
          .map(([key, value]) => `<${key}>${value} </${key}>`)
          .join("\n")}
        </X_Data>
        <X_Filter>
          <X_Filter_Multiple>
          </X_Filter_Multiple>
        </X_Filter>
        <J_Api>"UserId":"Admin"</J_Api>
      </dsXml>
    `;
    console.log(data, "data in save");

    try {
      const response = await apiService.postWithAuth(BASE_URL + PATH_URL,data)
      console.log(response.data?.data?.rs0[0].RowsAffected,'response1');
      if(response.data?.data?.rs0[0].RowsAffected) {
        toast.success("Update Sucessfully")
        getApiConfigData(setApiConfigData,userId,setLoading);
        setLoading(false);
      }
    } catch (error) {
      toast.error(error)
    }

  };
  
  const handleViewLog = (row: ApiConfigurationRow) => {
    const serviceName = row?.ServiceName;
    setViewLogServiceName(serviceName);
    setViewLogHeader({
      VendorName: row.VendorName || "",
      ServiceName: row.ServiceName || "",
    });
  };


  const handleCloseViewLog = () => {
    setViewLogServiceName("")
    setModalOpen(false)
  }

console.log(colors,'colors api checker');


  return (
    <div
      style={{
        background: colors?.background || "#f0f0f0",
        color: colors?.text || "#000",
        minHeight: "100vh",
        padding: "20px"
      }}
      className="w-full"
    >

      {(loading || logLoading) && (
        <div className="fixed inset-0 flex items-center justify-center backdrop-blur-sm z-50">
          <Loader />
        </div>
      )}


      <div className="border-b border-grey-500 flex items-center gap-5">
        <button
          className="px-4 py-2 text-sm rounded-t-lg font-bold bg-[#3EB489] mt-2"
          style={{ backgroundColor: "white" }}
        >
          Api Configuration
        </button>
      </div>

      <div className="overflow-x-auto mt-4">
      <table
  className="min-w-full text-sm border-collapse whitespace-nowrap"
  style={{
    border: `1px solid ${gridBorderColor}`,
    backgroundColor: gridBgColor
  }}
>
  <thead>
    <tr>
      <th className="px-2 py-1 border" style={{  border: `1px solid  ${gridBorderColor}`,background: colors.color3 }}>
        Action
      </th>

      {visibleKeys.map((header) => (
        <th
          key={header}
          className="px-2 py-1 border"
          style={{ border: `1px solid  ${gridBorderColor}`,background: colors.color3 }}
        >
          {header}
        </th>
      ))}
    </tr>
  </thead>

  <tbody>
    {apiConfigData.map((row, rowIndex) => (
      <tr key={rowIndex} style={{ border: `1px solid  ${gridBorderColor}`,backgroundColor: getRowBgColor(rowIndex, gridBgColor) }}>
        {/* ACTION COLUMN */}
        <td
  style={{ border: `1px solid ${gridBorderColor}` }}
  className="px-2 py-1"
>
  <div className="flex items-center gap-2">
    <button
      onClick={() => handleEdit(rowIndex)}
      className="flex items-center gap-2 px-3 py-1.5 text-sm
        border border-orange-600 text-orange-600 rounded-lg
        hover:bg-orange-600 hover:text-white transition-all duration-200"
    >
      <FiEdit size={16} />
      Edit
    </button>

    <button
      onClick={() => handleViewLog(row)}
      className="flex items-center gap-2 px-3 py-1.5 text-sm
        border border-purple-600 text-purple-600 rounded-lg
        hover:bg-purple-600 hover:text-white transition-all duration-200"
    >
      <HiOutlineDocumentText size={16} />
      Logs
    </button>
  </div>
</td>



        {/* FIRST 4 DATA COLUMNS */}
        {visibleKeys.map((key) => (
          <td key={key} style={{ border: `1px solid  ${gridBorderColor}`}} className="px-2 py-1 border">
            {row[key] && row[key].length > 100
              ? row[key].substring(0, 100) + "..."
              : row[key] ?? "-"}
          </td>
        ))}
      </tr>
    ))}
  </tbody>
</table>

      </div>

      {/* Modals remain same ... */}
      {/* View Log Modal */}
      {modalOpen && (
        <Dialog
          open={modalOpen}
          onClose={() => handleCloseViewLog()}
          className="relative z-[200]"
        >
          <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
          <div className="fixed inset-0 flex items-center justify-center p-4">
            <DialogPanel className="bg-white rounded-lg shadow-xl max-w-4xl w-full p-6 max-h-[80vh] overflow-auto relative">
              <DialogTitle className="text-xl font-bold mb-4">
                View Log
              </DialogTitle>
              <div className="flex justify-center item-center">
              <DialogTitle className="text-xl font-sans mb-4">
              <span className="font-bold">VendorName:</span> {viewLogHeader?.VendorName}
              </DialogTitle>
              <DialogTitle className="text-xl font-sans mb-4 ml-4">
              <span className="font-bold">ServiceName:</span> {viewLogHeader?.ServiceName}
              </DialogTitle>
              </div>
              <button
                onClick={() => handleCloseViewLog()}
                className="absolute top-2 right-4 text-2xl font-bold text-gray-500 hover:text-black"
                aria-label="Close"
              >
                &times;
              </button>

              {viewLogServiceNameApiData?.length > 0 ? (
                <div className="overflow-x-auto mb-6">
                    <table className="min-w-full border border-gray-300 text-sm">
                    <thead>
                        <tr className="bg-gray-100">
                        {Object.keys(viewLogServiceNameApiData[0]).map((key) => (
                            <th key={key} className="border px-4 py-2 text-left">
                            {key}
                            </th>
                        ))}
                        </tr>
                    </thead>
                    <tbody>
                        {viewLogServiceNameApiData.map((row, idx) => (
                        <tr key={idx} className="hover:bg-gray-50">
                            {Object.keys(row).map((key) => (
                            <td key={key} className="border px-4 py-2 break-all">
                                {row[key]}
                            </td>
                            ))}
                        </tr>
                        ))}
                    </tbody>
                    </table>
                </div>
                ) : (
                <div className="text-gray-500 text-center py-10">No log found</div>
                )}
            </DialogPanel>
          </div>
        </Dialog>
      )}

      {/* Long Text Modal (View Only) */}
      {selectedText && (
        <Dialog
          open={true}
          onClose={() => setSelectedText(null)}
          className="relative z-[300]"
        >
          <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
          <div className="fixed inset-0 flex items-center justify-center p-4">
            <DialogPanel className="bg-white rounded-lg shadow-xl max-w-2xl w-full p-6 max-h-[80vh] overflow-auto relative">
              <DialogTitle className="text-xl font-bold mb-4">
                Full Value
              </DialogTitle>
              <button
                onClick={() => setSelectedText(null)}
                className="absolute top-2 right-4 text-2xl font-bold text-gray-500 hover:text-black"
                aria-label="Close"
              >
                &times;
              </button>
              <div className="whitespace-pre-wrap break-words text-gray-800 text-sm">
                {selectedText}
              </div>
            </DialogPanel>
          </div>
        </Dialog>
      )}

      {/* Long Text Edit Modal */}
      {editModal && editIndex !== null && (
  <Dialog
    open={true}
    onClose={() => setEditModal(null)}
    className="relative z-[400]"
  >
    {/* Overlay */}
    <div className="fixed inset-0 bg-black/40" />

    {/* Modal Wrapper */}
    <div className="fixed inset-0 flex items-center justify-center p-6">
      <DialogPanel className="bg-white w-full max-w-6xl rounded-md shadow-2xl overflow-hidden">

        {/* ================= HEADER ================= */}
        <div className="flex items-center justify-between px-6 py-3 border-b bg-gray-100">
          <DialogTitle className="text-lg font-semibold text-gray-800">
            Edit API Configuration
          </DialogTitle>

          <button
            onClick={() => setEditModal(null)}
            className="px-3 py-1 text-sm rounded bg-blue-100 text-blue-700 hover:bg-blue-200"
          >
            ✕ Close
          </button>
        </div>

        {/* ================= BODY ================= */}
        <div className="p-6 max-h-[70vh] overflow-auto">
          <div className="grid grid-cols-3 gap-x-6 gap-y-4">

            {uniqueKeys.map((key) => {
              const isEditable = editableColumns.includes(key);
              const value = editableRow[key] ?? "";
              const isLongText = value.length > 50;

              return (
                <div key={key}>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">
                    {key}
                  </label>

                  {/* ===== TIME FIELDS ===== */}
                  {key === "AutoAPIStartTime" || key === "AutoAPIEndTime" ? (
                    <input
                      type="time"
                      disabled={!isEditable}
                      value={
                        value
                          ? value.slice(0, 2) + ":" + value.slice(2, 4)
                          : ""
                      }
                      onChange={(e) =>
                        handleInputChange(
                          key,
                          e.target.value.replace(":", "") + "00"
                        )
                      }
                      className={`w-full px-2 py-1 text-sm border rounded
                        ${!isEditable
                          ? "bg-gray-100 cursor-not-allowed"
                          : "bg-white"
                        }
                      `}
                    />
                  ) : isLongText ? (
                    /* ===== TEXTAREA (>200 chars) ===== */
                    <textarea
                      rows={4}
                      disabled={!isEditable}
                      value={value}
                      onChange={(e) =>
                        handleInputChange(key, e.target.value)
                      }
                      className={`w-full px-2 py-1 text-sm border rounded resize-none
                        ${!isEditable
                          ? "bg-gray-100 cursor-not-allowed"
                          : "bg-white"
                        }
                      `}
                    />
                  ) : (
                    /* ===== INPUT (<=200 chars) ===== */
                    <input
                      type="text"
                      disabled={!isEditable}
                      value={value}
                      onChange={(e) =>
                        handleInputChange(key, e.target.value)
                      }
                      className={`w-full px-2 py-1 text-sm border rounded
                        ${!isEditable
                          ? "bg-gray-100 cursor-not-allowed"
                          : "bg-white"
                        }
                      `}
                    />
                  )}
                </div>
              );
            })}

          </div>
        </div>

        {/* ================= FOOTER ================= */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t bg-gray-50">
          <button
            onClick={() => setEditModal(null)}
            className="px-4 py-2 text-sm rounded bg-gray-300 hover:bg-gray-400"
          >
            Cancel
          </button>

          <button
            onClick={() => {
              setEditModal(null);
              handleSave(); // ✅ EXISTING SAVE LOGIC
            }}
            className="px-5 py-2 text-sm rounded bg-blue-600 text-white hover:bg-blue-700"
          >
            Save
          </button>
        </div>

      </DialogPanel>
    </div>
  </Dialog>
)}




    </div>
  );
};

export default ApiConfiguration;

