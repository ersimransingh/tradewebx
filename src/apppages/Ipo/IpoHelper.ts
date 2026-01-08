"use client";
import { BASE_URL, PATH_URL } from "@/utils/constants";
import {  CheckStatusXML, deleteXML, submitXML, xmlDataUPI } from "./IpoXML";
import apiService from "@/utils/apiService";
import { toast } from "react-toastify";


  

export const IPO_url = `${BASE_URL}/api/main/tradeweb`;

export const configDetails = (authToken) => {
    return {
      headers: {
        Authorization: `Bearer ${authToken}`,
        "Content-Type": "application/xml",
      },
    };
  };
  



export const IPO_SELECTED = (selectedIpo) => {

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

export const DYNAMIC_DETAILS = (selectedIpo) => {
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

export const handleDecrement = (bidType:any, bid:any, setBid:any, minimumOrder:any) => {
    console.log(bidType,':                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              bidType',setBid,':setBid',minimumOrder,':minimumOrder');
    
    if (bidType === 'bid1') {
        if (bid > minimumOrder) {
            setBid((prev) => parseInt(prev) - parseInt(minimumOrder));
        }
    }
    if (bidType === 'bid2') {
        if (bid > minimumOrder) {
            setBid((prev) => parseInt(prev) - parseInt(minimumOrder));
        }
    }
    if (bidType === 'bid3') {
        if (bid > minimumOrder) {
            setBid((prev) => parseInt(prev) - parseInt(minimumOrder));
        }
    }
};


export const handleBidChange = (e:any, bidType:any, setBid:any) => {
    const value = parseInt(e.target.value); // Ensure value is a number or default to 0
    if (bidType === "bid1") {
        setBid(value);
    } else if (bidType === "bid2") {
        setBid(value);
    } else if (bidType === "bid3") {
        setBid(value);
    }
};

export const handleFocus = (bidType:any, bid:any, minimumOrder:any, setBid:any) => {

    
    if (bidType === 'bid1') {
        if (bid) { // Check if the input is not empty or null
            const value = parseInt(bid);
            if (value >= minimumOrder && value % minimumOrder === 0) {
                // Valid value
            } else {
                toast.error(`Enter valid Quantity. It should be multiple of ${minimumOrder}`);
                setBid('');
            }
        }
    }
    if (bidType === 'bid2') {
        if (bid) { // Check if the input is not empty or null
            const value = parseInt(bid);
            if (value >= minimumOrder && value % minimumOrder === 0) {
                // Valid value
                return value
            } else {
                toast.error(`Enter valid Quantity. It should be multiple of ${minimumOrder}`);
                setBid('');
            }
        }
    }
    if (bidType === 'bid3') {
        if (bid) { // Check if the input is not empty or null
            const value = parseInt(bid);
            if (value >= minimumOrder && value % minimumOrder === 0) {
                // Valid value
            } else {
                toast.error(`Enter valid Quantity. It should be multiple of ${minimumOrder}`);
                setBid('');
            }
        }
    }
};

export const handleIncrement = (bidType:any, bid:any, setBid:any, minimumOrder:any) => {
    if (bidType === 'bid1') {
        if (!bid || bid === '') {
            // If bid1 is empty, initialize it to the minimumOrder
            setBid(minimumOrder);
        } else {
            // Increment bid1 by the minimumOrder
            setBid((prev:any) => parseInt(prev) + minimumOrder);
        }
    }

    if (bidType === 'bid2') {
        if (!bid || bid === '') {
            setBid(minimumOrder);
        } else {
            setBid((prev:any) => parseInt(prev) + minimumOrder);
        }
    }

    if (bidType === 'bid3') {
        if (!bid || bid === '') {
            setBid(minimumOrder);
        } else {
            setBid((prev:any) => parseInt(prev) + minimumOrder);
        }
    }
};

export const handleCheckboxChange = (bidType:any, setIsChecke:any, isChecked:any, setCutOff:any, setDisableCutOff:any, priceRange:any) => {
    if (bidType === 'bid1') {
        setIsChecke(!isChecked); // Toggle checkbox state
        if (!isChecked) {
            // Set to max price and disable input
            setCutOff(priceRange.split(" - ")[1]);
            setDisableCutOff(true);
        } else {
            setDisableCutOff(false);
            setCutOff(""); // Clear cutoff price when unchecked
        }
    }
    if (bidType === 'bid2') {
        setIsChecke(!isChecked)

        if (!isChecked) {
            // Set to max price and disable input
            setCutOff(priceRange.split(" - ")[1]);
            setDisableCutOff(true);
        } else {
            setDisableCutOff(false);
            setCutOff(""); // Clear cutoff price when unchecked
        }
    }
    if (bidType === 'bid3') {
        setIsChecke(!isChecked)

        if (!isChecked) {
            // Set to max price and disable input
            setCutOff(priceRange.split(" - ")[1]);
            setDisableCutOff(true);
        } else {
            setDisableCutOff(false);
            setCutOff(""); // Clear cutoff price when unchecked
        }
    }
};

export const handleTextBoxChange = (e:any, bidType:any, setCutOff:any) => {
    let value = e.target.value;
    if (value === "") {
        value = null; // Set to null for empty input
    } else {
        value = parseFloat(value); // Ensure it's a valid number
    }

    if (bidType === 'bid1') {
        setCutOff(value);
    } else if (bidType === 'bid2') {
        setCutOff(value);
    } else if (bidType === 'bid3') {
        setCutOff(value);
    }
};

export const handleCutOffBlur = (bidType:any, cutOff:any, setCutOff:any, priceRange:any) => {
    let value;
    if (bidType === 'bid1') {
        value = cutOff;
    } else if (bidType === 'bid2') {
        value = cutOff;
    } else if (bidType === 'bid3') {
        value = cutOff;
    }

    if (value === null || value === "") {
        // If the input is empty, you can reset it to a valid value like null or zero
        value = null;
    } else {
        value = parseInt(value); // Validate if it's a valid number
        if (value < priceRange.split(" - ")[0] || value > priceRange.split(" - ")[1]) {
            toast.error(`Please enter a value between ${priceRange.split(" - ")[0]} and ${priceRange.split(" - ")[1]}.`);
            value = null; // Reset to null or you could clear the input
            value = ''
        }
    }

    if (bidType === 'bid1') {
        setCutOff(value);
    } else if (bidType === 'bid2') {
        setCutOff(value);
    } else if (bidType === 'bid3') {
        setCutOff(value);
    }
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




export const onSubmitBtn = (userClientCode:any, scripCode:any, ipoCategory:any, upiId:any, selectedUpi:any, bid1:any, cutOff:any, isChecked:any, bid2:any, cutOff2:any, isChecked2:any, bid3:any, cutOff3:any, isChecked3:any, setTermsAccepted:any, termsAccepted:any, clearFn:any, setStatus:any, calculateAmountPayable:any,authToken:any) => {

    const data = {
        clientCode: userClientCode,
        scripCode: scripCode,
        category: ipoCategory,
        UPIId: `${upiId.trim()}${selectedUpi.trim()}`,
        bid1: bid1,
        cutOff: parseInt(cutOff),
        cutOffFlag: isChecked,
        bid2: bid2,
        cutOff2: isNaN(parseInt(cutOff2)) === true ? '' : parseInt(cutOff2),
        cutOffFlag2: isChecked2,
        bid3: bid3,
        cutOff3: isNaN(parseInt(cutOff3)) === true ? '' : parseInt(cutOff3),
        cutOffFlag3: isChecked3
    }


    // setIpoAllData()


    if ((selectedUpi === '' || upiId === '')) {

        
        toast.error('UPI ID cannot be blank')
        return;
    } if (
        (!bid1 || !cutOff) &&  // Check if bid1 and cutOff are both empty
        (!bid2 || !cutOff2) && // Check if bid2 and cutOff2 are both empty
        (!bid3 || !cutOff3)    // Check if bid3 and cutOff3 are both empty
    ) {
        toast.error('Enter Bid Details');
        return;
    }

    if ((isChecked || isChecked2 || isChecked3) && (calculateAmountPayable() > 200000)) {
        toast.error('Bid cannot be at the Cut-off Price for HNI category. Please bid at a fixed price in the issue price range.')
        return
    }
    else {

        setTermsAccepted(!termsAccepted)
        submitApiFetch(submitXML(data.clientCode, data.scripCode, data.category, data.UPIId, data.bid1, data.cutOff, data.cutOffFlag, data.bid2, data.cutOff2, data.cutOffFlag2, data.bid3, data.cutOff3, data.cutOffFlag3), configDetails(authToken),clearFn)
       
        setStatus(false);
        clearFn()
        return
    }

}



export const handleDelete = async (data:any,clientCode:any,config:any) => {
    if (window.confirm("Are you sure you want to delete this IPO?")) {
        // const response = await axios.post(IPO_url, deleteXML(clientCode,data.IPO_NSE_Symbol, data.IPO_Category),  config)
        const response = await apiService.postWithAuth(BASE_URL + PATH_URL, deleteXML(clientCode,data.IPO_NSE_Symbol, data.IPO_Category))



    }
};


export const checkStatusFs = async(data:any,clientCode:any,config:any) => {
    // const response = await axios.post(IPO_url, CheckStatusXML(clientCode,data.IPO_NSE_Symbol, data.IPO_Category),  config)
    const response = await apiService.postWithAuth(BASE_URL + PATH_URL, CheckStatusXML(clientCode,data.IPO_NSE_Symbol, data.IPO_Category))


    
    return response
    
}


// deleteXML(data.IPO_NSE_Symbol, data.IPO_Category),
