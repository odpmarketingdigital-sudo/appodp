export type GoogleAdsCustomerOption = {
  customerId: string;
  resourceName: string;
  descriptiveName?: string | null;
  /** ID da MCC (login-customer-id) quando a conta é acessada via gerenciador. */
  managerCustomerId?: string | null;
  isManager?: boolean;
};

export type GoogleAdsCustomersListResult =
  | { ok: true; customers: GoogleAdsCustomerOption[] }
  | { ok: false; error: string; customers: GoogleAdsCustomerOption[] };

export type GoogleAdsCampaignPerformanceRow = {
  campaignId: string;
  name: string;
  status: string;
  spend: number;
  impressions: number;
  clicks: number;
  conversions: number;
  /** CTR em percentual (ex.: 2.35 = 2,35%). */
  ctr: number;
  /** Custo por conversão (CPL). Null quando não há conversões. */
  cpl: number | null;
  isActive: boolean;
};

export type GoogleAdsCampaignPerformanceResult =
  | { ok: true; campaigns: GoogleAdsCampaignPerformanceRow[] }
  | { ok: false; error: string; campaigns: GoogleAdsCampaignPerformanceRow[] };
