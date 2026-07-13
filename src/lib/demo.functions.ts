import { createServerFn } from "@tanstack/react-start";
import { generateText, Output } from "ai";
import { z } from "zod";
import { createLovableAiGatewayProvider } from "./ai-gateway.server";

const Input = z.object({
  location: z.string().trim().min(2).max(120),
});

const Schema = z.object({
  region: z.string().describe("Normalized region name, e.g. 'Ado LGA, Ekiti State, Nigeria'"),
  climate: z.string().describe("One-sentence climate & rainfall summary"),
  soil: z.string().describe("One-sentence dominant soil type summary"),
  parcels: z.object({
    detected: z.number().int().min(20).max(9999),
    avgHectares: z.number().min(0.2).max(50),
  }),
  crops: z
    .array(
      z.object({
        name: z.string(),
        suitability: z.number().int().min(0).max(100),
        window: z.string().describe("Best planting window, e.g. 'Apr – Jun'"),
        note: z.string().describe("One short agronomic tip"),
      })
    )
    .min(3)
    .max(5),
  risks: z.array(z.string()).min(2).max(4).describe("Top disease/weather risks to watch"),
  advisory: z.string().describe("2-sentence action plan for a smallholder farmer"),
});

export type DemoAnalysis = z.infer<typeof Schema>;

export const analyzeLocation = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) => Input.parse(raw))
  .handler(async ({ data }): Promise<DemoAnalysis> => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("Missing LOVABLE_API_KEY");
    const gateway = createLovableAiGatewayProvider(key);

    const { output } = await generateText({
      model: gateway("google/gemini-2.5-flash"),
      output: Output.object({ schema: Schema }),
      system:
        "You are an agronomist for AgroPulse Fix, a digital agriculture platform for Nigeria and West Africa. Return realistic, region-appropriate crop suitability data. Prefer staple and cash crops actually grown in the requested area. Values must be plausible for smallholder farming.",
      prompt: `Location: "${data.location}". Produce a parcel-detection & crop suitability briefing.`,
    });

    return output;
  });
