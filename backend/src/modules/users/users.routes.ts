import { Router } from "express";
import crypto from "node:crypto";
import { z } from "zod";
import { DepartmentModel } from "../../models/Department.js";
import { ROLE_VALUES, USER_STATUS_VALUES } from "../../models/enums.js";
import { UserModel } from "../../models/User.js";
import { asyncHandler } from "../../utils/asyncHandler.js";

const roleEnum = z.enum(ROLE_VALUES);
const statusEnum = z.enum(USER_STATUS_VALUES);

const baseUserSchema = z.object({
  email: z.string().email(),
  name: z.string().trim().min(2).max(150),
  role: roleEnum,
  status: statusEnum.default("ACTIVE"),
  department: z.string().trim().min(2).max(150).optional(),
  managedDepartments: z.array(z.string().trim().min(2).max(150)).optional(),
  password: z.string().min(6).max(128),
  parentEmail: z.string().email().nullable().optional(),
  parentName: z.string().trim().min(2).max(150).nullable().optional(),
  requestedRole: roleEnum.nullable().optional(),
});

const createUserSchema = baseUserSchema.extend({
  parentUserId: z.string().regex(/^USR-[0-9]{4}$/).nullable().optional(),
});

const registerSchema = z.object({
  email: z.string().email(),
  name: z.string().trim().min(2).max(150),
  password: z.string().min(6).max(128),
  department: z.string().trim().min(2).max(150).optional(),
  desiredRole: roleEnum.optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1).max(128),
});

const approveSchema = z.object({
  finalRole: roleEnum,
  approver: z.object({
    email: z.string().email(),
    name: z.string().trim().min(2).max(150),
    role: roleEnum,
  }),
});

const hashPassword = (password: string) => crypto.createHash("sha256").update(password).digest("hex");

const ROLE_LEVEL: Record<(typeof ROLE_VALUES)[number], number> = {
  ADMIN: 0,
  CHU_TICH: 1,
  PCT: 2,
  TONG_HOP: 2,
  TRUONG_PHONG: 3,
  NHAN_VIEN: 4,
};

const canCreateRole = (
  actorRole: (typeof ROLE_VALUES)[number],
  targetRole: (typeof ROLE_VALUES)[number]
) => {
  if (actorRole === "ADMIN") {
    return true;
  }

  return ROLE_LEVEL[actorRole] < ROLE_LEVEL[targetRole];
};

const buildApiToken = (userId: string) => {
  const suffix = crypto.randomBytes(2).toString("hex").toUpperCase();
  return `DX-${userId.slice(-4)}-${suffix}`;
};

const getNextUserId = async () => {
  const latest = await UserModel.findOne({ userId: /^USR-[0-9]{4}$/ })
    .sort({ userId: -1 })
    .select({ userId: 1, _id: 0 })
    .lean();

  const latestNumber = latest?.userId ? Number.parseInt(latest.userId.split("-")[1] ?? "0", 10) : 0;
  const nextNumber = Number.isNaN(latestNumber) ? 1 : latestNumber + 1;
  return `USR-${String(nextNumber).padStart(4, "0")}`;
};

const resolveDepartmentCode = async (department?: string) => {
  if (!department?.trim()) {
    return undefined;
  }

  const normalized = department.trim();
  const byCode = await DepartmentModel.findOne({ code: normalized.toUpperCase() }).lean();
  if (byCode) {
    return byCode.code;
  }

  const byName = await DepartmentModel.findOne({ name: normalized }).lean();
  return byName?.code;
};

const toApiUser = async (user: {
  userId: string;
  email: string;
  apiToken: string;
  fullName: string;
  role: string;
  status: string;
  departmentCode?: string | null;
  managedDepartments?: string[];
  parentEmail?: string | null;
  parentName?: string | null;
  requestedRole?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}) => {
  const department = user.departmentCode
    ? await DepartmentModel.findOne({ code: user.departmentCode }).lean()
    : null;

  return {
    id: user.userId,
    email: user.email,
    apiToken: user.apiToken,
    name: user.fullName,
    role: user.role,
    status: user.status,
    department: department?.name,
    managedDepartments: user.managedDepartments ?? [],
    parentEmail: user.parentEmail ?? null,
    parentName: user.parentName ?? null,
    requestedRole: user.requestedRole ?? null,
    createdAt: user.createdAt ?? null,
    updatedAt: user.updatedAt ?? null,
  };
};

export const usersRouter = Router();

usersRouter.get(
  "/",
  asyncHandler(async (_req, res) => {
    const users = await UserModel.find({}).sort({ userId: 1 }).lean();
    const mapped = await Promise.all(
      users.map((user) =>
        toApiUser({
          userId: user.userId,
          email: user.email,
          apiToken: user.apiToken,
          fullName: user.fullName,
          role: user.role,
          status: user.status,
          departmentCode: user.departmentCode,
          managedDepartments: user.managedDepartments,
          parentEmail: user.parentEmail,
          parentName: user.parentName,
          requestedRole: user.requestedRole,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        })
      )
    );

    res.json(mapped);
  })
);

usersRouter.post(
  "/login",
  asyncHandler(async (req, res) => {
    const payload = loginSchema.parse(req.body);
    const normalizedEmail = payload.email.trim().toLowerCase();

    const user = await UserModel.findOne({ email: normalizedEmail }).lean();
    if (!user) {
      return res.status(404).json({ message: "Email chưa được đăng ký trong hệ thống." });
    }

    if (user.status !== "ACTIVE") {
      return res.status(403).json({ message: "Tài khoản đang chờ duyệt hoặc bị khóa." });
    }

    const passwordHash = hashPassword(payload.password);
    if (passwordHash !== user.passwordHash) {
      return res.status(400).json({ message: "Mật khẩu không chính xác." });
    }

    return res.json(
      await toApiUser({
        userId: user.userId,
        email: user.email,
        apiToken: user.apiToken,
        fullName: user.fullName,
        role: user.role,
        status: user.status,
        departmentCode: user.departmentCode,
        managedDepartments: user.managedDepartments,
        parentEmail: user.parentEmail,
        parentName: user.parentName,
        requestedRole: user.requestedRole,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      })
    );
  })
);

usersRouter.post(
  "/register",
  asyncHandler(async (req, res) => {
    registerSchema.parse(req.body);
    return res.status(403).json({
      message: "Chức năng tự đăng ký đã tắt. Vui lòng liên hệ quản trị hoặc cấp có thẩm quyền để được cấp tài khoản.",
    });
  })
);

usersRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const payload = createUserSchema.parse(req.body);
    const normalizedEmail = payload.email.trim().toLowerCase();

    if (!payload.parentEmail) {
      return res.status(403).json({ message: "Thiếu thông tin người tạo tài khoản." });
    }

    const actorEmail = payload.parentEmail.trim().toLowerCase();
    const actor = await UserModel.findOne({ email: actorEmail }).lean();
    if (!actor || actor.status !== "ACTIVE") {
      return res.status(403).json({ message: "Người tạo tài khoản không hợp lệ hoặc không hoạt động." });
    }

    if (!canCreateRole(actor.role, payload.role)) {
      return res.status(403).json({ message: "Bạn không có quyền tạo tài khoản với vai trò này." });
    }

    const existing = await UserModel.findOne({ email: normalizedEmail }).lean();
    if (existing) {
      return res.status(400).json({ message: "Email đã tồn tại trong hệ thống." });
    }

    const userId = await getNextUserId();
    const departmentCode = await resolveDepartmentCode(payload.department);

    const created = await UserModel.create({
      userId,
      email: normalizedEmail,
      apiToken: buildApiToken(userId),
      passwordHash: hashPassword(payload.password),
      fullName: payload.name.trim(),
      role: payload.role,
      status: payload.status,
      departmentCode,
      managedDepartments: payload.managedDepartments ?? [],
      parentUserId: payload.parentUserId ?? undefined,
      parentEmail: payload.parentEmail ?? undefined,
      parentName: payload.parentName ?? undefined,
      requestedRole: payload.requestedRole ?? null,
    });

    return res.status(201).json(
      await toApiUser({
        userId: created.userId,
        email: created.email,
        apiToken: created.apiToken,
        fullName: created.fullName,
        role: created.role,
        status: created.status,
        departmentCode: created.departmentCode,
        managedDepartments: created.managedDepartments,
        parentEmail: created.parentEmail,
        parentName: created.parentName,
        requestedRole: created.requestedRole,
        createdAt: created.createdAt,
        updatedAt: created.updatedAt,
      })
    );
  })
);

usersRouter.patch(
  "/approve/:email",
  asyncHandler(async (req, res) => {
    const payload = approveSchema.parse(req.body);
    const rawEmail = req.params.email;
    if (!rawEmail) {
      return res.status(400).json({ message: "Thiếu email tài khoản cần phê duyệt." });
    }
    const email = decodeURIComponent(rawEmail).trim().toLowerCase();

    const user = await UserModel.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "Tài khoản không tồn tại." });
    }

    const approverEmail = payload.approver.email.trim().toLowerCase();
    const approver = await UserModel.findOne({ email: approverEmail }).lean();
    if (!approver || approver.status !== "ACTIVE") {
      return res.status(403).json({ message: "Người phê duyệt không hợp lệ hoặc không hoạt động." });
    }

    if (!canCreateRole(approver.role, payload.finalRole)) {
      return res.status(403).json({ message: "Bạn không có quyền phê duyệt vai trò này." });
    }

    if (user.status !== "PENDING") {
      return res.status(400).json({ message: "Tài khoản này không ở trạng thái chờ duyệt." });
    }

    user.role = payload.finalRole;
    user.status = "ACTIVE";
    user.requestedRole = undefined;
    user.parentEmail = payload.approver.email;
    user.parentName = payload.approver.name;

    await user.save();

    return res.json({ message: "Đã phê duyệt tài khoản thành công." });
  })
);
