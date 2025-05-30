import { BASE_URL, PATH_URL } from "@/utils/constants"
import axios from "axios"

export const tableHeader = ['Code','Name','ISIN','Rate','Holding','Value','HairCut','Net Value','Request','Value']

BASE_URL
PATH_URL

export const decimalFormat: Record<string, number> = {
    Rate: 2,
    Holding: 0,
    Value: 2,
    NetValue: 2,
    Request: 2,
    Value2: 2,
  };


export  const rightAlignKeys = ['ScripCode','TotalQty','ClosingPrice','BranchCode','MarketValue','Haircut','NetValue','Retain','ReqValue'];


export const dropDownApiCall = async (setDematId) => {
    const xmlDataDropDown = `
  <dsXml>
    <J_Ui>"ActionName":"Tradeweb", "Option":"GetBenefAccountNo","RequestFrom" :"W"</J_Ui>
    <Sql/>
    <X_Filter>
      <ClientCode>${localStorage.getItem('userId')}</ClientCode>
    </X_Filter>
    <J_Api>"UserId":"${localStorage.getItem('userId')}","AccYear":24,"MyDbPrefix":"SVVS","MenuCode":0,"ModuleID":0,"MyDb":null,"DenyRights":null</J_Api>
  </dsXml>
  `;
  
    try {
      const request = await axios.post(BASE_URL + PATH_URL, xmlDataDropDown, {
        headers: {
          'Content-Type': 'application/xml',
          'Authorization': `Bearer ${document.cookie.split('auth_token=')[1]}`
        }
      });
  
      const result = request.data.data.rs0 || [];
      setDematId(result);
    } catch (error) {
      console.error('Dropdown API Call Failed', error);
      setDematId([]);
    }
  };
  
  export const tableApiCall = async(selectedDemat,setTableHeaders,setTableRows) => {

    console.log(selectedDemat,'selectedDemat22');
    

    const xmlDataTable = `
<dsXml>
	<J_Ui>"ActionName":"Tradeweb", "Option":"GetHolding","RequestFrom" :"W"</J_Ui>
	<Sql/>
	<X_Filter>
        <ClientCode>${localStorage.getItem('userId')}</ClientCode>
        <DematActNo>${selectedDemat.DPAccountNo}</DematActNo>
        <DPType>${selectedDemat.DPType}</DPType>
	</X_Filter>
	<J_Api>"UserId":"${localStorage.getItem('userId')}","AccYear":24,"MyDbPrefix":"SVVS","MenuCode":0,"ModuleID":0,"MyDb":null,"DenyRights":null</J_Api>
</dsXml>
`

    try {
        
        const request = await axios.post(BASE_URL + PATH_URL, xmlDataTable, {
            headers: {
              'Content-Type': 'application/xml',
              'Authorization': `Bearer ${document.cookie.split('auth_token=')[1]}`
            }
          })

          const result = request.data?.data?.rs0?.[0]?.DATA || [];
          console.log(result,'result2');
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

                  console.log(rows,'rows');
                  

                  setTableRows(rows)

    } catch (error) {
        
    }
  }


  export const pledgeRedirectApiCall = async(pledgeRedirectApiCall) => {

    const URL = `${pledgeRedirectApiCall}`

    console.log(URL,'URL');
    

    try {
        let request = await axios.post('')
    } catch (error) {
        
    }
  }


