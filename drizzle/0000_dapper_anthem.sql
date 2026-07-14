CREATE TABLE `learning_notes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`title` text NOT NULL,
	`source` text DEFAULT '电脑网页导入' NOT NULL,
	`tag` text DEFAULT '项目经验' NOT NULL,
	`symptom` text DEFAULT '待补充现象' NOT NULL,
	`reason` text DEFAULT '待分析原因' NOT NULL,
	`action` text DEFAULT '待整理下一步' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
