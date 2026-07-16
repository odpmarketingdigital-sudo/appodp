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
