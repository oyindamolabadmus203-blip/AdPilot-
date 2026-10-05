import { getAuth } from "@clerk/express";
import {
  and,
  count,
  desc,
  eq,
} from "drizzle-orm";
import {
  CreateCampaignBody,
  CreateCampaignResponse,
  DeleteCampaignParams,
  GenerateCampaignIdeasBody,
  GenerateCampaignIdeasResponse,
  GetBusinessProfileResponse,
  GetCampaignParams,
  GetCampaignResponse,
  GetDashboardSummaryResponse,
  ListCampaignsResponse,
  ReviseCampaignIdeaBody,
  ReviseCampaignIdeaResponse,
  SaveBusinessProfileBody,
  SaveBusinessProfileResponse,
  UpdateCampaignBody,
  UpdateCampaignParams,
  UpdateCampaignResponse,
} from "@workspace/api-zod";
import {
  adpilotCampaignsTable,
  adpilotProfilesTable,
  db,
} from "@workspace/db";
import {
  type Request,
  type Response,
  Router,
  type IRouter,
} from "express";
import {
  generateCampaignIdeas,
  reviseCampaignIdea,
} from "../lib/dummyCampaignIdeas";

const router: IRouter = Router();

function authenticatedUserId(req: Request, res: Response): string | null {
  const userId = getAuth(req).userId;
  if (!userId) {
    res.status(401).json({ error: "Sign in to access your AdPilot workspace." });
    return null;
  }
  return userId;
}

function serializeCampaign(
  campaign: typeof adpilotCampaignsTable.$inferSelect,
) {
  return {
    ...campaign,
    createdAt: campaign.createdAt.toISOString(),
    updatedAt: campaign.updatedAt.toISOString(),
  };
}

function toCalendarDate(
  value: string | Date | null | undefined,
): string | null | undefined {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return value;
}

const emptyProfile = {
  businessName: "",
  businessDescription: "",
  productsServices: "",
  websiteUrl: null,
  businessLocation: "",
  advertisingLocations: [],
  targetAudience: "",
  language: "English",
  objective: "enquiries" as const,
  brandColors: [],
  preferredTone: "Clear and friendly",
  currency: "NGN",
  timeZone: "Africa/Lagos",
  dailyBudget: null,
  totalBudget: null,
  startDate: null,
  endDate: null,
};

router.get("/profile/me", async (req, res): Promise<void> => {
  const userId = authenticatedUserId(req, res);
  if (!userId) return;

  const [row] = await db
    .select()
    .from(adpilotProfilesTable)
    .where(eq(adpilotProfilesTable.userId, userId));

  const profile = row ? SaveBusinessProfileBody.parse(row.data) : emptyProfile;
  res.json(
    GetBusinessProfileResponse.parse({
      ...profile,
      updatedAt: row?.updatedAt.toISOString() ?? new Date().toISOString(),
    }),
  );
});

router.put("/profile/me", async (req, res): Promise<void> => {
  const userId = authenticatedUserId(req, res);
  if (!userId) return;

  const parsed = SaveBusinessProfileBody.safeParse(req.body);
  if (!parsed.success) {
    req.log.warn({ errors: parsed.error.message }, "Invalid business profile");
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [row] = await db
    .insert(adpilotProfilesTable)
    .values({ userId, data: parsed.data })
    .onConflictDoUpdate({
      target: adpilotProfilesTable.userId,
      set: { data: parsed.data, updatedAt: new Date() },
    })
    .returning();

  res.json(
    SaveBusinessProfileResponse.parse({
      ...parsed.data,
      updatedAt: row.updatedAt.toISOString(),
    }),
  );
});

router.get("/dashboard/summary", async (req, res): Promise<void> => {
  const userId = authenticatedUserId(req, res);
  if (!userId) return;

  const grouped = await db
    .select({ status: adpilotCampaignsTable.status, total: count() })
    .from(adpilotCampaignsTable)
    .where(eq(adpilotCampaignsTable.userId, userId))
    .groupBy(adpilotCampaignsTable.status);
  const recent = await db
    .select()
    .from(adpilotCampaignsTable)
    .where(eq(adpilotCampaignsTable.userId, userId))
    .orderBy(desc(adpilotCampaignsTable.updatedAt))
    .limit(5);
  const totals = new Map(grouped.map((row) => [row.status, row.total]));

  res.json(
    GetDashboardSummaryResponse.parse({
      campaignCount: grouped.reduce((sum, row) => sum + row.total, 0),
      draftCount: totals.get("draft") ?? 0,
      reviewCount: totals.get("ready_for_review") ?? 0,
      recentCampaigns: recent.map(serializeCampaign),
    }),
  );
});

router.post("/ideas", async (req, res): Promise<void> => {
  const userId = authenticatedUserId(req, res);
  if (!userId) return;

  const parsed = GenerateCampaignIdeasBody.safeParse(req.body);
  if (!parsed.success) {
    req.log.warn({ errors: parsed.error.message }, "Invalid campaign idea request");
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  if (!parsed.data.businessName.trim() || !parsed.data.productsServices.trim()) {
    res.status(400).json({
      error: "Add your business name and products or services before asking Dummy for ideas.",
    });
    return;
  }

  res.json(
    GenerateCampaignIdeasResponse.parse({
      mode: "rule_based",
      notice:
        "These are starter ideas created from the details you entered. Dummy is not using an AI model and does not inspect your files.",
      concepts: generateCampaignIdeas(parsed.data),
    }),
  );
});

router.post("/ideas/revise", async (req, res): Promise<void> => {
  const userId = authenticatedUserId(req, res);
  if (!userId) return;

  const parsed = ReviseCampaignIdeaBody.safeParse(req.body);
  if (!parsed.success) {
    req.log.warn({ errors: parsed.error.message }, "Invalid idea revision request");
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  res.json(ReviseCampaignIdeaResponse.parse(reviseCampaignIdea(parsed.data)));
});

router.get("/campaigns", async (req, res): Promise<void> => {
  const userId = authenticatedUserId(req, res);
  if (!userId) return;

  const campaigns = await db
    .select()
    .from(adpilotCampaignsTable)
    .where(eq(adpilotCampaignsTable.userId, userId))
    .orderBy(desc(adpilotCampaignsTable.updatedAt));
  res.json(ListCampaignsResponse.parse(campaigns.map(serializeCampaign)));
});

router.post("/campaigns", async (req, res): Promise<void> => {
  const userId = authenticatedUserId(req, res);
  if (!userId) return;

  const parsed = CreateCampaignBody.safeParse(req.body);
  if (!parsed.success) {
    req.log.warn({ errors: parsed.error.message }, "Invalid campaign draft");
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [campaign] = await db
    .insert(adpilotCampaignsTable)
    .values({
      ...parsed.data,
      userId,
      startDate: toCalendarDate(parsed.data.startDate),
      endDate: toCalendarDate(parsed.data.endDate),
    })
    .returning();
  res.status(201).json(
    CreateCampaignResponse.parse(serializeCampaign(campaign)),
  );
});

router.get("/campaigns/:campaignId", async (req, res): Promise<void> => {
  const userId = authenticatedUserId(req, res);
  if (!userId) return;

  const params = GetCampaignParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [campaign] = await db
    .select()
    .from(adpilotCampaignsTable)
    .where(
      and(
        eq(adpilotCampaignsTable.id, params.data.campaignId),
        eq(adpilotCampaignsTable.userId, userId),
      ),
    );
  if (!campaign) {
    res.status(404).json({ error: "Campaign not found." });
    return;
  }
  res.json(GetCampaignResponse.parse(serializeCampaign(campaign)));
});

router.patch("/campaigns/:campaignId", async (req, res): Promise<void> => {
  const userId = authenticatedUserId(req, res);
  if (!userId) return;

  const params = UpdateCampaignParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateCampaignBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  if (Object.keys(parsed.data).length === 0) {
    res.status(400).json({ error: "Add at least one change before saving." });
    return;
  }

  const [campaign] = await db
    .update(adpilotCampaignsTable)
    .set({
      ...parsed.data,
      startDate: toCalendarDate(parsed.data.startDate),
      endDate: toCalendarDate(parsed.data.endDate),
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(adpilotCampaignsTable.id, params.data.campaignId),
        eq(adpilotCampaignsTable.userId, userId),
      ),
    )
    .returning();
  if (!campaign) {
    res.status(404).json({ error: "Campaign not found." });
    return;
  }
  res.json(UpdateCampaignResponse.parse(serializeCampaign(campaign)));
});

router.delete("/campaigns/:campaignId", async (req, res): Promise<void> => {
  const userId = authenticatedUserId(req, res);
  if (!userId) return;

  const params = DeleteCampaignParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [campaign] = await db
    .delete(adpilotCampaignsTable)
    .where(
      and(
        eq(adpilotCampaignsTable.id, params.data.campaignId),
        eq(adpilotCampaignsTable.userId, userId),
      ),
    )
    .returning({ id: adpilotCampaignsTable.id });
  if (!campaign) {
    res.status(404).json({ error: "Campaign not found." });
    return;
  }
  res.status(204).end();
});

export default router;
