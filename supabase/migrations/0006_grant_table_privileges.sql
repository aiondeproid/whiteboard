-- 新しい Supabase（ローカル CLI・新規クラウドプロジェクト）は public のテーブルを
-- anon/authenticated に自動で GRANT しなくなったため、明示的に付与する。
-- 実際のアクセス制御は従来どおり RLS で行う。既存の本番環境では付与済みなので変化なし。

grant select, insert, update, delete on boards to authenticated;
grant select, insert, update, delete on board_members to authenticated;
grant select on departments to authenticated;
grant select, insert, update, delete on documents to authenticated;
