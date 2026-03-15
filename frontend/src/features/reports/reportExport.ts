import type { TaskRecord } from "../tasks/taskData";

type ExportMode = "chi-tiet" | "theo-phong" | "theo-ca-nhan";

const toCsvValue = (value: string | number | undefined) => {
  const normalized = String(value ?? "").replaceAll('"', '""');
  return `"${normalized}"`;
};

const buildRowsByMode = (tasks: TaskRecord[], mode: ExportMode) => {
  if (mode === "theo-phong") {
    const grouped = tasks.reduce<Record<string, { total: number; done: number; overdue: number }>>((acc, task) => {
      const key = task.department;
      const current = acc[key] ?? { total: 0, done: 0, overdue: 0 };
      current.total += 1;
      if (task.status === "HOAN_THANH") {
        current.done += 1;
      }
      if (new Date(task.dueDate).getTime() < Date.now() && task.status !== "HOAN_THANH") {
        current.overdue += 1;
      }
      acc[key] = current;
      return acc;
    }, {});

    return {
      headers: ["Phòng ban", "Tổng nhiệm vụ", "Hoàn thành", "Quá hạn"],
      rows: Object.entries(grouped).map(([department, item]) => [department, item.total, item.done, item.overdue]),
    };
  }

  if (mode === "theo-ca-nhan") {
    const grouped = tasks.reduce<Record<string, { role: string; total: number; done: number; avg: number }>>((acc, task) => {
      const key = task.assignee;
      const current = acc[key] ?? { role: task.assigneeRole, total: 0, done: 0, avg: 0 };
      current.total += 1;
      current.done += task.status === "HOAN_THANH" ? 1 : 0;
      current.avg += task.completionRate;
      acc[key] = current;
      return acc;
    }, {});

    return {
      headers: ["Cá nhân", "Vai trò", "Tổng nhiệm vụ", "Hoàn thành", "% hoàn thành TB"],
      rows: Object.entries(grouped).map(([assignee, item]) => [
        assignee,
        item.role,
        item.total,
        item.done,
        Math.round(item.avg / Math.max(1, item.total)),
      ]),
    };
  }

  return {
    headers: [
      "Mã",
      "Tiêu đề",
      "Phòng ban",
      "Người nhận",
      "Vai trò",
      "Nguồn giao",
      "Hạn xử lý",
      "Trạng thái",
      "% hoàn thành",
      "Phản hồi",
      "Đánh giá",
    ],
    rows: tasks.map((task) => [
      task.id,
      task.title,
      task.department,
      task.assignee,
      task.assigneeRole,
      task.source,
      task.dueDate,
      task.status,
      task.completionRate,
      task.feedback ?? "",
      task.evaluationComment ?? "",
    ]),
  };
};

export const exportTasksToCsv = (tasks: TaskRecord[], mode: ExportMode, fileName: string) => {
  const { headers, rows } = buildRowsByMode(tasks, mode);
  const csv = [headers, ...rows]
    .map((row) => row.map((cell) => toCsvValue(cell as string | number | undefined)).join(","))
    .join("\n");

  const blob = new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.setAttribute("download", fileName);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(link.href);
};
