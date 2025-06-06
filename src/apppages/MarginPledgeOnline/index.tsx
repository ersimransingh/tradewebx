'use client';
import { useTheme } from '@/context/ThemeContext';
import React, { useEffect, useState } from 'react';
import { decimalFormat, dropDownApiCall, rightAlignKeys, tableApiCall } from './marginConst';
import axios from 'axios';
import { BASE_URL, PATH_URL } from '@/utils/constants';

type TableRow = {
  [key: string]: any;
  ReqValue: string;
  Value: string;
};

const initialTableData: TableRow[] = [];

export default function MarginPledgeOnline() {
  const { colors } = useTheme();
  const [tableData, setTableData] = useState<TableRow[]>(initialTableData);
  const [selectAll, setSelectAll] = useState(false);
  const [dematId, setDematId] = useState([]);
  const [selectedDemat, setSelectedDemat] = useState<{ DPAccountNo: string; DPType: string } | null>(null);
  const [tableHeaders, setTableHeaders] = useState<string[]>([]);
  const [tableRows, setTableRows] = useState<any[]>([]);
  const [tableVisible, setTableVisible] = useState<boolean>(false);
  const [pledgeRedirectData, setPledgeRedirectData] = useState<any>([]);
  const [buttonDisable, setButtonDisable] = useState<boolean>(true);

  useEffect(() => {
    dropDownApiCall(setDematId);
  }, []);

  useEffect(() => {
    const fetchTableBody = async () => {
      await tableApiCall(selectedDemat, setTableHeaders, (rows) => {
        setTableRows(rows);
        const enrichedRows = rows.map(row => ({
          ...row,
          ReqValue: '',
          Value: '',
        }));
        setTableData(enrichedRows);
      });
    };
    if (selectedDemat) fetchTableBody();
  }, [selectedDemat]);

  const parseNumber = (val: string | number | undefined | null): number => {
    const cleaned = (val || '').toString().replace(/%$/, '');
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? 0 : parsed;
  };

  const formatValue = (key: string, val: string) => {
    if (key === 'Haircut') return val;
    const num = parseFloat(val);
    const decimals = decimalFormat[key];
    if (isNaN(num) || decimals === undefined) return val;
    return num.toFixed(decimals);
  };

  const handleReqValueChange = (e: React.ChangeEvent<HTMLInputElement>, rowIndex: number) => {
    const val = e.target.value;
    if (val === '') {
      updateReqValue(rowIndex, '', '');
      return;
    }
    if (!/^[\d]*\.?[\d]*$/.test(val)) return;
    updateReqValue(rowIndex, val, '');
  };

  const handleReqValueBlur = (rowIndex: number) => {
    const reqQty = parseNumber(tableData[rowIndex].ReqValue);
    const TotalQty = parseNumber(tableData[rowIndex].TotalQty);
    if (reqQty > TotalQty) {
      alert('Requested quantity cannot be greater than TotalQty value!');
      updateReqValue(rowIndex, '', '');
      return;
    }
    const closingPrice = parseNumber(tableData[rowIndex].ClosingPrice);
    const haircut = parseNumber(tableData[rowIndex].Haircut);
    const value = ((reqQty * closingPrice * (100 - haircut)) / 100).toFixed(2);
    updateReqValue(rowIndex, tableData[rowIndex].ReqValue, value.toString());
  };

  const updateReqValue = (rowIndex: number, reqVal: string, value: string = '') => {
    const updated = [...tableData];
    updated[rowIndex].ReqValue = reqVal;
    updated[rowIndex].Value = value;
    setTableData(updated);
  };

  const handleSelectAll = () => {
    const newState = !selectAll;
    const updated = tableData.map((row) => {
      if (!newState) return { ...row, ReqValue: '', Value: '' };
      const TotalQty = parseNumber(row.TotalQty);
      const closingPrice = parseNumber(row.ClosingPrice);
      const haircut = parseNumber(row.Haircut);
      const value = (TotalQty * closingPrice * ((100 - haircut) / 100)).toFixed(2);
      return { ...row, ReqValue: String(TotalQty), Value: value };
    });
    setTableData(updated);
    setSelectAll(newState);
  };

  const getTotal = (key: keyof TableRow) =>
    tableData.reduce((sum, row) => sum + parseNumber(row[key]), 0).toFixed(2);

  const extendedHeaders = [...tableHeaders];
  if (!extendedHeaders.includes('ReqValue')) extendedHeaders.push('ReqValue');
  if (!extendedHeaders.includes('Value')) extendedHeaders.push('Value');

  useEffect(() => {
    const pos = tableData.filter((ele) => ele.ReqValue);
    setButtonDisable(pos.length === 0);
  }, [tableData]);

  const tableAllData = async () => {
    const tableDataPost = `
      <dsXml>
        <J_Ui>"ActionName":"Tradeweb", "Option":"PostData","RequestFrom":"W"</J_Ui>
        <Sql/>
        <X_Filter>
          <ClientCode>${localStorage.getItem('userId')}</ClientCode>
          <DematActNo>${selectedDemat?.DPAccountNo}</DematActNo>
          <DPType>${selectedDemat?.DPType}</DPType>
        </X_Filter>
        <X_Data>
          ${tableData.filter(t => parseFloat(t.ReqValue) > 0).map(t => `
            <HOLDING>
              <ClientCode>${localStorage.getItem('userId')}</ClientCode>
              <ScripCode>${t.ScripCode}</ScripCode>
              <ISIN>${t.ISIN}</ISIN>
              <ISINName>${t.ScripName}</ISINName>
              <Qty>${t.ReqValue}</Qty>
              <Value>${t.Value}</Value>
              <DPAccountNo>${selectedDemat?.DPAccountNo}</DPAccountNo>
            </HOLDING>
          `).join('')}
        </X_Data>
        <J_Api>"UserId":"${localStorage.getItem('userId')}","AccYear":24,"MyDbPrefix":"SVVS","MenuCode":0,"ModuleID":0,"MyDb":null,"DenyRights":null</J_Api>
      </dsXml>
    `;
    try {
      const request = await axios.post(BASE_URL + PATH_URL, tableDataPost, {
        headers: {
          'Content-Type': 'application/xml',
          'Authorization': `Bearer ${document.cookie.split('auth_token=')[1]}`
        }
      });
      if (request.data.success === true) {
        setPledgeRedirectData(request.data.data.rs0);
      }
    } catch (error) {
      console.log(error);
    }
  };

  const pledgeRedirectApiCall = () => {
    try {
      const redirectData = pledgeRedirectData?.[0]?.DATA;
      if (!redirectData) return;

      const { APIUrl, DPId, ReqId, Version } = redirectData.Param;
      const pledgedtls = redirectData.JsonOutput;

      const form = document.createElement('form');
      form.method = 'POST';
      form.action = APIUrl;
      form.target = '_blank';
      form.style.display = 'none';

      const addHiddenField = (name: string, value: string) => {
        const input = document.createElement('input');
        input.type = 'hidden';
        input.name = name;
        input.value = value;
        form.appendChild(input);
      };

      addHiddenField('DPId', DPId);
      addHiddenField('ReqId', ReqId);
      addHiddenField('Version', Version);
      addHiddenField('pledgedtls', pledgedtls);

      document.body.appendChild(form);
      form.submit();
      setTimeout(() => document.body.removeChild(form), 1000);
    } catch (error) {
      console.error("Pledge API Error:", error);
    }
  };

  useEffect(() => {
    if (pledgeRedirectData.length > 0) pledgeRedirectApiCall();
  }, [pledgeRedirectData]);

  return (
    <div className="px-2 sm:px-4">
      <h1 className="text-center text-lg font-semibold mb-4">Pledge For Margin (Online)</h1>

      <div className="flex justify-center mb-4">
        <select
          className="border border-gray-500 rounded px-2 h-[30px] my-2 w-full max-w-xs appearance-none"
          style={{ backgroundColor: colors.textInputBackground }}
          value={selectedDemat ? selectedDemat.DPAccountNo : ''}
          onChange={(e) => {
            const selected = dematId.find(d => d.DPAccountNo === e.target.value);
            setSelectedDemat(selected || null);
            setTableVisible(!!selected);
          }}
        >
          <option value="" disabled>Select Demat A/C No</option>
          {dematId.map((item, idx) => (
            <option key={idx} value={item.DPAccountNo}>
              {item.DPAccountNo} ({item.DPType})
            </option>
          ))}
        </select>
      </div>

      {tableVisible && (
        <div className="flex justify-center">
          <div className="overflow-auto sm:overflow-visible w-full max-w-[80%]">
            <table className="min-w-full text-sm border-collapse" style={{ border: `1px solid ${colors?.color1 || '#f0f0f0'}`, backgroundColor: colors.textInputBackground }}>
              <thead>
                <tr>
                  {extendedHeaders.map((key, index) => (
                    <th
                      key={index}
                      className={`p-2 ${rightAlignKeys.includes(key) ? 'text-right' : 'text-center'}`}
                      style={{
                        border: `1px solid ${colors?.color1 || '#f0f0f0'}`,
                        background: colors?.primary || '#f0f0f0',
                        width: ['ReqValue'].includes(key) ? '130px' : undefined,
                      }}
                    >
                      {key}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tableData.map((row, rowIndex) => (
                  <tr key={rowIndex}>
                    {extendedHeaders.map((header, colIndex) => (
                      <td
                        key={colIndex}
                        className="px-2 py-1 text-sm"
                        style={{ border: `1px solid ${colors?.color1 || '#f0f0f0'}` }}
                      >
                        {header === 'ReqValue' ? (
                          <input
                            type="text"
                            className="border border-gray-300 rounded w-full px-1 text-right"
                            value={row.ReqValue}
                            onChange={(e) => handleReqValueChange(e, rowIndex)}
                            onBlur={() => handleReqValueBlur(rowIndex)}
                          />
                        ) : header === 'Value' ? (
                          <div className="text-right">{row.Value}</div>
                        ) : (
                          <div className={`${rightAlignKeys.includes(header) ? 'text-right' : 'text-left'}`}>
                            {formatValue(header, row[header])}
                          </div>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
                <tr className="font-semibold">
                  {extendedHeaders.map((header, index) => {
                    const totalKeys = ['TotalQty', 'NetValue', 'ReqValue', 'Value'];
                    const isTotal = totalKeys.includes(header);
                    return (
                      <td
                        key={index}
                        className={`p-2 ${rightAlignKeys.includes(header) ? 'text-right' : 'text-left'}`}
                        style={{ border: `1px solid ${colors?.color1 || '#f0f0f0'}` }}
                      >
                        {index === 0 ? 'Total:' : isTotal ? getTotal(header as keyof TableRow) : ''}
                      </td>
                    );
                  })}
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tableVisible && (
        <>
          <div className="flex justify-end w-full max-w-[80%] mx-auto mt-2">
            <label className="text-sm">
              <input type="checkbox" className="mr-2" checked={selectAll} onChange={handleSelectAll} />
              Select All
            </label>
          </div>
          <div className="flex justify-center items-center mt-4">
            <button
              onClick={tableAllData}
              disabled={buttonDisable}
              style={{
                backgroundColor: buttonDisable ? '#ccc' : colors.primary,
                cursor: buttonDisable ? 'not-allowed' : 'pointer',
              }}
              className={`text-white py-2 px-8 rounded-md shadow-lg transform transition-transform duration-200 ease-in-out font-medium ${buttonDisable ? 'opacity-50' : 'active:scale-90'}`}
            >
              OK
            </button>
          </div>
        </>
      )}
    </div>
  );
}
