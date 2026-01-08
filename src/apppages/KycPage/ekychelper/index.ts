import apiService from "@/utils/apiService";
import { BASE_URL, PATH_URL } from "@/utils/constants";
import { storeLocalStorage, sanitizePayload } from "@/utils/helper";
import { toast } from "react-toastify";

export const fetchEkycDropdownOptions = async (field: any, setMasterDropdownOptions: any, setMasterLoadingDropdowns: any) => {
    if (!field.wQuery) return;
    try {
        setMasterLoadingDropdowns(prev => ({ ...prev, [field.wKey]: true }));
        const jUi = Object.entries(field.wQuery.J_Ui)
            .map(([key, value]) => `"${key}":"${value}"`)
            .join(',');

        const jApi = Object.entries(field.wQuery.J_Api)
            .map(([key, value]) => `"${key}":"${value}"`)
            .join(',');

        const xmlData = `<dsXml>
                <J_Ui>${jUi}</J_Ui>
                <Sql>${field.wQuery.Sql || ''}</Sql>
                <X_Filter>${field.wQuery.X_Filter || ''}</X_Filter>
                <J_Api>${jApi}</J_Api>
            </dsXml>`;

        const response = await apiService.postWithAuth(BASE_URL + PATH_URL, xmlData);

        const options = response.data?.data?.rs0?.map((item: any) => ({
            label: item[field.wDropDownKey?.key || 'DisplayName'],
            value: item[field.wDropDownKey?.value || 'Value']
        }));

        setMasterDropdownOptions(prev => ({ ...prev, [field.wKey]: options }));
    } catch (error) {
        console.error(`Error fetching options for ${field.wKey}:`, error);
    } finally {
        setMasterLoadingDropdowns(prev => ({ ...prev, [field.wKey]: false }));
    }
};


export const handleSaveSinglePageData = async (
    settings: any,
    JsonData: any,
    setActiveTab?: any,
    tabName?: string,
    setSaving?: (loading: boolean) => void,
    page?: string
) => {
    if (!settings) return;

    // Set loading state to true when starting the save operation
    if (setSaving) setSaving(true);

    try {
        const jUi = Object.entries(settings.J_Ui)
            .map(([key, value]) => `"${key}":"${value}"`)
            .join(',');

        const jApi = Object.entries(settings.J_Api)
            .map(([key, value]) => `"${key}":"${value}"`)
            .join(',');

        // Construct X_Filter with edit data if available
        const formData = JsonData || {};
        let XFilterMultiple = '';
        Object.entries(settings.X_Filter_Multiple).forEach(([key, value]) => {
            XFilterMultiple += `<${key}>${value}</${key}>`;
        });

        // Stringify first, then escape ampersands
        // const jsonString = JSON.stringify(formData);

        const xmlData = `<dsXml>
        <J_Ui>${jUi}</J_Ui>
        <Sql>${settings.Sql || ''}</Sql>
        <X_Filter></X_Filter>
        <X_DataJson>${JSON.stringify(sanitizePayload(formData))}</X_DataJson>
        <X_Filter_Multiple>${XFilterMultiple || ''}</X_Filter_Multiple>
        <J_Api>${jApi}</J_Api>
        </dsXml>`;

        const response = await apiService.postWithAuth(BASE_URL + PATH_URL, xmlData);

        if (response.data?.success) {
            const responseData = response.data?.data?.rs0?.[0];

            if (responseData?.Flag === "E") {
                // Error case
                toast.error(responseData.Message || "Error saving data");
            } else if (responseData?.Flag === "S") {
                // Success case
                toast.success(responseData.Message || "Data saved successfully");
                if (setActiveTab && tabName) {
                    setActiveTab(tabName);
                    if (page === "finalPage") {
                        storeLocalStorage("ekyc_submit", "true");
                    }
                }
            } else {
                // Handle other cases or default success
                toast.error(responseData.Message || "Something went wrong");
            }
        } else {
            toast.error(response.data.message || "Something went wrong while saving data");
        }
    } catch (error) {
        console.error(`Error saving data:`, error);
        toast.error("An error occurred while saving data");
    } finally {
        // Set loading state to false when operation completes (success or error)
        if (setSaving) setSaving(false);
    }
}

export const SubmitEkycForm = async (settings: any, data: any, setSaving?: (loading: boolean) => void, MasterSettings?: any) => {
    if (setSaving) setSaving(true);

    try {
        const jUi = Object.entries(settings.J_Ui)
            .map(([key, value]) => `"${key}":"${value}"`)
            .join(',');

        const jApi = Object.entries(settings.J_Api)
            .map(([key, value]) => `"${key}":"${value}"`)
            .join(',');
        const formData = data || {};
        let XFilterMultiple = '';


        Object.entries(settings.X_Filter_Multiple).forEach(([key, value]) => {
            XFilterMultiple += `<${key}>${value}</${key}>`;
        });

        // Stringify first, then escape ampersands
        // const jsonString = JSON.stringify(formData);


        const xmlData = `<dsXml>
                <J_Ui>${jUi}</J_Ui>
                <Sql></Sql>
                <X_Filter></X_Filter>
                <X_DataJson>${JSON.stringify(sanitizePayload(formData))}</X_DataJson>
                <X_Filter_Multiple>${XFilterMultiple}</X_Filter_Multiple>
                <J_Api>${jApi}</J_Api>
            </dsXml>`;

        const response = await apiService.postWithAuth(BASE_URL + PATH_URL, xmlData);
        if (response.data?.success) {
            const responseData = response.data?.data?.rs0?.[0];

            if (responseData?.Flag === "E") {
                // Error case
                toast.error(responseData.Message || "Error saving data");
            } else if (responseData?.Flag === "S") {
                // Success case
                toast.success(responseData.Message || "Data saved successfully");
                storeLocalStorage("ekyc_viewMode", "true");
                storeLocalStorage("ekyc_checker", "true");
                storeLocalStorage("hideVerifyAadhar", "true");

            } else if (responseData?.Flag === "A") {
                handleThirdPartyApi(MasterSettings)
                storeLocalStorage('redirectedField', "FinalFormSubmission");
            } else {
                // Handle other cases or default success
                toast.error(responseData.Message || "Something went wrong");
            }
        } else {
            toast.error(response.data.message || "Something went wrong while saving data");
        }

    } catch (error) {
        console.error(`Error fetching options for:`, error);
    } finally {
        // Set loading state to false when operation completes (success or error)
        if (setSaving) setSaving(false);
    }
};



export const handleThirdPartyApi = async (Settings: any) => {

    const { J_Ui = {}, Sql, X_Filter, X_Filter_Multiple = {}, J_Api = {} } = Settings?.DigiLockerAPI?.dsXml;

    let xFilter = '';
    let xFilterMultiple = '';

    const jUi = Object.entries(J_Ui).map(([key, value]) => `"${key}":"${value}"`).join(',');
    const jApi = Object.entries(J_Api).map(([key, value]) => `"${key}":"${value}"`).join(',');



    Object.entries(X_Filter_Multiple).forEach(([key, value]) => {
        xFilterMultiple += `<${key}>${value}</${key}>`;
    });

    Object.entries(X_Filter).forEach(([key, value]) => {
        xFilter += `<${key}>${value}</${key}>`;
    });
    const xmlData = `<dsXml>\n            <J_Ui>${jUi}</J_Ui>\n            <Sql>${Sql || ''}</Sql>\n            <X_Filter>${xFilter}</X_Filter>\n            <X_Filter_Multiple>${xFilterMultiple}</X_Filter_Multiple>\n            <J_Api>${jApi}</J_Api>\n        </dsXml>`;
    try {
        const response = await apiService.postWithAuth(BASE_URL + PATH_URL, xmlData);

        // Extract and parse the XML from response
        const columnData = response?.data?.data?.rs0?.[0]?.Column1;
        if (columnData) {
            // Ensure the XML is wrapped in a root tag
            const xmlString = columnData.trim().startsWith('<root>') ? columnData : `<root>${columnData}</root>`;
            try {
                const parser = new DOMParser();
                const xmlDoc = parser.parseFromString(xmlString, 'text/xml');
                const urlNode = xmlDoc.getElementsByTagName('url')[0];
                const url = urlNode?.textContent;
                window.open(url, '_self');
                toast.success('Redirecting to third party URL...');
            } catch (err) {
                console.error('Error parsing ThirdPartyAPI XML:', err);
            }
        }
    } catch (error) {
        console.error('ThirdPartyAPI error:', error);
        toast.error('ThirdPartyAPI error!');
    } finally {

    }

}

export const handleDigiLockerCallBackAPI = async (Settings: any, setCheckKRAMode?: any, fetchFormData?: any, setSaving?: any) => {
    if (setSaving) setSaving(true);

    const { J_Ui = {}, Sql, X_Filter, X_Filter_Multiple = {}, J_Api = {} } = Settings?.DigiLockerCallBackAPI?.dsXml;

    let xFilter = '';
    let xFilterMultiple = '';

    const jUi = Object.entries(J_Ui).map(([key, value]) => `"${key}":"${value}"`).join(',');
    const jApi = Object.entries(J_Api).map(([key, value]) => `"${key}":"${value}"`).join(',');

    Object.entries(X_Filter_Multiple).forEach(([key, value]) => {
        xFilterMultiple += `<${key}>${value}</${key}>`;
    });

    Object.entries(X_Filter).forEach(([key, value]) => {
        xFilter += `<${key}>${value}</${key}>`;
    });
    const xmlData = `<dsXml>\n            <J_Ui>${jUi}</J_Ui>\n            <Sql>${Sql || ''}</Sql>\n            <X_Filter>${xFilter}</X_Filter>\n            <X_Filter_Multiple>${xFilterMultiple}</X_Filter_Multiple>\n            <J_Api>${jApi}</J_Api>\n        </dsXml>`;
    try {
        const response = await apiService.postWithAuth(BASE_URL + PATH_URL, xmlData);

        // Extract and parse the XML from response
        const columnData = response?.data?.data?.rs0?.[0]?.Column1;
        const flagValue = columnData.match(/<Flag>(.*?)<\/Flag>/)[1];

        if (flagValue === "S") {
            storeLocalStorage('redirectedField', null);
            storeLocalStorage("ekyc_viewMode", "true");
            storeLocalStorage("ekyc_checker", "true");

            toast.success("E-verification successfull");
            setCheckKRAMode(true);
            fetchFormData();
        }
    } catch (error) {
        console.error('ThirdPartyAPI error:', error);
        toast.error('ThirdPartyAPI error!');
    } finally {
        if (setSaving) setSaving(false);
    }
}