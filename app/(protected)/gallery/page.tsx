import { getDb, toPlain, type SubmissionRow } from "@/lib/db";
import GalleryExplorer from "@/components/GalleryExplorer";

export default async function GalleryPage() {
  const db = getDb();
  const submissions = toPlain<SubmissionRow>(
    db
      .prepare(
        `SELECT id, title, category, summary, tags, created_at, author_name
         FROM submissions
         ORDER BY created_at DESC, id DESC`
      )
      .all()
  );

  return <GalleryExplorer submissions={submissions} />;
}
