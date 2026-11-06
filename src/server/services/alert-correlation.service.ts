import {
  getCorrelationEvents,
  getCorrelationClusters,
  type CorrelationEventFilters,
} from "@/server/db/queries/alert-correlation.queries";

export class AlertCorrelationService {
  async list(filters: CorrelationEventFilters) {
    return getCorrelationEvents(filters);
  }

  async clusters(filters: CorrelationEventFilters) {
    return getCorrelationClusters(filters);
  }
}

export const alertCorrelationService = new AlertCorrelationService();
