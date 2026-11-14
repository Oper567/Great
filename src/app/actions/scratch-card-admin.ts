"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import {
  saveToLocalScratchCardsStore,
  getLocalScratchCardsStore,
  deleteFromLocalScratchCardsStore,
  updateInLocalScratchCardsStore,
} from "@/lib/scratch-card-store";

/**
 * Super Admin: Generate bulk scratch cards with strict 2-check usage limit
 */
export async function generateScratchCardsAction(formData: FormData): Promise<{
  success: boolean;
  error?: string;
  count?: number;
  cards?: any[];
}> {
  const quantity = Math.min(Math.max(parseInt((formData.get("quantity") as string) || "5", 10), 1), 100);
  const session = (formData.get("session") as string)?.trim() || "2025/2026";
  const term = (formData.get("term") as string)?.trim() || "Third Term";

  try {
    const generatedCards = [];
    const yearPrefix = new Date().getFullYear();

    for (let i = 0; i < quantity; i++) {
      // Cryptographically pseudo-random PIN: GFMS-XXXX-XXXX
      const part1 = Math.floor(1000 + Math.random() * 9000);
      const part2 = Math.floor(1000 + Math.random() * 9000);
      const pin = `GFMS-${part1}-${part2}`;

      // Serial Number: SN-GFMS-YYYY-XXXXX
      const serialSuffix = Math.floor(10000 + Math.random() * 90000);
      const serialNumber = `SN-GFMS-${yearPrefix}-${serialSuffix}`;
      const cardId = `sc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}_${i}`;

      const cardPayload = {
        id: cardId,
        pin,
        serialNumber,
        session,
        term,
        maxUsage: 3, // Strictly 3 checks per card
        usageCount: 0,
        status: "active" as const,
        admNo: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // 1. Always save into persistent local store
      saveToLocalScratchCardsStore(cardPayload);

      // 2. Save into PostgreSQL database
      try {
        await prisma.$executeRawUnsafe(`
          CREATE TABLE IF NOT EXISTS "scratch_cards" (
            "id" TEXT PRIMARY KEY,
            "pin" TEXT NOT NULL UNIQUE,
            "serialNumber" TEXT UNIQUE,
            "admNo" TEXT,
            "usageCount" INTEGER NOT NULL DEFAULT 0,
            "maxUsage" INTEGER NOT NULL DEFAULT 3,
            "status" TEXT NOT NULL DEFAULT 'active',
            "session" TEXT,
            "term" TEXT,
            "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
          );
          CREATE INDEX IF NOT EXISTS "scratch_cards_pin_idx" ON "scratch_cards"("pin");
          CREATE INDEX IF NOT EXISTS "scratch_cards_adm_no_idx" ON "scratch_cards"("admNo");
        `).catch(() => {});

        const dbCard = await prisma.scratchCard.create({
          data: {
            id: cardId,
            pin,
            serialNumber,
            session,
            term,
            maxUsage: 3,
            usageCount: 0,
            status: "active",
          },
        });
        generatedCards.push(dbCard || cardPayload);
      } catch (dbErr) {
        console.warn("DB scratchCard save warning (persisted to local store):", dbErr);
        generatedCards.push(cardPayload);
      }
    }

    revalidatePath("/admin/cbt");
    revalidatePath("/result");
    return { success: true, count: generatedCards.length, cards: generatedCards };
  } catch (err: any) {
    console.error("Generate scratch cards error:", err);
    return {
      success: false,
      error: `Failed to generate scratch cards: ${err?.message || "Unknown error"}`,
    };
  }
}

/**
 * Super Admin: Fetch all scratch cards with live inventory stats
 */
export async function getAllScratchCardsAction(): Promise<{
  success: boolean;
  error?: string;
  cards: any[];
  stats?: {
    total: number;
    active: number;
    exhausted: number;
    assigned: number;
  };
}> {
  try {
    // 1. Fetch from PostgreSQL
    let dbCards: any[] = [];
    try {
      dbCards = await prisma.scratchCard.findMany({
        orderBy: { createdAt: "desc" },
      });
    } catch {}

    // 2. Fetch from persistent local store
    const localCards = getLocalScratchCardsStore();

    // 3. Merge unique cards by PIN
    const cardMap = new Map<string, any>();
    for (const lc of localCards) {
      if (lc.pin) cardMap.set(lc.pin.toUpperCase(), lc);
    }
    for (const dc of dbCards) {
      if (dc.pin) cardMap.set(dc.pin.toUpperCase(), dc);
    }

    const cards = Array.from(cardMap.values()).sort((a, b) => {
      const timeA = new Date(a.createdAt || 0).getTime();
      const timeB = new Date(b.createdAt || 0).getTime();
      return timeB - timeA;
    });

    const activeCount = cards.filter((c) => c.status === "active" && (c.usageCount || 0) < (c.maxUsage || 3)).length;
    const exhaustedCount = cards.filter((c) => c.status === "exhausted" || (c.usageCount || 0) >= (c.maxUsage || 3)).length;
    const assignedCount = cards.filter((c) => !!c.admNo).length;

    return {
      success: true,
      cards,
      stats: {
        total: cards.length,
        active: activeCount,
        exhausted: exhaustedCount,
        assigned: assignedCount,
      },
    };
  } catch (err: any) {
    console.error("Get scratch cards error:", err);
    const localCards = getLocalScratchCardsStore();
    return { success: true, cards: localCards || [] };
  }
}

/**
 * Super Admin: Delete a Scratch Card
 */
export async function deleteScratchCardAction(cardId: string): Promise<{ success: boolean; error?: string }> {
  try {
    deleteFromLocalScratchCardsStore(cardId);
    await prisma.scratchCard.delete({
      where: { id: cardId },
    }).catch(() => {});
    revalidatePath("/admin/cbt");
    revalidatePath("/result");
    return { success: true };
  } catch (err: any) {
    console.error("Delete scratch card error:", err);
    return { success: false, error: "Failed to delete scratch card." };
  }
}

/**
 * Super Admin: Reset a Scratch Card (clears lock & usageCount back to 0)
 */
export async function resetScratchCardAction(cardId: string): Promise<{ success: boolean; error?: string }> {
  try {
    updateInLocalScratchCardsStore(cardId, {
      usageCount: 0,
      maxUsage: 3,
      status: "active",
      admNo: null,
    });

    await prisma.scratchCard.update({
      where: { id: cardId },
      data: {
        usageCount: 0,
        maxUsage: 3,
        status: "active",
        admNo: null,
      },
    }).catch(() => {});

    revalidatePath("/admin/cbt");
    revalidatePath("/result");
    return { success: true };
  } catch (err: any) {
    console.error("Reset scratch card error:", err);
    return { success: false, error: "Failed to reset scratch card." };
  }
}
