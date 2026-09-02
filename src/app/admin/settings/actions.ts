"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/authConfig";
import { setFeatureToggle } from "@/lib/settings";

export async function toggleHealthId(formData: FormData) {
  const session = await auth();
  const enabled = formData.get("enabled") === "true";
  await setFeatureToggle("healthIdEnabled", enabled, (session?.user as any)?.providerId || "unknown");
  revalidatePath("/admin/settings");
  revalidatePath("/admin");
}

export async function toggleProviderId(formData: FormData) {
  const session = await auth();
  const enabled = formData.get("enabled") === "true";
  await setFeatureToggle("providerIdEnabled", enabled, (session?.user as any)?.providerId || "unknown");
  revalidatePath("/admin/settings");
  revalidatePath("/admin");
}
