import type { ActiveCampaignTokenMetadata } from "@/types/activecampaign";

export function parseActiveCampaignMetadata(
  metadata: unknown,
): ActiveCampaignTokenMetadata {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return {};
  }

  const record = metadata as Record<string, unknown>;
  return {
    pipelineId:
      typeof record.pipelineId === "string" ? record.pipelineId : undefined,
  };
}
