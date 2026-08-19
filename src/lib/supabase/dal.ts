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

export async function getDocuments(
  boardId: string,
  departmentId: string
): Promise<Document[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("documents")
    .select(
      "id, board_id, department_id, title, storage_path, visible, created_at, updated_at"
    )
    .eq("board_id", boardId)
    .eq("department_id", departmentId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
}
