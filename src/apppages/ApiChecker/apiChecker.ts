import apiService from "@/utils/apiService";
import { BASE_URL, PATH_URL } from "@/utils/constants";
import { toast } from "react-toastify";

  const xml = `
  <dsXml>
  <J_Ui>"ActionName":"TradeWeb","Option":"GETAPISETTING","RequestFrom":"W"</J_Ui>
  <Sql/>
  <X_Filter/>
  <X_Filter_Multiple/>
  <X_Data>
  </X_Data>
  <J_Api>"UserId":"ADMIN"</J_Api>
</dsXml>`

export const getApiConfigData = async(setApiConfigData) => {
    try {

        const response = await apiService.postWithAuth(BASE_URL + PATH_URL, xml);
        if(response.success === true){
            const data = response?.data?.data?.rs0
            setApiConfigData(data)
        }
        
        
    } catch (error) {
        toast.error(error)
    }
}



const cleanJSONStringLiteral = (str: string) => {
    try {
      // Step 1: Parse the outer escaped string
      const parsed = JSON.parse(str);
  
      // Step 2: Re-stringify to remove internal escapes and make it valid JSON
      if (typeof parsed === 'object') {
        return JSON.stringify(parsed);
      }
  
      return str;
    } catch {
      // If it's not valid JSON, return original string
      return str;
    }
  };
  
  export const viewLogApiCall = async (
    setModalOpen,
    viewLogServiceName: string,
    setViewLogServiceNameApiData: any
  ) => {
    const viewLogXML = `
      <dsXml>
        <J_Ui>"ActionName":"TradeWeb","Option":"APISETTINGLOG","RequestFrom":"W"</J_Ui>
        <Sql/>
        <X_Filter/>
        <X_Filter_Multiple><APIName>${viewLogServiceName}</APIName></X_Filter_Multiple>
        <X_Data></X_Data>
        <J_Api>"UserId":"ADMIN"</J_Api>
      </dsXml>
    `;
  
    try {
      const response = await apiService.postWithAuth(BASE_URL + PATH_URL, viewLogXML);
      setModalOpen(true)
  
      if (response.success === true && response?.data?.data?.rs0 !== null) {
        const data = response?.data?.data?.rs0 || [];
  
        const transformed = data.map((entry) => ({
          ...entry,
          Request: cleanJSONStringLiteral(entry.Request),
          Response: cleanJSONStringLiteral(entry.Response),
        }));
  
        setViewLogServiceNameApiData(transformed);
      }

      if(response?.data?.data?.rs0 === null ){
        toast.error('no log found')
        setModalOpen(false)
  
      }

    } catch (error) {
      toast.error(error);
    }
  };


  //can be required in future
  // export const viewLogApiCall = async (viewLogServiceName, setViewLogServiceNameApiData, setIsViewLogModalOpen) => {
  //   const viewLogXML = `
  // <dsXml>
  //   <J_Ui>"ActionName":"TradeWeb","Option":"APISETTINGLOG","RequestFrom":"W"</J_Ui>
  //   <Sql/>
  //   <X_Filter/>
  //   <X_Filter_Multiple><APIName>${viewLogServiceName}</APIName></X_Filter_Multiple>
  //   <X_Data></X_Data>
  //   <J_Api>"UserId":"ADMIN"</J_Api>
  // </dsXml>`;
  
  //   try {
  //     const response = await apiService.postWithAuth(BASE_URL + PATH_URL, viewLogXML);
  //     console.log(response, 'response config data');
  
  //     const data = response?.data?.data?.rs0;
  
  //     // ⛔️ Check for empty log
  //     if (response.success === true && (!data || data.length === 0)) {
  //       toast.error("No View Log data found.");
  //       setIsViewLogModalOpen(false);
  //       return;
  //     }
  
  //     if (response.success === true) {
  //       const transformed = data.map(entry => {
  //         let parsedRequest = {};
  //         let parsedResponse = {};
  
  //         try {
  //           parsedRequest = JSON.parse(entry.Request);
  //         } catch (e) {
  //           console.error("Invalid JSON in Request:", e);
  //         }
  
  //         try {
  //           const responseString = entry.Response
  //             .replace(/\\r\\n/g, "")
  //             .replace(/\\"/g, '"')
  //             .replace(/\\\\/g, "\\"); // Removes stray backslashes
  //           parsedResponse = JSON.parse(responseString);
  //         } catch (e) {
  //           console.error("Invalid JSON in Response:", e);
  //         }
  
  //         return {
  //           ...entry,
  //           ParsedRequest: parsedRequest,
  //           ParsedResponse: parsedResponse,
  //         };
  //       });
  
  //       setViewLogServiceNameApiData(transformed);
  //       setIsViewLogModalOpen(true); // ✅ Only open when valid data
  //     }
  //   } catch (error) {
  //     toast.error("Failed to fetch View Log.");
  //     setIsViewLogModalOpen(false);
  //   }
  // };
  
  
  
  
  
  

  