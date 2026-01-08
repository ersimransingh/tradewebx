"use client";
import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '@/redux/store';
import { useTheme } from '@/context/ThemeContext';
import { DYNAMIC_DETAILS, IPO_SELECTED, checkStatusFs, configDetails, fetchUPIType, handleBidChange, handleCheckboxChange, handleCutOffBlur, handleDecrement, handleDelete, handleFocus, handleIncrement, handleTermsChange, handleTextBoxChange, onSubmitBtn } from './IpoHelper';
import { useLocalStorage } from '@/hooks/useLocalListner';
import { ACTION_NAME, BASE_URL, PATH_URL } from '@/utils/constants';
import apiService from '@/utils/apiService';


interface IpoItem {
  IPO_Company_Name: string;
  IPO_Category: string;
  start_date?: string;
  end_date?: string;
  price_range: string;
  tick_size: string;
  min_order: string;
  rhp?: string;
  ApplyFlag: 'Y' | 'N';
  status?: string;
  StatusFlag: 'Y' | 'N';
  DPRemarks?: string;
  BankRemarks?: string;
  DeleteFlag?: 'Y' | 'N';

  // extra fields you are already using
  discount?: string;
  minimumOrder?: number;
  priceRange?: string;
  scripCode?: string;
  ipoCategory?: string;
}


interface UpiOption {
  Value: string;
  DisplayName: string;
}

const Ipo = () => {
  const { colors } = useTheme();

  
  const authToken = useSelector((state: RootState) => state.auth.authToken);
  const [ipoData, setIpoData] = useState<IpoItem[]>([]);
  const [selectedIpo, setSelectedIpo] = useState<string[] | null>(null);
  const [upiSelect, setUpiSelect] = useState<UpiOption[]>([]);
  const [selectedUpi, setSelectedUpi] = useState('');
  const [upiId, setUpiId] = useState('');
  const [bid1, setBid1] = useState<number | "">(""); // Allow empty string for initial state
  const [isChecked, setIsChecked] = useState<boolean>(false); // Checkbox state
  const [cutOff, setCutOff] = useState<number | "" >("") // Cutoff Price state
  const [disableCutOff, setDisableCutOff] = useState<boolean>(false); // Disable cutoff input
  const [bid2, setBid2] = useState<number | "" >(""); // Bid value
  const [bid3, setBid3] = useState<number | "">(""); // Bid value
  const [cutOff2, setCutOff2] = useState<number | "">(""); // Cutoff Price state
  const [cutOff3, setCutOff3] = useState<number | "">(""); // Cutoff Price state
  const [isChecked2, setIsChecked2] = useState<boolean>(false);
  const [isChecked3, setIsChecked3] = useState<boolean>(false);
  const [termsAccepted, setTermsAccepted] = useState<boolean>(false); // Track terms checkbox state
  const [disableCutOff2, setDisableCutOff2] = useState<boolean>(false); // Disable cutoff input
  const [disableCutOff3, setDisableCutOff3] = useState<boolean>(false); // Disable cutoff input
  const [status, setStatus] = useState<boolean>(false);

  const [clientCode] = useLocalStorage('clientCode', null);

  const config = {
    headers: {
      Authorization: `Bearer ${authToken}`,
      "Content-Type": "application/xml",
    },
  };


  configDetails(authToken);

  const fetchIpo = async () => {
    if (typeof window === 'undefined') return;

    const xmlDataIPO = `
      <dsXml>
        <J_Ui>"ActionName":"${ACTION_NAME}", "Option":"IPO","Level":1, "RequestFrom":"W"</J_Ui>
        <Sql></Sql>
        <X_Filter></X_Filter>
        <X_GFilter></X_GFilter>
        <J_Api>"UserId":"${clientCode}"</J_Api>
      </dsXml>
    `;

    try {
      // const response = await axios.post(IPO_url, xmlDataIPO, config);
      const response = await apiService.postWithAuth(BASE_URL + PATH_URL, xmlDataIPO)

      setIpoData(response.data?.data?.rs0 || []);
    } catch (error) {
      console.error("Error fetching IPO:", error);
    }
  };

  useEffect(() => {
    if (clientCode) {
      fetchIpo();
      fetchUPIType(setUpiSelect);
    } else {

    }

  }, [clientCode]);



  const handleUpiChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedUpi(e.target.value);
  };

  const handleUpiIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUpiId(e.target.value);
  };

  const ipoData1 = IPO_SELECTED(selectedIpo);
  const dynamicDetails = DYNAMIC_DETAILS(selectedIpo);

  const handleSelectIpo = (ipo: any) => {
    setSelectedIpo(ipo);

    // ✅ Parse the max price from the price range (e.g., "603.00 - 610.00")
    const [minPriceStr, maxPriceStr] = ipo.price_range.split("-").map((p: string) => p.trim());
    const maxPrice = parseFloat(maxPriceStr || minPriceStr); // fallback to min if only one price
    const minPrice = ipo.min_order




    // ✅ Set Bid 1 to minimum order and Cutoff to max price
    // const minOrder = ipo.minimumOrder
    // // console.log();
    // setBid1('');
    // setCutOff('');
    // setDisableCutOff(false);
    // setIsChecked(false);



    setBid1(minPrice);
    setCutOff(maxPrice);
    setIsChecked(true);
    setDisableCutOff(true);

    // ❌ Clear other bids to avoid confusion
    setBid2("");
    setBid3("");
    setCutOff2("");
    setCutOff3("");
    setIsChecked2(false);
    setIsChecked3(false);
    setDisableCutOff2(false);
    setDisableCutOff3(false)
  };

  // const calculateAmountPayable = () => {

  //   const discount = parseInt(ipoData1[0].discount)

  //   let baseLine = []
  //   let values = []

  //   baseLine = [
  //     bid1 * cutOff || 0,
  //     bid2 * cutOff2 || 0,
  //     bid3 * cutOff3 || 0,
  //   ];

  //   if ((isChecked) && (bid1 * cutOff > 0 || bid2 * cutOff2 > 0 || bid3 * cutOff3 > 0)) {
  //     values = [
  //       bid1 * (cutOff - discount) || 0,
  //       bid2 * (cutOff2) || 0,
  //       bid3 * (cutOff3) || 0,
  //     ];

  //     return Math.max(...values)
  //   }

  //   if ((isChecked2) && discount > 0 && (bid1 * cutOff > 0 || bid2 * cutOff2 > 0 || bid3 * cutOff3 > 0)) {
  //     values = [
  //       bid1 * (cutOff) || 0,
  //       bid2 * (cutOff2 - discount) || 0,
  //       bid3 * (cutOff3) || 0,
  //     ];

  //     return Math.max(...values)
  //   }

  //   if ((isChecked3) && discount > 0 && (bid1 * cutOff > 0 || bid2 * cutOff2 > 0 || bid3 * cutOff3 > 0)) {
  //     values = [
  //       bid1 * (cutOff) || 0,
  //       bid2 * (cutOff2) || 0,
  //       bid3 * (cutOff3 - discount) || 0,
  //     ];


  //     return Math.max(...values)

  //   }

  //   return Math.max(...baseLine)
  // };

  const toNumber = (value: number | ""): number =>
  value === "" ? 0 : value;


  const calculateAmountPayable = () => {
    const discount = Number(ipoData1[0]?.discount || 0);
  
    const b1 = toNumber(bid1);
    const b2 = toNumber(bid2);
    const b3 = toNumber(bid3);
  
    const c1 = toNumber(cutOff);
    const c2 = toNumber(cutOff2);
    const c3 = toNumber(cutOff3);
  
    const baseLine: number[] = [
      b1 * c1,
      b2 * c2,
      b3 * c3,
    ];
  
    if (isChecked && baseLine.some(v => v > 0)) {
      const values = [
        b1 * Math.max(c1 - discount, 0),
        b2 * c2,
        b3 * c3,
      ];
      return Math.max(...values);
    }
  
    if (isChecked2 && discount > 0 && baseLine.some(v => v > 0)) {
      const values = [
        b1 * c1,
        b2 * Math.max(c2 - discount, 0),
        b3 * c3,
      ];
      return Math.max(...values);
    }
  
    if (isChecked3 && discount > 0 && baseLine.some(v => v > 0)) {
      const values = [
        b1 * c1,
        b2 * c2,
        b3 * Math.max(c3 - discount, 0),
      ];
      return Math.max(...values);
    }
  
    return Math.max(...baseLine);
  };
  





  const clearFn = () => {
    setBid1('');
    setBid2('');
    setBid3('');
    setCutOff('');
    setCutOff2('');
    setCutOff3('');
    setUpiId('');
    setSelectedUpi('');
    setIsChecked(false)
    setIsChecked2(false)
    setIsChecked3(false)
    // setUpiSelect('')
  }



  return (
    <div
      style={{
        background: colors?.background || '#f0f0f0',
        color: colors?.text || '#000',
        minHeight: '100vh',
        padding: '20px',
      }}
    >
      <h2 style={{ color: colors?.text || '#000' }} className="text-center text-blue-600 text-2xl font-semibold mb-4">
        Public Offerings
      </h2>

      <table className="w-full border border-gray-300 text-sm">
        <thead style={{ background: colors?.primary || '#f0f0f0' }} className="bg-gray-200">
          <tr>
            <th className="p-2 border">Company Name</th>
            <th className="p-2 border">Category</th>
            <th className="p-2 border">Start Date</th>
            <th className="p-2 border">End Date</th>
            <th className="p-2 border">Price Range</th>
            <th className="p-2 border">Tick Size</th>
            <th className="p-2 border">Minimum Order</th>
            <th className="p-2 border">RHP</th>
            <th className="p-2 border">Status</th>
            <th className="p-2 border">Remark</th>
          </tr>
        </thead>
        <tbody
        style={{
          backgroundColor: 'white',
        }} >
          {ipoData.map((item, idx) => (
            <tr
              key={idx}
              className="text-center border cursor-pointer hover:bg-gray-100"
              onClick={() => handleSelectIpo(item)}
              
            >
              <td className="p-2 border">{item.IPO_Company_Name}</td>
              <td className="p-2 border">{item.IPO_Category}</td>
              <td className="p-2 border">{item.start_date?.trim()}</td>
              <td className="p-2 border">{item.end_date?.trim()}</td>
              <td className="p-2 border">{item.price_range}</td>
              <td className="p-2 border">{item.tick_size}</td>
              <td className="p-2 border">{item.min_order}</td>
              <td className="p-2 border">{item.rhp || '-'}</td>
              <td className="p-2 border text-blue-600 cursor-pointer hover:underline">
                {item.ApplyFlag === 'Y' ? item.status :
                  <div>
                    <span onClick={() => checkStatusFs(item, clientCode, config)}>Check Status</span>
                  </div>}
              </td>
              {/* <td className="p-2 border">{item.StatusFlag === 'Y' ? `
              <div>
              <strong>DPRemarks:-<strong>${item.DPRemarks}, BankRemarks:-${item.BankRemarks} 
              <ul/>
              </div>`:'Pending'}</td> */}
              <td className="p-2 border text-left"   style={{
                backgroundColor: 'white',
              }}>
                {item.StatusFlag === 'Y' ? (
                  <div>
                    <div>
                      <strong>DP Remarks:</strong> {item.DPRemarks}
                    </div>
                    <div>
                      <strong>Bank Remarks:</strong> {item.BankRemarks}
                    </div>
                    <div onClick={() => handleDelete(item, clientCode, config)} className='text-blue-600 cursor-pointer hover:underline'>
                      {item.DeleteFlag === 'Y' ? 'Delete' : ''}
                    </div>
                  </div>
                ) : (
                  'Pending'
                )}
              </td>

            </tr>
          ))}
        </tbody>
      </table>

      <div style={{ background: colors?.primary || '#f0f0f0' }} className="mt-4 bg-gray-100 border p-4">
        <p className="font-bold text-sm text-gray-800">
          Timing: <span className="text-black">10 AM to 5 PM of Week Days (Other than Holidays)</span>
        </p>
        <p className="text-sm text-gray-700 mt-1 text-white">
          The UPI collect request from the bank might be delayed. Accept to apply whenever you receive the collect request on your UPI app (might take up to the end of the day).
        </p>
      </div>

      {selectedIpo && (
        <div className="mt-2 border-2 border-gray-300 p-4 flex h-auto items-start" style={{ backgroundColor: 'white' }}>
          {/* Left Panel */}
          <div style={{ background: colors?.primary || '#f0f0f0' }} className="rounded-lg bg-[#A6C3E5] w-1/3">
            {dynamicDetails.map((detail, index) => (
              <div key={index} className="m-1 p-1">
                <label className="font-bold text-sm font-sans">{detail.label}</label>:{" "}
                <span className="font-medium text-sm font-sans">{detail.value}</span>
              </div>
            ))}
          </div>

          {/* Right Panel */}
          <div className="secondForm ml-[10%] flex flex-col space-y-2">
            <div className="w-[730px]">
              <input
                value={ipoData1[0]?.individualInvestor || ""}
                readOnly={true}
                className="font-sans ml-[-1px] border border-gray-500 rounded h-[30px] w-[530px] p-2 m-2"
                placeholder="Individual Investor"
              />
            </div>

            {/* UPI and Type Section */}
            <div className="flex space-x-2 items-center">
              <input
                className="font-sans border border-gray-500 rounded px-2 py-1 h-[30px] my-2 w-[265px]"
                type="text"
                value={upiId}
                onChange={handleUpiIdChange}
                placeholder="Enter UPI ID"
              />

              <div className="relative">
                <select
                  className="font-sans border border-gray-500 rounded px-2 h-[30px] my-2 w-[265px] appearance-none"
                  value={selectedUpi}
                  onChange={handleUpiChange}
                >
                  <option value="">Select UPI Type</option>
                  {upiSelect.map((upi, index) => (
                    <option key={index} value={upi.Value}>
                      {upi.DisplayName}
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                  <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                    <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                  </svg>
                </div>
              </div>
            </div>

            {/*Bid and cutoff section */}
            <div className="flex items-center space-x-2">
              {/* Decrement Button */}
              <button className="bg-gray-300 text-black px-3 py-2 rounded hover:bg-gray-400" onClick={() => handleDecrement('bid1', bid1, setBid1, ipoData1[0].minimumOrder)}>
                -
              </button>
              <input
                className="font-sans border border-gray-500 rounded px-2 py-1  w-[200px]"
                type="number"
                value={bid1}
                onChange={(e) => handleBidChange(e, "bid1", setBid1)}
                onBlur={() => handleFocus("bid1", bid1, ipoData1[0]?.minimumOrder, setBid1)}
                placeholder="Bid 1"
              />
              <button className="bg-gray-300 text-black px-3 py-2 rounded hover:bg-gray-400" onClick={() => handleIncrement('bid1', bid1, setBid1, ipoData1[0]?.minimumOrder)}>
                +
              </button>

              <div className="ml-2 flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={() => handleCheckboxChange('bid1', setIsChecked, isChecked, setCutOff, setDisableCutOff, ipoData1[0]?.priceRange)}
                  className="h-[30px] w-[30px] text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />

                <input
                  placeholder="Cutoff Price"
                  value={cutOff || ""}
                  className="font-sans border border-gray-500 rounded px-[2px] py-1 w-[200px]"
                  onChange={(e) => handleTextBoxChange(e, 'bid1', setCutOff)}
                  onBlur={() => handleCutOffBlur('bid1', cutOff, setCutOff, ipoData1[0]?.priceRange)}
                  disabled={disableCutOff}
                  type="number"
                />
              </div>

            </div>

            <div className="flex items-center space-x-2">
              {/* Decrement Button */}
              <button className="bg-gray-300 text-black px-3 py-2 rounded hover:bg-gray-400" onClick={() => handleDecrement('bid2', bid2, setBid2, ipoData1[0].minimumOrder)}>
                -
              </button>
              <input
                className="font-sans border border-gray-500 rounded px-2 py-1  w-[200px]"
                type="number"
                value={bid2}
                onChange={(e) => handleBidChange(e, "bid2", setBid2)}
                onBlur={() => handleFocus("bid2", bid2, ipoData1[0]?.minimumOrder, setBid2)}
                placeholder="Bid 2"
              />
              <button className="bg-gray-300 text-black px-3 py-2 rounded hover:bg-gray-400" onClick={() => handleIncrement('bid2', bid2, setBid2, ipoData1[0]?.minimumOrder)}>
                +
              </button>

              <div className="ml-2 flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={isChecked2}
                  onChange={() => handleCheckboxChange('bid2', setIsChecked2, isChecked2, setCutOff2, setDisableCutOff2, ipoData1[0]?.priceRange)}
                  className="h-[30px] w-[30px] text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />

                <input
                  placeholder="Cutoff Price"
                  value={cutOff2 || ""}
                  className="font-sans border border-gray-500 rounded px-[2px] py-1 w-[200px]"
                  onChange={(e) => handleTextBoxChange(e, 'bid2', setCutOff2)}
                  onBlur={() => handleCutOffBlur('bid2', cutOff2, setCutOff2, ipoData1[0]?.priceRange)}
                  disabled={disableCutOff2}
                  type="number"
                />
              </div>

            </div>

            <div className="flex items-center space-x-2">
              {/* Decrement Button */}
              <button className="bg-gray-300 text-black px-3 py-2 rounded hover:bg-gray-400" onClick={() => handleDecrement('bid3', bid3, setBid3, ipoData1[0].minimumOrder)}>
                -
              </button>
              <input
                className="font-sans border border-gray-500 rounded px-2 py-1  w-[200px]"
                type="number"
                value={bid3}
                onChange={(e) => handleBidChange(e, "bid3", setBid3)}
                onBlur={() => handleFocus("bid3", bid3, ipoData1[0]?.minimumOrder, setBid3)}
                placeholder="Bid 3"
              />
              <button className="bg-gray-300 text-black px-3 py-2 rounded hover:bg-gray-400" onClick={() => handleIncrement('bid3', bid3, setBid3, ipoData1[0]?.minimumOrder)}>
                +
              </button>

              <div className="ml-2 flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={isChecked3}
                  onChange={() => handleCheckboxChange('bid3', setIsChecked3, isChecked3, setCutOff3, setDisableCutOff3, ipoData1[0]?.priceRange)}
                  className="h-[30px] w-[30px] text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />

                <input
                  placeholder="Cutoff Price"
                  value={cutOff3 || ""}
                  className="font-sans border border-gray-500 rounded px-[2px] py-1 w-[200px]"
                  onChange={(e) => handleTextBoxChange(e, 'bid3', setCutOff3)}
                  onBlur={() => handleCutOffBlur('bid3', cutOff3, setCutOff3, ipoData1[0]?.priceRange)}
                  disabled={disableCutOff3}
                  type="number"
                />
              </div>

            </div>

            <div className="mt-4">
              <span className="block font-medium font-sans">
                Amount Payable: {calculateAmountPayable().toFixed(2)}
              </span>
            </div>

            <div className="flex items-center space-x-2 mt-2">
              <input
                type="checkbox"
                checked={termsAccepted}
                onChange={(e) => handleTermsChange(e, setTermsAccepted)}
                className="w-4 h-4"
              />
              <p className="py-1 w-[500px] text-sm text-gray-700">
                I hereby undertake that I have read the Red Herring Prospectus and I am an eligible UPI bidder as per the applicable provisions of the SEBI(Issue of Capital and Disclosure Requirement) Regulation, 2009.
              </p>
            </div>

            <div className="mt-2">
              <button
                onClick={() =>
                  onSubmitBtn(
                    clientCode,
                    ipoData1[0]?.scripCode,
                    ipoData1[0]?.ipoCategory,
                    upiId,
                    selectedUpi,
                    bid1,
                    cutOff,
                    isChecked,
                    bid2,
                    cutOff2,
                    isChecked2,
                    bid3,
                    cutOff3,
                    isChecked3,
                    setTermsAccepted,
                    termsAccepted,
                    clearFn,
                    setStatus,
                    calculateAmountPayable,
                    authToken
                  )
                }
                disabled={!termsAccepted}
                className={`px-4 py-2 rounded font-semibold ${termsAccepted
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-gray-300 text-gray-600 cursor-not-allowed'
                  }`}
              >
                Submit
              </button>
            </div>


            {/*over */}

          </div>

        </div>
      )}
    </div>
  );
};

export default Ipo;


// selectedUpi