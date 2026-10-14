"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

// 削除済みの資料を一覧に戻す。通し番号・期間・ラベルは削除前のまま。
export async function restoreDocument(documentId: string) {
  const supabase = await createClient();
  await supabase
    .from("documents")
    .update({ deleted_at: null })
    .eq("id", documentId);
  revalidatePath("/edit/history");
  revalidatePath("/edit", "layout");
}
