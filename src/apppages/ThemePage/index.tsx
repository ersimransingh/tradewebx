
//Final code---------------------------------------->

"use client";
import { ThemeType } from "@/context/ThemeContext";
import { useTheme } from "@/context/ThemeContext";
import React, { useState } from "react";
import { Modal } from "@/components/ui/modal";
import CaseConfirmationModal from "@/components/Modals/CaseConfirmationModal";
import apiService from "@/utils/apiService";
import { BASE_URL, PATH_URL,ACTION_NAME } from "@/utils/constants";
import { toast } from "react-toastify";
import { ThemeColors } from "@/types/ThemeColors";

const colorLabelMap: Record<string, string> = {
  background: "Full Background",
  background2: "Main Background",
  primary: "Button Primary Color",
  secondary: "Secondary Color",
  color1: "Table Color",
  color2: "Color 2",
  color3: "Color 3",
  textInputBackground: "Text Input Background",
  textInputBorder: "Text Input Border",
  textInputText: "Text Input Text",
  buttonBackground: "Button Background",
  buttonText: "Button Text",
  errorText: "Error Text",
  cardBackground: "Card Background",
  oddCardBackground: "Odd Card Background",
  evenCardBackground: "Even Card Background",
  filtersBackground: "Filters Background",
  tabBackground: "Tab Background",
  tabText: "Tab Text",
  biometricBox: "Biometric Box",
  biometricText: "Biometric Text",
};

const ThemePage = () => {
  const { theme, setTheme, availableThemes, colors, updateTheme } = useTheme();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [applyMessage, setApplyMessage] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  // 🟢 Store NEW colors user edits
  const [editedColors, setEditedColors] = useState<ThemeColors>(colors);

  //  Open modal & load fresh colors (API defaults)
  const handleOpenModal = () => {
    setEditedColors(colors);
    setIsModalOpen(true);
  };

  //  Handle color changes on right column
  const handleColorChange = (key: keyof ThemeColors, value: string) => {
    setEditedColors((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  //  Apply for live preview only
  const handleApply = () => {
    updateTheme(((prevThemes) => {
      const updatedThemes = { ...prevThemes, [theme]: editedColors };
      //  Store in localStorage properly
      localStorage.setItem("app_theme_colors", JSON.stringify(updatedThemes));
      return updatedThemes;
    }) as any);
    setApplyMessage("Theme colors applied! Please check the UI.");
    // Clear after 3 seconds
    setTimeout(() => {
      setApplyMessage("");
    }, 3000);
  };


  //  Submit → open confirmation modal
  const handleSubmit = () => {
    setIsConfirmModalOpen(true);
  };

  const confirmSave = async () => {

    try {
      //  Merge default colors and newly edited colors
      const updatedColors = { ...colors, ...editedColors };

      //  Retrieve previously saved themes from localStorage
      const storedThemes = JSON.parse(localStorage.getItem("app_theme_colors") || "{}");

      //  Update the theme in storage
      const finalThemes = { ...storedThemes, [theme]: updatedColors };

      // Save the updated themes and update context
      localStorage.setItem("app_theme_colors", JSON.stringify(finalThemes));
      updateTheme(finalThemes); // apply to context

      setIsLoading(true)

      //  Construct the XML payload
      const payload = `
        <dsXml>
          <J_Ui>"ActionName":"${ACTION_NAME}","Option":"UPDATETHEME","RequestFrom":"w"</J_Ui>
          <Sql/>
          <X_Filter/>
          <X_Filter_Multiple/>
          <X_Data>${JSON.stringify(finalThemes)}</X_Data>
          <J_Api>
            "UserId":"${localStorage.getItem("userId")}",
            "UserType":"${localStorage.getItem("userType")}"
          </J_Api>
        </dsXml>
      `;

      // Make the API call
      const response = await apiService.postWithAuth(BASE_URL + PATH_URL, payload);
      const resData = response?.data?.data?.rs0?.[0];
      const flag = resData?.Flag;
      const message = resData?.Message || "No message from server";

      //  Show toast on success or error
      if (response?.success && flag === "S") {
        toast.success(message);
        setIsConfirmModalOpen(false);
        setIsModalOpen(false);
        setIsLoading(false)
      } else {
        toast.error(message || "Failed to update theme.");
        setIsConfirmModalOpen(false);
        setIsModalOpen(false);
        setIsLoading(false)
      }

    } catch (error) {
      toast.error("Something went wrong. Please refresh and try again.");
      setIsConfirmModalOpen(false);
      setIsModalOpen(false);
      setIsLoading(false)
    } finally {
      setIsConfirmModalOpen(false);
      setIsModalOpen(false);
      setIsLoading(false)
    }
  };


  return (
    <div
      style={{
        background: colors?.background || "#f0f0f0",
        color: colors?.text || "#000",
        minHeight: "100vh",
        padding: "20px",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "20px",
        }}
      >
        <h1 style={{ margin: 0 }}>Theme Settings</h1>

        <button
          onClick={handleOpenModal}
          style={{
            padding: "6px 12px",
            fontSize: "13px",
            background: colors.primary,
            color: colors.buttonText,
            borderRadius: "8px",
            cursor: "pointer",
            border: "none",
          }}
        >
          Edit {theme} Theme Colors
        </button>
      </div>

      {/* Theme Selection Buttons */}
      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        {availableThemes.map((themeOption: ThemeType) => (
          <button
            key={themeOption}
            onClick={() => setTheme(themeOption)}
            style={{
              padding: "15px",
              border: `2px solid ${themeOption === theme ? colors.primary : colors.textInputBorder
                }`,
              borderRadius: "8px",
              background: colors.cardBackground,
              color: colors.buttonText,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "15px",
              width: "100%",
              textAlign: "left",
            }}
          >
            <div
              style={{
                width: "30px",
                height: "30px",
                borderRadius: "50%",
                background:
                  themeOption === "dark"
                    ? "#334155"
                    : themeOption === "light"
                      ? "#d2e7ff"
                      : themeOption === "lightDark"
                        ? "#242424"
                        : "#E3F2FD",
              }}
            />
            <span
              style={{
                color: colors.text,
                textTransform: "capitalize",
                flex: 1,
              }}
            >
              {themeOption}
            </span>
            {themeOption === theme && (
              <span style={{ color: colors.primary }}>✓ Current Theme</span>
            )}
          </button>
        ))}
      </div>

      {/* MODAL FOR COLOR EDITING */}
      {isModalOpen && (
        <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} className="max-w-[800px] p-6">
          <div
            className="p-2 max-h-[75vh] overflow-y-auto rounded-lg bg-white mx-auto"
            style={{ scrollbarWidth: "thin", scrollbarColor: "#ccc transparent" }}
          >
            <div
              className="flex items-center justify-center gap-6 bg-white p-4 border-b border-gray-200"
              style={{
                position: "sticky",
                top: 0,
                zIndex: 50,
              }}
            >
              {/* Heading */}
              <h2 className="text-xl font-semibold text-center whitespace-nowrap">
                Edit Theme: <span className="capitalize">{theme}</span>
              </h2>

              {/* Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={handleApply}
                  style={{
                    padding: "8px 16px",
                    background: colors.primary,
                    color: colors.buttonText,
                    borderRadius: "8px",
                    cursor: "pointer",
                    border: "none",
                    fontSize: "12px",
                  }}
                >
                  Apply
                </button>
                <button
                  onClick={handleSubmit}
                  style={{
                    padding: "8px 16px",
                    background: colors.primary,
                    color: colors.buttonText,
                    borderRadius: "8px",
                    cursor: "pointer",
                    border: "none",
                    fontSize: "12px",
                  }}
                >
                  Submit
                </button>
                {applyMessage && (
                  <p className="text-green-600 text-sm mt-2 text-right">{applyMessage}</p>
                )}
              </div>
            </div>

            {/*  Column Headings */}
            <div className="grid grid-cols-2 gap-4 mb-3 font-semibold text-gray-700 text-center">
              <div className="border-b pb-2">Existing Color of Fields</div>
              <div className="border-b pb-2">New Color to Choose for the Field</div>
            </div>

            {/*  Two Columns */}
            <div className="grid grid-cols-2 gap-4">
              {/* LEFT COLUMN - Current Colors */}
              <div className="flex flex-col items-center gap-3">
                {Object.entries(editedColors).map(([key]) => (
                  <div key={key} className="flex flex-col items-center">
                    <div
                      className="w-8 h-8 rounded-full border mb-1"
                      style={{ backgroundColor: colors[key as keyof ThemeColors] }}
                    />
                    <span className="text-sm font-medium text-center">
                      {colorLabelMap[key] || key}
                    </span>
                  </div>
                ))}
              </div>

              {/* RIGHT COLUMN - Color Pickers */}
              <div className="flex flex-col items-center gap-3">
                {Object.entries(editedColors).map(([key, value]) => (
                  <div key={key} className="flex flex-col items-center w-24">
                    <div className="flex items-center gap-1">
                      <input
                        type="color"
                        value={value}
                        onChange={(e) =>
                          handleColorChange(key as keyof ThemeColors, e.target.value)
                        }
                        className="w-10 h-8 cursor-pointer border rounded"
                      />
                      <button
                        onClick={() =>
                          setEditedColors((prev) => ({
                            ...prev,
                            [key]: colors[key as keyof ThemeColors], // reset to original color
                          }))
                        }
                        className="text-[10px] px-1 py-0.5 rounded bg-gray-200 hover:bg-gray-300 border text-gray-700"
                      >
                        Reset
                      </button>
                    </div>
                    <span className="text-xs text-center mt-1">
                      {colorLabelMap[key] || key}
                    </span>
                  </div>

                ))}
              </div>
            </div>
          </div>
          {/* Confirmation Modal */}
          {isConfirmModalOpen && (
            <CaseConfirmationModal
              message="Are you sure you want to permanently save these theme color changes?"
              onCancel={() => setIsConfirmModalOpen(false)}
              onConfirm={confirmSave}
              isOpen={true}
              type={"M"}
            />
          )}
        </Modal>
      )}
    </div>
  );
};

export default ThemePage;

