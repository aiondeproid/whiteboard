export type Department = {
  id: string;
  slug: string;
  name: string;
  sort_order: number;
};

export type Board = {
  id: string;
  name: string;
  join_code: string;
};

export type DocumentCategory = "urgent" | "notice" | "routine";

export type Document = {
  id: string;
  board_id: string;
  department_id: string;
  title: string;
  storage_path: string;
  visible: boolean;
  display_start: string | null;
  display_end: string | null;
  pinned: boolean;
  category: DocumentCategory | null;
  serial_no: number;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
};
