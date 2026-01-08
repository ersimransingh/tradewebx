
"use client";

export const xmlDataIPO = (clientCode:any) => { 
  return `<dsXml>
 <J_Ui>{"ActionName":"TradeWeb", "Option":"IPO", "Level":1, "RequestFrom":"W"}</J_Ui>
 <Sql></Sql>
 <X_Filter></X_Filter>
 <X_GFilter></X_GFilter>
 <J_Api>{"UserId":"${clientCode}"}</J_Api>
</dsXml>`;
}

export const xmlDataUPI = `<dsXml>
<J_Ui>"ActionName":"IPO", "Option":"UPIHandle","Level":1</J_Ui>
<Sql>undefined</Sql>
<X_Filter></X_Filter>
<X_GFilter></X_GFilter>
<J_Api></J_Api>
</dsXml>`;



export const submitXML = (
  clientCode:any,
  scripCode:any,
  category:any,
  UPIId:any,
  bid1:any,
  cutOff:any,
  cutOffFlag:any,
  bid2:any,
  cutOff2:any,
  cutOffFlag2:any,
  bid3:any,
  cutOff3:any,
  cutOffFlag3:any,
  // clearFn:any
) => {
  const xmlData = `<dsXml>
  <J_Ui>"ActionName":"IPO", "Option":"Submit" </J_Ui>
  <X_Filter></X_Filter>
  <X_Data>
  <ClientCode>${clientCode}</ClientCode>
  <ScripCode>${scripCode}</ScripCode>
  <Category>${category}</Category>
  <UPIId>${UPIId}</UPIId>
  <items>
  <item>
   <Quantity>${bid1}</Quantity>
   <Rate>${cutOff}</Rate>
   <Cuttoffflag>${cutOffFlag}</Cuttoffflag>
  </item> 
  <item>
  <Quantity>${bid2}</Quantity>
  <Rate>${cutOff2}</Rate>
  <Cuttoffflag>${cutOffFlag2}</Cuttoffflag>
 </item> 
   <item>
   <Quantity>${bid3}</Quantity>
   <Rate>${cutOff3}</Rate>
   <Cuttoffflag>${cutOffFlag3}</Cuttoffflag>
  </item> 
  </items>
  </X_Data>
  <J_Api>"UserId":"ADMIN","AccYear":24,"MyDbPrefix":"SVVS","MemberCode":"undefined","SecretKey":"undefined","MenuCode":5,"ModuleID":5,"MyDb":"","DenyRights":""</J_Api>
</dsXml>`;



  return xmlData;

};



export const deleteXML = (userClientCode,scripCode, individualInvestor) => {
  const xmlData = `<dsXml>
  <J_Ui>"ActionName":"IPO", "Option":"Submit" </J_Ui>
  <X_Filter></X_Filter>
  <X_Data>
  <ClientCode>${userClientCode}</ClientCode>
  <ScripCode>${scripCode}</ScripCode>
  <Category>${individualInvestor}</Category>
  <ProcessType>DELETE</ProcessType>
  </X_Data>
  <J_Api>"UserId":"ADMIN","AccYear":24,"MyDbPrefix":"SVVS","MemberCode":"undefined","SecretKey":"undefined","MenuCode":5,"ModuleID":5,"MyDb":"","DenyRights":""</J_Api>
</dsXml>`;

  return xmlData;
};


export const CheckStatusXML = (userClientCode,scripCode, individualInvestor) => {
  const xmlData = `<dsXml>
  <J_Ui>"ActionName":"IPO", "Option":"Submit" </J_Ui>
  <X_Filter></X_Filter>
  <X_Data>
  <ClientCode>${userClientCode}</ClientCode>
  <ScripCode>${scripCode}</ScripCode>
  <Category>${individualInvestor}</Category>
  <ProcessType>STATUS</ProcessType>
  </X_Data>
  <J_Api>"UserId":"ADMIN","AccYear":24,"MyDbPrefix":"SVVS","MemberCode":"undefined","SecretKey":"undefined","MenuCode":5,"ModuleID":5,"MyDb":"","DenyRights":""</J_Api>
</dsXml>`;

  return xmlData;
};

