export interface IpoItem {
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
    IPO_NSE_Symbol: string;
  }



  export interface IpoRow {
    // API response fields
    IPO_Company_Name: string;
    IPO_Category: string;
    start_date?: string;
    end_date?: string;
    price_range: string;
    tick_size: string;
    min_order: number;
    rhp?: string;
  
    ApplyFlag: 'Y' | 'N';
    status?: string;
    StatusFlag: 'Y' | 'N';
  
    DPRemarks?: string;
    BankRemarks?: string;
    DeleteFlag?: 'Y' | 'N';
  
    // IPO specific business fields
    IPO_Discount: string;
    IPO_Category_Descp: string;
    IPO_NSE_Symbol: string;
    IPOFlag: string;
  
    // Derived / helper-mapped fields (used by UI logic)
    discount?: number;
    minimumOrder?: number;
    priceRange?: string;
    scripCode?: string;
    ipoCategory?: string;
    category?: string; 
  }


//   IPO_Discount, IPO_Category_Descp, IPOFlag


  
export interface UpiOption {
    Value: string;
    DisplayName: string;
  }

  export type BidType = 'bid1' | 'bid2' | 'bid3';


  export interface SubmitBidPayload {
    clientCode: string;
    scripCode: string;
    category: string;
    UPIId: string;
    bid1: number | '';
    cutOff: number | '';
    cutOffFlag: boolean;
    bid2: number | '';
    cutOff2: number | '';
    cutOffFlag2: boolean;
    bid3: number | '';
    cutOff3: number | '';
    cutOffFlag3: boolean;
  }



  export interface IpoRowSymbol {
    IPO_NSE_Symbol: string;
    IPO_Category: string;
  }

  export interface SelectableIpo {
    IPO_NSE_Symbol: string;
    price_range: string;   // "603.00 - 610.00"
    min_order: number;
    category?: string;     // optional (safe for future use)
      // Used by helpers
  IPO_Discount?: number | string;
  IPO_Category_Descp?: string;
  IPOFlag?: string;
  IPO_Category: string;
  }


  export interface IpoBidContext {
    IPO_NSE_Symbol: string;
    price_range: string;
    min_order: number;
  
    // Used by helpers
    IPO_Discount?: number | string;
    IPO_Category_Descp?: string;
    IPOFlag?: string;
  }
  

 
  
  

  