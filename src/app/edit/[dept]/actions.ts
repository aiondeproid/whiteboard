"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getEditorBoard, getDepartmentBySlug } from "@/lib/supabase/dal";

export type AddDocumentState = { error?: string } | undefined;

export async function addDocument(
  deptSlug: string,
  _prevState: AddDocumentState,
  formData: FormData
): Promise<AddDocumentState> {
  const board = await getEditorBoard();
  if (!board) return { error: "ボードが見つかりません。" };

  const department = await getDepartmentBySlug(deptSlug);
  if (!department) return { error: "部が見つかりません。" };

  const title = String(formData.get("title") ?? "").trim();
  const file = formData.get("file");

  if (!title) return { error: "タイトルを入力してください。" };
  if (!(file instanceof File) || file.size === 0) {
    return { error: "PDFファイルを選択してください。" };
  }
  if (file.type !== "application/pdf") {
    return { error: "PDFファイルのみアップロードできます。" };
  }

  const supabase = await createClient();
  const path = `${board.id}/${department.id}/${crypto.randomUUID()}.pdf`;

  const { error: uploadError } = await supabase.storage
    .from("documents")
    .upload(path, file, { contentType: "application/pdf" });

  if (uploadError) {
    return { error: "アップロードに失敗しました。" };
  }

  const { error: insertError } = await supabase.from("documents").insert({
    board_id: board.id,
    department_id: department.id,
    title,
    storage_path: path,
  });

  if (insertError) {
    await supabase.storage.from("documents").remove([path]);
    return { error: "資料の登録に失敗しました。" };
  }

  revalidatePath(`/edit/${deptSlug}`);
}

export async function toggleVisible(
  deptSlug: string,
  documentId: string,
  visible: boolean
) {
  const supabase = await createClient();
  await supabase.from("documents").update({ visible }).eq("id", documentId);
  revalidatePath(`/edit/${deptSlug}`);
}

export async function deleteDocument(
  deptSlug: string,
  documentId: string,
  storagePath: string
) {
  const supabase = await createClient();
  await supabase.storage.from("documents").remove([storagePath]);
  await supabase.from("documents").delete().eq("id", documentId);
  revalidatePath(`/edit/${deptSlug}`);
}
