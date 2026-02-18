export interface DigitalLogEmailProps {
    data: any[]; // Raw data from props, to be mapped to TradeRow
    settings?: any;
    filters?: any;
    isAutoWidth?: boolean;
    handleRefresh?: () => void;
}
