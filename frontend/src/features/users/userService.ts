import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { db } from "../../firebase/firebase";
import { Role } from "../../types/role";
import type { UserProfile, UserStatus } from "../../types/user";
import { canCreateRole } from "./roleHierarchy";

const USERS_COLLECTION = "users";

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
  email: string;
  name: string;
  role: Role;
  status: UserStatus;
  department?: string;
  managedDepartments?: string[];
  passwordHash: string;
  parentEmail?: string | null;
  parentName?: string | null;
  requestedRole?: Role | null;
  createdAt?: unknown;
  updatedAt?: unknown;
  approvedByRole?: Role | null;
};

const normalizeEmail = (email: string) => email.trim().toLowerCase();

const usersCollectionRef = collection(db, USERS_COLLECTION);

const mapUserDoc = (id: string, data: UserDoc): UserProfile => ({
  id,
  email: data.email,
  name: data.name,
  role: data.role,
  status: data.status,
  department: data.department,
  managedDepartments: data.managedDepartments,
  parentEmail: data.parentEmail ?? null,
  parentName: data.parentName ?? null,
  requestedRole: data.requestedRole ?? null,
  createdAt: (data.createdAt as UserProfile["createdAt"]) ?? null,
  updatedAt: (data.updatedAt as UserProfile["updatedAt"]) ?? null,
});

const encodeHex = (buffer: ArrayBuffer) =>
  Array.from(new Uint8Array(buffer))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");

const getCrypto = () => {
  const cryptoImpl = globalThis.crypto;

  if (!cryptoImpl?.subtle) {
    throw new Error("Thiết bị không hỗ trợ thuật toán mã hóa bắt buộc.");
  }

  return cryptoImpl;
};

export const hashPassword = async (password: string): Promise<string> => {
  const encoded = new TextEncoder().encode(password);
  const hashBuffer = await getCrypto().subtle.digest("SHA-256", encoded);
  return encodeHex(hashBuffer);
};

export const fetchUserProfile = async (email: string): Promise<UserProfile | null> => {
  const normalized = normalizeEmail(email);
  const userRef = doc(db, USERS_COLLECTION, normalized);
  const snapshot = await getDoc(userRef);

  if (!snapshot.exists()) {
    return null;
  }

  return mapUserDoc(snapshot.id, snapshot.data() as UserDoc);
};

export const loginUser = async (email: string, password: string): Promise<UserProfile> => {
  const normalized = normalizeEmail(email);
  const userRef = doc(db, USERS_COLLECTION, normalized);
  const snapshot = await getDoc(userRef);

  if (!snapshot.exists()) {
    throw new Error("Email chưa được đăng ký trong hệ thống.");
  }

  const data = snapshot.data() as UserDoc;

  if (data.status !== "ACTIVE") {
    throw new Error("Tài khoản đang chờ duyệt hoặc bị khóa.");
  }

  const passwordHash = await hashPassword(password);

  if (passwordHash !== data.passwordHash) {
    throw new Error("Mật khẩu không chính xác.");
  }

  return mapUserDoc(snapshot.id, data);
};

export const createUserByHierarchy = async (input: HierarchyCreateInput): Promise<UserProfile> => {
  if (!canCreateRole(input.actor.role, input.role)) {
    throw new Error("Bạn không thể tạo tài khoản với vai trò này.");
  }

  if (input.password.length < 6) {
    throw new Error("Mật khẩu cần tối thiểu 6 ký tự.");
  }

  const normalized = normalizeEmail(input.email);
  const userRef = doc(db, USERS_COLLECTION, normalized);
  const snapshot = await getDoc(userRef);

  if (snapshot.exists()) {
    throw new Error("Email đã tồn tại trong hệ thống.");
  }

  const passwordHash = await hashPassword(input.password);
  const payload: UserDoc = {
    email: normalized,
    name: input.name.trim(),
    role: input.role,
    status: "ACTIVE",
    department: input.department?.trim(),
    managedDepartments: input.managedDepartments?.filter((dept): dept is string => Boolean(dept?.trim())),
    passwordHash,
    parentEmail: input.actor.email,
    parentName: input.actor.name,
    requestedRole: null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    approvedByRole: input.actor.role,
  };

  await setDoc(userRef, payload);

  return mapUserDoc(normalized, payload);
};

export const registerUser = async (input: RegisterUserInput): Promise<void> => {
  if (input.password.length < 6) {
    throw new Error("Mật khẩu cần tối thiểu 6 ký tự.");
  }

  const normalized = normalizeEmail(input.email);
  const userRef = doc(db, USERS_COLLECTION, normalized);
  const snapshot = await getDoc(userRef);

  if (snapshot.exists()) {
    const existing = snapshot.data() as UserDoc;
    if (existing.status === "PENDING") {
      throw new Error("Email này đang chờ phê duyệt.");
    }

    throw new Error("Email đã được sử dụng.");
  }

  const passwordHash = await hashPassword(input.password);
  const payload: UserDoc = {
    email: normalized,
    name: input.name.trim(),
    role: input.desiredRole ?? Role.NHAN_VIEN,
    status: "PENDING",
    department: input.department?.trim(),
    managedDepartments: [],
    passwordHash,
    parentEmail: null,
    parentName: null,
    requestedRole: input.desiredRole ?? Role.NHAN_VIEN,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    approvedByRole: null,
  };

  await setDoc(userRef, payload);
};

export const approvePendingUser = async (input: ApproveUserInput): Promise<void> => {
  if (!canCreateRole(input.approver.role, input.finalRole) && input.approver.role !== Role.ADMIN) {
    throw new Error("Bạn không có quyền phê duyệt vai trò này.");
  }

  const normalized = normalizeEmail(input.email);
  const userRef = doc(db, USERS_COLLECTION, normalized);
  const snapshot = await getDoc(userRef);

  if (!snapshot.exists()) {
    throw new Error("Tài khoản không tồn tại.");
  }

  const data = snapshot.data() as UserDoc;

  if (data.status !== "PENDING") {
    throw new Error("Tài khoản này không ở trạng thái chờ duyệt.");
  }

  await updateDoc(userRef, {
    role: input.finalRole,
    status: "ACTIVE" satisfies UserStatus,
    requestedRole: null,
    parentEmail: input.approver.email,
    parentName: input.approver.name,
    approvedByRole: input.approver.role,
    updatedAt: serverTimestamp(),
  });
};

export const subscribeUsers = (
  onData: (users: UserProfile[]) => void,
  onError?: (message: string) => void
) => {
  const q = query(usersCollectionRef, orderBy("status"), orderBy("role"));

  return onSnapshot(
    q,
    (snapshot) => {
      const users = snapshot.docs.map((docSnap) => mapUserDoc(docSnap.id, docSnap.data() as UserDoc));
      onData(users);
    },
    (error) => onError?.(error.message)
  );
};
