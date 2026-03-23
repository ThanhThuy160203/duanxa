import { Role } from "../../types/role";

const ROLE_LEVEL: Record<Role, number> = {
  [Role.ADMIN]: 0,
  [Role.CHU_TICH]: 1,
  [Role.PCT]: 2,
  [Role.TONG_HOP]: 2,
  [Role.TRUONG_PHONG]: 3,
  [Role.NHAN_VIEN]: 4,
};

const ROLE_CHILDREN_MAP: Record<Role, Role[]> = {
  [Role.ADMIN]: [
    Role.CHU_TICH,
    Role.TONG_HOP,
    Role.PCT,
    Role.TRUONG_PHONG,
    Role.NHAN_VIEN,
  ],
  [Role.CHU_TICH]: [Role.PCT, Role.TONG_HOP, Role.TRUONG_PHONG, Role.NHAN_VIEN],
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

export const canAssignToRole = (actorRole: Role, targetRole: Role): boolean => {
  if (actorRole === Role.ADMIN) {
    return true;
  }

  // Chu tich can delegate to Tong hop for cross-department distribution.
  if (actorRole === Role.CHU_TICH && targetRole === Role.TONG_HOP) {
    return true;
  }

  return ROLE_LEVEL[actorRole] < ROLE_LEVEL[targetRole];
};

export const getAssignableRoles = (actorRole: Role): Role[] => {
  if (actorRole === Role.ADMIN) {
    return [Role.CHU_TICH, Role.TONG_HOP, Role.PCT, Role.TRUONG_PHONG, Role.NHAN_VIEN];
  }

  return (Object.values(Role) as Role[]).filter((targetRole) => canAssignToRole(actorRole, targetRole));
};
