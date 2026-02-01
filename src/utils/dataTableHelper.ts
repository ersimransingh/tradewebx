import apiService from "./apiService";
import moment from "moment";
import { base64ToUint8Array, buildFilterXml } from "./helper";
import JSZip from "jszip";
import { BASE_URL, PATH_URL } from "./constants";
import { toast } from "react-toastify";
import { saveAs } from 'file-saver';




const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

export const handleSendEmailByFormat = async (
  setIsLoading, filtersCheck, userId, pageData, selectedRows, userType, sendEmailMultiCheckbox, setSelectedRows, formatType
) => {
  if (!Array.isArray(selectedRows) || selectedRows?.length === 0) {
    toast.warn("Please select at least one report to proceed");
    return;
  }

  setIsLoading(true);
  const filterXml = buildFilterXml(filtersCheck, userId);
  const timestamp = moment().format("YYYYMMDD_HHmmss");
  const mainFolderName = `IncomeTaxReports_${formatType}_${timestamp}`;
  
  const zip = new JSZip();
  // 🚫 NO SUBFOLDER - files go directly into main folder
  const mainFolder = zip.folder(mainFolderName);

  const clientCodeMatch = filterXml.match(/<ClientCode>(.*?)<\/ClientCode>/);
  const clientCode = clientCodeMatch ? clientCodeMatch[1].trim() : "";
  const emailSendingCaptionTxt = pageData?.[0]?.level || '';

  const failedRows = [];
  let fileCount = 0;

  try {
    for (const [index, row] of selectedRows.entries()) {
      const reportDisplay1 = formatType === 'Pdf' ? 'D' : 'X';
      const XML = `
        <dsXml>
          <J_Ui>"ActionName":"TradeWeb","Option":"SENDEMAIL","Level":1,"RequestFrom":"W","ReportDisplay1":"${reportDisplay1}"</J_Ui>
          <Sql/>
          <X_Filter>
              ${filterXml}
              <ReportName>${row.ReportName || ""}</ReportName>
              <Segment>${row.Segment || ""}</Segment>
          </X_Filter>
          <X_GFilter/>
          <J_Api>"UserId":"${userId}", "UserType":"${userType}"</J_Api>
        </dsXml>
      `;

      try {
        const response = await apiService.postWithAuth(BASE_URL + PATH_URL, XML);
        const emailPayloadXML = response?.data?.data?.rs0?.[0]?.EmailPayload;

        if (emailPayloadXML) {
          const emailResponse = await apiService.postWithAuth(BASE_URL + PATH_URL, emailPayloadXML);
          const data = emailResponse?.data?.data?.rs0?.[0];
          const base64Key = formatType === 'Pdf' ? 'Base64PDF' : 'Base64Excel';

          if (emailResponse.success === true && data?.[base64Key]) {
            const base64 = data[base64Key];
            const fileExt = formatType === 'Pdf' ? '.pdf' : '.xlsx';
            
            let fileName = [clientCode, row.ReportType, row.ReportName, row.Segment]
              .map(v => typeof v === "string" ? v.replace(/\s+/g, "").replace(/[^\w.-]/g, "").trim() : "")
              .filter(Boolean)
              .join("_") + fileExt;

            const extensionIndex = fileName.lastIndexOf('.');
            if (extensionIndex !== -1) {
              fileName = fileName.slice(0, extensionIndex) + `_${index}` + fileName.slice(extensionIndex);
            }

            const fileContent = base64ToUint8Array(base64);
            // ✅ Files directly in main folder (NO subfolder)
            mainFolder.file(fileName, fileContent);
            fileCount++;
          } else {
            failedRows.push(row._id);
          }
        } else {
          failedRows.push(row._id);
        }
      } catch (err) {
        failedRows.push(row._id);
      }
    }

    if (fileCount === 0) {
      mainFolder.file("README.txt", `No ${formatType} files generated.`);
    }

    if (fileCount > 0) {
      const zipBlob = await zip.generateAsync({ type: "blob" });
      const zipBase64 = await blobToBase64(zipBlob);
      const zipFileName = `${mainFolderName}.zip`;

      sendEmailMultiCheckbox(zipBase64, zipFileName, filterXml, emailSendingCaptionTxt, userId, userType);
      toast.success(`Email sent: ${fileCount} ${formatType}(s)`);
    } else {
      toast.error(`No ${formatType} files to send.`);
    }

    if (failedRows.length > 0) {
      setSelectedRows(prev => prev.filter(r => !failedRows.includes(r._id)));
    }

  } catch (error) {
    toast.error("Email failed.");
  } finally {
    setIsLoading(false);
  }
};



export const handleDownloadZipByFormat = async (selectedRows, setIsLoading, filtersCheck, userId, userType, setSelectedRows, formatType) => {
  if (!Array.isArray(selectedRows) || selectedRows?.length === 0) {
    toast.warn("Please select at least one report");
    return;
  }

  setIsLoading(true);
  const filterXml = buildFilterXml(filtersCheck, userId);
  const timestamp = moment().format("YYYYMMDD_HHmmss");
  const mainFolderName = `IncomeTaxReports_${formatType}_${timestamp}`;
  
  const zip = new JSZip();
  // 🚫 NO SUBFOLDER - files go directly into main folder
  const mainFolder = zip.folder(mainFolderName);

  const clientCodeMatch = filterXml.match(/<ClientCode>(.*?)<\/ClientCode>/);
  const clientCode = clientCodeMatch ? clientCodeMatch[1].trim() : "";

  const failedRows = [];
  let fileCount = 0;

  try {
    for (const [index, row] of selectedRows.entries()) {
      const reportDisplay1 = formatType === 'Pdf' ? 'D' : 'X';
      const XML = `
        <dsXml>
          <J_Ui>"ActionName":"TradeWeb","Option":"SENDEMAIL","Level":1,"RequestFrom":"W","ReportDisplay1":"${reportDisplay1}"</J_Ui>
          <Sql/>
          <X_Filter>
              ${filterXml}
              <ReportName>${row.ReportName || ""}</ReportName>
              <Segment>${row.Segment || ""}</Segment>
          </X_Filter>
          <X_GFilter/>
          <J_Api>"UserId":"${userId}", "UserType":"${userType}"</J_Api>
        </dsXml>
      `;

      try {
        const response = await apiService.postWithAuth(BASE_URL + PATH_URL, XML);
        const emailPayloadXML = response?.data?.data?.rs0?.[0]?.EmailPayload;

        if (emailPayloadXML) {
          const emailResponse = await apiService.postWithAuth(BASE_URL + PATH_URL, emailPayloadXML);
          const data = emailResponse?.data?.data?.rs0?.[0];
          const base64Key = formatType === 'Pdf' ? 'Base64PDF' : 'Base64Excel';

          if (emailResponse.success === true && data?.[base64Key]) {
            const base64 = data[base64Key];
            const fileExt = formatType === 'Pdf' ? '.pdf' : '.xlsx';
            
            let fileName = [clientCode, row.ReportType, row.ReportName, row.Segment]
              .map(v => typeof v === "string" ? v.replace(/\s+/g, "").replace(/[^\w.-]/g, "").trim() : "")
              .filter(Boolean)
              .join("_") + fileExt;

            const extensionIndex = fileName.lastIndexOf('.');
            if (extensionIndex !== -1) {
              fileName = fileName.slice(0, extensionIndex) + `_${index}` + fileName.slice(extensionIndex);
            }

            const fileContent = base64ToUint8Array(base64);
            // ✅ Files directly in main folder (NO subfolder)
            mainFolder.file(fileName, fileContent);
            fileCount++;
          } else {
            failedRows.push(row._id);
          }
        }
      } catch (err) {
        failedRows.push(row._id);
      }
    }

    if (fileCount === 0) {
      mainFolder.file("README.txt", `No ${formatType} files generated.`);
    }

    if (fileCount > 0) {
      const zipBlob = await zip.generateAsync({ type: "blob" });
      saveAs(zipBlob, `${mainFolderName}.zip`);
      toast.success(`Downloaded ${fileCount} ${formatType}(s)`);
    } else {
      toast.error(`No ${formatType} files generated.`);
    }

    if (failedRows.length > 0) {
      setSelectedRows(prev => prev.filter(r => !failedRows.includes(r._id)));
    }

  } catch (error) {
    toast.error("Download failed.");
  } finally {
    setIsLoading(false);
  }
};