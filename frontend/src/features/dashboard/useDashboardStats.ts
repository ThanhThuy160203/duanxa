import { useMemo } from "react";
import { Role } from "../../types/role";
import type { UserProfile } from "../../types/user";
import { getDeadlineState, getVisibleTasksByRole, type TaskRecord } from "../tasks/taskData";
import { useTasksRealtime } from "../tasks/useTasksRealtime";
import { useUsersRealtime } from "../users/useUsersRealtime";

export type DashboardStats = {
  visibleTasks: number;
  tasksProcessing: number;
  tasksCompleted: number;
  tasksAwaitingApproval: number;
  tasksNew: number;
  tasksOverdue: number;
  tasksUpcoming: number;
  tasksNeedAttention: number;
  reportsReady: number;
  staffAssignments: number;
  departmentCount: number;
  sourceCount: number;
  activeUsers: number;
  pendingUsers: number;
};

export type HighlightStatKey = keyof DashboardStats;

const DEFAULT_STATS: DashboardStats = {
  visibleTasks: 0,
  tasksProcessing: 0,
  tasksCompleted: 0,
  tasksAwaitingApproval: 0,
  tasksNew: 0,
  tasksOverdue: 0,
  tasksUpcoming: 0,
  tasksNeedAttention: 0,
  reportsReady: 0,
  staffAssignments: 0,
  departmentCount: 0,
  sourceCount: 0,
  activeUsers: 0,
  pendingUsers: 0,
};

const buildStats = (tasks: TaskRecord[], users: UserProfile[], role?: Role): DashboardStats => {
  if (!role) {
    return DEFAULT_STATS;
  }

  const visibleTasks = getVisibleTasksByRole(tasks, role);

  const stats: DashboardStats = { ...DEFAULT_STATS };
  const departmentSet = new Set<string>();
  const sourceSet = new Set<string>();

  for (const task of visibleTasks) {
    if (task.department) {
      departmentSet.add(task.department);
    }

    if (task.source) {
      sourceSet.add(task.source);
    }

    if (task.assigneeRole === Role.NHAN_VIEN) {
      stats.staffAssignments += 1;
    }

    switch (task.status) {
      case "DANG_XU_LY":
        stats.tasksProcessing += 1;
        break;
      case "HOAN_THANH":
        stats.tasksCompleted += 1;
        break;
      case "CHO_DUYET":
        stats.tasksAwaitingApproval += 1;
        break;
      case "MOI_NHAN":
        stats.tasksNew += 1;
        break;
      default:
        break;
    }

    const deadlineState = getDeadlineState(task);
    if (deadlineState === "QUA_HAN") {
      stats.tasksOverdue += 1;
    } else if (deadlineState === "SAP_DEN_HAN") {
      stats.tasksUpcoming += 1;
    }
  }

  let activeUsersCount = 0;
  let pendingUsersCount = 0;
  for (const user of users) {
    if (user.department) {
      departmentSet.add(user.department);
    }

    if (user.status === "ACTIVE") {
      activeUsersCount += 1;
    } else if (user.status === "PENDING") {
      pendingUsersCount += 1;
    }
  }

  stats.visibleTasks = visibleTasks.length;
  stats.tasksNeedAttention = stats.tasksOverdue + stats.tasksUpcoming;
  stats.reportsReady = stats.tasksCompleted;
  stats.departmentCount = departmentSet.size;
  stats.sourceCount = sourceSet.size;
  stats.activeUsers = activeUsersCount;
  stats.pendingUsers = pendingUsersCount;

  return stats;
};

export const useDashboardStats = (role?: Role) => {
  const { tasks, loading: tasksLoading, error: tasksError } = useTasksRealtime();
  const { users, loading: usersLoading, error: usersError } = useUsersRealtime();

  const stats = useMemo(() => buildStats(tasks, users, role), [role, tasks, users]);
  const loading = tasksLoading || usersLoading;
  const error = tasksError ?? usersError;

  return {
    stats,
    loading,
    tasksLoading,
    usersLoading,
    error,
    tasksError,
    usersError,
  } as const;
};
