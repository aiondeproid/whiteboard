"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/supabase/dal";

export type JoinBoardAsEditorState = { error?: string } | undefined;

export async function joinBoardAsEditor(
  _prevState: JoinBoardAsEditorState,
  formData: FormData
): Promise<JoinBoardAsEditorState> {
  await requireUser();

  const code = String(formData.get("code") ?? "").trim();
  if (!code) {
    return { error: "招待コードを入力してください。" };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("join_board_as_editor", {
    p_code: code,
  });

  if (error) {
    return { error: "招待コードが正しくありません。" };
  }

  revalidatePath("/edit");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/edit/login");
}
