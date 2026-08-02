"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/supabase/dal";

export type JoinBoardState = { error?: string } | undefined;

export async function joinBoard(
  _prevState: JoinBoardState,
  formData: FormData
): Promise<JoinBoardState> {
  await requireUser("/display/login");

  const code = String(formData.get("code") ?? "").trim();
  if (!code) {
    return { error: "参加コードを入力してください。" };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("join_board_with_code", {
    p_code: code,
  });

  if (error) {
    return { error: "参加コードが正しくありません。" };
  }

  revalidatePath("/display");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/display/login");
}
