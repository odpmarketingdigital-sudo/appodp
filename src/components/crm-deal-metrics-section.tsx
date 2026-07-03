import { CrmDealMetricsDashboard } from "@/components/crm-deal-metrics-dashboard";
import { getDealMetrics } from "@/lib/integrations/activecampaign-api";

import type { DateRange } from "@/types/integrations";

type CrmDealMetricsSectionProps = {
  apiBaseUrl: string;
  apiToken: string;
  range: DateRange;
  pipelineId: string;
};

export async function CrmDealMetricsSection({
  apiBaseUrl,
  apiToken,
  range,
  pipelineId,
}: CrmDealMetricsSectionProps) {
  let report;
  try {
    report = await getDealMetrics(
      apiBaseUrl,
      apiToken,
      range,
      pipelineId,
    );
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Não foi possível carregar os negócios do ActiveCampaign.";

    return (
      <div
        role="alert"
        className="rounded-xl border border-red-900/50 bg-red-950/40 px-4 py-3 text-sm text-red-300"
      >
        {message}
      </div>
    );
  }

  return <CrmDealMetricsDashboard report={report} />;
}
