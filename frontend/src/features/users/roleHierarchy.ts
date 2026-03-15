import { Role } from "../../types/role";

const ROLE_CHILDREN_MAP: Record<Role, Role[]> = {
  [Role.ADMIN]: [
    Role.CHU_TICH,
    Role.PCT,
    Role.TRUONG_PHONG,
    Role.NHAN_VIEN,
    Role.TONG_HOP,
    Role.ADMIN,
  ],
  [Role.CHU_TICH]: [Role.PCT, Role.TRUONG_PHONG, Role.NHAN_VIEN, Role.TONG_HOP],
  [Role.PCT]: [Role.TRUONG_PHONG, Role.NHAN_VIEN],
  [Role.TRUONG_PHONG]: [Role.NHAN_VIEN],
  [Role.TONG_HOP]: [Role.TRUONG_PHONG, Role.NHAN_VIEN],
  [Role.NHAN_VIEN]: [],
};

export const getCreatableRoles = (role: Role): Role[] => ROLE_CHILDREN_MAP[role] ?? [];

export const canCreateRole = (actorRole: Role, targetRole: Role): boolean => {
  if (actorRole === Role.ADMIN) {
    return true;
  }

  return ROLE_CHILDREN_MAP[actorRole]?.includes(targetRole) ?? false;
};
