import { Router } from "express";
import { z } from "zod";
import { DepartmentModel } from "../../models/Department.js";
import type { ROLE_VALUES } from "../../models/enums.js";
import { TASK_SOURCE_VALUES, TASK_STATUS_VALUES } from "../../models/enums.js";
import { TaskModel } from "../../models/Task.js";
import { UserModel } from "../../models/User.js";
import { asyncHandler } from "../../utils/asyncHandler.js";

const taskStatusEnum = z.enum(TASK_STATUS_VALUES);
const taskSourceEnum = z.enum(TASK_SOURCE_VALUES);

const userIdSchema = z.string().regex(/^USR-[0-9]{4}$/);

const createTaskSchema = z.object({
  id: z.string().trim().toUpperCase().regex(/^[A-Z]{2,4}-[0-9]{3,6}$/).optional(),
  title: z.string().trim().min(3).max(400),
  assigneeUserId: userIdSchema,
  createdByUserId: userIdSchema,
  departmentCode: z.string().trim().toUpperCase().min(2).max(30),
  source: taskSourceEnum,
  dueDate: z.coerce.date(),
});

const assignTaskSchema = z.object({
  assigneeUserId: userIdSchema,
  departmentCode: z.string().trim().toUpperCase().min(2).max(30),
  actorUserId: userIdSchema,
});

const feedbackSchema = z.object({
  actorUserId: userIdSchema,
  feedback: z.string().trim().min(3).max(2000),
  completionRate: z.coerce.number().min(0).max(100),
});

const evaluateSchema = z.object({
  actorUserId: userIdSchema,
  approved: z.boolean(),
  score: z.coerce.number().min(0).max(100),
  comment: z.string().trim().min(3).max(2000),
});

const cancelSchema = z.object({
  actorUserId: userIdSchema,
  reason: z.string().trim().min(3).max(2000),
});

const resetTaskItemSchema = z.object({
  id: z.string().trim().toUpperCase().regex(/^[A-Z]{2,4}-[0-9]{3,6}$/),
  title: z.string().trim().min(3).max(400),
  assignee: z.string().trim().min(2).max(150),
  department: z.string().trim().min(2).max(150),
  source: z.string().trim().min(2).max(50),
  dueDate: z.string().trim().min(8).max(40),
  status: taskStatusEnum.optional(),
  completionRate: z.number().min(0).max(100).optional(),
  feedback: z.string().max(2000).optional(),
  evaluationScore: z.number().min(0).max(100).optional(),
  evaluationComment: z.string().max(2000).optional(),
  cancelledReason: z.string().max(2000).optional(),
});

const resetTasksSchema = z.object({
  actorUserId: userIdSchema,
  tasks: z.array(resetTaskItemSchema).min(1),
});

const ensureUserExists = async (id: string) => {
  const user = await UserModel.findOne({ userId: id }).lean();
  return Boolean(user);
};

const getUserById = async (id: string) => {
  return UserModel.findOne({ userId: id }).lean();
};

const ROLE_LEVEL: Record<(typeof ROLE_VALUES)[number], number> = {
  ADMIN: 0,
  CHU_TICH: 1,
  TONG_HOP: 1,
  PCT: 2,
  TRUONG_PHONG: 3,
  NHAN_VIEN: 4,
};

const canAssignToLowerRole = (actorRole: string, assigneeRole: string) => {
  if (actorRole === "ADMIN") {
    return true;
  }

  // Special delegation rule: Chu tich can assign to Tong hop.
  if (actorRole === "CHU_TICH" && assigneeRole === "TONG_HOP") {
    return true;
  }

  const actorLevel = ROLE_LEVEL[actorRole as (typeof ROLE_VALUES)[number]];
  const assigneeLevel = ROLE_LEVEL[assigneeRole as (typeof ROLE_VALUES)[number]];
  if (actorLevel === undefined || assigneeLevel === undefined) {
    return false;
  }

  return actorLevel < assigneeLevel;
};

const ensureDepartmentExists = async (code: string) => {
  const department = await DepartmentModel.findOne({ code }).lean();
  return Boolean(department);
};

const resolveSourceCode = (source: string) => {
  const mapping: Record<string, (typeof TASK_SOURCE_VALUES)[number]> = {
    "SỞ/BAN/NGÀNH": "SO_BAN_NGANH",
    SO_BAN_NGANH: "SO_BAN_NGANH",
    "UBND TỈNH": "UBND_TINH",
    UBND_TINH: "UBND_TINH",
    "CHỦ TỊCH": "CHU_TICH",
    CHU_TICH: "CHU_TICH",
    "PHÓ CHỦ TỊCH": "PHO_CHU_TICH",
    PHO_CHU_TICH: "PHO_CHU_TICH",
    "TRƯỞNG PHÒNG": "TRUONG_PHONG",
    TRUONG_PHONG: "TRUONG_PHONG",
  };

  return mapping[source.trim().toUpperCase()] ?? "CHU_TICH";
};

const buildTaskPrefix = (departmentCode: string) => {
  if (departmentCode === "PHONG_KINH_TE") return "KT";
  if (departmentCode === "PHONG_VH_XH") return "VH";
  if (departmentCode === "VAN_PHONG_HDNDU_BND") return "VP";
  if (departmentCode === "CONG_AN_XA") return "CA";
  if (departmentCode === "QUAN_SU_XA") return "QS";
  if (departmentCode === "TRAM_Y_TE") return "YT";
  if (departmentCode === "TRUNG_TAM_HCC") return "HC";
  return "CV";
};

const getNextTaskId = async (departmentCode: string) => {
  const prefix = buildTaskPrefix(departmentCode);
  const latest = await TaskModel.findOne({ id: new RegExp(`^${prefix}-[0-9]{3,6}$`) })
    .sort({ id: -1 })
    .select({ id: 1, _id: 0 })
    .lean();

  const latestNumber = latest?.id ? Number.parseInt(latest.id.split("-")[1] ?? "0", 10) : 0;
  const nextNumber = Number.isNaN(latestNumber) ? 1 : latestNumber + 1;
  return `${prefix}-${String(nextNumber).padStart(3, "0")}`;
};

const mapTask = async (task: {
  id: string;
  title: string;
  assigneeUserId: string;
  departmentCode: string;
  source: string;
  dueDate: Date;
  status: string;
  completionRate: number;
  feedback?: string | null;
  evaluationScore?: number | null;
  evaluationComment?: string | null;
  cancelledReason?: string | null;
  createdAt: Date;
  updatedAt: Date;
}) => {
  const assignee = await UserModel.findOne({ userId: task.assigneeUserId }).lean();
  const department = await DepartmentModel.findOne({ code: task.departmentCode }).lean();

  return {
    id: task.id,
    title: task.title,
    assigneeUserId: task.assigneeUserId,
    assigneeName: assignee?.fullName ?? null,
    assigneeRole: assignee?.role ?? null,
    departmentCode: task.departmentCode,
    departmentName: department?.name ?? null,
    source: task.source,
    dueDate: task.dueDate,
    status: task.status,
    completionRate: task.completionRate,
    feedback: task.feedback ?? null,
    evaluationScore: task.evaluationScore ?? null,
    evaluationComment: task.evaluationComment ?? null,
    cancelledReason: task.cancelledReason ?? null,
    createdAt: task.createdAt,
    updatedAt: task.updatedAt,
  };
};

export const tasksRouter = Router();

tasksRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const status = req.query.status as string | undefined;
    const departmentCode = req.query.departmentCode as string | undefined;

    const query: Record<string, unknown> = {};

    if (status) {
      query.status = taskStatusEnum.parse(status);
    }

    if (departmentCode) {
      query.departmentCode = departmentCode.toUpperCase();
    }

    const tasks = await TaskModel.find(query).sort({ dueDate: 1, createdAt: -1 }).lean();
    const mapped = await Promise.all(
      tasks.map((task) =>
        mapTask({
          ...task,
          assigneeUserId: task.assigneeUserId,
          createdAt: task.createdAt ?? new Date(),
          updatedAt: task.updatedAt ?? new Date(),
        })
      )
    );

    res.json(mapped);
  })
);

tasksRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const payload = createTaskSchema.parse(req.body);

    const [assignee, creator, departmentExists] = await Promise.all([
      getUserById(payload.assigneeUserId),
      getUserById(payload.createdByUserId),
      ensureDepartmentExists(payload.departmentCode),
    ]);

    if (!assignee) {
      return res.status(400).json({ message: "assigneeUserId does not exist" });
    }

    if (!creator) {
      return res.status(400).json({ message: "createdByUserId does not exist" });
    }

    if (!canAssignToLowerRole(creator.role, assignee.role)) {
      return res.status(403).json({
        message: "Bạn chỉ được giao nhiệm vụ cho cấp thấp hơn trong hệ thống phân cấp.",
      });
    }

    if (!departmentExists) {
      return res.status(400).json({ message: "departmentCode does not exist" });
    }

    const created = await TaskModel.create({
      id: payload.id ?? (await getNextTaskId(payload.departmentCode)),
      title: payload.title,
      assigneeUserId: payload.assigneeUserId,
      createdByUserId: payload.createdByUserId,
      departmentCode: payload.departmentCode,
      source: payload.source,
      dueDate: payload.dueDate,
      status: "MOI_NHAN",
      completionRate: 0,
    });

    return res.status(201).json(await mapTask({
      id: created.id,
      title: created.title,
      assigneeUserId: created.assigneeUserId,
      departmentCode: created.departmentCode,
      source: created.source,
      dueDate: created.dueDate,
      status: created.status,
      completionRate: created.completionRate,
      feedback: created.feedback,
      evaluationScore: created.evaluationScore,
      evaluationComment: created.evaluationComment,
      cancelledReason: created.cancelledReason,
      createdAt: created.createdAt,
      updatedAt: created.updatedAt,
    }));
  })
);

tasksRouter.patch(
  "/:id/assign",
  asyncHandler(async (req, res) => {
    const payload = assignTaskSchema.parse(req.body);
    const { id } = req.params;

    const [assignee, actor, departmentExists] = await Promise.all([
      getUserById(payload.assigneeUserId),
      getUserById(payload.actorUserId),
      ensureDepartmentExists(payload.departmentCode),
    ]);

    if (!assignee || !actor || !departmentExists) {
      return res.status(400).json({ message: "assigneeUserId or departmentCode is invalid" });
    }

    if (!canAssignToLowerRole(actor.role, assignee.role)) {
      return res.status(403).json({
        message: "Bạn chỉ được giao nhiệm vụ cho cấp thấp hơn trong hệ thống phân cấp.",
      });
    }

    const updated = await TaskModel.findOneAndUpdate(
      { id },
      {
        assigneeUserId: payload.assigneeUserId,
        departmentCode: payload.departmentCode,
        status: "DANG_XU_LY",
        feedback: `Được giao bởi user ${payload.actorUserId}`,
        cancelledReason: undefined,
      },
      { new: true, runValidators: true }
    );

    if (!updated) {
      return res.status(404).json({ message: "Task not found" });
    }

    return res.json({
      id: updated.id,
      status: updated.status,
      assigneeUserId: updated.assigneeUserId,
      departmentCode: updated.departmentCode,
      updatedAt: updated.updatedAt,
    });
  })
);

tasksRouter.patch(
  "/:id/feedback",
  asyncHandler(async (req, res) => {
    const payload = feedbackSchema.parse(req.body);
    const { id } = req.params;

    const updated = await TaskModel.findOneAndUpdate(
      { id },
      {
        status: "CHO_DUYET",
        completionRate: payload.completionRate,
        feedback: `User ${payload.actorUserId}: ${payload.feedback}`,
        cancelledReason: undefined,
      },
      { new: true, runValidators: true }
    );

    if (!updated) {
      return res.status(404).json({ message: "Task not found" });
    }

    return res.json({
      id: updated.id,
      status: updated.status,
      completionRate: updated.completionRate,
      feedback: updated.feedback,
      updatedAt: updated.updatedAt,
    });
  })
);

tasksRouter.patch(
  "/:id/evaluate",
  asyncHandler(async (req, res) => {
    const payload = evaluateSchema.parse(req.body);
    const { id } = req.params;
    const status = payload.approved ? "HOAN_THANH" : "DANG_XU_LY";
    const completionRate = payload.approved ? 100 : Math.min(95, payload.score);

    const updated = await TaskModel.findOneAndUpdate(
      { id },
      {
        status,
        evaluationScore: payload.score,
        evaluationComment: `User ${payload.actorUserId}: ${payload.comment}`,
        completionRate,
        cancelledReason: undefined,
      },
      { new: true, runValidators: true }
    );

    if (!updated) {
      return res.status(404).json({ message: "Task not found" });
    }

    return res.json({
      id: updated.id,
      status: updated.status,
      completionRate: updated.completionRate,
      evaluationScore: updated.evaluationScore,
      evaluationComment: updated.evaluationComment,
      updatedAt: updated.updatedAt,
    });
  })
);

tasksRouter.patch(
  "/:id/cancel",
  asyncHandler(async (req, res) => {
    const payload = cancelSchema.parse(req.body);
    const { id } = req.params;

    const updated = await TaskModel.findOneAndUpdate(
      { id },
      {
        status: "DA_HUY",
        cancelledReason: `User ${payload.actorUserId}: ${payload.reason}`,
      },
      { new: true, runValidators: true }
    );

    if (!updated) {
      return res.status(404).json({ message: "Task not found" });
    }

    return res.json({
      id: updated.id,
      status: updated.status,
      cancelledReason: updated.cancelledReason,
      updatedAt: updated.updatedAt,
    });
  })
);

tasksRouter.post(
  "/reset",
  asyncHandler(async (req, res) => {
    const payload = resetTasksSchema.parse(req.body);

    const actorExists = await ensureUserExists(payload.actorUserId);
    if (!actorExists) {
      return res.status(400).json({ message: "actorUserId does not exist" });
    }

    const users = await UserModel.find({}).lean();
    const departments = await DepartmentModel.find({}).lean();

    const userByName = new Map(users.map((user) => [user.fullName.trim().toLowerCase(), user]));
    const departmentByName = new Map(departments.map((department) => [department.name.trim().toLowerCase(), department]));

    const mappedTasks = payload.tasks.map((task) => {
      const assignee = userByName.get(task.assignee.trim().toLowerCase());
      if (!assignee) {
        throw new Error(`Assignee not found: ${task.assignee}`);
      }

      const department = departmentByName.get(task.department.trim().toLowerCase());
      if (!department) {
        throw new Error(`Department not found: ${task.department}`);
      }

      return {
        id: task.id,
        title: task.title,
        assigneeUserId: assignee.userId,
        createdByUserId: payload.actorUserId,
        departmentCode: department.code,
        source: resolveSourceCode(task.source),
        dueDate: new Date(task.dueDate),
        status: task.status ?? "DANG_XU_LY",
        completionRate: task.completionRate ?? 0,
        feedback: task.feedback,
        evaluationScore: task.evaluationScore,
        evaluationComment: task.evaluationComment,
        cancelledReason: task.cancelledReason,
      };
    });

    await TaskModel.deleteMany({});
    await TaskModel.insertMany(mappedTasks);

    return res.json({ message: "Tasks reset successfully", count: mappedTasks.length });
  })
);
