import apiService from "@/utils/apiService";
import { ACTION_NAME, BASE_URL, PATH_URL } from "@/utils/constants"
import { getLocalStorage } from "@/utils/helper";
import axios from "axios"
import { toast } from "react-toastify";

export const tableHeader = ['Code', 'Name', 'ISIN', 'Rate', 'Holding', 'Value', 'HairCut', 'Net Value', 'Request', 'Value']



export const decimalFormat: Record<string, number> = {
  Rate: 2,
  Holding: 0,
  Value: 2,
  NetValue: 2,
  Request: 2,
  Value2: 2,
};


export const rightAlignKeys = ['ScripCode', 'TotalQty', 'ClosingPrice', 'BranchCode', 'MarketValue', 'Haircut', 'NetValue', 'Retain', 'ReqValue'];


export const dropDownApiCall = async (setDematId) => {
  const xmlDataDropDown = `
  <dsXml>
    <J_Ui>"ActionName":"${ACTION_NAME}", "Option":"GetBenefAccountNo","RequestFrom" :"W"</J_Ui>
    <Sql/>
    <X_Filter>
      <ClientCode>${getLocalStorage('userId')}</ClientCode>
    </X_Filter>
    <J_Api>"UserId":"${getLocalStorage('userId')}","AccYear":24,"MyDbPrefix":"SVVS","MenuCode":0,"ModuleID":0,"MyDb":null,"DenyRights":null</J_Api>
  </dsXml>
  `;

  try {
    const request = await apiService.postWithAuth(BASE_URL + PATH_URL, xmlDataDropDown);

    const result = request.data.data.rs0 || [];
    setDematId(result);
  } catch (error) {
    console.error('Dropdown API Call Failed', error);
    setDematId([]);
  }
};

export const tableApiCall = async (selectedDemat, setTableHeaders, setTableRows) => {


  const xmlDataTable = `
<dsXml>
	<J_Ui>"ActionName":"${ACTION_NAME}", "Option":"GetHolding","RequestFrom" :"W"</J_Ui>
	<Sql/>
	<X_Filter>
        <ClientCode>${getLocalStorage('userId')}</ClientCode>
        <DematActNo>${selectedDemat.DPAccountNo}</DematActNo>
        <DPType>${selectedDemat.DPType}</DPType>
	</X_Filter>
	<J_Api>"UserId":"${getLocalStorage('userId')}","AccYear":24,"MyDbPrefix":"SVVS","MenuCode":0,"ModuleID":0,"MyDb":null,"DenyRights":null</J_Api>
</dsXml>
`

  try {

    const request = await apiService.postWithAuth(BASE_URL + PATH_URL, xmlDataTable);

    const result = request.data?.data?.rs0?.[0]?.DATA || [];
    const headers = Object.keys(result[0]);
    setTableHeaders(headers)

    const rows = result.map(record => {
      const formattedRow = {};
      headers.forEach(key => {
        let value = record[key];

        // Optional formatting
        if (typeof value === 'number') {
          value = value.toFixed(2);
        }
        if (key.toLowerCase().includes('haircut')) {
          value = `${value}%`;
        }

        formattedRow[key] = value;
      });

      return formattedRow;
    });



    setTableRows(rows)

  } catch (error) {
    console.error(error)

  }
}


//this func will be used when futur process get completed by Backend
export const pledgeRedirectApiCall = async (pledgeRedirectApiCall) => {

  const URL = `${pledgeRedirectApiCall}`



  try {
    const request = await axios.post('')
  } catch (error) {

  }
}


const now = new Date();

// Format: yyyyMMddHHmmss
  const formatted =
    now.getFullYear().toString() +
    String(now.getMonth() + 1).padStart(2, '0') +
    String(now.getDate()).padStart(2, '0') +
    String(now.getHours()).padStart(2, '0') +
    String(now.getMinutes()).padStart(2, '0') +
    String(now.getSeconds()).padStart(2, '0');

// Random number between 10 and 99  
const random = Math.floor(Math.random() * 90) + 10;

const strRequestReference = formatted + random.toString();


const strRequestTime =
    now.getFullYear() + "-" +
    String(now.getMonth() + 1).padStart(2, '0') + "-" +
    String(now.getDate()).padStart(2, '0') + "T" +
    String(now.getHours()).padStart(2, '0') + ":" +
    String(now.getMinutes()).padStart(2, '0') + ":" +
    String(now.getSeconds()).padStart(2, '0') +
    "+0530";



    const digitalSignatureApiCall = async (
      JsonOutput: unknown,
      userId:unknown,
      userType:unknown
    ): Promise<string | null> => {
      try {
        const xml = `
          <dsXml>
            <J_Ui>"ActionName":"MARGINPLEDGENSDL","Option":"GETSIGNATURE","RequestFrom":"W"</J_Ui>
            <Sql/>
            <X_Filter></X_Filter>
            <X_Data>
              <RequestJson><![CDATA[${JSON.stringify(JsonOutput)}]]></RequestJson>
            </X_Data>
            <J_Api>"UserId":"${userId}", "UserType":"${userType}"</J_Api>
          </dsXml>
        `;
    
        const response = await apiService.postWithAuth(BASE_URL + PATH_URL, xml);
    
        console.log("Digital Signature API response:", response);
    
        // 🔴 API-level failure
        if (!response?.success) {
          toast.error(response?.message || "Failed to generate digital signature");
          return null;
        }
    
        const digitalSignature =
          response?.data?.data?.rs0?.[0]?.Signature ?? null;
    
        // 🔴 Signature missing despite success=true
        if (!digitalSignature) {
          toast.error("Digital signature not found in response");
          return null;
        }
    
        return digitalSignature;
      } catch (error: any) {
        console.error("Digital signature API failed:", error);
        toast.error(
          error?.message || "Something went wrong while generating signature"
        );
        return null;
      }
    };

export const pledgeRedirectApiNDSLCall = async(userId,userType,pledgeRedirectData) => {

  try {
    const redirectData = pledgeRedirectData?.[0]?.DATA;
    if (!redirectData) return;

    const { JsonOutput, Param } = redirectData;
    const { APIUrl, TransactionType, Requestor, RequestorId, Channel } =
      Param;
     

 
      
      const digitalSignature = await digitalSignatureApiCall(JsonOutput,userId,userType);

      // 🔴 STOP HERE if signature not generated
      if (!digitalSignature) {
        console.warn("Digital signature missing. Redirect aborted.");
        return;
      }

    

    const form = document.createElement('form');
    form.method = 'POST';
    form.action = APIUrl;
    form.target = '_blank';
    form.style.display = 'none';

    const addHiddenField = (name, value) => {
      const input = document.createElement('input');
      input.type = 'hidden';
      input.name = name;
      input.value = value;
      form.appendChild(input);
    };

    addHiddenField('transactionType', TransactionType);
    addHiddenField('requestor', Requestor);
    addHiddenField('requestorId', RequestorId);
    addHiddenField('requestReference', strRequestReference);
    addHiddenField('channel', Channel);
    addHiddenField('orderReqDtls', JSON.stringify(JsonOutput));
    addHiddenField('requestTime', strRequestTime);
    addHiddenField('digitalSignature', digitalSignature);
    console.log(form,'form')
    document.body.appendChild(form);
    form.submit();

    // setTimeout(() => document.body.removeChild(form), 1000);
  } catch (error) {
    console.error('NSDL Redirect Error:', error);
  }
};



