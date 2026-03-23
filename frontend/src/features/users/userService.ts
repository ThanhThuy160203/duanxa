import { Role } from "../../types/role";
import type { UserProfile, UserStatus } from "../../types/user";
import { canCreateRole } from "./roleHierarchy";

export type HierarchyCreateInput = {
  email: string;
  name: string;
  password: string;
  role: Role;
  department?: string;
  managedDepartments?: string[];
  actor: {
    email: string;
    name: string;
    role: Role;
  };
};

export type RegisterUserInput = {
  email: string;
  name: string;
  password: string;
  department?: string;
  desiredRole?: Role;
};

export type ApproveUserInput = {
  email: string;
  finalRole: Role;
  approver: {
    email: string;
    name: string;
    role: Role;
  };
};

type UserDoc = {
  id: string;
  email: string;
  apiToken?: string;
  name: string;
  role: Role;
  status: UserStatus;
  department?: string;
  managedDepartments?: string[];
  parentEmail?: string | null;
  parentName?: string | null;
  requestedRole?: Role | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};

export type DepartmentOption = {
  code: string;
  name: string;
};

const normalizeEmail = (email: string) => email.trim().toLowerCase();

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, "") || "http://localhost:4000/api";
const USERS_API_URL = `${API_BASE_URL}/users`;
const DEPARTMENTS_API_URL = `${API_BASE_URL}/departments`;
const POLL_INTERVAL_MS = 5000;

const mapUserDoc = (data: UserDoc): UserProfile => ({
  id: data.id,
  email: data.email,
  apiToken: data.apiToken,
  name: data.name,
  role: data.role,
  status: data.status,
  department: data.department,
  managedDepartments: data.managedDepartments,
  parentEmail: data.parentEmail ?? null,
  parentName: data.parentName ?? null,
  requestedRole: data.requestedRole ?? null,
  createdAt: data.createdAt ?? null,
  updatedAt: data.updatedAt ?? null,
});

const parseErrorMessage = async (response: Response) => {
  try {
    const payload = (await response.json()) as { message?: string };
    return payload.message || "Yeu cau that bai.";
  } catch {
    return "Yeu cau that bai.";
  }
};

const request = async <T>(path: string, init?: RequestInit): Promise<T> => {
  const response = await fetch(`${USERS_API_URL}${path}`, {
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

export const fetchUserProfile = async (email: string): Promise<UserProfile | null> => {
  const normalized = normalizeEmail(email);
  const users = await request<UserDoc[]>("/");
  const found = users.find((user) => normalizeEmail(user.email) === normalized);
  return found ? mapUserDoc(found) : null;
};

export const loginUser = async (email: string, password: string): Promise<UserProfile> => {
  const payload = await request<UserDoc>("/login", {
    method: "POST",
    body: JSON.stringify({ email: normalizeEmail(email), password }),
  });

  return mapUserDoc(payload);
};

export const createUserByHierarchy = async (input: HierarchyCreateInput): Promise<UserProfile> => {
  if (!canCreateRole(input.actor.role, input.role)) {
    throw new Error("Bạn không thể tạo tài khoản với vai trò này.");
  }

  if (input.password.length < 6) {
    throw new Error("Mật khẩu cần tối thiểu 6 ký tự.");
  }

  const payload = await request<UserDoc>("/", {
    method: "POST",
    body: JSON.stringify({
      email: normalizeEmail(input.email),
      name: input.name,
      password: input.password,
      role: input.role,
      status: "ACTIVE",
      department: input.department,
      managedDepartments: input.managedDepartments,
      parentEmail: input.actor.email,
      parentName: input.actor.name,
      requestedRole: null,
    }),
  });

  return mapUserDoc(payload);
};

export const registerUser = async (input: RegisterUserInput): Promise<void> => {
  await request<{ message: string }>("/register", {
    method: "POST",
    body: JSON.stringify({
      email: normalizeEmail(input.email),
      name: input.name,
      password: input.password,
      department: input.department,
      desiredRole: input.desiredRole,
    }),
  });
};

export const fetchDepartments = async (): Promise<DepartmentOption[]> => {
  const response = await fetch(DEPARTMENTS_API_URL);
  if (!response.ok) {
    throw new Error(await parseErrorMessage(response));
  }

  return (await response.json()) as DepartmentOption[];
};

export const approvePendingUser = async (input: ApproveUserInput): Promise<void> => {
  if (!canCreateRole(input.approver.role, input.finalRole) && input.approver.role !== Role.ADMIN) {
    throw new Error("Bạn không có quyền phê duyệt vai trò này.");
  }

  await request<{ message: string }>(`/approve/${encodeURIComponent(normalizeEmail(input.email))}`, {
    method: "PATCH",
    body: JSON.stringify({
      finalRole: input.finalRole,
      approver: input.approver,
    }),
  });
};

export const subscribeUsers = (
  onData: (users: UserProfile[]) => void,
  onError?: (message: string) => void
) => {
  let disposed = false;
  let loading = false;

  const loadUsers = async () => {
    if (loading) {
      return;
    }

    loading = true;
    try {
      const rows = await request<UserDoc[]>("/");
      if (disposed) {
        return;
      }

      const users = rows
        .map(mapUserDoc)
        .sort((a, b) => {
          if (a.status === b.status) {
            return a.role.localeCompare(b.role);
          }
          return a.status.localeCompare(b.status);
        });
      onData(users);
    } catch (error) {
      if (!disposed) {
        onError?.(error instanceof Error ? error.message : "Khong the tai danh sach tai khoan.");
      }
    } finally {
      loading = false;
    }
  };

  void loadUsers();
  const timer = window.setInterval(() => {
    void loadUsers();
  }, POLL_INTERVAL_MS);

  return () => {
    disposed = true;
    window.clearInterval(timer);
  };
};
