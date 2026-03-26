import { Role } from "../../types/role";

export type TimeFilter = "THANG" | "QUY" | "NAM";
export type DeadlineFilter = "TOAN_BO" | "SAP_DEN_HAN" | "QUA_HAN";

export type RoleCapabilities = {
  canReceiveTask: boolean;
  canProvideFeedback: boolean;
  canCreateTask: boolean;
  canAssignTask: boolean;
  canReassignTask: boolean;
  canCancelTask: boolean;
  canEvaluateTask: boolean;
  canExportReport: boolean;
  canViewPersonalResult: boolean;
  canViewDepartmentResult: boolean;
  canViewMultiDepartmentResult: boolean;
  canViewGlobalResult: boolean;
  canViewAllTasks: boolean;
  canViewEmployeeRanking: boolean;
  canViewDepartmentRanking: boolean;
  canWarnPerformance: boolean;
  canClassifyTaskSource: boolean;
  canManageAccounts: boolean;
  canDeleteAccounts: boolean;
  canResetPasswords: boolean;
  canMapDepartmentsToLeads: boolean;
  visibleSources: string[];
};

export const ROLE_CAPABILITY_MAP: Record<Role, RoleCapabilities> = {
  [Role.NHAN_VIEN]: {
    canReceiveTask: true,
    canProvideFeedback: true,
    canCreateTask: false,
    canAssignTask: false,
    canReassignTask: false,
    canCancelTask: false,
    canEvaluateTask: false,
    canExportReport: true,
    canViewPersonalResult: true,
    canViewDepartmentResult: false,
    canViewMultiDepartmentResult: false,
    canViewGlobalResult: false,
    canViewAllTasks: false,
    canViewEmployeeRanking: false,
    canViewDepartmentRanking: false,
    canWarnPerformance: false,
    canClassifyTaskSource: false,
    canManageAccounts: false,
    canDeleteAccounts: false,
    canResetPasswords: false,
    canMapDepartmentsToLeads: false,
    visibleSources: ["Trưởng phòng", "Phó Chủ tịch", "Chủ tịch"],
  },
  [Role.TRUONG_PHONG]: {
    canReceiveTask: true,
    canProvideFeedback: true,
    canCreateTask: false,
    canAssignTask: true,
    canReassignTask: true,
    canCancelTask: false,
    canEvaluateTask: true,
    canExportReport: true,
    canViewPersonalResult: true,
    canViewDepartmentResult: true,
    canViewMultiDepartmentResult: false,
    canViewGlobalResult: false,
    canViewAllTasks: false,
    canViewEmployeeRanking: true,
    canViewDepartmentRanking: true,
    canWarnPerformance: true,
    canClassifyTaskSource: false,
    canManageAccounts: false,
    canDeleteAccounts: false,
    canResetPasswords: false,
    canMapDepartmentsToLeads: false,
    visibleSources: ["Sở/Ban/Ngành", "UBND Tỉnh", "Chủ tịch", "Phó Chủ tịch", "Trưởng phòng"],
  },
  [Role.PCT]: {
    canReceiveTask: true,
    canProvideFeedback: true,
    canCreateTask: true,
    canAssignTask: true,
    canReassignTask: true,
    canCancelTask: false,
    canEvaluateTask: true,
    canExportReport: true,
    canViewPersonalResult: true,
    canViewDepartmentResult: true,
    canViewMultiDepartmentResult: true,
    canViewGlobalResult: false,
    canViewAllTasks: true,
    canViewEmployeeRanking: true,
    canViewDepartmentRanking: true,
    canWarnPerformance: true,
    canClassifyTaskSource: false,
    canManageAccounts: false,
    canDeleteAccounts: false,
    canResetPasswords: false,
    canMapDepartmentsToLeads: false,
    visibleSources: ["Sở/Ban/Ngành", "UBND Tỉnh", "Chủ tịch", "Phó Chủ tịch", "Trưởng phòng"],
  },
  [Role.CHU_TICH]: {
    canReceiveTask: true,
    canProvideFeedback: true,
    canCreateTask: true,
    canAssignTask: true,
    canReassignTask: true,
    canCancelTask: true,
    canEvaluateTask: true,
    canExportReport: true,
    canViewPersonalResult: true,
    canViewDepartmentResult: true,
    canViewMultiDepartmentResult: true,
    canViewGlobalResult: true,
    canViewAllTasks: true,
    canViewEmployeeRanking: true,
    canViewDepartmentRanking: true,
    canWarnPerformance: true,
    canClassifyTaskSource: true,
    canManageAccounts: false,
    canDeleteAccounts: false,
    canResetPasswords: false,
    canMapDepartmentsToLeads: false,
    visibleSources: ["Sở/Ban/Ngành", "UBND Tỉnh", "Chủ tịch", "Phó Chủ tịch", "Trưởng phòng"],
  },
  [Role.TONG_HOP]: {
    canReceiveTask: true,
    canProvideFeedback: true,
    canCreateTask: true,
    canAssignTask: true,
    canReassignTask: true,
    canCancelTask: true,
    canEvaluateTask: true,
    canExportReport: true,
    canViewPersonalResult: true,
    canViewDepartmentResult: true,
    canViewMultiDepartmentResult: true,
    canViewGlobalResult: true,
    canViewAllTasks: true,
    canViewEmployeeRanking: true,
    canViewDepartmentRanking: true,
    canWarnPerformance: true,
    canClassifyTaskSource: true,
    canManageAccounts: false,
    canDeleteAccounts: false,
    canResetPasswords: false,
    canMapDepartmentsToLeads: false,
    visibleSources: ["Sở/Ban/Ngành", "UBND Tỉnh", "Chủ tịch", "Phó Chủ tịch"],
  },
  [Role.ADMIN]: {
    canReceiveTask: true,
    canProvideFeedback: true,
    canCreateTask: true,
    canAssignTask: true,
    canReassignTask: true,
    canCancelTask: true,
    canEvaluateTask: true,
    canExportReport: true,
    canViewPersonalResult: true,
    canViewDepartmentResult: true,
    canViewMultiDepartmentResult: true,
    canViewGlobalResult: true,
    canViewAllTasks: true,
    canViewEmployeeRanking: true,
    canViewDepartmentRanking: true,
    canWarnPerformance: true,
    canClassifyTaskSource: true,
    canManageAccounts: true,
    canDeleteAccounts: true,
    canResetPasswords: true,
    canMapDepartmentsToLeads: true,
    visibleSources: ["Sở/Ban/Ngành", "UBND Tỉnh", "Chủ tịch", "Phó Chủ tịch", "Trưởng phòng"],
  },
};
