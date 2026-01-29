"use client";
import React, { useState, useEffect,useCallback } from "react";
// import { useModal } from "../../hooks/useModal";
import { useTheme } from "../../context/ThemeContext";
import { useSearchParams } from "next/navigation";

import Image from "next/image";
import { ACTION_NAME, BASE_URL, PATH_URL } from "../../utils/constants";
import apiService from "@/utils/apiService";
import { decryptData, getLocalStorage } from "@/utils/helper";

export default function UserMetaCard() {
  // const { closeModal } = useModal();
  const { colors } = useTheme();
  const searchParams = useSearchParams();
  const [profileData, setProfileData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // useEffect(() => {
  //   getUserDetails();
  // }, []);

  // const getUserDetails = async () => {
  const getUserDetails = useCallback(async () => {
    setIsLoading(true);

    // Get userid from URL parameters, fallback to localStorage
    const urlUserIdParam = searchParams.get('userid');
    const urlUserId = urlUserIdParam ? decryptData(urlUserIdParam) : null;
    const userData = {
      userId: getLocalStorage('userId') || ''
    };

    const xmlData = `<dsXml>
        <J_Ui>"ActionName":"${ACTION_NAME}", "Option":"UserProfile","Level":1, "RequestFrom":"W"</J_Ui>
        <Sql></Sql>
        <X_Filter></X_Filter>
        <X_Filter_Multiple>${urlUserId ? `<ClientCode>${urlUserId}</ClientCode>` : ''}</X_Filter_Multiple>
        <X_GFilter></X_GFilter>
        <J_Api>"UserId":"${userData.userId}", "UserType":"${getLocalStorage('userType')}"</J_Api>
    </dsXml>`;

    try {
      const response = await apiService.postWithAuth(BASE_URL + PATH_URL, xmlData);

      if (response.data?.data?.rs0?.[0]) {
        setProfileData(response.data.data.rs0[0]);
      }
      setIsLoading(false);
    } catch (error) {
      console.error('Error fetching user profile:', error);
      setIsLoading(false);
    } finally {
      setIsLoading(false);
    }
  }, [searchParams]);
  //};

   useEffect(() => {
    getUserDetails();
  }, [getUserDetails]);

  // Helper function to get user initials
  const getUserInitials = () => {
    if (!profileData) return "";

    // Try to get name from any available section
    let name = "";
    for (const sectionName in profileData) {
      if (profileData[sectionName] && Array.isArray(profileData[sectionName]) && profileData[sectionName].length > 0) {
        const sectionData = profileData[sectionName][0];
        if (sectionData.Name) {
          name = sectionData.Name;
          break;
        }
      }
    }

    if (!name) return "";

    const nameParts = name.split(" ");
    if (nameParts.length >= 2) {
      return `${nameParts[0][0]}${nameParts[1][0]}`.toUpperCase();
    } else if (nameParts.length === 1) {
      return nameParts[0][0].toUpperCase();
    }
    return "";
  };

  // Function to render a single section box dynamically
  const renderSectionBox = (sectionName, sectionData) => {
    if (!sectionData || !Array.isArray(sectionData) || sectionData.length === 0) {
      return null;
    }

    // If there's only one record, show the old design
    if (sectionData.length === 1) {
      const data = sectionData[0];
      const fields = Object.keys(data);

      return (
        <div key={sectionName} className="p-5 border rounded-2xl lg:p-6" style={cardStyle}>
          <h4 className="mb-4 text-lg font-semibold" style={textStyle}>{sectionName}</h4>
          <div className="space-y-3">
            {fields.map((field) => {
              const value = data[field];

              return (
                <div key={field} className="flex">
                  <span className="text-sm" style={secondaryTextStyle}>{field} : </span>&nbsp;&nbsp;
                  <span className="text-sm font-medium text-left" style={textStyle}>
                    {value || '-'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      );
    }

    // If there are multiple records, show a table
    const fields = Object.keys(sectionData[0]);

    return (
      <div key={sectionName} className="p-5 border rounded-2xl lg:p-6" style={cardStyle}>
        <h4 className="mb-4 text-lg font-semibold" style={textStyle}>{sectionName}</h4>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: `2px solid ${colors.color3}` }}>
                {fields.map((field) => (
                  <th
                    key={field}
                    className="px-3 py-2 text-left font-semibold whitespace-nowrap"
                    style={textStyle}
                  >
                    {field}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sectionData.map((data, index) => (
                <tr
                  key={index}
                  style={{
                    borderBottom: index < sectionData.length - 1 ? `1px solid ${colors.color3}` : 'none'
                  }}
                >
                  {fields.map((field) => (
                    <td
                      key={field}
                      className="px-3 py-3 whitespace-nowrap"
                      style={textStyle}
                    >
                      {data[field] || '-'}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  // Get available sections from profileData
  const getAvailableSections = () => {
    if (!profileData) return [];

    return Object.keys(profileData).filter(sectionName =>
      profileData[sectionName] &&
      Array.isArray(profileData[sectionName]) &&
      profileData[sectionName].length > 0
    );
  };

  // const handleSave = () => {
  //   // Handle save logic here
  //   closeModal();
  // };

  // Custom styles based on theme
  const cardStyle = {
    backgroundColor: colors.cardBackground,
    borderColor: colors.color3,
  };

  const textStyle = {
    color: colors.text,
  };

  const secondaryTextStyle = {
    color: colors.secondary,
  };

  // const socialButtonStyle = {
  //   backgroundColor: colors.buttonBackground,
  //   borderColor: colors.color3,
  // };

  // const socialIconStyle = {
  //   color: colors.buttonText,
  // };

  // Helper function to get display name from any section
  const getDisplayName = () => {
    if (!profileData) return "";

    for (const sectionName in profileData) {
      if (profileData[sectionName] && Array.isArray(profileData[sectionName]) && profileData[sectionName].length > 0) {
        const sectionData = profileData[sectionName][0];
        if (sectionData.Name) {
          return sectionData.Name;
        }
      }
    }
    return "";
  };

  // Helper function to get display code from any section
  const getDisplayCode = () => {
    if (!profileData) return "";

    for (const sectionName in profileData) {
      if (profileData[sectionName] && Array.isArray(profileData[sectionName]) && profileData[sectionName].length > 0) {
        const sectionData = profileData[sectionName][0];
        if (sectionData.Code) {
          return sectionData.Code;
        }
      }
    }
    return "";
  };

  // Helper function to get location info
  const getLocationInfo = () => {
    if (!profileData) return "";

    for (const sectionName in profileData) {
      if (profileData[sectionName] && Array.isArray(profileData[sectionName]) && profileData[sectionName].length > 0) {
        const sectionData = profileData[sectionName][0];
        if (sectionData.City || sectionData.Country) {
          const city = sectionData.City || "";
          const country = sectionData.Country || "";
          return [city, country].filter(Boolean).join(", ");
        }
      }
    }
    return "";
  };

  return (
    <>
      <div className="p-5 border rounded-2xl lg:p-6" style={cardStyle}>
        {isLoading ? (
          <div className="flex justify-center items-center h-40">
            <p style={textStyle}>Loading profile data...</p>
          </div>
        ) : (
          <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex flex-col items-center w-full gap-6 xl:flex-row">
              <div className="w-20 h-20 overflow-hidden border rounded-full flex items-center justify-center" style={{ borderColor: colors.color3, backgroundColor: colors.buttonBackground }}>
                {profileData ? (
                  <span className="text-xl font-bold" style={{ color: colors.buttonText }}>
                    {getUserInitials()}
                  </span>
                ) : (
                  <Image
                    width={80}
                    height={80}
                    src="/images/user/owner.jpg"
                    alt="user"
                  />
                )}
              </div>
              <div className="order-3 xl:order-2">
                <h4 className="mb-2 text-lg font-semibold text-center xl:text-left" style={textStyle}>
                  {getDisplayName()}
                </h4>
                <div className="flex flex-col items-center gap-1 text-center xl:flex-row xl:gap-3 xl:text-left">
                  <p className="text-sm" style={secondaryTextStyle}>
                    {getDisplayCode()}
                  </p>
                  <div className="hidden h-3.5 w-px xl:block" style={{ backgroundColor: colors.color3 }}></div>
                  <p className="text-sm" style={secondaryTextStyle}>
                    {getLocationInfo()}
                  </p>
                </div>
              </div>

            </div>
          </div>
        )}
      </div>

      {/* Add profile details sections */}
      {!isLoading && profileData && (
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          {getAvailableSections().map(sectionName => renderSectionBox(sectionName, profileData[sectionName]))}
        </div>
      )}
    </>
  );
}
