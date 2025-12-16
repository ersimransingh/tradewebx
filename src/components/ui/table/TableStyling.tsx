import { useTheme } from '@/context/ThemeContext';
import React from 'react';

interface TableStylingProps {
  onRowClick?: (rowData: any) => void; // Optional row click handler
  screenSize?: 'mobile' | 'tablet' | 'web'; // Screen size for responsive styling
}


function TableStyling({ onRowClick, screenSize = 'web' }: TableStylingProps) {
  const { colors, fonts } = useTheme();

  return (
    <style jsx global>{`
      .rdg {
        block-size: 100%;
        border: 1px solid ${colors.textInputBorder};
        --rdg-header-background-color: ${colors.primary};
        --rdg-header-row-color: ${colors.buttonText};
        --rdg-background-color: ${colors.background};
        --rdg-row-hover-background-color: ${colors.color1};
      }
      
      .rdg-header-row {
        background-color: ${colors.primary};
        color: ${colors.buttonText};
        font-weight: 600;
      }

      ${screenSize === 'mobile' || screenSize === 'tablet' ? `
        .rdg-cell:first-child {
          display: flex;
          align-items: center;
          justify-content: center;
        }
      ` : ''}

      .rdg-cell {
        border-right: 1px solid ${colors.textInputBorder};
        border-bottom: 1px solid ${colors.textInputBorder};
        padding: 0 8px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        color: ${colors.text};
      }

      .numeric-column-header, .numeric-column-cell {
        text-align: right !important;
      }

      .numeric-value {
        text-align: right !important;
        width: 100% !important;
        display: block !important;
      }

      .rdg-row {
        cursor: ${onRowClick ? 'pointer' : 'default'};
      }

      .rdg-row:nth-child(even) {
        background-color: ${colors.evenCardBackground};
      }

      .rdg-row:nth-child(odd) {
        background-color: ${colors.oddCardBackground};
      }

      .rdg-row:hover {
        background-color: ${colors.color1} !important;
      }

      .rdg-header-sort-cell {
        cursor: pointer;
      }

      .rdg-header-sort-cell:hover {
        background-color: ${colors.primary}dd;
      }

      .expanded-content {
        position: relative;
        width: 100%;
        min-height: 200px;
        background-color: ${colors.background};
        border: 1px solid ${colors.textInputBorder};
        margin-top: 4px;
      }

      .expanded-header {
        position: absolute;
        top: 0;
        left: 0;
        width: 30px;
        height: 30px;
        display: flex;
        align-items: center;
        justify-content: center;
        background-color: ${colors.background};
        border-right: 1px solid ${colors.textInputBorder};
        border-bottom: 1px solid ${colors.textInputBorder};
      }

      .expanded-details {
        padding: 16px 16px 16px 46px;
        display: flex;
        flex-direction: column;
        gap: 8px;
      }

      .expanded-row-item {
        display: flex;
        align-items: flex-start;
      }

      .expanded-row-label {
        font-weight: bold;
        min-width: 150px;
        color: ${colors.text};
        padding-right: 16px;
      }

      .expanded-row-value {
        color: ${colors.text};
        flex: 1;
        word-break: break-word;
        display: flex;
        align-items: center;
      }

      .expanded-row-value > div {
        display: inline;
        width: 100%;
      }

      .expand-button {
        cursor: pointer;
        width: 100%;
        height: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 12px;
        background-color: transparent;
        border: none;
        color: ${colors.text};
      }

      .expand-button:hover {
        background-color: ${colors.color1};
      }

      .action-buttons {
        display: flex;
        gap: 8px;
      }

      .edit-button, .delete-button, .view-button {
        padding: 4px 10px;
        border: none;
        cursor: pointer;
        font-size: 12px;
        border-radius: 4px;
        transition: background-color 0.2s ease; 
      }
      
      .edit-button:disabled, 
      .delete-button:disabled {
        background-color: #e0e0e0;
        color: #a0a0a0;
        cursor: not-allowed;
      }
      .view-button {
        background-color: ${colors.primary};
        color: ${colors.buttonText};
      }
      .edit-button {
        background-color: ${colors.buttonBackground};
        color: ${colors.buttonText};
      }

      .delete-button {
        background-color: ${colors.errorText};
        color: ${colors.buttonText};
      }

      /* Detail Column Styles */
      .detail-column-cell {
        cursor: pointer;
      }

      .detail-column-value {
        color: #2563eb;
        font-weight: 500;
        text-decoration: none;
        transition: all 0.2s ease;
      }

      .detail-column-value:hover {
        text-decoration: underline;
        color: #1d4ed8;
      }

      .detail-column-header {
        color: #2563eb;
      }
    `}</style>
  );
}

export default TableStyling;