import {
  getAlfaTicketPrefixCounts,
  getAssignmentGroupDepartmentComparison,
  getBusiestPeriods,
  getClosureStats,
  getCorrelationSummary,
  getDailyVolumes,
  getDepartmentVolumes,
  getMappingCoverageByContactType,
  getMappingSummary,
  getMatchesByMethod,
  getRepeatedSubjects,
  getSourceCounts,
  getTimeDifferenceStats,
  getUnmatchedSample,
} from "@/server/db/queries/reports.queries";

export class ReportsService {
  async getDataReport() {
    const [
      sourceCounts,
      prefixCounts,
      correlationSummary,
      matchMethods,
      mappingSummary,
      coverage,
      unmatchedSample,
      departmentComparison,
      timeDifferenceStats,
    ] = await Promise.all([
      getSourceCounts(),
      getAlfaTicketPrefixCounts(),
      getCorrelationSummary(),
      getMatchesByMethod(),
      getMappingSummary(),
      getMappingCoverageByContactType(),
      getUnmatchedSample(),
      getAssignmentGroupDepartmentComparison(),
      getTimeDifferenceStats(),
    ]);

    return {
      sourceCounts,
      alfaTicketPrefixCounts: prefixCounts,
      correlationSummary: correlationSummary[0],
      matchesByMethod: matchMethods,
      mappingSummary: mappingSummary[0],
      mappingCoverageByContactType: coverage,
      unmatchedSample,
      assignmentGroupDepartmentComparison: departmentComparison,
      timeDifferenceStats: timeDifferenceStats[0],
      timestampAssumption:
        "Per PM confirmation, timezone-naive timestamps are interpreted as IST (Asia/Kolkata). Alfa Closed Created On values with an explicit Z suffix are UTC. Missing timestamps remain NULL.",
      timeDifferenceScope:
        "Time-difference statistics include only links where time_difference_seconds was recorded. Exact incident correlation-ID matches store absolute lag, while service-request matches have NULL lag because the source lacks created_on.",
    };
  }

  async getBaselineReport() {
    const [
      dailyVolumes,
      closureStats,
      busiestPeriods,
      repeatedSubjects,
      departmentVolumes,
    ] = await Promise.all([
      getDailyVolumes(),
      getClosureStats(),
      getBusiestPeriods(),
      getRepeatedSubjects(),
      getDepartmentVolumes(),
    ]);

    return {
      period: {
        from: "2026-10-01",
        through: "2026-10-15",
        timezone: "Asia/Kolkata",
      },
      dailyVolumes,
      closureStats: closureStats[0],
      busiestPeriods,
      repeatedSubjects,
      departmentVolumes,
      notes: [
        "Daily volumes count source records, including duplicate source rows.",
        "Busy periods combine Alfa records and MSOLVE incidents; service requests are excluded.",
        "Department volumes are based on Alfa records.",
        "Dates use IST calendar boundaries. Alfa Closed Created On values with explicit Z suffix are interpreted as UTC.",
      ],
    };
  }
}

export const reportsService = new ReportsService();
