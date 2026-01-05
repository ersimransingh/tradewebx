"use client";
import { useTheme } from "@/context/ThemeContext";
import { useState } from "react";

const Repledge = () => {
  const { colors } = useTheme();

  const [selectedRows, setSelectedRows] = useState<any[]>([]);

  const demoData = [
    {
      ScripCode: '500325',
      ScripName: 'Reliance Industries',
      ISIN: 'INE002A01018',
      Rate: '2700.50',
      Qty: '100',
      PledgeReqNo: 'PRN123456',
      PledgePSN: 'PSN987654',
    },
    {
      ScripCode: '532540',
      ScripName: 'TCS',
      ISIN: 'INE467B01029',
      Rate: '3500.00',
      Qty: '50',
      PledgeReqNo: 'PRN654321',
      PledgePSN: 'PSN123789',
    },
  ];

  const onCheckBoxClick = (checked: boolean, row: any) => {
    if (checked) {
      // Add to selected
      setSelectedRows((prev) => [...prev, row]);

    } else {
      // Remove from selected
      setSelectedRows((prev) =>
        prev.filter((item) => item.PledgeReqNo !== row.PledgeReqNo)
      );

    }


  };

  return (
    <>
      <div className="h-auto p-4">
        <h1 className="text-xl font-semibold text-center mb-4">Repledge</h1>

        <div className="overflow-x-auto">
          <table
            style={{ border: `1px solid ${colors?.color1 || '#f0f0f0'}` }}
            className="min-w-full border"
          >
            <thead
              style={{ border: `1px solid ${colors?.color1 || '#f0f0f0'}` }}
            >
              <tr>
                <th className="border px-4 py-2">ScripCode</th>
                <th className="border px-4 py-2">ScripName</th>
                <th className="border px-4 py-2">ISIN</th>
                <th className="border px-4 py-2">Rate</th>
                <th className="border px-4 py-2">Qty</th>
                <th className="border px-4 py-2">Pledge Req No</th>
                <th className="border px-4 py-2">Pledge PSN</th>
                <th className="border px-4 py-2">Select</th>
              </tr>
            </thead>
            <tbody>
              {demoData.map((row, index) => (
                <tr key={index} className="text-center">
                  <td className="border px-4 py-2">{row.ScripCode}</td>
                  <td className="border px-4 py-2">{row.ScripName}</td>
                  <td className="border px-4 py-2">{row.ISIN}</td>
                  <td className="border px-4 py-2">{row.Rate}</td>
                  <td className="border px-4 py-2">{row.Qty}</td>
                  <td className="border px-4 py-2">{row.PledgeReqNo}</td>
                  <td className="border px-4 py-2">{row.PledgePSN}</td>
                  <td className="border px-4 py-2">
                    <input
                      type="checkbox"
                      checked={selectedRows.some(
                        (item) => item.PledgeReqNo === row.PledgeReqNo
                      )}
                      onChange={(e) => onCheckBoxClick(e.target.checked, row)}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-4">
          <h2 className="font-bold">Selected Rows:</h2>
          <pre>{JSON.stringify(selectedRows, null, 2)}</pre>
        </div>
      </div>
    </>
  );
};

export default Repledge;
