import { redirect } from "next/navigation";
import {
  getDb,
  toPlain,
  toPlainOne,
  type UserRow,
  type SubmissionRow,
} from "@/lib/db";
import { getSession } from "@/lib/auth";
import AdminPanel from "@/components/AdminPanel";

export default async function AdminPage() {
  const session = await getSession();
  if (!session || session.role !== "admin") redirect("/");

  const db = getDb();

  const users = toPlain<UserRow>(
    db
      .prepare(
        `SELECT u.id, u.username, u.name, u.role, u.created_at,
                COUNT(s.id) AS submission_count
         FROM users u
         LEFT JOIN submissions s ON s.user_id = u.id
         GROUP BY u.id
         ORDER BY u.role = 'admin' DESC, u.created_at ASC`
      )
      .all()
  );

  const recent = toPlain<SubmissionRow>(
    db
      .prepare(
        `SELECT id, title, category, summary, tags, created_at, author_name
         FROM submissions
         ORDER BY created_at DESC, id DESC
         LIMIT 10`
      )
      .all()
  );

  const categoryStats = toPlain<{ category: string; count: number }>(
    db
      .prepare(
        `SELECT category, COUNT(*) AS count
         FROM submissions
         GROUP BY category
         ORDER BY count DESC`
      )
      .all()
  );

  const totals = toPlainOne<{
    students: number;
    submissions: number;
    today: number;
  }>(
    db
      .prepare(
        `SELECT
           (SELECT COUNT(*) FROM users WHERE role = 'student') AS students,
           (SELECT COUNT(*) FROM submissions) AS submissions,
           (SELECT COUNT(*) FROM submissions WHERE date(created_at) = date('now', 'localtime')) AS today`
      )
      .get()
  );

  return (
    <AdminPanel
      currentUserId={session.id}
      users={users}
      recent={recent}
      categoryStats={categoryStats}
      totals={totals}
    />
  );
}
