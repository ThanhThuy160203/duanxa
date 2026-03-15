import type { Timestamp } from "firebase/firestore";
import type { Role } from "./role";

export type UserStatus = "ACTIVE" | "PENDING" | "DISABLED";

export type UserProfile = {
  id: string;
  email: string;
  name: string;
  role: Role;
  status: UserStatus;
  department?: string;
  managedDepartments?: string[];
  parentEmail?: string | null;
  parentName?: string | null;
  requestedRole?: Role | null;
  createdAt?: Timestamp | null;
  updatedAt?: Timestamp | null;
};
