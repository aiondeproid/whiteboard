"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/supabase/dal";

export type CreateBoardState = { error?: string } | undefined;

export async function createBoard(
  _prevState: CreateBoardState,
  formData: FormData
): Promise<CreateBoardState> {
  await requireUser();

  const name = String(formData.get("name") ?? "").trim();
  if (!name) {
    return { error: "ボード名を入力してください。" };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("create_board", { p_name: name });

  if (error) {
    return { error: "ボードの作成に失敗しました。" };
  }

  revalidatePath("/edit");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/edit/login");
}
