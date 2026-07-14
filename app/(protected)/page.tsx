import { getDb, toPlain, type SubmissionRow } from "@/lib/db";
import { getSession } from "@/lib/auth";
import Workspace from "@/components/Workspace";

export default async function WorkspacePage() {
  const session = (await getSession())!;
  const db = getDb();
  const mine = toPlain<SubmissionRow>(
    db
      .prepare(
        "SELECT * FROM submissions WHERE user_id = ? ORDER BY created_at DESC, id DESC"
      )
      .all(session.id)
  );

  return <Workspace userName={session.name} initialSubmissions={mine} />;
}
