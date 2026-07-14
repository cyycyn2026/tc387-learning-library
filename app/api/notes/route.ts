import { desc } from "drizzle-orm";
import { getDb } from "../../../db";
import { learningNotes } from "../../../db/schema";

function toRouteErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : "Unexpected error";
  const detail =
    error instanceof Error && error.cause instanceof Error ? error.cause.message : "";
  const combined = `${message}\n${detail}`;

  if (
    combined.includes("no such table") ||
    combined.includes("learning_notes")
  ) {
    return "云端经验库还没有完成数据库初始化，请重新部署一次包含 D1 迁移的版本。";
  }

  return message;
}

export async function GET() {
  try {
    const db = getDb();
    const rows = await db
      .select()
      .from(learningNotes)
      .orderBy(desc(learningNotes.createdAt), desc(learningNotes.id))
      .limit(100);

    return Response.json({ notes: rows });
  } catch (error) {
    return Response.json(
      { error: toRouteErrorMessage(error) },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as {
      title?: string;
      source?: string;
      tag?: string;
      symptom?: string;
      reason?: string;
      action?: string;
    };

    const title = payload.title?.trim() ?? "";

    if (!title) {
      return Response.json({ error: "标题不能为空" }, { status: 400 });
    }

    const db = getDb();
    const [note] = await db
      .insert(learningNotes)
      .values({
        title,
        source: payload.source?.trim() || "电脑网页导入",
        tag: payload.tag?.trim() || "项目经验",
        symptom: payload.symptom?.trim() || "待补充现象",
        reason: payload.reason?.trim() || "待分析原因",
        action: payload.action?.trim() || "待整理下一步",
      })
      .returning();

    return Response.json({ note }, { status: 201 });
  } catch (error) {
    return Response.json(
      { error: toRouteErrorMessage(error) },
      { status: 500 },
    );
  }
}
