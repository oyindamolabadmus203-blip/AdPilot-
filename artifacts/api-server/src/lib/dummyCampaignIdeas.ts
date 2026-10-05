import {
  type CampaignConcept,
  type CampaignIdeaRevisionInput,
  type CampaignIdeasInput,
} from "@workspace/api-zod";

const trimSentence = (value: string, limit = 180): string => {
  const clean = value.replace(/\s+/g, " ").trim();
  if (clean.length <= limit) return clean;
  const boundary = clean.lastIndexOf(" ", limit - 1);
  return `${clean.slice(0, boundary > 80 ? boundary : limit).trimEnd()}…`;
};

const callToActionFor: Record<CampaignIdeasInput["objective"], string> = {
  enquiries: "Get in touch",
  sales: "Explore offerings",
  website_visits: "Learn more",
  awareness: "Discover more",
};

function conceptCopy(
  angleIndex: number,
  businessName: string,
  productsServices: string,
  description: string,
  targetAudience: string,
): string {
  const name = businessName || "your business";
  const offering = productsServices || "the products or services you describe";
  const audience = targetAudience
    ? `For ${targetAudience}, `
    : "";
  const context = description ? ` ${description}` : "";

  switch (angleIndex) {
    case 0:
      return trimSentence(`${name} offers ${offering}.${context}`);
    case 1:
      return trimSentence(`${audience}explore ${offering} from ${name}.${context}`);
    default:
      return trimSentence(
        `Take a closer look at ${offering} from ${name}.${context}`,
      );
  }
}

export function generateCampaignIdeas(
  input: CampaignIdeasInput,
): CampaignConcept[] {
  const businessName = input.businessName.trim();
  const productsServices = input.productsServices.trim();
  const businessDescription = input.businessDescription.trim();
  const targetAudience = input.targetAudience.trim();
  const mediaDescriptions = input.mediaDescriptions;
  const headlineVariants = [
    `Explore ${productsServices}`,
    `Meet ${businessName}`,
    `A closer look at ${productsServices}`,
  ];
  const angles = [
    "A clear introduction",
    "Speak to your selected audience",
    "Take a closer look",
  ];

  return [0, 1, 2].map((index) => {
    const mediaDescription = mediaDescriptions[index] ?? null;
    const platform = input.platforms[index % input.platforms.length];
    const audience = targetAudience || "Your campaign's selected audience";
    const storyboard =
      mediaDescription?.toLowerCase().startsWith("video:")
        ? `Opening: show the video you selected. On-screen text: “${trimSentence(
            headlineVariants[index],
            55,
          )}”. Closing: show ${businessName} and “${callToActionFor[input.objective]}”.`
        : null;

    return {
      angle: angles[index],
      headline: trimSentence(headlineVariants[index], 60),
      primaryCopy: conceptCopy(
        index,
        businessName,
        productsServices,
        businessDescription,
        targetAudience,
      ),
      callToAction: callToActionFor[input.objective],
      mediaDescription,
      storyboard,
      platform,
      audience,
      explanation: mediaDescription
        ? "A starter direction based on the details you typed and the media description you supplied. Dummy did not inspect the file itself."
        : "A starter direction based only on the business details and audience you supplied.",
    };
  });
}

export function reviseCampaignIdea(
  input: CampaignIdeaRevisionInput,
): CampaignConcept {
  const { concept, direction } = input;
  const name = input.businessName.trim() || "your business";
  const offering =
    input.productsServices.trim() || "the products or services you described";

  const revision: Record<CampaignIdeaRevisionInput["direction"], string> = {
    shorter: `Explore ${offering} from ${name}.`,
    warmer: `Take a moment to explore ${offering} from ${name}.`,
    clearer: `${name} offers ${offering}.`,
    different_angle: `A closer look at ${offering}, from ${name}.`,
  };

  return {
    ...concept,
    angle:
      direction === "different_angle"
        ? "A different angle"
        : `${concept.angle} — ${direction}`,
    headline:
      direction === "different_angle"
        ? trimSentence(`A closer look at ${offering}`, 60)
        : concept.headline,
    primaryCopy: trimSentence(revision[direction]),
    explanation:
      "Revised using a fixed writing rule and only the business details you supplied. This is not AI-generated.",
  };
}
