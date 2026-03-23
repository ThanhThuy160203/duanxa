export const ROLE_VALUES = ["ADMIN", "CHU_TICH", "PCT", "TRUONG_PHONG", "NHAN_VIEN", "TONG_HOP"] as const;
export const USER_STATUS_VALUES = ["ACTIVE", "PENDING", "DISABLED"] as const;
export const TASK_STATUS_VALUES = ["MOI_NHAN", "DANG_XU_LY", "CHO_DUYET", "HOAN_THANH", "DA_HUY"] as const;
export const TASK_SOURCE_VALUES = ["SO_BAN_NGANH", "UBND_TINH", "CHU_TICH", "PHO_CHU_TICH", "TRUONG_PHONG"] as const;

export type RoleValue = (typeof ROLE_VALUES)[number];
export type UserStatusValue = (typeof USER_STATUS_VALUES)[number];
export type TaskStatusValue = (typeof TASK_STATUS_VALUES)[number];
export type TaskSourceValue = (typeof TASK_SOURCE_VALUES)[number];
