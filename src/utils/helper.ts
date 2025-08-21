import { THEME_COLORS_STORAGE_KEY, THEME_STORAGE_KEY } from "@/context/ThemeContext";
import { APP_METADATA_KEY } from "./constants";
import { toast } from "react-toastify";
import { log } from "node:console";

export const clearLocalStorage = () => {
    const appMetadata = localStorage.getItem(APP_METADATA_KEY);
    const appThemeColors = localStorage.getItem(THEME_COLORS_STORAGE_KEY);
    const appTheme = localStorage.getItem(THEME_STORAGE_KEY);
    localStorage.clear();
    localStorage.setItem(APP_METADATA_KEY, appMetadata);
    if (appThemeColors) localStorage.setItem(THEME_COLORS_STORAGE_KEY, appThemeColors);
    if (appTheme) localStorage.setItem(THEME_STORAGE_KEY, appTheme);
}

// Utility to find page data by component name in menuItems
export function findPageData(menuItems: any[], componentName: string): any {
    const searchInItems = (items: any[]): any => {
        for (const item of items) {
            if (item.componentName?.toLowerCase() === componentName.toLowerCase() && item.pageData) {
                return item.pageData;
            }
            if (item.subItems && item.subItems.length > 0) {
                const foundInSubItems = searchInItems(item.subItems);
                if (foundInSubItems) {
                    return foundInSubItems;
                }
            }
        }
        return null;
    };
    return searchInItems(menuItems);
}
export function handleViewFile(base64Data: string, fieldType: string = 'file') {
    if (!base64Data?.startsWith('data:')) {
        alert("Invalid file data");
        return;
    }

    const match = base64Data.match(/^data:(.*);base64,(.*)$/);
    if (!match) {
        alert("Invalid base64 structure");
        return;
    }

    const mimeType = match[1];
    const base64 = match[2];

    try {
        const byteCharacters = atob(base64);
        const byteNumbers = Array.from(byteCharacters, char => char.charCodeAt(0));
        const byteArray = new Uint8Array(byteNumbers);

        const blob = new Blob([byteArray], { type: mimeType });
        const blobUrl = URL.createObjectURL(blob);

        const newTab = window.open(blobUrl, '_blank');

        if (!newTab || newTab.closed || typeof newTab.closed === 'undefined') {
            const link = document.createElement('a');
            link.href = blobUrl;
            link.download = `uploaded-file.${fieldType || 'file'}`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    } catch (error) {
        alert("Unable to preview file.");
    }
}

//Dynamic XML Payload
export const buildFilterXml = (filters: Record<string, any>, userId: string): string => {
    if (filters && Object.keys(filters).length > 0) {
        return Object.entries(filters).map(([key, value]) => {
            if ((key === 'FromDate' || key === 'ToDate') && value) {
                const date = new Date(String(value));
                if (!isNaN(date.getTime())) {
                    const year = date.getFullYear();
                    const month = String(date.getMonth() + 1).padStart(2, '0');
                    const day = String(date.getDate()).padStart(2, '0');
                    return `<${key}>${year}${month}${day}</${key}>`;
                }
            }
            return `<${key}>${value}</${key}>`;
        }).join('\n');
    } else {
        return `<ClientCode>${userId}</ClientCode>`;
    }
};

export const clearMakerSates = () => {
    localStorage.removeItem('ekycChecker');
}

export function getFileTypeFromBase64(base64: string): string {
    const header = base64.slice(0, 30);

    if (header.startsWith('JVBERi0')) return 'pdf'; // PDF
    if (header.startsWith('/9j/')) return 'jpeg';    // JPEG
    if (header.startsWith('iVBORw0KGgo')) return 'png'; // PNG
    if (header.startsWith('UEsDB')) return 'zip';    // ZIP
    if (header.includes('<?xml') || header.includes('PD94bWwg')) return 'xml'; // XML
    if (header.includes('R0lGOD')) return 'gif';     // GIF
    if (header.includes('AAABAAEAEBAAAAEAIABoBAAAFgAAACgAAAAQAAAAIAAAAAEAIAAAAAAAQAAAAAAAAAAAAAAA')) return 'ico'; // ICO
    if (/^[A-Za-z0-9+\/=]+\s*$/.test(base64)) return 'text'; // generic fallback for plain text

    return 'unknown';
}


export function displayAndDownloadPDF(base64Data: any, fileName: string) {
    // Create a blob from the base64 data
    const byteCharacters = atob(base64Data);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);

    // Open the PDF in a new tab
    const newTab = window.open(url, '_blank');

    // If the new tab is blocked, show a message with download link
    if (!newTab || newTab.closed || typeof newTab.closed === 'undefined') {
        // Create a download link
        const downloadLink = document.createElement('a');
        downloadLink.href = url;
        downloadLink.download = fileName;
        downloadLink.textContent = 'Download PDF';

        // Create a container for the message
        const container = document.createElement('div');
        container.style.position = 'fixed';
        container.style.top = '0';
        container.style.left = '0';
        container.style.right = '0';
        container.style.backgroundColor = '#f8f9fa';
        container.style.padding = '20px';
        container.style.boxShadow = '0 2px 10px rgba(0,0,0,0.1)';
        container.style.zIndex = '1000';

        const message = document.createElement('p');
        message.textContent = 'The PDF viewer was blocked by your popup blocker. ';
        message.appendChild(downloadLink);

        container.appendChild(message);
        document.body.prepend(container);

        // Auto-click the download link after a short delay
        setTimeout(() => {
            downloadLink.click();
            // Clean up the URL object after download
            setTimeout(() => URL.revokeObjectURL(url), 100);
        }, 500);
    } else {
        // Clean up the URL object when the tab is closed
        newTab.onbeforeunload = function () {
            URL.revokeObjectURL(url);
        };
    }
}


export const clearIndexedDB = () => {
    return new Promise((resolve, reject) => {
        const request = indexedDB.deleteDatabase("ekycDB");

        request.onsuccess = () => {
            console.log("IndexedDB deleted successfully");
            resolve(true);
        };

        request.onerror = (event) => {
            console.error("Error deleting IndexedDB:", request.error);
            reject(request.error);
        };

        request.onblocked = () => {
            console.warn("Database deletion blocked (probably open in another tab)");
            reject("Database deletion blocked");
        };
    });
};

export const dynamicXmlGenratingFn = (ApiData,rowData) => {
    const J_Ui = Object.entries(ApiData.dsXml.J_Ui)
        .map(([key, value]) => `"${key}":"${value}"`)
        .join(',');
    
      const X_Filter_Multiple = Object.keys(ApiData.dsXml.X_Filter_Multiple)
        .filter(key => key in rowData)
        .map(key => `<${key}>${rowData[key]}</${key}>`)
        .join('');

        const xmlData = `<dsXml>
        <J_Ui>${J_Ui}</J_Ui>
        <Sql>${ApiData.dsXml.Sql || ''}</Sql>
        <X_Filter>${ApiData.dsXml.X_Filter || ''}</X_Filter>
        <X_Filter_Multiple>${X_Filter_Multiple}</X_Filter_Multiple>
        <J_Api>"UserId":"${localStorage.getItem('userId')}"</J_Api>
      </dsXml>`;

      return xmlData

}

export const parseXmlList = (xmlString: string, tag: string): string[] => {
        const regex = new RegExp(`<${tag}>(.*?)</${tag}>`, 'g');
        const matches = xmlString.match(regex);
        return matches ? matches.map((match: any) => match.replace(new RegExp(`</?${tag}>`, 'g'), '').split(',')) : [];
    };
export const parseXmlValue = (xmlString: string, tag: string): string => {
        const regex = new RegExp(`<${tag}>(.*?)</${tag}>`);
        const match = xmlString.match(regex);
        return match ? match[1] : '';
    };
export  const parseHeadings = (xmlString: string): any => {
        // Implement heading parsing logic if needed
        return {};
    };


export const parseSettingsFromXml = (xmlString: string) => {
    // Create and return the settings object
    return {
        totalList: parseXmlList(xmlString, 'TotalList'),
        rightList: parseXmlList(xmlString, 'RightList'),
        hideList: parseXmlList(xmlString, 'HideList'),
        dateFormat: parseXmlValue(xmlString, 'DateFormat'),
        dateFormatList: parseXmlList(xmlString, 'DateFormatList'),
        dec2List: parseXmlList(xmlString, 'Dec2List'),
        dec4List: parseXmlList(xmlString, 'Dec4List'),
        drCRColorList: parseXmlList(xmlString, 'DrCRColorList'),
        pnLColorList: parseXmlList(xmlString, 'PnLColorList'),
        primaryKey: parseXmlValue(xmlString, 'PrimaryKey'),
        companyName: parseXmlValue(xmlString, 'CompanyName'),
        companyAdd1: parseXmlValue(xmlString, 'CompanyAdd1'),
        companyAdd2: parseXmlValue(xmlString, 'CompanyAdd2'),
        companyAdd3: parseXmlValue(xmlString, 'CompanyAdd3'),
        reportHeader: parseXmlValue(xmlString, 'ReportHeader'),
        pdfWidth: parseXmlValue(xmlString, 'PDFWidth'),
        pdfHeight: parseXmlValue(xmlString, 'PDFHeight'),
        mobileColumns: parseXmlList(xmlString, 'MobileColumns'),
        tabletColumns: parseXmlList(xmlString, 'TabletColumns'),
        webColumns: parseXmlList(xmlString, 'WebColumns'),
        headings: parseHeadings(xmlString)
    };
};


export function displayAndDownloadFile(base64: string, fileDownloadName?: string) {
    const fileType = getFileTypeFromBase64(base64);
    const mimeMap: Record<string, string> = {
        pdf: 'application/pdf',
        png: 'image/png',
        jpeg: 'image/jpeg',
        jpg: 'image/jpeg',
        gif: 'image/gif',
        xml: 'application/xml',
        text: 'text/plain',
        zip: 'application/zip',
    };

    const mimeType = mimeMap[fileType] || 'application/octet-stream';

    const byteCharacters = atob(base64);
    const byteNumbers = Array.from(byteCharacters, char => char.charCodeAt(0));
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: mimeType });
    const blobUrl = URL.createObjectURL(blob);

    if (fileDownloadName) {
        const safeName = fileDownloadName.replace(/[<>:"/\\|?*]+/g, '-');
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = safeName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    } else {
        window.open(blobUrl, '_blank');
    }
}

// Interface for button configuration
interface ButtonConfig {
    show_edit_button?: boolean;
    show_add_button?: boolean;
    show_excel_export_button?: boolean;
    show_email_report_button?: boolean;
    show_download_options_button?: boolean;
    show_csv_export_button?: boolean;
    show_pdf_export_button?: boolean;
    show_search_button?: boolean;
    show_refresh_button?: boolean;
    show_filter_button?: boolean;
}

// Interface for button visibility parameters
interface ButtonVisibilityParams {
    buttonType: 'edit' | 'add' | 'excel_export' | 'email_report' | 'download_options' | 'csv_export' | 'pdf_export' | 'search' | 'refresh' | 'filter';
    // Existing conditions
    componentType?: string;
    selectedRowsLength?: number;
    hasEditableColumn?: boolean;
    showFilterHorizontally?: boolean;
    hasFilters?: boolean;
    showTypeList?: boolean;
    additionalTablesLength?: number;
    hasApiData?: boolean;
    // New button config from API
    buttonConfig?: ButtonConfig;
}

/**
 * Determines if a button should be visible based on both existing logic and new buttonConfig
 * @param params - Parameters containing button type, existing conditions, and button config
 * @returns boolean - true if button should be shown, false otherwise
 */
export const shouldShowButton = (params: ButtonVisibilityParams): boolean => {
    const {
        buttonType,
        componentType,
        selectedRowsLength = 0,
        hasEditableColumn = false,
        showFilterHorizontally = false,
        hasFilters = false,
        showTypeList = false,
        additionalTablesLength = 0,
        hasApiData = false,
        buttonConfig
    } = params;

    // First check existing logic conditions
    let existingLogicResult = false;

    switch (buttonType) {
        case 'edit':
            existingLogicResult = selectedRowsLength > 0 && hasEditableColumn;
            break;
        
        case 'add':
            existingLogicResult = componentType === 'entry' || componentType === 'multientry';
            break;
        
        case 'excel_export':
            existingLogicResult = true; // Always shown in current logic
            break;
        
        case 'email_report':
            existingLogicResult = true; // Always shown in current logic
            break;
        
        case 'download_options':
            existingLogicResult = showTypeList;
            break;
        
        case 'csv_export':
            existingLogicResult = additionalTablesLength === 0;
            break;
        
        case 'pdf_export':
            existingLogicResult = additionalTablesLength === 0;
            break;
        
        case 'search':
            existingLogicResult = hasApiData;
            break;
        
        case 'refresh':
            existingLogicResult = true; // Always shown in current logic
            break;
        
        case 'filter':
            existingLogicResult = !showFilterHorizontally && hasFilters;
            break;
        
        default:
            existingLogicResult = false;
    }

    // If existing logic says don't show, then don't show regardless of buttonConfig
    if (!existingLogicResult) {
        return false;
    }

    // If no buttonConfig is provided, fall back to existing logic
    if (!buttonConfig) {
        return existingLogicResult;
    }

    // Check buttonConfig setting for this button type
    let buttonConfigResult = false;
    
    switch (buttonType) {
        case 'edit':
            buttonConfigResult = buttonConfig.show_edit_button ?? true;
            break;
        
        case 'add':
            buttonConfigResult = buttonConfig.show_add_button ?? true;
            break;
        
        case 'excel_export':
            buttonConfigResult = buttonConfig.show_excel_export_button ?? true;
            break;
        
        case 'email_report':
            buttonConfigResult = buttonConfig.show_email_report_button ?? true;
            break;
        
        case 'download_options':
            buttonConfigResult = buttonConfig.show_download_options_button ?? true;
            break;
        
        case 'csv_export':
            buttonConfigResult = buttonConfig.show_csv_export_button ?? true;
            break;
        
        case 'pdf_export':
            buttonConfigResult = buttonConfig.show_pdf_export_button ?? true;
            break;
        
        case 'search':
            buttonConfigResult = buttonConfig.show_search_button ?? true;
            break;
        
        case 'refresh':
            buttonConfigResult = buttonConfig.show_refresh_button ?? true;
            break;
        
        case 'filter':
            buttonConfigResult = buttonConfig.show_filter_button ?? true;
            break;
        
        default:
            buttonConfigResult = true;
    }

    // Both existing logic AND buttonConfig must be true for button to show
    return existingLogicResult && buttonConfigResult;
};








