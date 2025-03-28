"use client";
import React, { useState, useEffect } from "react";
import { useModal } from "../../hooks/useModal";
import { useTheme } from "../../context/ThemeContext";

import Image from "next/image";
import axios from "axios";
import { BASE_URL, PATH_URL } from "../../utils/constants";

export default function UserMetaCard() {
  const { isOpen, openModal, closeModal } = useModal();
  const { colors } = useTheme();
  const [profileData, setProfileData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    getUserDetails();
  }, []);

  const getUserDetails = async () => {
    setIsLoading(true);
    const userData = {
      userId: localStorage.getItem('userId') || ''
    };

    const xmlData = `<dsXml>
        <J_Ui>"ActionName":"tradeweb", "Option":"UserProfile","Level":1, "RequestFrom":"M"</J_Ui>
        <Sql></Sql>
        <X_Filter></X_Filter>
        <X_GFilter></X_GFilter>
        <J_Api>"UserId":"${userData.userId}"</J_Api>
    </dsXml>`;

    try {
      const response = await axios.post(BASE_URL + PATH_URL, xmlData, {
        headers: {
          'Content-Type': 'application/xml',
          'Authorization': `Bearer ${document.cookie.split('auth_token=')[1]}`
        }
      });

      if (response.data?.data?.rs0?.[0]) {
        setProfileData(response.data.data.rs0[0]);
      }
      setIsLoading(false);
    } catch (error) {
      console.error('Error fetching user profile:', error);
      setIsLoading(false);
    }
  };

  // Helper function to get personal details
  const getPersonalDetail = (field) => {
    return profileData?.["Personal Detail"]?.[0]?.[field] || "";
  };

  // Helper function to get address details
  const getAddressDetail = (field) => {
    return profileData?.["Address Details"]?.[0]?.[field] || "";
  };

  // Helper function to get bank details
  const getBankDetail = (field) => {
    return profileData?.["Bank Details"]?.[0]?.[field] || "";
  };

  // Helper function to get demat details
  const getDematDetail = (field) => {
    return profileData?.["Demat Details"]?.[0]?.[field] || "";
  };

  // Helper function to get user initials
  const getUserInitials = () => {
    const name = getPersonalDetail("Name");
    if (!name) return "";

    const nameParts = name.split(" ");
    if (nameParts.length >= 2) {
      return `${nameParts[0][0]}${nameParts[1][0]}`.toUpperCase();
    } else if (nameParts.length === 1) {
      return nameParts[0][0].toUpperCase();
    }
    return "";
  };

  const handleSave = () => {
    // Handle save logic here
    closeModal();
  };

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

  const socialButtonStyle = {
    backgroundColor: colors.buttonBackground,
    borderColor: colors.color3,
  };

  const socialIconStyle = {
    color: colors.buttonText,
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
                  {getPersonalDetail("Name")}
                </h4>
                <div className="flex flex-col items-center gap-1 text-center xl:flex-row xl:gap-3 xl:text-left">
                  <p className="text-sm" style={secondaryTextStyle}>
                    {getPersonalDetail("Code")}
                  </p>
                  <div className="hidden h-3.5 w-px xl:block" style={{ backgroundColor: colors.color3 }}></div>
                  <p className="text-sm" style={secondaryTextStyle}>
                    {getAddressDetail("City")}, {getAddressDetail("Country")}
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
          {/* Personal Details */}
          <div className="p-5 border rounded-2xl lg:p-6" style={cardStyle}>
            <h4 className="mb-4 text-lg font-semibold" style={textStyle}>Personal Details</h4>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm" style={secondaryTextStyle}>Code</span>
                <span className="text-sm font-medium" style={textStyle}>{getPersonalDetail("Code")}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm" style={secondaryTextStyle}>Name</span>
                <span className="text-sm font-medium" style={textStyle}>{getPersonalDetail("Name")}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm" style={secondaryTextStyle}>Mobile</span>
                <span className="text-sm font-medium" style={textStyle}>{getPersonalDetail("Mobile")}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm" style={secondaryTextStyle}>Email</span>
                <span className="text-sm font-medium" style={textStyle}>{getPersonalDetail("Email")}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm" style={secondaryTextStyle}>Gender</span>
                <span className="text-sm font-medium" style={textStyle}>{getPersonalDetail("Gender")}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm" style={secondaryTextStyle}>PAN</span>
                <span className="text-sm font-medium" style={textStyle}>{getPersonalDetail("PAN")}</span>
              </div>
            </div>
          </div>

          {/* Address Details */}
          <div className="p-5 border rounded-2xl lg:p-6" style={cardStyle}>
            <h4 className="mb-4 text-lg font-semibold" style={textStyle}>Address Details</h4>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm" style={secondaryTextStyle}>Address</span>
                <span className="text-sm font-medium text-right" style={textStyle}>
                  {getAddressDetail("Address1")}, {getAddressDetail("Address2")}, {getAddressDetail("Address3")}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm" style={secondaryTextStyle}>City</span>
                <span className="text-sm font-medium" style={textStyle}>{getAddressDetail("City")}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm" style={secondaryTextStyle}>State</span>
                <span className="text-sm font-medium" style={textStyle}>{getAddressDetail("State")}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm" style={secondaryTextStyle}>Country</span>
                <span className="text-sm font-medium" style={textStyle}>{getAddressDetail("Country")}</span>
              </div>
            </div>
          </div>

          {/* Bank Details */}
          <div className="p-5 border rounded-2xl lg:p-6" style={cardStyle}>
            <h4 className="mb-4 text-lg font-semibold" style={textStyle}>Bank Details</h4>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm" style={secondaryTextStyle}>Bank Name</span>
                <span className="text-sm font-medium" style={textStyle}>{getBankDetail("Name")}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm" style={secondaryTextStyle}>Account No</span>
                <span className="text-sm font-medium" style={textStyle}>{getBankDetail("Account No")}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm" style={secondaryTextStyle}>IFSC</span>
                <span className="text-sm font-medium" style={textStyle}>{getBankDetail("IFSC")}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm" style={secondaryTextStyle}>MICR</span>
                <span className="text-sm font-medium" style={textStyle}>{getBankDetail("MICR")}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm" style={secondaryTextStyle}>Account Type</span>
                <span className="text-sm font-medium" style={textStyle}>{getBankDetail("AccountType")}</span>
              </div>
            </div>
          </div>

          {/* Demat Details */}
          <div className="p-5 border rounded-2xl lg:p-6" style={cardStyle}>
            <h4 className="mb-4 text-lg font-semibold" style={textStyle}>Demat Details</h4>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm" style={secondaryTextStyle}>DP ID</span>
                <span className="text-sm font-medium" style={textStyle}>{getDematDetail("DP ID")}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm" style={secondaryTextStyle}>DP Account No</span>
                <span className="text-sm font-medium" style={textStyle}>{getDematDetail("DP Account No")}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
