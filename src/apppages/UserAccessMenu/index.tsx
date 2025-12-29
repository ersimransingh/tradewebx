"use client";

import { useEffect, useState } from "react";
import CommonCustomDropdown from "@/components/form/DropDown/CommonDropDown";
import { useTheme } from "@/context/ThemeContext";
import apiService from "@/utils/apiService";
import { BASE_URL, PATH_URL, ACTION_NAME } from "@/utils/constants";
import { toast } from "react-toastify";
import { useSelector } from "react-redux";
import { RootState } from "@/redux/store";
import { getLocalStorage } from "@/utils/helper";

//  Import types
import { GroupOption, AccessMaster, AccessMenu, CheckboxSummary,BoolString,GroupApiRow  } from "@/types/UserAccessTypes";

const UserAccessMenu: React.FC = () => {
  const [groupOptions, setGroupOptions] = useState<GroupOption[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<GroupOption | null>(null);
  const [rs0, setRs0] = useState<AccessMaster[]>([]);
  const [rs1, setRs1] = useState<AccessMenu[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const { colors } = useTheme();
  const UserID = getLocalStorage("userId");
  const userType = getLocalStorage("userType");
  const authToken = useSelector((state: RootState) => state.auth.authToken);

  const config = {
    headers: {
      Authorization: `Bearer ${authToken}`,
      "Content-Type": "application/xml",
    },
  };

  //  Helpers
  // const isBoolStr = (v: any): boolean =>
  //   v === "True" || v === "False" || v === "true" || v === "false";
  // Type guard (no `any`)
const isBoolStr = (v: unknown): v is BoolString =>
  v === "True" || v === "False" || v === "true" || v === "false";

  const getEligibleChecked = (rows: AccessMenu[], col: string): CheckboxSummary => {
    let eligible = 0;
    let checked = 0;
    for (const r of rows) {
      const v = r?.[col];
      if (isBoolStr(v)) {
        eligible += 1;
        if (v === "True") checked += 1;
      }
    }
    return { eligible, checked };
  };

  //  1. Fetch group list
  useEffect(() => {
    const fetchGroups = async () => {
      setIsLoading(true);
      try {
        const payload = `
          <dsXml>
            <J_Ui>"ActionName":"UserAccess","Option":"GROUPCODE"</J_Ui>
            <Sql></Sql>
            <X_Filter></X_Filter>
            <X_GFilter></X_GFilter>
            <J_Api>
              "UserId":"${UserID?.trim() || ""}",
              "UserType":"${userType}"
            </J_Api>
          </dsXml>`;

        const response = await apiService.postWithAuth(BASE_URL + PATH_URL, payload);

        if (response?.success && response?.data?.data?.rs0) {
          // const mappedOptions = response.data.data.rs0.map((item: any) => ({
          const mappedOptions : GroupOption[] = (response.data.data.rs0 as GroupApiRow[]).map((item) => ({
            value: item?.Value?.trim(),
            label: item?.DisplayName?.trim(),
          }));
          setGroupOptions(mappedOptions);
        }
      } catch {
        toast.error("Failed to fetch groups. Please refresh again.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchGroups();
  }, []);

  //  2. Fetch access data for selected group
  useEffect(() => {
    if (!selectedGroup) return;

    const fetchAccessData = async () => {
      setIsLoading(true);
      try {
        const payload = `
          <dsXml>
            <J_Ui>"ActionName":"${ACTION_NAME}","Option":"GetDataUserAccess"</J_Ui>
            <Sql></Sql>
            <X_Filter><GroupCode>${selectedGroup.value}</GroupCode></X_Filter>
            <X_GFilter></X_GFilter>
            <J_Api>"UserId":"${UserID?.trim() || ""}","UserType":"${userType}"</J_Api>
          </dsXml>`;

        const response = await apiService.postWithAuth(BASE_URL + PATH_URL, payload);

        if (response?.success) {
          setRs0(response?.data?.data?.rs0 || []);
          setRs1(response?.data?.data?.rs1 || []);
        }
      } catch {
        toast.error("Failed to fetch user access data.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchAccessData();
  }, [selectedGroup]);

  //  Toggle rs0 checkbox
  const handleRs0Change = (index: number, key: string) => {
    setRs0((prev) =>
      prev.map((item, i) =>
        i === index
          ? { ...item, [key]: item[key] === "True" ? "False" : "True" }
          : item
      )
    );
  };

  //  Toggle rs1 checkbox
  const handleRs1Change = (rowIndex: number, col: string) => {
    setRs1((prev) =>
      prev.map((row, idx) =>
        idx === rowIndex
          ? { ...row, [col]: row[col] === "True" ? "False" : "True" }
          : row
      )
    );
  };

  //  Select all per column
  const handleSelectAll = (col: string, check: boolean) => {
    setRs1((prev) =>
      prev.map((row) => {
        if (isBoolStr(row[col])) {
          return { ...row, [col]: check ? "True" : "False" };
        }
        return row;
      })
    );
  };

  //  Build XML payload
  const buildXml = (
    rs0: AccessMaster[],
    rs1: AccessMenu[],
    tempUserId: string,
    userType: string
  ): string => {
    const master = rs0?.[0]
      ? `<Master>${Object.keys(rs0[0])
          .map((key) => `<${key}>${String(rs0[0][key])?.trim()}</${key}>`)
          .join("")}</Master>`
      : "";

    const items = rs1?.length
      ? `<items>${rs1
          .map(
            (row) =>
              `<item>${Object.keys(row)
                .map((key) => `<${key}>${String(row[key])?.trim()}</${key}>`)
                .join("")}</item>`
          )
          .join("")}</items>`
      : "";

    return `<dsXml>
      <J_Ui>"ActionName":"GetDataUserAccess","Option":"ADD"</J_Ui>
      <X_Filter/>
      <X_Data>
        ${master}
        ${items}
        <UserId>${tempUserId}</UserId>
      </X_Data>
      <J_Api>"UserId":"${UserID}","UserType":"${userType}"</J_Api>
    </dsXml>`;
  };

  //  Extract message from XML response
  const extractMessage = (rawMessage: string) => {
    if (!rawMessage) return "";
    const match = rawMessage.match(/<Message>(.*?)<\/Message>/i);
    return match ? match[1].trim() : rawMessage.trim();
  };

  //  Submit XML data to server
  const handleSubmit = async () => {
    setIsLoading(true);
    try {
      const xml = buildXml(rs0, rs1, UserID?.trim() || "", userType?.trim() || "");
      const response = await apiService.postWithAuth(BASE_URL + PATH_URL, xml, config);

      if (response?.success) {
        toast.success(extractMessage(response.message));
      } else {
        toast.error("Failed to update Insertion.");
      }
    } catch {
      toast.error("Something went wrong. Please refresh again!");
    } finally {
      setIsLoading(false);
    }
  };

  // ---------------- Render ----------------
  return (
    <>
      <div className="border-b border-grey-500 flex items-center gap-5">
        <button
          className="px-4 py-2 text-sm rounded-t-lg font-bold bg-[#3EB489] mt-2"
          style={{ backgroundColor: "white" }}
        >
          User Access Menu
        </button>
      </div>

      {/* Group Dropdown & rs0 Checkboxes */}
      <div className="flex items-center gap-6 p-2 bg-white rounded-lg shadow flex-wrap">
        <div className="flex items-center gap-3 min-w-[280px]">
          <label className="font-medium text-gray-700 whitespace-nowrap">
            Group Name:
          </label>
          <div className="flex-1 relative">
            {isLoading ? (
              <div className="flex items-center justify-center h-10 bg-gray-50 border rounded-md text-sm text-gray-500">
                Loading...
              </div>
            ) : (
              <CommonCustomDropdown
                options={groupOptions}
                value={selectedGroup}
                onChange={setSelectedGroup}
                placeholder="Select Group..."
                resetOnOpen={false}
                colors={{
                  text: colors.text,
                  primary: colors.primary,
                  buttonText: colors.buttonText,
                  color3: colors.color3,
                  cardBackground: colors.cardBackground,
                }}
              />
            )}
          </div>
        </div>

        {rs0?.length > 0 && (
          <div className="flex flex-wrap gap-4">
            {Object.keys(rs0[0])
              .filter((key) => key !== "GroupCode")
              .map((key) => (
                <label key={key} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={rs0[0][key] === "True"}
                    onChange={() => handleRs0Change(0, key)}
                  />
                  {key}
                </label>
              ))}
          </div>
        )}

        {selectedGroup && (
          <div className="mt-0 ml-auto">
            <button
              onClick={handleSubmit}
              disabled={isLoading}
              style={{
                padding: "8px 16px",
                background: colors.primary,
                color: colors.buttonText,
                borderRadius: "8px",
                cursor: isLoading ? "not-allowed" : "pointer",
                border: "none",
                fontSize: "12px",
                opacity: isLoading ? 0.7 : 1,
              }}
            >
              {isLoading ? "Submitting..." : "Submit"}
            </button>
          </div>
        )}
      </div>

      {/* Table */}
      {rs1?.length > 0 && (
        <div className="mt-4 border rounded-lg shadow">
          <div className="max-h-[680px] overflow-y-auto">
            <table
              className="min-w-full border-collapse border border-gray-300 text-sm"
              style={{
                backgroundColor: colors.background,
                color: colors.text,
              }}
            >
              <thead
                className="sticky top-0 bg-gray-100 z-10"
                style={{
                  border: `1px solid ${colors?.color1 || "#f0f0f0"}`,
                  background: colors?.primary || "#f0f0f0",
                }}
              >
                <tr>
                  {["MenuName", "MenuCode", "MenuTag", "ParentMenu"].map((key) => (
                    <th key={key} className="border p-2">
                      {key}
                    </th>
                  ))}

                  {Object.keys(rs1[0])
                    .filter(
                      (key) =>
                        !["GroupCode", "MenuCode", "MenuName", "MenuTag", "ParentMenu"].includes(key)
                    )
                    .map((col, idx) => {
                      const { eligible, checked } = getEligibleChecked(rs1, col);
                      const allChecked = eligible > 0 && checked === eligible;
                      const someChecked = checked > 0 && checked < eligible;

                      return (
                        <th key={col} className="border p-2 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <input
                              type="checkbox"
                              style={{ cursor: "pointer" }}
                              ref={(el) => {
                                if (el) el.indeterminate = someChecked;
                              }}
                              checked={allChecked}
                              onChange={(e) => handleSelectAll(col, e.target.checked)}
                              disabled={eligible === 0}
                            />
                            <span>{idx + 1}</span>
                          </div>
                        </th>
                      );
                    })}
                </tr>
              </thead>

              <tbody style={{ border: `1px solid ${colors?.color1 || "#f0f0f0"}` }}>
                {isLoading ? (
                  <tr>
                    <td colSpan={Object.keys(rs1[0]).length} className="text-center p-4">
                      Loading...
                    </td>
                  </tr>
                ) : (
                  rs1.map((row, idx) => (
                    <tr key={row.MenuCode || idx}>
                      {["MenuName", "MenuCode", "MenuTag", "ParentMenu"].map((col) => (
                        <td
                          key={col}
                          className="border p-2"
                          style={{ border: `1px solid ${colors?.color1 || "#f0f0f0"}` }}
                        >
                          {row[col]}
                        </td>
                      ))}

                      {Object.keys(row)
                        .filter(
                          (key) =>
                            !["GroupCode", "MenuCode", "MenuName", "MenuTag", "ParentMenu"].includes(
                              key
                            )
                        )
                        .map((col) => (
                          <td
                            key={col}
                            className="border p-2 text-center"
                            style={{ border: `1px solid ${colors?.color1 || "#f0f0f0"}` }}
                          >
                            {isBoolStr(row[col]) && (
                              <label className="flex items-center justify-center gap-1">
                                <input
                                  type="checkbox"
                                  style={{ cursor: "pointer" }}
                                  checked={row[col] === "True"}
                                  onChange={() => handleRs1Change(idx, col)}
                                />
                                <span className="text-xs">{col}</span>
                              </label>
                            )}
                          </td>
                        ))}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
};

export default UserAccessMenu;
