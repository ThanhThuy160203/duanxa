export const Role = {
  ADMIN: "ADMIN",
  CHU_TICH: "CHU_TICH",
  PCT: "PCT",
  TRUONG_PHONG: "TRUONG_PHONG",
  NHAN_VIEN: "NHAN_VIEN",
  TONG_HOP: "TONG_HOP",
} as const;

export type Role = (typeof Role)[keyof typeof Role];

export const ROLE_LABEL_MAP: Record<Role, string> = {
  [Role.NHAN_VIEN]: "Nhân viên",
  [Role.TRUONG_PHONG]: "Trưởng phòng",
  [Role.PCT]: "Phó Chủ tịch",
  [Role.CHU_TICH]: "Chủ tịch",
  [Role.TONG_HOP]: "Tổng hợp",
  [Role.ADMIN]: "Admin",
};