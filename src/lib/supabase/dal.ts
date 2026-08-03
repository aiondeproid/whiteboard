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

// MVP assumption: a user edits at most one board.
export const getEditorBoard = cache(async (): Promise<Board | null> => {
  await requireUser();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("board_members")
    .select("boards(id, name, join_code, owner_id)")
    .eq("role", "editor")
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  const boards = (data as { boards: Board | Board[] | null } | null)?.boards;
  return Array.isArray(boards) ? (boards[0] ?? null) : (boards ?? null);
});

// Display app: any board membership (editor or viewer), not just editor.
export const getMemberBoard = cache(async (): Promise<Board | null> => {
  await requireUser("/display/login");
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("board_members")
    .select("boards(id, name, join_code, owner_id)")
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  const boards = (data as { boards: Board | Board[] | null } | null)?.boards;
  return Array.isArray(boards) ? (boards[0] ?? null) : (boards ?? null);
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

// Display app: single document lookup for the PDF viewer route, scoped to
// board+department+visible so a viewer can't reach a hidden or foreign document
// by guessing an id in the URL.
export async function getVisibleDocument(
  boardId: string,
  departmentId: string,
  documentId: string
): Promise<Document | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("documents")
    .select(
      "id, board_id, department_id, title, storage_path, visible, created_at, updated_at"
    )
    .eq("board_id", boardId)
    .eq("department_id", departmentId)
    .eq("id", documentId)
    .eq("visible", true)
    .maybeSingle();

  if (error) throw error;
  return data ?? null;
}

// Display app: filters to visible=true explicitly rather than relying on the
// viewer-role RLS policy, so it's correct even if browsed by an editor account.
export async function getVisibleDocuments(
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
    .eq("visible", true)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
}
