import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "./server";
import type { Board, Department, Document } from "@/lib/types";

export const getUser = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});

export const requireUser = cache(async (redirectTo = "/edit/login") => {
  const user = await getUser();
  if (!user) redirect(redirectTo);
  return user;
});

// 社内共有の単一ボード。認証済みユーザーは全員自動的に editor として参加する。
export const getEditorBoard = cache(async (): Promise<Board> => {
  await requireUser();
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("join_board_as_editor");

  if (error) throw error;
  return data as Board;
});

export const getDepartments = cache(async (): Promise<Department[]> => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("departments")
    .select("id, slug, name, sort_order")
    .order("sort_order");

  if (error) throw error;
  return data ?? [];
});

export async function getDepartmentBySlug(
  slug: string
): Promise<Department | null> {
  const departments = await getDepartments();
  return departments.find((d) => d.slug === slug) ?? null;
}

export async function getDocumentPreviewUrl(
  storagePath: string,
  expiresInSeconds = 300
): Promise<string | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.storage
    .from("documents")
    .createSignedUrl(storagePath, expiresInSeconds);

  if (error) return null;
  return data.signedUrl;
}

const DOCUMENT_COLUMNS =
  "id, board_id, department_id, title, storage_path, visible, display_start, display_end, pinned, category, serial_no, deleted_at, created_at, updated_at";

// 署名付きURLをまとめて発行する（履歴一覧用）。storage_path → URL の Map を返す。
export async function getDocumentPreviewUrls(
  storagePaths: string[],
  expiresInSeconds = 300
): Promise<Map<string, string>> {
  if (storagePaths.length === 0) return new Map();
  const supabase = await createClient();
  const { data, error } = await supabase.storage
    .from("documents")
    .createSignedUrls(storagePaths, expiresInSeconds);

  if (error || !data) return new Map();
  return new Map(
    data.flatMap((item) =>
      item.path && item.signedUrl ? [[item.path, item.signedUrl] as const] : []
    )
  );
}

export async function getDocuments(
  boardId: string,
  departmentId: string
): Promise<Document[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("documents")
    .select(DOCUMENT_COLUMNS)
    .eq("board_id", boardId)
    .eq("department_id", departmentId)
    .is("deleted_at", null)
    .order("pinned", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

// 掲示履歴: 削除済みを含むボード内の全資料を通し番号の新しい順で返す。
export async function getDocumentHistory(boardId: string): Promise<Document[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("documents")
    .select(DOCUMENT_COLUMNS)
    .eq("board_id", boardId)
    .order("serial_no", { ascending: false });

  if (error) throw error;
  return data ?? [];
}
