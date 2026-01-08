import apiService from "@/utils/apiService";
import { BASE_URL, PATH_URL } from "@/utils/constants";
import { sanitizeValueSpecialChar } from "@/utils/helper";

export const handleNextValidationFields = async (
  editData,
  currentTab,
  masterFormValues,
  ) => {
    console.log("check tab change api",editData,currentTab,masterFormValues)
  if (!Object.keys(currentTab?.Settings?.TabChangeAPI || {}).length) return;

  const { J_Ui, Sql, X_Filter, J_Api } = currentTab?.Settings?.TabChangeAPI;

  let xFilter = "";

  if (X_Filter && typeof X_Filter === 'object') {
    // Handle X_Filter as an object with key-value pairs
    const filterEntries = Object.entries(X_Filter).map(([key, value]) => {
      let fieldValue;
      
      if (typeof value === 'string' && value.startsWith("##") && value.endsWith("##")) {
        const formKey = value.slice(2, -2);
        fieldValue = masterFormValues ? sanitizeValueSpecialChar(masterFormValues[formKey]) : editData ? sanitizeValueSpecialChar(editData[formKey])  : "" ;
      } else {
        fieldValue = sanitizeValueSpecialChar(value);
      }
      return `<${key}>${fieldValue}</${key}>`;
    });
    
    xFilter = filterEntries.join("");
  }
  
  const jUi = Object.entries(J_Ui || {})
    .map(([key, value]) => `"${key}":"${value}"`)
    .join(",");
    
  const jApi = Object.entries(J_Api || {})
    .map(([key, value]) => `"${key}":"${value}"`)
    .join(",");

  const xmlData = `<dsXml>
      <J_Ui>${jUi}</J_Ui>
      <Sql>${Sql || ""}</Sql>
      <X_Filter>${xFilter}</X_Filter>
      <X_Filter_Multiple></X_Filter_Multiple>
      <J_Api>${jApi}</J_Api>
  </dsXml>`;

  try {
    const response = await apiService.postWithAuth(BASE_URL + PATH_URL, xmlData);
    return response;
  } catch (error) {
    console.error("Validation API error:", error);
  }
};

export const executeEditValidateApi = async (editValidateData:any, masterFormValues:any) => {
    if (!editValidateData) return;

    const { J_Ui, Sql, X_Filter, X_Filter_Multiple, J_Api } = editValidateData;

    let xFilter = '';
    let xFilterMultiple = '';

    if (X_Filter_Multiple && Object.keys(X_Filter_Multiple).length > 0) {
        Object.entries(X_Filter_Multiple).forEach(([key, placeholder]) => {
            let fieldValue;
            if (typeof placeholder === 'string' && placeholder.startsWith('##') && placeholder.endsWith('##')) {
                const formKey = placeholder.slice(2, -2);
                fieldValue = masterFormValues?.[formKey];
            } else {
                fieldValue = placeholder;
            }

            if (fieldValue) {
                const sanitizedValue = sanitizeValueSpecialChar(fieldValue);
                xFilterMultiple += `<${key}>${sanitizedValue}</${key}>`;
            }
        });
    } else if (X_Filter && typeof X_Filter === 'string') {
        let fieldValue;
        if (X_Filter.startsWith('##') && X_Filter.endsWith('##')) {
            const formKey = X_Filter.slice(2, -2);
            fieldValue = masterFormValues?.[formKey];
        } else {
            // Check if X_Filter is just a field name (old compatible mode just in case, though user showed specific structure)
             // But strict reading of EntryForm handleBlur suggests checking against placeholders or direct value.
            // Following what handleBlur does for X_Filter:
             if (X_Filter.startsWith('##') && X_Filter.endsWith('##')) {
                  // already handled
             } else {
                 fieldValue = X_Filter; // Treat as value if not ##...## ?
                 // wait, handleBlur: if (X_Filter.startsWith('##')...) fieldValue = formValues... else fieldValue = X_Filter
                 // then <X_Filter>fieldValue</X_Filter>
                 // But wait, the XML tag name is also X_Filter variable in handleBlur?
                 // EntryForm.tsx: xFilter = `<${X_Filter}>${fieldValue}</${X_Filter}>`;
                 // This implies X_Filter variable contains the KEY name?
                 // Let's re-read EntryForm.tsx carefully.
             }
        }
         // Re-reading EntryForm.tsx:
         // 312: } else if (X_Filter) {
         // 314:    if (X_Filter.startsWith('##')...) ...
         // 329:    xFilter = `<${X_Filter}>${fieldValue}</${X_Filter}>`;
         // This implies X_Filter string IS the tag name.
         // But in user screenshot: X_Filter: "" (empty string).
         // So likely X_Filter logic won't trigger if it matches screenshot.
         // I will assume X_Filter_Multiple is the main one used here as per screenshot.
    }
     // Re-implementing correctly based on my finding:
    if (X_Filter && typeof X_Filter === 'string' && X_Filter !== "") {
         let fieldValue;
          // Logic from handleBlur
         if (X_Filter.startsWith('##') && X_Filter.endsWith('##')) {
             const formKey = X_Filter.slice(2, -2);
             fieldValue = masterFormValues?.[formKey];
         } else {
             fieldValue = X_Filter;
         }

          if (fieldValue) {
            const sanitizedValue = sanitizeValueSpecialChar(fieldValue);
             // handleBlur uses the X_Filter string itself as the TAG name.
             // This seems odd if X_Filter is a value.
             // But let's trust handleBlur matches the backend expectation.
            xFilter = `<${X_Filter}>${sanitizedValue}</${X_Filter}>`;
         }
    }


    const jUi = Object.entries(J_Ui || {})
        .map(([key, value]) => `"${key}":"${value}"`)
        .join(',');

    const jApi = Object.entries(J_Api || {})
        .map(([key, value]) => `"${key}":"${value}"`)
        .join(',');

    const xmlData = `<dsXml>
            <J_Ui>${jUi}</J_Ui>
            <Sql>${Sql || ''}</Sql>
            <X_Filter>${xFilter}</X_Filter>
            <X_Filter_Multiple>${xFilterMultiple}</X_Filter_Multiple>
            <J_Api>${jApi}</J_Api>
        </dsXml>`;

    try {
        const response = await apiService.postWithAuth(BASE_URL + PATH_URL, xmlData);
        return response?.data?.data?.rs0?.[0]?.Column1;
    } catch (error) {
        console.error('Execute Edit Validate API error:', error);
        return null;
    }
};