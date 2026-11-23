export type Language = 'en' | 'ar';
export type Theme = 'light' | 'dark';
export type NavView =
  | 'dashboard'
  | 'calculator'
  | 'invoices'
  | 'reports'
  | 'assistant'
  | 'library'
  | 'settings';

export type TaxCode = 'TVA' | 'IBS' | 'IRG' | 'IFU' | 'TAP' | 'TIMBRE' | 'CUSTOM';

export type CalculationMode = 'forward_ht' | 'reverse_ttc' | 'direct_base';

export interface TaxRateOption {
  id: string;
  rate: number;
  labelEn: string;
  labelAr: string;
}

export interface TaxRuleConfig {
  id: string;
  code: TaxCode;
  nameEn: string;
  nameAr: string;
  acronym: string;
  defaultRate: number;
  rateOptions: TaxRateOption[];
  effectiveDate: string; // YYYY-MM-DD
  legalReferenceEn: string;
  legalReferenceAr: string;
  requiresVerification: boolean;
  verificationNoteEn: string;
  verificationNoteAr: string;
  calculationNature: 'indirect_vat' | 'direct_profit_income' | 'flat_turnover' | 'stamp';
  isUserModified?: boolean;
}

export type InvoiceStatus = 'paid' | 'pending' | 'draft';

export interface Invoice {
  id: string;
  invoiceNumber: string;
  clientName: string;
  clientNif?: string;
  description: string;
  date: string; // YYYY-MM-DD
  taxRuleId: string;
  taxCode: TaxCode;
  taxRate: number;
  amountHT: number;
  taxAmount: number;
  amountTTC: number;
  status: InvoiceStatus;
  notes?: string;
  createdAt: string;
}

export interface CalculatorSnapshot {
  mode: CalculationMode;
  taxRuleId: string;
  taxCode: TaxCode;
  taxNameEn: string;
  taxNameAr: string;
  rate: number;
  amountHT: number;
  taxAmount: number;
  amountTTC: number;
  transactionDate: string;
  effectiveDate: string;
}

export interface UserPreferences {
  language: Language;
  theme: Theme;
  entityName: string;
  entityNif: string;
  showLegalNotices: boolean;
  currencyDisplay: 'code' | 'symbol';
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: string;
  error?: boolean;
}
