"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getEditorBoard, getDepartmentBySlug } from "@/lib/supabase/dal";
import { isCategory } from "@/lib/category";
import { todayInTokyo } from "@/lib/schedule";
import type { DocumentCategory } from "@/lib/types";

export type AddDocumentState = { error?: string } | undefined;
export type DocumentFormState = { error?: string; saved?: boolean } | undefined;

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

// 重要度ラベル（空欄は「なし」）を検証する。
function parseCategory(
  formData: FormData
): { category: DocumentCategory | null } | { error: string } {
  const value = String(formData.get("category") ?? "");
  if (!value) return { category: null };
  if (!isCategory(value)) return { error: "ラベルが正しくありません。" };
  return { category: value };
}

function parsePdf(formData: FormData): { file: File } | { error: string } {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "PDFファイルを選択してください。" };
  }
  if (file.type !== "application/pdf") {
    return { error: "PDFファイルのみアップロードできます。" };
  }
  return { file };
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
  if (!title) return { error: "タイトルを入力してください。" };
  const pdf = parsePdf(formData);
  if ("error" in pdf) return pdf;

  const schedule = parseSchedule(formData);
  if ("error" in schedule) return schedule;
  const category = parseCategory(formData);
  if ("error" in category) return category;

  const supabase = await createClient();
  const path = `${board.id}/${department.id}/${crypto.randomUUID()}.pdf`;

  const { error: uploadError } = await supabase.storage
    .from("documents")
    .upload(path, pdf.file, { contentType: "application/pdf" });

  if (uploadError) {
    return { error: "アップロードに失敗しました。" };
  }

  const { error: insertError } = await supabase.from("documents").insert({
    board_id: board.id,
    department_id: department.id,
    title,
    storage_path: path,
    ...schedule,
    ...category,
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

export async function togglePinned(
  deptSlug: string,
  documentId: string,
  pinned: boolean
) {
  const supabase = await createClient();
  await supabase.from("documents").update({ pinned }).eq("id", documentId);
  revalidatePath(`/edit/${deptSlug}`);
}

// 表示期間と重要度ラベルをまとめて保存する。
export async function updateDocumentSettings(
  deptSlug: string,
  documentId: string,
  _prevState: DocumentFormState,
  formData: FormData
): Promise<DocumentFormState> {
  const schedule = parseSchedule(formData);
  if ("error" in schedule) return schedule;
  const category = parseCategory(formData);
  if ("error" in category) return category;

  const supabase = await createClient();
  const { error } = await supabase
    .from("documents")
    .update({ ...schedule, ...category })
    .eq("id", documentId);

  if (error) return { error: "設定の保存に失敗しました。" };

  revalidatePath(`/edit/${deptSlug}`);
  return { saved: true };
}

// タイトル・期間などはそのままに PDF だけ差し替える。
// 新しいパスにアップロード → DB を更新 → 旧ファイルを削除、の順で、途中失敗時に資料が壊れないようにする。
export async function replaceDocumentFile(
  deptSlug: string,
  documentId: string,
  _prevState: DocumentFormState,
  formData: FormData
): Promise<DocumentFormState> {
  const board = await getEditorBoard();
  const department = await getDepartmentBySlug(deptSlug);
  if (!department) return { error: "部が見つかりません。" };

  const pdf = parsePdf(formData);
  if ("error" in pdf) return pdf;

  const supabase = await createClient();
  const { data: current, error: fetchError } = await supabase
    .from("documents")
    .select("storage_path")
    .eq("id", documentId)
    .single();

  if (fetchError || !current) return { error: "資料が見つかりません。" };

  const path = `${board.id}/${department.id}/${crypto.randomUUID()}.pdf`;
  const { error: uploadError } = await supabase.storage
    .from("documents")
    .upload(path, pdf.file, { contentType: "application/pdf" });

  if (uploadError) return { error: "アップロードに失敗しました。" };

  const { error: updateError } = await supabase
    .from("documents")
    .update({ storage_path: path })
    .eq("id", documentId);

  if (updateError) {
    await supabase.storage.from("documents").remove([path]);
    return { error: "差し替えに失敗しました。" };
  }

  await supabase.storage.from("documents").remove([current.storage_path]);

  revalidatePath(`/edit/${deptSlug}`);
  return { saved: true };
}

// 表示終了日を過ぎた資料を、この部の分だけまとめて削除する。
// 論理削除なので履歴と PDF は残る。
export async function deleteEndedDocuments(deptSlug: string) {
  const board = await getEditorBoard();
  const department = await getDepartmentBySlug(deptSlug);
  if (!department) return;

  const supabase = await createClient();
  await supabase
    .from("documents")
    .update({ deleted_at: new Date().toISOString() })
    .eq("board_id", board.id)
    .eq("department_id", department.id)
    .is("deleted_at", null)
    .lt("display_end", todayInTokyo());

  revalidatePath(`/edit/${deptSlug}`);
  revalidatePath("/edit/history");
}

// 一覧から外して履歴に残す（論理削除）。PDF ファイルも残すので履歴から閲覧・復元できる。
export async function deleteDocument(deptSlug: string, documentId: string) {
  const supabase = await createClient();
  await supabase
    .from("documents")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", documentId);
  revalidatePath(`/edit/${deptSlug}`);
  revalidatePath("/edit/history");
}
