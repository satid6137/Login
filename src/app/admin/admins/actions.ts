"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/authConfig";
import { prisma } from "@/lib/db";

export async function addAdmin(formData: FormData) {
  const providerId = (formData.get("providerId") as string)?.trim();
  const name = (formData.get("name") as string)?.trim() || null;
  if (!providerId) return;

  const session = await auth();
  await prisma.adminWhitelist.upsert({
    where: { providerId },
    update: { name },
    create: { providerId, name, addedBy: (session?.user as any)?.providerId || "unknown" },
  });
  revalidatePath("/admin/admins");
}

export async function removeAdmin(formData: FormData) {
  const id = Number(formData.get("id"));
  await prisma.adminWhitelist.delete({ where: { id } });
  revalidatePath("/admin/admins");
}
