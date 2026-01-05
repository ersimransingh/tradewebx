// src/types/bodProcessTypes.ts

// Validation modal type
export interface ValidationModalState {
    isOpen: boolean;
    message: string;
    type: 'M' | 'S' | 'E' | 'D';
  }
  
  // API data structure (you can refine these keys later)
  export interface BodProcessRow {
    ProcessName?: string;
    LastUpdated?: string;
    [key: string]: string | number | boolean | null | undefined; // fallback for dynamic keys
  }

  export type CheckedRowsType = boolean[];

  