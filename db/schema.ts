import { sql } from "drizzle-orm";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const learningNotes = sqliteTable("learning_notes", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  title: text("title").notNull(),
  source: text("source").notNull().default("电脑网页导入"),
  tag: text("tag").notNull().default("项目经验"),
  symptom: text("symptom").notNull().default("待补充现象"),
  reason: text("reason").notNull().default("待分析原因"),
  action: text("action").notNull().default("待整理下一步"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});
