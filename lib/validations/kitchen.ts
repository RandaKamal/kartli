import { z } from "zod";

export const kitchenSpaceTypeSchema = z.enum([
  "FLATSHARE",
  "FAMILY",
  "OFFICE",
  "NEUTRAL",
]);

export const updateKitchenSettingsSchema = z.object({
  kitchenId: z.string().min(1),
  name: z.string().min(1, "Kitchen name is required").max(255, "Kitchen name cannot exceed 255 characters"),
  space_type: kitchenSpaceTypeSchema,
});

export type UpdateKitchenSettingsSchemaInput = z.infer<typeof updateKitchenSettingsSchema>;
