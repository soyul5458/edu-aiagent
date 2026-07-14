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

  const db = await getDb();

  const usersResult = await db.query(
    `SELECT u.id, u.username, u.name, u.role, u.created_at,
            COUNT(s.id) AS submission_count
     FROM users u
     LEFT JOIN submissions s ON s.user_id = u.id
     GROUP BY u.id
     ORDER BY (u.role = 'admin') DESC, u.created_at ASC`
  );
  const users = toPlain<UserRow>(usersResult.rows);

  const recentResult = await db.query(
    `SELECT id, title, category, summary, tags, created_at, author_name
     FROM submissions
     ORDER BY created_at DESC, id DESC
     LIMIT 10`
  );
  const recent = toPlain<SubmissionRow>(recentResult.rows);

  const categoryStatsResult = await db.query(
    `SELECT category, COUNT(*) AS count
     FROM submissions
     GROUP BY category
     ORDER BY count DESC`
  );
  const categoryStats = toPlain<{ category: string; count: number }>(
    categoryStatsResult.rows.map((r) => ({
      ...r,
      count: parseInt(r.count, 10),
    }))
  );

  const totalsResult = await db.query(
    `SELECT
       (SELECT COUNT(*) FROM users WHERE role = 'student')::int AS students,
       (SELECT COUNT(*) FROM submissions)::int AS submissions,
       (SELECT COUNT(*) FROM submissions WHERE DATE(created_at) = CURRENT_DATE)::int AS today`
  );
  const totals = toPlainOne<{
    students: number;
    submissions: number;
    today: number;
  }>(totalsResult.rows[0]);

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
