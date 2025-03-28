"use client";
import UserAddressCard from "@/components/user-profile/UserAddressCard";
import UserInfoCard from "@/components/user-profile/UserInfoCard";
import UserMetaCard from "@/components/user-profile/UserMetaCard";
import { useTheme } from "@/context/ThemeContext";
import React from "react";

export default function Profile() {
  const { colors } = useTheme();

  const containerStyle = {
    backgroundColor: colors.background2,
    borderColor: colors.color3,
  };

  const headingStyle = {
    color: colors.text,
  };

  return (
    <div className="h-screen">
      <div className="rounded-2xl border p-5 lg:p-6" style={containerStyle}>
        <h3 className="mb-5 text-lg font-semibold lg:mb-7" style={headingStyle}>
          Profile
        </h3>
        <div className="space-y-6">
          <UserMetaCard />
          {/* <UserInfoCard /> */}
          {/* <UserAddressCard /> */}
        </div>
      </div>
    </div>
  );
}
