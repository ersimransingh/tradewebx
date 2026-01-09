"use client";
import { BASE_URL, PATH_URL } from "@/utils/constants";
import {  CheckStatusXML, deleteXML, submitXML, xmlDataUPI } from "./IpoXML";
import apiService from "@/utils/apiService";
import { toast } from "react-toastify";
import { BidType, IpoRow, IpoRowSymbol, SubmitBidPayload } from "@/types/ipoTypes";
import { ChangeEvent, Dispatch, SetStateAction } from 'react';

  

export const IPO_url = `${BASE_URL}/api/main/tradeweb`;

export const configDetails = (authToken) => {
    return {
      headers: {
        Authorization: `Bearer ${authToken}`,
        "Content-Type": "application/xml",
      },
    };
  };
  



export const IPO_SELECTED = (selectedIpo: IpoRow | null) => {

    return selectedIpo ? [
        {
            priceRange: selectedIpo?.price_range,
            minimumOrder: selectedIpo?.min_order,
            discount: selectedIpo?.IPO_Discount,
            individualInvestor: selectedIpo?.IPO_Category_Descp,
            scripCode: selectedIpo?.IPO_NSE_Symbol,
            ipoFlag: selectedIpo?.IPOFlag,
            ipoCategory: selectedIpo?.IPO_Category
        },
    ] : []

}

export const DYNAMIC_DETAILS = (selectedIpo: IpoRow | null) => {
    return selectedIpo ? [
        { label: "IPO Name", value: selectedIpo.IPO_Company_Name },
        { label: "Price Range", value: selectedIpo.price_range },
        { label: "Minimum Order", value: selectedIpo.min_order },
        { label: "Tick Size", value: selectedIpo.tick_size },
        { label: "Discount", value: selectedIpo.IPO_Discount },
        { label: "Cutoff Price", value: selectedIpo.price_range.split(" - ")[1] }
    ] : [];
}

export const fetchUPIType = async (setUpiSelect) => {

    try {
        // const response = await axios.post(IPO_url, xmlDataUPI, configDetails(authToken));
        const response = await apiService.postWithAuth(BASE_URL + PATH_URL, xmlDataUPI)


        if (response.data.data.rs0) {
            const userTypeData = response.data.data.rs0

            const formattedUpiType = userTypeData.map((upiType) => ({
                Value: `@${upiType.Value.trim()}`, // Key
                DisplayName: `@${upiType.DisplayName.trim()}`, // Label
            }));
            setUpiSelect(formattedUpiType);


            

        }

    } catch (error) {
        console.error("Error fetching IPO details:", error);
    }
}

export const handleDecrement = (bidType:BidType, bid:number | "", setBid: React.Dispatch<React.SetStateAction<number | "">>, minimumOrder:number) => {
    console.log(bidType,':                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              bidType',setBid,':setBid',minimumOrder,':minimumOrder');
    
    if (bid === "" || bid <= minimumOrder) return;

  setBid(prev =>
    typeof prev === "number" ? prev - minimumOrder : prev
  );
};


export const handleBidChange = (
    e: ChangeEvent<HTMLInputElement>,
    bidType: BidType, // kept for consistency / future use
    setBid: Dispatch<SetStateAction<number | ''>>
  ): void => {
    const rawValue = e.target.value;
  
    // Allow clearing the input
    if (rawValue === '') {
      setBid('');
      return;
    }
  
    const value = Number(rawValue);
  
    if (!Number.isNaN(value)) {
      setBid(value);
    }
  };

export const handleFocus = (
    bidType: BidType, // kept for consistency (future logic if needed)
    bid: string | number | null,
    minimumOrder: number,
    setBid: React.Dispatch<React.SetStateAction<number | "">>
  ): void => {
    if (bid === null || bid === '') return;
  
    const value = Number(bid);
  
    if (
      Number.isNaN(value) ||
      value < minimumOrder ||
      value % minimumOrder !== 0
    ) {
      toast.error(
        `Enter valid Quantity. It should be multiple of ${minimumOrder}`
      );
      setBid('');
    }
  };

export const handleIncrement = (
    bidType: BidType,
    bid: string | number | null,
    setBid: React.Dispatch<React.SetStateAction<number | "">>,
    minimumOrder: number
  ): void => {
    if (!bid || bid === '') {
      // Initialize bid with minimumOrder
      setBid(minimumOrder);
      return;
    }
  
    setBid((prev) => Number(prev) + minimumOrder);
  };

  export const handleCheckboxChange = (
    bidType: BidType, // kept for consistency
    setIsChecked: Dispatch<SetStateAction<boolean>>,
    isChecked: boolean,
    setCutOff: Dispatch<SetStateAction<number | ''>>,
    setDisableCutOff: Dispatch<SetStateAction<boolean>>,
    priceRange: string
  ): void => {
    const [, maxPrice] = priceRange.split(' - ').map(Number);
  
    setIsChecked((prev) => !prev);
  
    if (!isChecked) {
      // checked → set max price & disable input
      setCutOff(maxPrice);
      setDisableCutOff(true);
    } else {
      // unchecked → enable input & clear
      setDisableCutOff(false);
      setCutOff('');
    }
  };
  
  export const handleTextBoxChange = (
    e: ChangeEvent<HTMLInputElement>,
    bidType: BidType, // optional but consistent
    setCutOff: Dispatch<SetStateAction<number | ''>>
  ): void => {
    const value = e.target.value;
  
    if (value === '') {
      setCutOff('');
      return;
    }
  
    const numericValue = Number(value);
  
    if (!Number.isNaN(numericValue)) {
      setCutOff(numericValue);
    }
  };
  
  export const handleCutOffBlur = (
    bidType: BidType,
    cutOff: number | '',
    setCutOff: Dispatch<SetStateAction<number | ''>>,
    priceRange: string
  ): void => {
    if (cutOff === '' || cutOff === null) {
      setCutOff('');
      return;
    }
  
    const value = Number(cutOff);
    const [minPrice, maxPrice] = priceRange.split(' - ').map(Number);
  
    if (Number.isNaN(value) || value < minPrice || value > maxPrice) {
      toast.error(`Please enter a value between ${minPrice} and ${maxPrice}.`);
      setCutOff('');
      return;
    }
  
    setCutOff(value);
  };
  


export const handleTermsChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    setTermsAccepted: React.Dispatch<React.SetStateAction<boolean>>
  ) => {
    setTermsAccepted(e.target.checked);
  };
  


const submitApiFetch = async (xmlData,config,clearFn) => {


    // const response = await axios.post(IPO_url, xmlData, config)
    const response = await apiService.postWithAuth(BASE_URL + PATH_URL, xmlData)

    if (response.success === true) {
        // clearFn()
        toast.success('form submitted')
        return
    }

    // configDetails(authToken)

}




export const onSubmitBtn = (
    userClientCode: string,
    scripCode: string,
    ipoCategory: string,
    upiId: string,
    selectedUpi: string,
  
    bid1: number | '',
    cutOff: number | '',
    isChecked: boolean,
  
    bid2: number | '',
    cutOff2: number | '',
    isChecked2: boolean,
  
    bid3: number | '',
    cutOff3: number | '',
    isChecked3: boolean,
  
    setTermsAccepted: Dispatch<SetStateAction<boolean>>,
    termsAccepted: boolean,
  
    clearFn: () => void,
    setStatus: Dispatch<SetStateAction<boolean>>,
  
    calculateAmountPayable: () => number,
    authToken: string
  ): void => {
    const payload: SubmitBidPayload = {
      clientCode: userClientCode,
      scripCode,
      category: ipoCategory,
      UPIId: `${upiId.trim()}${selectedUpi.trim()}`,
  
      bid1,
      cutOff: cutOff === '' ? '' : Number(cutOff),
      cutOffFlag: isChecked,
  
      bid2,
      cutOff2: cutOff2 === '' ? '' : Number(cutOff2),
      cutOffFlag2: isChecked2,
  
      bid3,
      cutOff3: cutOff3 === '' ? '' : Number(cutOff3),
      cutOffFlag3: isChecked3,
    };
  
    /* ---------- VALIDATIONS ---------- */
  
    if (!upiId || !selectedUpi) {
      toast.error('UPI ID cannot be blank');
      return;
    }
  
    const noBidEntered =
      (!bid1 || !cutOff) &&
      (!bid2 || !cutOff2) &&
      (!bid3 || !cutOff3);
  
    if (noBidEntered) {
      toast.error('Enter Bid Details');
      return;
    }
  
    const isAnyCutOffChecked = isChecked || isChecked2 || isChecked3;
  
    if (isAnyCutOffChecked && calculateAmountPayable() > 200000) {
      toast.error(
        'Bid cannot be at the Cut-off Price for HNI category. Please bid at a fixed price in the issue price range.'
      );
      return;
    }
  
    /* ---------- SUBMIT ---------- */
  
    setTermsAccepted(!termsAccepted);
  
    submitApiFetch(
      submitXML(
        payload.clientCode,
        payload.scripCode,
        payload.category,
        payload.UPIId,
        payload.bid1,
        payload.cutOff,
        payload.cutOffFlag,
        payload.bid2,
        payload.cutOff2,
        payload.cutOffFlag2,
        payload.bid3,
        payload.cutOff3,
        payload.cutOffFlag3
      ),
      configDetails(authToken),
      clearFn
    );
  
    setStatus(false);
    clearFn();
  };
  



//   export const handleDelete = async (
//     data: IpoRow,
//     clientCode: string
//   ): Promise<void> => {
//     const confirmDelete = window.confirm(
//       'Are you sure you want to delete this IPO?'
//     );
  
//     if (!confirmDelete) return;
  
//     try {
//       await apiService.postWithAuth(
//         BASE_URL + PATH_URL,
//         deleteXML(clientCode, data.IPO_NSE_Symbol, data.IPO_Category)
//       );
  
//       toast.success('IPO deleted successfully');
//     } catch (error: unknown) {
//       console.error('Delete IPO failed:', error);
//       toast.error('Failed to delete IPO');
//     }
//   };
  
export const handleDelete = async (
    data: IpoRowSymbol,
    clientCode: string
  ): Promise<void> => {
    const confirmDelete = window.confirm(
      'Are you sure you want to delete this IPO?'
    );
  
    if (!confirmDelete) return;
  
    try {
      await apiService.postWithAuth(
        BASE_URL + PATH_URL,
        deleteXML(clientCode, data.IPO_NSE_Symbol, data.IPO_Category)
      );
  
      toast.success('IPO deleted successfully');
    } catch (error: unknown) {
      console.error('Delete IPO failed:', error);
      toast.error('Failed to delete IPO');
    }
  };
  


  export const checkStatusFs = async (
    data: IpoRowSymbol,
    clientCode: string
  ): Promise<unknown> => {
    try {
      const response = await apiService.postWithAuth(
        BASE_URL + PATH_URL,
        CheckStatusXML(clientCode, data.IPO_NSE_Symbol, data.IPO_Category)
      );
  
      return response;
    } catch (error: unknown) {
      console.error('Check IPO status failed:', error);
      throw error; // allow caller to handle toast / UI
    }
  };
  





// deleteXML(data.IPO_NSE_Symbol, data.IPO_Category),
