import { getDb, toPlain, type SubmissionRow } from "@/lib/db";
import { getSession } from "@/lib/auth";
import Workspace from "@/components/Workspace";

export default async function WorkspacePage() {
  const session = (await getSession())!;
  const db = await getDb();
  const result = await db.query(
    "SELECT * FROM submissions WHERE user_id = $1 ORDER BY created_at DESC, id DESC",
    [session.id]
  );
  const mine = toPlain<SubmissionRow>(result.rows);

  return <Workspace userName={session.name} initialSubmissions={mine} />;
}
