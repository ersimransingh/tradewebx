import { useState, useEffect, useCallback } from "react";
import { ACTION_NAME, BASE_URL, PATH_URL } from "@/utils/constants";
import { toast } from "react-toastify";
import Loader from "@/components/Loader";
import apiService from "@/utils/apiService";
import DataTable from "@/components/DataTable";
import { findPageData, parseSettingsFromXml } from "@/utils/helper";
import { useAppSelector } from "@/redux/hooks";
import { selectAllMenuItems } from "@/redux/features/menuSlice";
interface DematLedgerModalProps {
    isOpen: boolean;
    onClose: () => void;
    clientCode: string;
    dpAccountNo: string;
}

const DematLedgerModal = ({ isOpen, onClose, clientCode, dpAccountNo }: DematLedgerModalProps) => {
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState<any[]>([]);
    const [rs1Settings, setRs1Settings] = useState<any>(null);
    const menuItems = useAppSelector(selectAllMenuItems);
    const pageData = findPageData(menuItems, "Dpledger");
    const pageSettings = pageData[0].levels[0].settings


    // const fetchDematLedger = async () => {
     const fetchDematLedger = useCallback(async () => {
        try {
            setLoading(true);
            const xmlData = `<dsXml>
        <J_Ui>"ActionName":"${ACTION_NAME}","Option":"DPLedger","Level":1,"RequestFrom":"W"</J_Ui>
        <Sql></Sql>
        <X_Filter><ClientCode>${clientCode}</ClientCode><BenefAccountNo>${dpAccountNo}</BenefAccountNo></X_Filter>
        <X_GFilter></X_GFilter>
        <J_Api>"UserId":"${clientCode}", "UserType":"user"</J_Api>
      </dsXml>`;

            const response = await apiService.postWithAuth(BASE_URL + PATH_URL, xmlData);

            if (response.data?.data?.rs0) {
                const rowData = response.data?.data?.rs0 || [];
                const dataWithId = rowData.map((row: any, index: number) => ({
                    ...row,
                    _id: index
                }));

                setData(dataWithId);
            } if (response.data.data.rs1?.[0]?.Settings) {
                const xmlString = response.data.data.rs1[0].Settings;
                const settingsJson = parseSettingsFromXml(xmlString)
                setRs1Settings(settingsJson);


            } else {
                toast.error("Failed to fetch Demat ledger");
            }
        } catch (error) {
            console.error("Error fetching Demat ledger:", error);
            toast.error("Error fetching Demat ledger");
        } finally {
            setLoading(false);
        }
    }, [clientCode, dpAccountNo]);
    // };

    useEffect(() => {
        if (isOpen) {
            fetchDematLedger();
        }
     }, [isOpen, fetchDematLedger]);
    // }, [isOpen]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 flex items-center justify-center z-[200]" style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}>
            <div className="bg-white rounded-lg p-6 w-full max-w-6xl max-h-[80vh] overflow-y-auto">
                <div className="flex justify-between items-center gap-4 mt-2 mb-4">
                    <h4 className="text-xl font-semibold">
                        Demat Ledger Balance
                    </h4>
                    <div className="flex gap-4">
                        <button
                            onClick={onClose}
                            className="bg-gray-300 hover:bg-gray-400 text-gray-800 px-4 py-2 rounded-md"
                        >
                            Close
                        </button>
                    </div>
                </div>

                {loading ? (
                    <div className="flex inset-0 flex items-center justify-center z-[200] max-h-[80vh]">
                        <Loader />
                    </div>
                ) : (
                    <div className="h-[70vh]">
                        {!data?.length ? (
                            <div className="text-center">
                                <h1>No Data Available</h1>
                            </div>
                        )
                            : (
                                <DataTable
                                    data={data}
                                    settings={{
                                        ...pageSettings,
                                        mobileColumns: rs1Settings?.mobileColumns?.[0] || [],
                                        tabletColumns: rs1Settings?.tabletColumns?.[0] || [],
                                        webColumns: rs1Settings?.webColumns?.[0] || [],
                                    }}
                                />
                            )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default DematLedgerModal;