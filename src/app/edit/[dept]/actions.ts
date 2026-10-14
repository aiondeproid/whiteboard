"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getEditorBoard, getDepartmentBySlug } from "@/lib/supabase/dal";

export type AddDocumentState = { error?: string } | undefined;
export type ScheduleState = { error?: string; saved?: boolean } | undefined;

type Schedule = { display_start: string | null; display_end: string | null };

// フォームの表示開始日・終了日（<input type="date"> の YYYY-MM-DD、空欄は無期限）を検証する。
function parseSchedule(formData: FormData): Schedule | { error: string } {
  const start = String(formData.get("display_start") ?? "").trim() || null;
  const end = String(formData.get("display_end") ?? "").trim() || null;
  const isDate = (v: string) => /^\d{4}-\d{2}-\d{2}$/.test(v);

  if ((start && !isDate(start)) || (end && !isDate(end))) {
    return { error: "日付の形式が正しくありません。" };
  }
  if (start && end && start > end) {
    return { error: "表示終了日は開始日以降にしてください。" };
  }
  return { display_start: start, display_end: end };
}

export async function addDocument(
  deptSlug: string,
  _prevState: AddDocumentState,
  formData: FormData
): Promise<AddDocumentState> {
  const board = await getEditorBoard();

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

  const schedule = parseSchedule(formData);
  if ("error" in schedule) return schedule;

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
    ...schedule,
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

export async function updateSchedule(
  deptSlug: string,
  documentId: string,
  _prevState: ScheduleState,
  formData: FormData
): Promise<ScheduleState> {
  const schedule = parseSchedule(formData);
  if ("error" in schedule) return schedule;

  const supabase = await createClient();
  const { error } = await supabase
    .from("documents")
    .update(schedule)
    .eq("id", documentId);

  if (error) return { error: "表示期間の保存に失敗しました。" };

  revalidatePath(`/edit/${deptSlug}`);
  return { saved: true };
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
