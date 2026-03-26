import path from "node:path";
import fs from "node:fs";
import XLSX from "xlsx";
import { DepartmentModel } from "../models/Department.js";
import { TaskModel } from "../models/Task.js";
import { UserModel } from "../models/User.js";
import { ROLE_VALUES, type RoleValue, type TaskSourceValue, type TaskStatusValue } from "../models/enums.js";
import { connectMongo, disconnectMongo } from "./mongo.js";

const DEFAULT_PASSWORD_HASH = "8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92";
const SHEET_PATH = process.env.NHAP_LIEU_PATH ?? path.resolve(process.cwd(), "src/db/Nhaplieu.xlsx/Nhaplieu.xlsx");
const SHEET_NAME = process.env.NHAP_LIEU_SHEET ?? "NHAP LIEU";

const HEADER_KEYS = {
  title: "TEN_VAN_BAN_NHIEM_VU",
  docCode: "SO_HIEU_VAN_BAN",
  documentDate: "NGAY_VAN_BAN",
  department: "DON_VI_DUOC_GIAO",
  assignee: "NGUOI_PHU_TRACH_CHINH",
  priority: "MUC_DO_UU_TIEN_CAO_TRUNG_BINH_THUONG_XUYEN",
  dueDate: "NGAY_HOAN_THANH_HAN_XU_LY",
  actualDate: "NGAY_THUC_TE_HOAN_THANH",
  status: "TRANG_THAI_NHIEM_VU_TU_DONG",
} as const;

type NormalizedRow = Record<string, unknown>;

type DepartmentLookup = {
  code: string;
  name: string;
};

type DepartmentDraft = DepartmentLookup & {
  isActive: boolean;
};

type UserLookup = {
  userId: string;
  fullName: string;
  departmentCode?: string;
  role?: RoleValue;
};

type UserDraft = {
  userId: string;
  email: string;
  apiToken: string;
  passwordHash: string;
  fullName: string;
  role: (typeof ROLE_VALUES)[number];
  status: "ACTIVE";
  departmentCode: string;
  managedDepartments: string[];
};

type TaskDraft = {
  id: string;
  title: string;
  assigneeUserId: string;
  createdByUserId: string;
  departmentCode: string;
  source: TaskSourceValue;
  dueDate: Date;
  status: TaskStatusValue;
  completionRate: number;
  feedback?: string;
  documentCode?: string;
  documentDate?: Date;
  priorityLabel?: string;
};

const stripDiacritics = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D");

const normalizeHeader = (value: string) =>
  stripDiacritics(value)
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "")
    .toUpperCase();

const normalizeKey = (value: string) =>
  stripDiacritics(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const slugify = (value: string) =>
  stripDiacritics(value)
    .trim()
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "")
    .toUpperCase();

const toDepartmentCode = (name: string) => {
  const slug = slugify(name) || "DON_VI_KHAC";
  return slug.slice(0, 30);
};

const nameToEmail = (name: string, sequence: number) => {
  const base = stripDiacritics(name)
    .trim()
    .replace(/[^a-zA-Z0-9]+/g, "")
    .toLowerCase();
  const fallback = base || "nguoidung";
  return `${fallback}.${String(sequence).padStart(4, "0")}@duan.gov.vn`;
};

const describeStatus = (raw: string): TaskStatusValue => {
  const normalized = normalizeKey(raw).toUpperCase();
  if (!normalized) {
    return "DANG_XU_LY";
  }

  if (["DA HOAN THANH", "HOAN THANH", "DA HOAN TAT"].includes(normalized)) {
    return "HOAN_THANH";
  }

  if (["CHO DUYET", "CHO XAC NHAN"].includes(normalized)) {
    return "CHO_DUYET";
  }

  if (["MOI NHAN", "VUA GIAO"].includes(normalized)) {
    return "MOI_NHAN";
  }

  if (["DA HUY", "HUY", "KHONG THUC HIEN"].includes(normalized)) {
    return "DA_HUY";
  }

  return "DANG_XU_LY";
};

const priorityToSource = (value: string): TaskSourceValue => {
  const normalized = normalizeKey(value);
  if (normalized.includes("cao")) {
    return "CHU_TICH";
  }

  if (normalized.includes("thuong")) {
    return "TRUONG_PHONG";
  }

  if (normalized.includes("tong hop")) {
    return "SO_BAN_NGANH";
  }

  return "PHO_CHU_TICH";
};

const buildTaskPrefix = (departmentCode: string) => {
  if (departmentCode === "PHONG_KINH_TE") return "KT";
  if (departmentCode === "PHONG_VH_XH") return "VH";
  if (departmentCode === "VAN_PHONG_HDNDU_BND") return "VP";
  if (departmentCode === "CONG_AN_XA") return "CA";
  if (departmentCode === "QUAN_SU_XA") return "QS";
  if (departmentCode === "TRAM_Y_TE") return "YT";
  if (departmentCode === "TRUNG_TAM_HCC") return "HC";
  return departmentCode.slice(0, 2) || "CV";
};

const parseDateCell = (value: unknown): Date | undefined => {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value;
  }

  if (typeof value === "number") {
    const excelEpoch = Date.UTC(1899, 11, 30);
    const millis = excelEpoch + Math.round(value * 24 * 60 * 60 * 1000);
    const asDate = new Date(millis);
    if (!Number.isNaN(asDate.getTime())) {
      return asDate;
    }
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) {
      return undefined;
    }

    const tokens = trimmed.split(/[\/\-]/);
    const part1 = Number.parseInt(tokens[0] ?? "", 10);
    const part2 = Number.parseInt(tokens[1] ?? "", 10);
    const part3 = Number.parseInt(tokens[2] ?? "", 10);
    if (!Number.isNaN(part1) && !Number.isNaN(part2) && !Number.isNaN(part3)) {
      if (part1 > 1900 && part1 <= 2100) {
        return new Date(part1, part2 - 1, part3);
      }

      return new Date(part3, part2 - 1, part1);
    }

    const inferred = new Date(trimmed);
    if (!Number.isNaN(inferred.getTime())) {
      return inferred;
    }
  }

  return undefined;
};

const completionFromStatus = (status: TaskStatusValue) => {
  if (status === "HOAN_THANH") {
    return 100;
  }
  if (status === "CHO_DUYET") {
    return 90;
  }
  if (status === "DANG_XU_LY") {
    return 60;
  }
  return 30;
};

const inferRole = (name: string): (typeof ROLE_VALUES)[number] => {
  const normalized = normalizeKey(name);
  if (normalized.includes("chu tich")) {
    return "CHU_TICH";
  }
  if (normalized.includes("pho chu tich")) {
    return "PCT";
  }
  if (normalized.includes("truong phong")) {
    return "TRUONG_PHONG";
  }
  if (normalized.includes("tong hop")) {
    return "TONG_HOP";
  }
  return "NHAN_VIEN";
};

const readRows = () => {
  if (!fs.existsSync(SHEET_PATH)) {
    throw new Error(`Không tìm thấy file Excel tại ${SHEET_PATH}`);
  }

  const workbook = XLSX.readFile(SHEET_PATH, { cellDates: true });
  const effectiveSheetName = workbook.SheetNames.includes(SHEET_NAME) ? SHEET_NAME : workbook.SheetNames[0];

  if (!effectiveSheetName) {
    throw new Error("Tệp Excel không có sheet để đọc.");
  }

  const sheet = workbook.Sheets[effectiveSheetName];
  if (!sheet) {
    throw new Error(`Không tìm thấy sheet ${effectiveSheetName} trong file Excel.`);
  }

  const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "", raw: true });

  return rawRows
    .map((row) => {
      const normalizedRow: NormalizedRow = {};
      for (const [key, value] of Object.entries(row)) {
        const normalizedKey = normalizeHeader(key);
        normalizedRow[normalizedKey] = typeof value === "string" ? value.trim() : value;
      }
      return normalizedRow;
    })
    .filter((row) => Boolean(row[HEADER_KEYS.title]));
};

const run = async () => {
  await connectMongo();

  try {
    const rows = readRows();
    const existingDepartmentDocs = await DepartmentModel.find({}, { code: 1, name: 1 }).lean().exec();
    const existingUserDocs = await UserModel.find({}, { userId: 1, fullName: 1, departmentCode: 1, role: 1 })
      .lean()
      .exec();

    const existingDepartments: DepartmentLookup[] = existingDepartmentDocs.map((dept) => ({
      code: dept.code,
      name: dept.name,
    }));
    const existingUsers: UserLookup[] = existingUserDocs.map((user) => ({
      userId: user.userId,
      fullName: user.fullName,
      departmentCode: user.departmentCode ?? undefined,
      role: user.role as RoleValue | undefined,
    }));

    const departmentMapByName = new Map<string, DepartmentLookup>();
    for (const dept of existingDepartments) {
      departmentMapByName.set(normalizeKey(dept.name), { code: dept.code, name: dept.name });
    }

    const userMapByName = new Map<string, UserLookup>();
    for (const user of existingUsers) {
      userMapByName.set(normalizeKey(user.fullName), {
        userId: user.userId,
        fullName: user.fullName,
        departmentCode: user.departmentCode,
        role: user.role,
      });
    }

    let nextUserNumber = existingUsers.reduce((max, user) => {
      const match = /USR-(\d{4})/.exec(user.userId);
      const parsed = match && match[1] ? Number.parseInt(match[1], 10) : 0;
      return Math.max(max, Number.isNaN(parsed) ? 0 : parsed);
    }, 0);

    let nextTokenSequence = nextUserNumber;

    const departmentDrafts = new Map<string, DepartmentDraft>();
    const userDrafts = new Map<string, UserDraft>();
    const tasks: TaskDraft[] = [];
    const countersByPrefix = new Map<string, number>();

    const creator = existingUsers.find((user) =>
      ["CHU_TICH", "ADMIN", "PCT"].includes((user.role as string) ?? "")
    );
    if (!creator) {
      throw new Error("Không tìm thấy tài khoản tạo nhiệm vụ mặc định (cần CHU_TICH hoặc ADMIN).");
    }

    for (const row of rows) {
      const title = String(row[HEADER_KEYS.title] ?? "").trim();
      const departmentName = String(row[HEADER_KEYS.department] ?? "").trim();
      const assigneeName = String(row[HEADER_KEYS.assignee] ?? "").trim();

      if (!title || !departmentName || !assigneeName) {
        continue;
      }

      const documentCode = String(row[HEADER_KEYS.docCode] ?? "").trim();
      const documentDate = parseDateCell(row[HEADER_KEYS.documentDate]);
      const priorityLabel = String(row[HEADER_KEYS.priority] ?? "").trim();

      const normalizedDepartment = normalizeKey(departmentName);
      let departmentCode = departmentMapByName.get(normalizedDepartment)?.code;
      if (!departmentCode) {
        const draft: DepartmentDraft = {
          code: toDepartmentCode(departmentName),
          name: departmentName,
          isActive: true,
        };
        departmentCode = draft.code;
        departmentDrafts.set(draft.code, draft);
        departmentMapByName.set(normalizedDepartment, { code: draft.code, name: draft.name });
      }

      const normalizedAssignee = normalizeKey(assigneeName);
      let assigneeUserId = userMapByName.get(normalizedAssignee)?.userId;

      if (!assigneeUserId) {
        nextUserNumber += 1;
        nextTokenSequence += 1;
        assigneeUserId = `USR-${String(nextUserNumber).padStart(4, "0")}`;
        const email = nameToEmail(assigneeName, nextUserNumber);
        const suffixBase = stripDiacritics(assigneeName).replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
        const suffix = (suffixBase.slice(0, 4) || "AUTO").padEnd(4, "X");
        const apiToken = `DX-${String(nextTokenSequence).padStart(4, "0")}-${suffix}`;
        const userDraft: UserDraft = {
          userId: assigneeUserId,
          email,
          apiToken,
          passwordHash: DEFAULT_PASSWORD_HASH,
          fullName: assigneeName,
          role: inferRole(assigneeName),
          status: "ACTIVE",
          departmentCode,
          managedDepartments: [],
        };
        userDrafts.set(assigneeUserId, userDraft);
        userMapByName.set(normalizedAssignee, {
          userId: assigneeUserId,
          fullName: assigneeName,
          departmentCode,
          role: userDraft.role,
        });
      }

      const prefix = buildTaskPrefix(departmentCode);
      const nextNumber = (countersByPrefix.get(prefix) ?? 0) + 1;
      countersByPrefix.set(prefix, nextNumber);

      const dueDate = parseDateCell(row[HEADER_KEYS.dueDate]) ?? new Date();
      const actualDate = parseDateCell(row[HEADER_KEYS.actualDate]);
      const status = describeStatus(String(row[HEADER_KEYS.status] ?? ""));
      const source = priorityToSource(priorityLabel);
      const completionRate = status === "HOAN_THANH" && actualDate ? 100 : completionFromStatus(status);
      const feedback = actualDate ? `Hoàn thành vào ${actualDate.toLocaleDateString("vi-VN")}` : undefined;

      const task: TaskDraft = {
        id: `${prefix}-${String(nextNumber).padStart(3, "0")}`,
        title,
        assigneeUserId,
        createdByUserId: creator.userId,
        departmentCode,
        source,
        dueDate,
        status,
        completionRate,
        feedback,
        documentCode: documentCode || undefined,
        documentDate: documentDate ?? undefined,
        priorityLabel: priorityLabel || undefined,
      };

      tasks.push(task);
    }

    if (departmentDrafts.size > 0) {
      await DepartmentModel.bulkWrite(
        Array.from(departmentDrafts.values()).map((draft) => ({
          updateOne: {
            filter: { code: draft.code },
            update: { $set: draft },
            upsert: true,
          },
        }))
      );
    }

    if (userDrafts.size > 0) {
      await UserModel.insertMany(Array.from(userDrafts.values()));
    }

    await TaskModel.deleteMany({});
    if (tasks.length > 0) {
      await TaskModel.insertMany(tasks);
    }

    console.log(`Đã nhập ${tasks.length} nhiệm vụ từ sheet ${SHEET_NAME}.`);
    console.log(`Bổ sung ${departmentDrafts.size} phòng ban và ${userDrafts.size} tài khoản mới.`);
  } finally {
    await disconnectMongo();
  }
};

void run().catch((error) => {
  console.error("Import thất bại:", error);
  process.exitCode = 1;
});
