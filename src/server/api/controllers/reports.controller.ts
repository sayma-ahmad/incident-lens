import { Elysia } from "elysia";
import { reportsService } from "@/server/services/reports.service";

export const reportsController = new Elysia()
  .get("/reports/data", async ({ set }) => {
    try {
      return await reportsService.getDataReport();
    } catch (error) {
      console.error("GET /api/reports/data failed:", error);
      set.status = 500;
      return { error: "Unable to generate the data and mapping report." };
    }
  })
  .get("/reports/baseline", async ({ set }) => {
    try {
      return await reportsService.getBaselineReport();
    } catch (error) {
      console.error("GET /api/reports/baseline failed:", error);
      set.status = 500;
      return { error: "Unable to generate the baseline report." };
    }
  });
