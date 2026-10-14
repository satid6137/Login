"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";

export async function addHcode(formData: FormData) {
  const hcode = (formData.get("hcode") as string)?.trim();
  const name = (formData.get("name") as string)?.trim() || null;
  if (!hcode) return;

  await prisma.ownHcode.upsert({
    where: { hcode },
    update: { name },
    create: { hcode, name },
  });
  revalidatePath("/admin/hcode");
}

export async function removeHcode(formData: FormData) {
  const id = Number(formData.get("id"));
  await prisma.ownHcode.delete({ where: { id } });
  revalidatePath("/admin/hcode");
}
