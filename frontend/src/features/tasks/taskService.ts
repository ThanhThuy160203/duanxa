import { Role } from "../../types/role";
import type { TaskRecord, TaskStatus } from "./taskData";
import { TASK_SEED_DATA } from "./taskData";

type BackendTask = {
  id: string;
  title: string;
  documentCode?: string | null;
  documentDate?: string | null;
  priorityLabel?: string | null;
  assigneeUserId: string;
  assigneeName: string | null;
  assigneeRole?: Role | null;
  departmentCode: string;
  departmentName: string | null;
  source: "SO_BAN_NGANH" | "UBND_TINH" | "CHU_TICH" | "PHO_CHU_TICH" | "TRUONG_PHONG";
  dueDate: string;
  status: TaskStatus;
  completionRate: number;
  feedback?: string | null;
  evaluationComment?: string | null;
  evaluationScore?: number | null;
  cancelledReason?: string | null;
};

type BackendUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
  department?: string;
};

type BackendDepartment = {
  code: string;
  name: string;
};

type CreateTaskInput = {
  title: string;
  assignee: string;
  assigneeRole: Role;
  department: string;
  source: string;
  dueDate: string;
  createdBy: string;
};

type AssignTaskInput = {
  taskId: string;
  assignee: string;
  assigneeRole: Role;
  department: string;
  actorName: string;
};

type FeedbackInput = {
  taskId: string;
  feedback: string;
  completionRate: number;
  actorName: string;
};

type EvaluateInput = {
  taskId: string;
  score: number;
  comment: string;
  approved: boolean;
  actorName: string;
};

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, "") || "http://localhost:4000/api";
const TASKS_API_URL = `${API_BASE_URL}/tasks`;
const USERS_API_URL = `${API_BASE_URL}/users`;
const DEPARTMENTS_API_URL = `${API_BASE_URL}/departments`;
const POLL_INTERVAL_MS = 5000;

const SOURCE_LABEL_TO_CODE: Record<string, BackendTask["source"]> = {
  "Sở/Ban/Ngành": "SO_BAN_NGANH",
  "UBND Tỉnh": "UBND_TINH",
  "Chủ tịch": "CHU_TICH",
  "Phó Chủ tịch": "PHO_CHU_TICH",
  "Trưởng phòng": "TRUONG_PHONG",
};

const SOURCE_CODE_TO_LABEL: Record<BackendTask["source"], string> = {
  SO_BAN_NGANH: "Sở/Ban/Ngành",
  UBND_TINH: "UBND Tỉnh",
  CHU_TICH: "Chủ tịch",
  PHO_CHU_TICH: "Phó Chủ tịch",
  TRUONG_PHONG: "Trưởng phòng",
};

const parseErrorMessage = async (response: Response) => {
  try {
    const payload = (await response.json()) as { message?: string };
    return payload.message || "Yeu cau that bai.";
  } catch {
    return "Yeu cau that bai.";
  }
};

const request = async <T>(url: string, init?: RequestInit): Promise<T> => {
  const response = await fetch(url, {
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
    ...init,
  });

  if (!response.ok) {
    throw new Error(await parseErrorMessage(response));
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
};

const resolveSourceCode = (label: string): BackendTask["source"] => SOURCE_LABEL_TO_CODE[label] ?? "CHU_TICH";

const toTaskRecord = (task: BackendTask): TaskRecord => ({
  id: task.id,
  title: task.title,
  documentCode: task.documentCode ?? undefined,
  documentDate: task.documentDate ? task.documentDate.slice(0, 10) : undefined,
  priorityLabel: task.priorityLabel ?? undefined,
  assignee: task.assigneeName ?? task.assigneeUserId,
  assigneeRole: task.assigneeRole ?? Role.NHAN_VIEN,
  department: task.departmentName ?? task.departmentCode,
  source: SOURCE_CODE_TO_LABEL[task.source],
  dueDate: task.dueDate.slice(0, 10),
  status: task.status,
  completionRate: task.completionRate,
  feedback: task.feedback ?? undefined,
  evaluationComment: task.evaluationComment ?? undefined,
  evaluationScore: task.evaluationScore ?? undefined,
  cancelledReason: task.cancelledReason ?? undefined,
});

const findUserByName = async (name: string) => {
  const users = await request<BackendUser[]>(USERS_API_URL);
  const normalized = name.trim().toLowerCase();
  return users.find((user) => user.name.trim().toLowerCase() === normalized);
};

const findDepartmentCodeByName = async (departmentName: string) => {
  const departments = await request<BackendDepartment[]>(DEPARTMENTS_API_URL);
  const normalized = departmentName.trim().toLowerCase();
  const matched = departments.find((department) => department.name.trim().toLowerCase() === normalized);
  return matched?.code;
};

export const subscribeTasks = (
  onData: (tasks: TaskRecord[]) => void,
  onError?: (message: string) => void
) => {
  let disposed = false;
  let loading = false;

  const loadTasks = async () => {
    if (loading) {
      return;
    }

    loading = true;
    try {
      const rows = await request<BackendTask[]>(TASKS_API_URL);
      if (!disposed) {
        onData(rows.map(toTaskRecord));
      }
    } catch (error) {
      if (!disposed) {
        onError?.(error instanceof Error ? error.message : "Khong the tai danh sach nhiem vu.");
      }
    } finally {
      loading = false;
    }
  };

  void loadTasks();
  const timer = window.setInterval(() => {
    void loadTasks();
  }, POLL_INTERVAL_MS);

  return () => {
    disposed = true;
    window.clearInterval(timer);
  };
};

export const createTask = async (input: CreateTaskInput) => {
  const [assigneeUser, creatorUser, selectedDepartmentCode] = await Promise.all([
    findUserByName(input.assignee),
    findUserByName(input.createdBy),
    findDepartmentCodeByName(input.department),
  ]);

  if (!assigneeUser) {
    throw new Error("Khong tim thay nguoi nhan nhiem vu.");
  }

  if (!creatorUser) {
    throw new Error("Khong tim thay nguoi tao nhiem vu.");
  }

  const assigneeDepartmentCode = assigneeUser.department
    ? await findDepartmentCodeByName(assigneeUser.department)
    : undefined;
  const departmentCode = selectedDepartmentCode ?? assigneeDepartmentCode ?? "VAN_PHONG_HDNDU_BND";

  await request<BackendTask>(TASKS_API_URL, {
    method: "POST",
    body: JSON.stringify({
      title: input.title,
      assigneeUserId: assigneeUser.id,
      createdByUserId: creatorUser.id,
      departmentCode,
      source: resolveSourceCode(input.source),
      dueDate: input.dueDate,
    }),
  });
};

export const assignTask = async (input: AssignTaskInput) => {
  const [assigneeUser, actorUser, selectedDepartmentCode] = await Promise.all([
    findUserByName(input.assignee),
    findUserByName(input.actorName),
    findDepartmentCodeByName(input.department),
  ]);

  if (!assigneeUser) {
    throw new Error("Khong tim thay nguoi duoc giao nhiem vu.");
  }

  if (!actorUser) {
    throw new Error("Khong tim thay nguoi giao nhiem vu.");
  }

  const assigneeDepartmentCode = assigneeUser.department
    ? await findDepartmentCodeByName(assigneeUser.department)
    : undefined;
  const departmentCode = selectedDepartmentCode ?? assigneeDepartmentCode ?? "VAN_PHONG_HDNDU_BND";

  await request<{ id: string }>(`${TASKS_API_URL}/${input.taskId}/assign`, {
    method: "PATCH",
    body: JSON.stringify({
      assigneeUserId: assigneeUser.id,
      actorUserId: actorUser.id,
      departmentCode,
    }),
  });
};

export const reassignTask = async (input: AssignTaskInput) => {
  await assignTask(input);
};

export const submitTaskFeedback = async (input: FeedbackInput) => {
  const actorUser = await findUserByName(input.actorName);
  if (!actorUser) {
    throw new Error("Khong tim thay nguoi phan hoi.");
  }

  await request<{ id: string }>(`${TASKS_API_URL}/${input.taskId}/feedback`, {
    method: "PATCH",
    body: JSON.stringify({
      actorUserId: actorUser.id,
      completionRate: input.completionRate,
      feedback: input.feedback,
    }),
  });
};

export const evaluateTask = async (input: EvaluateInput) => {
  const actorUser = await findUserByName(input.actorName);
  if (!actorUser) {
    throw new Error("Khong tim thay nguoi danh gia.");
  }

  await request<{ id: string }>(`${TASKS_API_URL}/${input.taskId}/evaluate`, {
    method: "PATCH",
    body: JSON.stringify({
      actorUserId: actorUser.id,
      approved: input.approved,
      score: input.score,
      comment: input.comment,
    }),
  });
};

export const cancelTask = async (taskId: string, reason: string, actorName: string) => {
  const actorUser = await findUserByName(actorName);
  if (!actorUser) {
    throw new Error("Khong tim thay nguoi huy nhiem vu.");
  }

  await request<{ id: string }>(`${TASKS_API_URL}/${taskId}/cancel`, {
    method: "PATCH",
    body: JSON.stringify({
      actorUserId: actorUser.id,
      reason,
    }),
  });
};

export const seedTasksIfEmpty = async () => {
  const rows = await request<BackendTask[]>(TASKS_API_URL);
  if (rows.length > 0) {
    return;
  }

  await replaceTasksWithSeedData();
};

export const replaceTasksWithSeedData = async () => {
  const actor = await findUserByName("Chủ tịch UBND xã");
  if (!actor) {
    throw new Error("Khong tim thay tai khoan chu tich de thay du lieu mau.");
  }

  await request<{ message: string }>(`${TASKS_API_URL}/reset`, {
    method: "POST",
    body: JSON.stringify({ actorUserId: actor.id, tasks: TASK_SEED_DATA }),
  });
};

export const fetchUsersAndDepartmentsByRole = async (
  role: Role
): Promise<Array<{ code: string; name: string }>> => {
  const [departments, users] = await Promise.all([
    request<BackendDepartment[]>(DEPARTMENTS_API_URL),
    request<BackendUser[]>(USERS_API_URL),
  ]);

  const departmentCodeByName = new Map(
    departments.map((dept) => [dept.name.trim().toLowerCase(), dept.code])
  );

  const usersWithRole = users.filter((user) => user.role === role);
  const departmentCodes = new Set(
    usersWithRole
      .map((user) => {
        const departmentName = user.department?.trim().toLowerCase();
        return departmentName ? departmentCodeByName.get(departmentName) : undefined;
      })
      .filter((code): code is string => Boolean(code))
  );

  // TONG_HOP accounts may not be attached to a specific department.
  // In that case, keep departments selectable and resolve assignee by role.
  if (role === Role.TONG_HOP && usersWithRole.length > 0 && departmentCodes.size === 0) {
    return departments;
  }

  return departments.filter((dept) => departmentCodes.has(dept.code));
};

export const fetchUsersByRoleAndDepartment = async (
  role: Role,
  departmentCode: string
): Promise<Array<{ id: string; name: string; email: string }>> => {
  const [users, departments] = await Promise.all([
    request<BackendUser[]>(USERS_API_URL),
    request<BackendDepartment[]>(DEPARTMENTS_API_URL),
  ]);

  if (role === Role.TONG_HOP) {
    return users
      .filter((user) => user.role === role)
      .map((user) => ({ id: user.id, name: user.name, email: user.email }));
  }

  const selectedDepartment = departments.find((dept) => dept.code === departmentCode);
  if (!selectedDepartment) {
    return [];
  }

  const normalizedDepartmentName = selectedDepartment.name.trim().toLowerCase();
  const filtered = users.filter((user) => {
    return user.role === role && user.department?.trim().toLowerCase() === normalizedDepartmentName;
  });

  return filtered.map((user) => ({ id: user.id, name: user.name, email: user.email }));
};
