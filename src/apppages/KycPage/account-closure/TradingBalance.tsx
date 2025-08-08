import { useState, useEffect } from "react";
import { BASE_URL, PATH_URL } from "@/utils/constants";
import { toast } from "react-toastify";
import Loader from "@/components/Loader";
import apiService from "@/utils/apiService";
import DataTable from "@/components/DataTable";
import { findPageData, parseSettingsFromXml } from "@/utils/helper";
import { useAppSelector } from "@/redux/hooks";
import { selectAllMenuItems } from "@/redux/features/menuSlice";

interface TradingBalanceModalProps {
    isOpen: boolean;
    onClose: () => void;
    clientCode: string;
}

const TradingBalanceModal = ({ isOpen, onClose, clientCode }: TradingBalanceModalProps) => {
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState<any[]>([]);

    const [rs1Settings, setRs1Settings] = useState<any>(null);
    const menuItems = useAppSelector(selectAllMenuItems);
    const pageData = findPageData(menuItems, "Ledger");
    const pageSettings = pageData[0].levels[0].settings


    const getCurrentFinancialYearDates = () => {
        const today = new Date();
        const currentYear = today.getFullYear();
        const currentMonth = today.getMonth();

        // Financial year runs from April 1 to March 31
        let fromDate, toDate;

        if (currentMonth >= 3) { // April or later
            fromDate = `${currentYear}0401`; // April 1 of current year
            toDate = `${currentYear + 1}0331`; // March 31 of next year
        } else { // January-March
            fromDate = `${currentYear - 1}0401`; // April 1 of previous year
            toDate = `${currentYear}0331`; // March 31 of current year
        }

        return { fromDate, toDate };
    };


    const fetchTradingLedger = async () => {
        try {
            setLoading(true);
            const { fromDate, toDate } = getCurrentFinancialYearDates();

            const xmlData = `<dsXml>
        <J_Ui>"ActionName":"TradeWeb","Option":"Ledger","Level":1,"RequestFrom":"W"</J_Ui>
        <Sql></Sql>
        <X_Filter><FromDate>${fromDate}</FromDate><ToDate>${toDate}</ToDate><ClientCode>${clientCode}</ClientCode></X_Filter>
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
                toast.error("Failed to fetch trading ledger");
            }
        } catch (error) {
            console.error("Error fetching trading ledger:", error);
            toast.error("Error fetching trading ledger");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isOpen) {
            fetchTradingLedger();
        }
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 flex items-center justify-center z-[200]" style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}>
            <div className="bg-white rounded-lg p-6 w-full max-w-6xl max-h-[80vh] overflow-y-auto">
                <div className="flex justify-between items-center gap-4 mt-2 mb-4">
                    <h4 className="text-xl font-semibold">
                        Trading Account Ledger
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

export default TradingBalanceModal;