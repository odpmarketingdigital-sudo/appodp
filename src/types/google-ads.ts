export type GoogleAdsCustomerOption = {
  customerId: string;
  resourceName: string;
};

export type GoogleAdsCustomersListResult =
  | { ok: true; customers: GoogleAdsCustomerOption[] }
  | { ok: false; error: string; customers: GoogleAdsCustomerOption[] };
