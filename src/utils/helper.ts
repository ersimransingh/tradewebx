import { THEME_COLORS_STORAGE_KEY, THEME_STORAGE_KEY } from "@/context/ThemeContext";
import { APP_METADATA_KEY, SECURE_STORAGE_KEY, SECURITY_LIBRARY, ACTION_NAME, BASE_URL, PATH_URL } from "./constants";
import { toast } from "react-toastify";
import { log } from "node:console";
//@ts-ignore
import { Token, Secret } from 'fernet';
import CryptoJS from 'crypto-js';
import apiService from "./apiService";

export const clearLocalStorage = () => {
    // Preserve essential app data
    const appMetadata = localStorage.getItem(APP_METADATA_KEY);
    const appThemeColors = localStorage.getItem(THEME_COLORS_STORAGE_KEY);
    const appTheme = localStorage.getItem(THEME_STORAGE_KEY);

    // Clear all localStorage including secure storage
    localStorage.clear();

    // Restore essential app data
    if (appMetadata) storeLocalStorage(APP_METADATA_KEY, appMetadata);
    if (appThemeColors) storeLocalStorage(THEME_COLORS_STORAGE_KEY, appThemeColors);
    if (appTheme) storeLocalStorage(THEME_STORAGE_KEY, appTheme);
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
            if ((key === 'FromDate' || key === 'ToDate' || key === 'AsOnDate') && value) {
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

export const dynamicXmlGenratingFn = (ApiData, rowData) => {
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
        <J_Api>"UserId":"${getLocalStorage('userId')}"</J_Api>
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
export const parseHeadings = (xmlString: string): any => {
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


export const base64ToUint8Array = (base64: string): Uint8Array => {
    const binaryStr = atob(base64);
    const len = binaryStr.length;
    const bytes = new Uint8Array(len);

    for (let i = 0; i < len; i++) {
        bytes[i] = binaryStr.charCodeAt(i);
    }
    return bytes;
};


// Password decryption key for CryptoJS
const passKey = "TradeWebX1234567";

// CryptoJS Decryption function
function Decryption(encryptedData: string) {
    const key = CryptoJS.enc.Utf8.parse(passKey);
    const iv = CryptoJS.enc.Utf8.parse(passKey);
    const decrypted = CryptoJS.AES.decrypt(encryptedData, key, {
        keySize: 128 / 8,
        iv: iv,
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7
    });
    return decrypted.toString(CryptoJS.enc.Utf8);
}

export const decodeFernetToken = (data: string) => {
    try {
        // Check security library type and use appropriate decryption method
        if (SECURITY_LIBRARY === 'cryptojssdk') {
            // Use CryptoJS decryption
            const decodedString = Decryption(data);
            console.log('Decoded string (CryptoJS):', decodedString);

            // Parse the decoded string as JSON
            const parsedData = JSON.parse(decodedString);
            console.log('Parsed JSON (CryptoJS):', parsedData);

            return parsedData;
        } else if (SECURITY_LIBRARY === 'fernetsdk') {
            // Use Fernet decryption
            const secret = new Secret("wM0zxSButFBLsbqvtBFfu2iJR2aC6FSvB9e20q8aOJA=");

            // Decode a token (typical frontend use case)
            const token = new Token({
                secret: secret,
                token: data,
                ttl: 0
            });

            const decodedString = token.decode();
            console.log('Decoded string (Fernet):', decodedString);

            // Parse the decoded string as JSON
            const parsedData = JSON.parse(decodedString);
            console.log('Parsed JSON (Fernet):', parsedData);

            return parsedData;
        } else {
            throw new Error(`Unsupported security library: ${SECURITY_LIBRARY}`);
        }
    } catch (error) {
        console.error('Error decoding/parsing token:', error);
        throw new Error('Failed to decode or parse token');
    }
};

export const normalizeEncryptedParam = (param: string | null): string | null => {
    if(param){
        const trimmedString = param?.trim();
        const finalParam = param.replace(/ /g, '+');
        return finalParam;
    } else{
        return null;
    }
};

// Encryption key - in production, this should be derived from user session or other secure method
const getEncryptionKey = (): string => {
    // Check if we're running in a browser environment
    if (typeof window === 'undefined' || typeof navigator === 'undefined' || typeof screen === 'undefined') {
        // Fallback key for server-side rendering
        return CryptoJS.SHA256('tradewebx_secure_key_ssr_fallback').toString();
    }

    // You can modify this to use a more secure key generation method
    // For now, using a combination of browser fingerprint and a constant
    const browserFingerprint = navigator.userAgent + navigator.language + screen.width + screen.height;
    return CryptoJS.SHA256(browserFingerprint + 'tradewebx_secure_key').toString();
};

// Encrypt data using AES encryption
export const encryptData = (data: string): string => {
    try {
        // Handle empty or undefined data gracefully
        if (!data || data.trim() === '') {
            console.warn('Empty data provided for encryption, returning empty string');
            return '';
        }

        const key = getEncryptionKey();
        if (!key) {
            throw new Error('Failed to generate encryption key');
        }

        const encrypted = CryptoJS.AES.encrypt(data, key).toString();
        return encrypted;
    } catch (error) {
        console.error('Encryption error:', error);
        throw new Error('Failed to encrypt data');
    }
};

// Decrypt data using AES decryption
export const decryptData = (encryptedData: string): string | null => {
    try {
        if (!encryptedData) {
            return null; // Return null instead of throwing error for empty data
        }

        const key = getEncryptionKey();
        if (!key) {
            throw new Error('Failed to generate encryption key');
        }

        const sanatizedData = normalizeEncryptedParam(encryptedData)
        const decrypted = CryptoJS.AES.decrypt(sanatizedData, key).toString(CryptoJS.enc.Utf8);

        if (!decrypted) {
            throw new Error('Failed to decrypt data - invalid key or corrupted data');
        }

        return decrypted;
    } catch (error) {
        console.error('Decryption error:', error);
        return null; // Return null instead of throwing error for graceful handling
    }
};

// Get all encrypted data from localStorage
const getEncryptedStorageData = (): Record<string, string> => {
    try {
        if (typeof window === "undefined") {
            // Running on server, return empty
            return {};
        }
        const encryptedData = localStorage.getItem(SECURE_STORAGE_KEY);
        if (!encryptedData) {
            return {};
        }
        const decryptedData = decryptData(encryptedData);
        if (!decryptedData) {
            return {};
        }
        return JSON.parse(decryptedData);
    } catch (error) {
        console.error("Error getting encrypted storage data:", error);
        return {};
    }
};

// Save all encrypted data to localStorage
const saveEncryptedStorageData = (data: Record<string, string>): void => {
    try {
        if (typeof window === "undefined") {
            // Running on server, do nothing
            return;
        }
        const jsonData = JSON.stringify(data);
        const encryptedData = encryptData(jsonData);
        localStorage.setItem(SECURE_STORAGE_KEY, encryptedData);
    } catch (error) {
        console.error("Error saving encrypted storage data:", error);
        throw new Error("Failed to save encrypted data");
    }
};

// Secure localStorage methods
export const storeLocalStorage = (key: string, value: string): void => {
    try {
        const currentData = getEncryptedStorageData();
        currentData[key] = value;
        saveEncryptedStorageData(currentData);

        // Debug logging for token storage
        if (key === 'auth_token') {
            console.log(`💾 [helper] Stored ${key}:`, value.substring(0, 30) + '...');

            // Immediately verify it was stored correctly
            const verification = getLocalStorage(key);
            console.log(`🔍 [helper] Verification of stored ${key}:`, verification ? verification.substring(0, 30) + '...' : 'null');
        }
    } catch (error) {
        console.error('Error storing data securely:', error);
        throw new Error('Failed to store data securely');
    }
};

export const getLocalStorage = (key: string): string | null => {
    try {
        const currentData = getEncryptedStorageData();
        const value = currentData[key] || null;

        // Debug logging for token retrieval
        if (key === 'auth_token' && value) {
            console.log(`🔍 [helper] Retrieved ${key}:`, value.substring(0, 30) + '...');
        }

        return value;
    } catch (error) {
        console.error('Error retrieving data securely:', error);
        return null;
    }
};

export const removeLocalStorage = (key: string): void => {
    try {
        const currentData = getEncryptedStorageData();
        delete currentData[key];
        saveEncryptedStorageData(currentData);
    } catch (error) {
        console.error('Error removing data securely:', error);
        throw new Error('Failed to remove data securely');
    }
};

// Clear all secure storage data
export const clearSecureStorage = (): void => {
    try {
        localStorage.removeItem(SECURE_STORAGE_KEY);
    } catch (error) {
        console.error('Error clearing secure storage:', error);
        throw new Error('Failed to clear secure storage');
    }
};


export function sanitizeValueSpecialChar(value, charactersToReplace = ['&', '!']) {
    if (typeof value !== 'string') return value;

    const escapeRegex = new RegExp(`[${charactersToReplace.join('')}]`, 'g');
    return value.replace(escapeRegex, ' ').trim();
}



export const sendEmailMultiCheckbox = async (base64Data: string, pdfName: string, filterXml: any, fileTitle: string, userId: string, userType: string) => {
    const emailXml = `
        <dsXml>
            <J_Ui>"ActionName":"${ACTION_NAME}", "Option":"EmailSend","RequestFrom":"W"</J_Ui>
            <Sql></Sql>
            <X_Filter>
                ${filterXml}
                <ReportName>${fileTitle}</ReportName>
                <FileName>${pdfName}</FileName>
                <Base64>${base64Data}</Base64>
            </X_Filter>
            <J_Api>"UserId":"${userId}","UserType":"${userType}","AccYear":24,"MyDbPrefix":"SVVS","MemberCode":"undefined","SecretKey":"undefined"</J_Api>
        </dsXml>`;

    const emailResponse = await apiService.postWithAuth(BASE_URL + PATH_URL, emailXml);

    const result = emailResponse?.data;
    const columnMsg = result?.data?.rs0?.[0]?.Column1 || '';

    if (result?.success) {
        if (columnMsg.toLowerCase().includes('mail template not define')) {
            toast.error('Mail Template Not Defined');
        } else {
            toast.success(columnMsg);
        }
    } else {
        toast.error(columnMsg || result?.message);
    }
};

export const escapeXmlChars = (value: string): string => {
    if (!value) return "";
    return value
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/'/g, "&apos;")
        .replace(/"/g, "&quot;");
};

export const sanitizePayload = (data: any): any => {
    if (typeof data === 'string') {
        return escapeXmlChars(data);
    } else if (Array.isArray(data)) {
        return data.map(item => sanitizePayload(item));
    } else if (typeof data === 'object' && data !== null) {
        const sanitizedObject: any = {};
        for (const key in data) {
            if (Object.prototype.hasOwnProperty.call(data, key)) {
                sanitizedObject[key] = sanitizePayload(data[key]);
            }
        }
        return sanitizedObject;
    }
    return data;
};

export function formatTextSplitString(text: string) {
  return text
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, str => str.toUpperCase())
    .trim();
}

//accessibility color-contrast functions into a common utility file and use them anywhere

export function getLuminance(hex: string) {
  hex = hex.replace("#", "");
  if (hex.length === 3) {
    hex = hex.split("").map((c) => c + c).join("");
  }

  const r = parseInt(hex.substring(0, 2), 16) / 255;
  const g = parseInt(hex.substring(2, 4), 16) / 255;
  const b = parseInt(hex.substring(4, 6), 16) / 255;

  const a = [r, g, b].map((v) =>
    v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)
  );

  return 0.2126 * a[0] + 0.7152 * a[1] + 0.0722 * a[2];
}

// Contrast ratio
export function getContrastRatio(fg: string, bg: string) {
  const L1 = getLuminance(fg);
  const L2 = getLuminance(bg);

  const brightest = Math.max(L1, L2);
  const darkest = Math.min(L1, L2);

  return (brightest + 0.05) / (darkest + 0.05);
}

// Darken color until it meets WCAG
export function darken(hex: string, amount = 12) {
  hex = hex.replace("#", "");
  let r = parseInt(hex.substring(0, 2), 16) - amount;
  let g = parseInt(hex.substring(2, 4), 16) - amount;
  let b = parseInt(hex.substring(4, 6), 16) - amount;

  r = Math.max(0, r);
  g = Math.max(0, g);
  b = Math.max(0, b);

  return (
    "#" +
    r.toString(16).padStart(2, "0") +
    g.toString(16).padStart(2, "0") +
    b.toString(16).padStart(2, "0")
  );
}

// Main WCAG fixer
export function ensureContrastColor(
  color: string,
  bgColor = "#ffffff" // default white background
) {
  if (!color) return color;

  // Convert any CSS color → hex
  const temp = document.createElement("div");
  temp.style.color = color;
  document.body.appendChild(temp);
  const computed = getComputedStyle(temp).color;
  document.body.removeChild(temp);

  const rgbMatch = computed.match(/\d+/g);
  if (!rgbMatch) return color;

  const [r, g, b] = rgbMatch.map(Number);

  let hex =
    "#" +
    r.toString(16).padStart(2, "0") +
    g.toString(16).padStart(2, "0") +
    b.toString(16).padStart(2, "0");

  // Continue darkening until it passes WCAG
  while (getContrastRatio(hex, bgColor) < 4.5) {
    hex = darken(hex, 12);
  }

  return hex;
}

//reusable function for choosing black/white text based on background brightness used in DataTable for IncomeTaxReport
export const getReadableTextColor = (bgColor: string) => {
  if (!bgColor) return "#ffffff";

  let hex = bgColor.replace("#", "");

  // convert shorthand color (#fff) → full form (#ffffff)
  if (hex.length === 3) {
    hex = hex.split("").map(c => c + c).join("");
  }

  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);

  // luminance formula
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;

  // If color is light → return black text
  return brightness > 160 ? "#000000" : "#ffffff";
};
