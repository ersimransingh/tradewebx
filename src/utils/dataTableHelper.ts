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

export const handleLoopThroughMultiSelectKeyHandler = async (setIsLoading,filtersCheck,userId,pageData,selectedRows,userType,sendEmailMultiCheckbox,setSelectedRows) => {
    setIsLoading(true);
  
    const filterXml = buildFilterXml(filtersCheck, userId);
    const zip = new JSZip();
    const zipFolderName = `ClientReports_${moment().format("YYYYMMDD_HHmmss")}`;
    const pdfFolder = zip.folder(zipFolderName);
  
    const collectedPdfs: { pdfName: string; base64: string }[] = [];
    const failedRows: string[] = [];
    const clientCodeMatch = filterXml.match(/<ClientCode>(.*?)<\/ClientCode>/);
    const clientCode = clientCodeMatch ? clientCodeMatch[1].trim() : "";
    const emailSendingCaptionTxt = pageData?.[0]?.level || '';

  
    try {
      for (const [index, row] of selectedRows.entries()) {
        const multiSelectXML = `
          <dsXml>
            <J_Ui>"ActionName":"TradeWeb","Option":"SENDEMAIL","Level":1,"RequestFrom":"W","ReportDisplay1":"D"</J_Ui>
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
          const response = await apiService.postWithAuth(BASE_URL + PATH_URL, multiSelectXML);
          const emailPayloadXML = response?.data?.data?.rs0?.[0]?.EmailPayload;
  
          if (!emailPayloadXML) {
            failedRows.push(row._id);
            continue;
          }
  
          const emailPayloadXmlSend = await apiService.postWithAuth(BASE_URL + PATH_URL, emailPayloadXML);
          const secondEmailResponse = emailPayloadXmlSend?.data?.data?.rs0?.[0];
  
          if (emailPayloadXmlSend.success === true && secondEmailResponse?.Base64PDF) {
            const base64 = secondEmailResponse.Base64PDF;
            let pdfName = [clientCode, row.ReportType, row.ReportName, row.Segment].map(v => typeof v === "string" ? v.replace(/\s+/g, "").replace(/[^\w.-]/g, "").trim(): "")
            .filter(Boolean)
            .join("_") || `Report_${index}.pdf`;

            if (!pdfName.toLowerCase().endsWith(".pdf")) pdfName += ".pdf";

            const extensionIndex = pdfName.lastIndexOf('.');
                       if (extensionIndex !== -1) {
                         pdfName = pdfName.slice(0, extensionIndex) + `_${index}` + pdfName.slice(extensionIndex);
                       } else {
                         pdfName = pdfName + `_${index}.pdf`;
                       }
  
            // Add file to JSZip folder
            const fileContent = base64ToUint8Array(base64);
            pdfFolder.file(pdfName, fileContent);
  
            // Also push to array (for reference/log)
            collectedPdfs.push({ pdfName, base64 });
          } else {
            failedRows.push(row._id);
          }
        } catch (innerErr) {
          console.error(`❌ Error processing row ${index + 1}:`, innerErr);
          failedRows.push(row._id);
        }
      }
  
      // After loop: zip all PDFs together
      if (collectedPdfs?.length > 0) {
        const zipBlob = await zip.generateAsync({ type: "blob" });
        const zipBase64 = await blobToBase64(zipBlob);
  
        // Create a proper ZIP file name
        const zipFileName = `${zipFolderName}.zip`;
   
  
        // 🧩 Now send this ZIP (Base64) via existing function
        sendEmailMultiCheckbox(zipBase64, zipFileName, filterXml, emailSendingCaptionTxt, userId, userType);
  
        toast.success(`ZIP with ${collectedPdfs?.length} PDF(s) sent successfully.`);
      } else {
        toast.error("No PDFs were generated to send.");
      }
  
      // Handle failures (deselect failed ones)
      if (failedRows?.length > 0) {
        setSelectedRows(prev => prev.filter(r => !failedRows.includes(r._id)));
        toast.warn(`${failedRows?.length} row(s) failed and were deselected.`);
      }
  
    } catch (error) {
      console.error("❌ Error during ZIP process:", error);
      toast.error("Failed to create ZIP or send email.");
    } finally {
      setIsLoading(false);
    }
};

export const handleLoopThroughMultiSelectKeyHandlerExcel = async (setIsLoading,filtersCheck,userId,pageData,selectedRows,userType,sendEmailMultiCheckbox,setSelectedRows) => {
    setIsLoading(true);

    const filterXml = buildFilterXml(filtersCheck, userId);
    const zip = new JSZip();
    const zipFolderName = `ClientReports_Excel_${moment().format("YYYYMMDD_HHmmss")}`;
    const excelFolder = zip.folder(zipFolderName);

    const collectedExcels: { excelName: string; base64: string }[] = [];
    const failedRows: string[] = [];
    // const clientCodeMatch = filterXml.match(/<ClientCode>(.*?)<\/ClientCode>/);
    // const clientCode = clientCodeMatch ? clientCodeMatch[1].trim() : "";
    const emailSendingCaptionTxt = pageData?.[0]?.level || '';

    try {
        for (const [index, row] of selectedRows.entries()) {
            const multiSelectXML = `
                <dsXml>
                    <J_Ui>"ActionName":"TradeWeb","Option":"SENDEMAIL","Level":1,"RequestFrom":"W","ReportDisplay1":"X"</J_Ui>
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
                const response = await apiService.postWithAuth(BASE_URL + PATH_URL, multiSelectXML);
                const emailPayloadXML = response?.data?.data?.rs0?.[0]?.EmailPayload;

                if (!emailPayloadXML) {
                    failedRows.push(row._id);
                    continue;
                }

                const emailPayloadXmlSend = await apiService.postWithAuth(BASE_URL + PATH_URL, emailPayloadXML);
                const secondEmailResponse = emailPayloadXmlSend?.data?.data?.rs0?.[0];

                if (emailPayloadXmlSend.success === true && secondEmailResponse?.Base64Excel) {
                    const base64 = secondEmailResponse.Base64Excel;
                    let excelName = [clientCode, row.ReportType, row.ReportName, row.Segment].map(v => typeof v === "string" ? v.replace(/\s+/g, "").replace(/[^\w.-]/g, "").trim(): "")
                    .filter(Boolean)
                    .join("_")  || `Report_${index}.xlsx`;

                    if (!excelName.toLowerCase().endsWith(".xlsx")) excelName += ".xlsx";

                    const extensionIndex = excelName.lastIndexOf('.');
                    if (extensionIndex !== -1) {
                        excelName = excelName.slice(0, extensionIndex) + `_${index}` + excelName.slice(extensionIndex);
                    } else {
                        excelName = excelName + `_${index}.xlsx`;
                    }

                    const fileContent = base64ToUint8Array(base64);
                    excelFolder.file(excelName, fileContent);
                    collectedExcels.push({ excelName, base64 });
                } else {
                    failedRows.push(row._id);
                }
            } catch (innerErr) {
                console.error(`❌ Error processing row ${index + 1}:`, innerErr);
                failedRows.push(row._id);
            }
        }

        // Array.isArray
        if (collectedExcels?.length > 0) {
            const zipBlob = await zip.generateAsync({ type: "blob" });
            const zipBase64 = await blobToBase64(zipBlob);
            const zipFileName = `${zipFolderName}.zip`;

            sendEmailMultiCheckbox(zipBase64, zipFileName, filterXml, emailSendingCaptionTxt, userId, userType);

            toast.success(`ZIP with ${collectedExcels?.length} Excel file(s) sent successfully.`);
        } else {
            toast.error("No Excel files were generated to send.");
        }

        // if (failedRows.length > 0) {
        if (Array.isArray(failedRows)) {
            setSelectedRows(prev => prev.filter(r => !failedRows.includes(r._id)));
            toast.warn(`${failedRows?.length} row(s) failed and were deselected.`);
        }
    } catch (error) {
        console.error("❌ Error during ZIP process:", error);
        toast.error("Failed to create ZIP or send email.");
    } finally {
        setIsLoading(false);
    }
};

export const handleLoopThroughMultiSelectKeyHandlerDownloadZip = async (selectedRows,setIsLoading,filtersCheck,userId,userType,setSelectedRows) => {

  if (!Array.isArray(selectedRows) || selectedRows?.length === 0) {
      toast.warn("Please select at least one report to proceed");
      return;  // Exit early if nothing is selected
    }

  setIsLoading(true);
  const filterXml = buildFilterXml(filtersCheck, userId);
  const zipFolderName = `ClientReports_${moment().format("YYYYMMDD_HHmmss")}_Pdf`;
  const zip = new JSZip();
  const pdfFolder = zip.folder(zipFolderName);



  // Extract client code from filterXml (e.g., <ClientCode>M000024</ClientCode>)
const clientCodeMatch = filterXml.match(/<ClientCode>(.*?)<\/ClientCode>/);
const clientCode = clientCodeMatch ? clientCodeMatch[1].trim() : "";

  
//   return
  // Snapshot the currently selected rows so updates to state don't affect iteration
  const rowsToProcess = Array.isArray(selectedRows) ? [...selectedRows] : [];
  const failedRows: { id: string; index: number; reason: string }[] = [];
  let pdfCount = 0;

  try {
    for (const [i, row] of rowsToProcess.entries()) {
      const index = i + 1;
      const multiSelectXML = `
        <dsXml>
          <J_Ui>"ActionName":"TradeWeb","Option":"SENDEMAIL","Level":1,"RequestFrom":"W","ReportDisplay1":"D"</J_Ui>
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
        const response = await apiService.postWithAuth(BASE_URL + PATH_URL, multiSelectXML);
        const emailPayloadXML = response?.data?.data?.rs0?.[0]?.EmailPayload;

        if (!emailPayloadXML) {
          console.warn(`⚠️ Row ${index}: No EmailPayload found`);
          failedRows.push({ id: row._id, index, reason: "No EmailPayload" });
          continue;
        }

        const emailPayloadXmlSend = await apiService.postWithAuth(BASE_URL + PATH_URL, emailPayloadXML);
        const emailResponseData = emailPayloadXmlSend?.data?.data?.rs0?.[0];

        if (emailPayloadXmlSend.success === true && emailResponseData?.Base64PDF) {
          const base64 = emailResponseData.Base64PDF;
          // let pdfName = emailResponseData.PDFName || `Report_${index}.pdf`;
          let pdfName = [clientCode, row.ReportName, row.Segment].map(v => typeof v === "string" ? v.replace(/\s+/g, "").replace(/[^\w.-]/g, "").trim(): "")
            .filter(Boolean)
            .join("_") || `Report_${index}.pdf`;

          // Ensure file ends with .pdf
          if (!pdfName.toLowerCase().endsWith(".pdf")) pdfName += ".pdf";


          
          // return
          
          // Append index to filename before extension to avoid overwrites
          const extensionIndex = pdfName.lastIndexOf('.');
          if (extensionIndex !== -1) {
            pdfName = pdfName.slice(0, extensionIndex) + `_${index}` + pdfName.slice(extensionIndex);
          } else {
            pdfName = pdfName + `_${index}.pdf`;
          }
          
          const fileContent = base64ToUint8Array(base64);
          pdfFolder.file(pdfName, fileContent);
          pdfCount++;
        } else {
          console.warn(`⚠️ Row ${index}: Missing Base64PDF`);
          failedRows.push({ id: row._id, index, reason: "Missing Base64PDF" });
        }
      } catch (err) {
        console.error(`❌ Error for row ${index}:`, err);
        failedRows.push({ id: row._id, index, reason: (err && err.message) || "API error" });
      }
    }

    // If no PDFs were added at all, create a README and still produce the ZIP
    if (pdfCount === 0) {
      pdfFolder.file("README.txt", "No PDF files were generated for the selected records.");
    }

    // If there were failures, add a README listing them and then deselect them from selectedRows
    if (failedRows?.length > 0) {
      const failText =
        `The following selected rows failed during export:\n\n` +
        failedRows.map(f => `Row ${f.index} (id: ${f.id}) — ${f.reason}`).join("\n");

      // append the failures README (will exist in zipRoot/zipFolderName)
      pdfFolder.file("FAILED_ROWS.txt", failText);

      // Batch-deselect failed rows from the global selectedRows state
      const failedIds = new Set(failedRows.map(f => f.id));
      setSelectedRows(prev => (Array.isArray(prev) ? prev.filter(r => !failedIds.has(r._id)) : []));
    }

    // Generate ZIP and trigger download
    if (pdfCount > 0) {
      const zipBlob = await zip.generateAsync({ type: "blob" });
      saveAs(zipBlob, `${zipFolderName}.zip`);
    } else {
      console.warn("No PDFs were generated, so ZIP download is skipped.");
    }


    // Display aggregate toast
    if (pdfCount > 0 && failedRows?.length === 0) {
      toast.success(`ZIP created with ${pdfCount} PDF(s).`);
    } else if (pdfCount > 0 && failedRows?.length > 0) {
      toast.warn(`ZIP created with ${pdfCount} PDF(s). ${failedRows?.length} failed (see FAILED_ROWS.txt).`);
    } else if (pdfCount === 0 && failedRows?.length > 0) {
      toast.error(`No PDFs created. ${failedRows?.length} failures (see FAILED_ROWS.txt).`);
    } 
  } catch (error) {
    console.error("❌ Error during ZIP creation:", error);
    toast.error("Failed to create ZIP. Please try again.");
  }
  finally {
      setIsLoading(false); // Hide loader
  }
};

export const handleLoopThroughMultiSelectKeyHandlerDownloadZipExcel = async (selectedRows,setIsLoading,filtersCheck,userId,userType,setSelectedRows) => {
  if (!Array.isArray(selectedRows) || selectedRows?.length === 0) {
      toast.warn("Please select at least one report to proceed");
      return;  // Exit early if nothing selected
  }

  setIsLoading(true);
  const filterXml = buildFilterXml(filtersCheck, userId);
  const zipFolderName = `ClientReports_Excel_${moment().format("YYYYMMDD_HHmmss")}_Excel`;
  const zip = new JSZip();
  const excelFolder = zip.folder(zipFolderName);

  // Extract client code from filterXml
  // const clientCodeMatch = filterXml.match(/<ClientCode>(.*?)<\/ClientCode>/);
  // const clientCode = clientCodeMatch ? clientCodeMatch[1].trim() : "";

  const rowsToProcess = Array.isArray(selectedRows) ? [...selectedRows] : [];
  const failedRows: { id: string; index: number; reason: string }[] = [];
  let excelCount = 0;

  try {
      for (const [i, row] of rowsToProcess.entries()) {
          const index = i + 1;
          const multiSelectXML = `
              <dsXml>
                  <J_Ui>"ActionName":"TradeWeb","Option":"SENDEMAIL","Level":1,"RequestFrom":"W","ReportDisplay1":"X"</J_Ui>
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
              const response = await apiService.postWithAuth(BASE_URL + PATH_URL, multiSelectXML);
              const emailPayloadXML = response?.data?.data?.rs0?.[0]?.EmailPayload;

              if (!emailPayloadXML) {
                  console.warn(`⚠️ Row ${index}: No EmailPayload found`);
                  failedRows.push({ id: row._id, index, reason: "No EmailPayload" });
                  continue;
              }

              const emailPayloadXmlSend = await apiService.postWithAuth(BASE_URL + PATH_URL, emailPayloadXML);
              const emailResponseData = emailPayloadXmlSend?.data?.data?.rs0?.[0];


              

              // Check for Base64XLSX instead of Base64PDF
              if (emailPayloadXmlSend.success === true && emailResponseData?.Base64Excel) {
                  const base64 = emailResponseData.Base64Excel;
                  let excelName = [clientCode, row.ReportName, row.Segment].map(v => typeof v === "string" ? v.replace(/\s+/g, "").replace(/[^\w.-]/g, "").trim(): "")
                  .filter(Boolean)
                  .join("_") || `Report_${index}.xlsx`;
                
                  // Ensure file ends with .xlsx
                  if (!excelName.toLowerCase().endsWith(".xlsx")) excelName += ".xlsx";

                  // Append index to filename before extension to avoid overwrites
                  const extensionIndex = excelName.lastIndexOf('.');
                  if (extensionIndex !== -1) {
                      excelName = excelName.slice(0, extensionIndex) + `_${index}` + excelName.slice(extensionIndex);
                  } else {
                      excelName = excelName + `_${index}.xlsx`;
                  }

                  // Convert Base64 string to Uint8Array for file content
                  const fileContent = base64ToUint8Array(base64);
                  excelFolder.file(excelName, fileContent);
                  excelCount++;
              } else {
                  console.warn(`⚠️ Row ${index}: Missing Base64XLSX`);
                  failedRows.push({ id: row._id, index, reason: "Missing Base64XLSX" });
              }
          } catch (err) {
              console.error(`❌ Error for row ${index}:`, err);
              failedRows.push({ id: row._id, index, reason: (err && err.message) || "API error" });
          }
      }

      // If no Excels were added, create a README
      if (excelCount === 0) {
          excelFolder.file("README.txt", "No Excel files were generated for the selected records.");
      }

      // If failures happened, add README and deselect failed rows
      if (failedRows?.length > 0) {
          const failText =
              `The following selected rows failed during export:\n\n` +
              failedRows.map(f => `Row ${f.index} (id: ${f.id}) — ${f.reason}`).join("\n");

          excelFolder.file("FAILED_ROWS.txt", failText);

          const failedIds = new Set(failedRows.map(f => f.id));
          setSelectedRows(prev => (Array.isArray(prev) ? prev.filter(r => !failedIds.has(r._id)) : []));
      }

      // Generate ZIP and trigger download if any Excels were added
      if (excelCount > 0) {
          const zipBlob = await zip.generateAsync({ type: "blob" });
          saveAs(zipBlob, `${zipFolderName}.zip`);
      } else {
          console.warn("No Excel files were generated, so ZIP download is skipped.");
      }



      if (excelCount > 0 && failedRows?.length === 0) {
          toast.success(`ZIP created with ${excelCount} Excel file(s).`);
      } else if (excelCount > 0 && failedRows?.length > 0) {
          toast.warn(`ZIP created with ${excelCount} Excel file(s). ${failedRows?.length} failed (see FAILED_ROWS.txt).`);
      } else if (excelCount === 0 && failedRows?.length > 0) {
          toast.error(`No Excel files created. ${failedRows?.length} failures (see FAILED_ROWS.txt).`);
      }
  } catch (error) {
      console.error("❌ Error during ZIP creation:", error);
      toast.error("Failed to create ZIP. Please try again.");
  } finally {
      setIsLoading(false);
  }
};