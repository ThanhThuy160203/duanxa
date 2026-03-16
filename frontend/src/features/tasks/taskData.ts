import { Role } from "../../types/role";
import type { DeadlineFilter, TimeFilter } from "../authorization/roleCapabilities";

export type TaskStatus = "MOI_NHAN" | "DANG_XU_LY" | "CHO_DUYET" | "HOAN_THANH" | "DA_HUY";
export type DeadlineState = "QUA_HAN" | "SAP_DEN_HAN" | "BINH_THUONG";

export type TaskRecord = {
  id: string;
  title: string;
  assignee: string;
  assigneeRole: Role;
  department: string;
  source: string;
  dueDate: string;
  status: TaskStatus;
  completionRate: number;
  feedback?: string;
  evaluationScore?: number;
  evaluationComment?: string;
  cancelledReason?: string;
};

export const TASK_SOURCES = ["Sở/Ban/Ngành", "UBND Tỉnh", "Chủ tịch", "Phó Chủ tịch", "Trưởng phòng"];

export const TASK_SEED_DATA: TaskRecord[] = [
  {
    id: "NV-001",
    title: "Báo cáo tiến độ cải cách hành chính",
    assignee: "Nguyễn Văn A",
    assigneeRole: Role.NHAN_VIEN,
    department: "Văn phòng",
    source: "Trưởng phòng",
    dueDate: "2026-02-26",
    status: "CHO_DUYET",
    completionRate: 95,
  },
  {
    id: "NV-002",
    title: "Cập nhật số liệu tiếp công dân",
    assignee: "Nguyễn Văn A",
    assigneeRole: Role.NHAN_VIEN,
    department: "Văn phòng",
    source: "Trưởng phòng",
    dueDate: "2026-03-05",
    status: "DANG_XU_LY",
    completionRate: 78,
  },
  {
    id: "TP-014",
    title: "Rà soát hồ sơ công việc quý I",
    assignee: "Trưởng phòng Văn phòng",
    assigneeRole: Role.TRUONG_PHONG,
    department: "Văn phòng",
    source: "Phó Chủ tịch",
    dueDate: "2026-03-18",
    status: "DANG_XU_LY",
    completionRate: 62,
  },
  {
    id: "TP-015",
    title: "Đôn đốc nhiệm vụ chậm tiến độ của phòng",
    assignee: "Trưởng phòng Văn phòng",
    assigneeRole: Role.TRUONG_PHONG,
    department: "Văn phòng",
    source: "Phó Chủ tịch",
    dueDate: "2026-03-01",
    status: "MOI_NHAN",
    completionRate: 20,
  },
  {
    id: "PCT-021",
    title: "Điều phối liên phòng xử lý hồ sơ tồn",
    assignee: "PCT Khối nội chính",
    assigneeRole: Role.PCT,
    department: "Khối nội chính",
    source: "Chủ tịch",
    dueDate: "2026-03-09",
    status: "DANG_XU_LY",
    completionRate: 55,
  },
  {
    id: "CT-031",
    title: "Chỉ đạo tổng hợp báo cáo toàn xã",
    assignee: "Chủ tịch UBND xã",
    assigneeRole: Role.CHU_TICH,
    department: "Lãnh đạo",
    source: "UBND Tỉnh",
    dueDate: "2026-03-25",
    status: "DANG_XU_LY",
    completionRate: 45,
  },
  {
    id: "TH-041",
    title: "Phân loại nguồn giao nhiệm vụ tháng 3",
    assignee: "Tổ tổng hợp",
    assigneeRole: Role.TONG_HOP,
    department: "Tổng hợp",
    source: "Chủ tịch",
    dueDate: "2026-03-04",
    status: "MOI_NHAN",
    completionRate: 40,
  },
  {
    id: "AD-051",
    title: "Rà soát tài khoản chưa gán phòng ban",
    assignee: "Quản trị hệ thống",
    assigneeRole: Role.ADMIN,
    department: "CNTT",
    source: "Nội bộ",
    dueDate: "2026-03-12",
    status: "DANG_XU_LY",
    completionRate: 50,
  },
];

const toDate = (value: string) => {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, (month ?? 1) - 1, day ?? 1);
};

export const getDeadlineState = (task: TaskRecord): DeadlineState => {
  const dueDate = toDate(task.dueDate);
  const today = new Date();
  const diff = Math.floor((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  if (diff < 0) {
    return "QUA_HAN";
  }

  if (diff <= 3) {
    return "SAP_DEN_HAN";
  }

  return "BINH_THUONG";
};

const isInsidePeriod = (task: TaskRecord, period: TimeFilter) => {
  const dueDate = toDate(task.dueDate);
  const today = new Date();
  const year = today.getFullYear();

  if (period === "THANG") {
    return dueDate.getFullYear() === year && dueDate.getMonth() === today.getMonth();
  }

  if (period === "NAM") {
    return dueDate.getFullYear() === year;
  }

  const currentQuarter = Math.floor(today.getMonth() / 3);
  const dueQuarter = Math.floor(dueDate.getMonth() / 3);
  return dueDate.getFullYear() === year && dueQuarter === currentQuarter;
};

const matchDeadlineFilter = (task: TaskRecord, filter: DeadlineFilter) => {
  if (filter === "TOAN_BO") {
    return true;
  }

  return getDeadlineState(task) === filter;
};

export const getVisibleTasksByRole = (tasks: TaskRecord[], role: Role) => {
  switch (role) {
    case Role.NHAN_VIEN:
      return tasks.filter((task) => task.assigneeRole === Role.NHAN_VIEN);
    case Role.TRUONG_PHONG:
      return tasks.filter((task) => task.department === "Văn phòng" || task.assigneeRole === Role.TRUONG_PHONG);
    case Role.PCT:
      return tasks.filter((task) => ["Văn phòng", "Nội vụ", "Tư pháp", "Khối nội chính"].includes(task.department));
    default:
      return tasks;
  }
};

export const filterTasks = (tasks: TaskRecord[], period: TimeFilter, deadline: DeadlineFilter) =>
  tasks.filter((task) => task.status !== "DA_HUY" && isInsidePeriod(task, period) && matchDeadlineFilter(task, deadline));

export const buildTaskAlerts = (tasks: TaskRecord[]) => {
  const overdue = tasks.filter((task) => getDeadlineState(task) === "QUA_HAN").length;
  const upcoming = tasks.filter((task) => getDeadlineState(task) === "SAP_DEN_HAN").length;

  return {
    overdue,
    upcoming,
    messages: [
      `Có ${overdue} nhiệm vụ quá hạn cần xử lý ngay.`,
      `Có ${upcoming} nhiệm vụ sắp đến hạn trong 72 giờ.`,
    ],
  };
};
