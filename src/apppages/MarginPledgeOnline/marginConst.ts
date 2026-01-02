import apiService from "@/utils/apiService";
import { ACTION_NAME, BASE_URL, PATH_URL } from "@/utils/constants"
import { getLocalStorage } from "@/utils/helper";

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

  // const URL = `${pledgeRedirectApiCall}`



  try {
    // const request = await axios.post('')
  } catch (error) {
    console.error(error)
  }
}


