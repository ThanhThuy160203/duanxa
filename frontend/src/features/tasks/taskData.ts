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

export const TASK_STATUS_LABEL_MAP: Record<TaskStatus, string> = {
  MOI_NHAN: "Mới nhận",
  DANG_XU_LY: "Đang xử lý",
  CHO_DUYET: "Chờ duyệt",
  HOAN_THANH: "Hoàn thành",
  DA_HUY: "Đã hủy",
};

export const TASK_STATUS_CHIP_COLOR_MAP: Record<TaskStatus, "default" | "primary" | "secondary" | "error" | "info" | "success" | "warning"> = {
  MOI_NHAN: "primary",
  DANG_XU_LY: "info",
  CHO_DUYET: "warning",
  HOAN_THANH: "success",
  DA_HUY: "error",
};

export const DEADLINE_STATE_SHORT_LABEL_MAP: Record<DeadlineState, string> = {
  QUA_HAN: "Quá hạn",
  SAP_DEN_HAN: "Sắp đến hạn",
  BINH_THUONG: "Đúng hạn",
};

export const DEADLINE_STATE_COLOR_MAP: Record<DeadlineState, "default" | "primary" | "secondary" | "error" | "info" | "success" | "warning"> = {
  QUA_HAN: "error",
  SAP_DEN_HAN: "warning",
  BINH_THUONG: "success",
};

export const TASK_SEED_DATA: TaskRecord[] = [
  {
    id: "VP-001",
    title: "Báo cáo nhanh tiến độ công tác bầu cử đại biểu HĐND các cấp",
    assignee: "Tạ Hồng Điền",
    assigneeRole: Role.NHAN_VIEN,
    department: "Văn phòng HĐND và UBND",
    source: "UBND Tỉnh",
    dueDate: "2026-03-20",
    status: "DANG_XU_LY",
    completionRate: 72,
  },
  {
    id: "KT-002",
    title: "Tổng hợp báo cáo tình hình thực hiện kinh phí phục vụ công tác",
    assignee: "Nguyễn Ngọc Phúc",
    assigneeRole: Role.NHAN_VIEN,
    department: "Phòng Kinh tế",
    source: "Sở/Ban/Ngành",
    dueDate: "2026-03-19",
    status: "DANG_XU_LY",
    completionRate: 60,
  },
  {
    id: "KT-003",
    title: "Rà soát góp ý dự thảo quyết định quy định chức năng nhiệm vụ Sở Xây dựng",
    assignee: "Nguyễn Tuấn Vũ",
    assigneeRole: Role.NHAN_VIEN,
    department: "Phòng Kinh tế",
    source: "Phó Chủ tịch",
    dueDate: "2026-03-23",
    status: "DANG_XU_LY",
    completionRate: 48,
  },
  {
    id: "VH-004",
    title: "Triển khai kế hoạch tuyên truyền xây dựng nông thôn mới",
    assignee: "Võ Thị Tình",
    assigneeRole: Role.NHAN_VIEN,
    department: "Phòng VH-XH",
    source: "Chủ tịch",
    dueDate: "2026-03-22",
    status: "MOI_NHAN",
    completionRate: 30,
  },
  {
    id: "VH-005",
    title: "Tổng hợp danh sách hộ nghèo cần hỗ trợ quý II",
    assignee: "Phan Thị Hương",
    assigneeRole: Role.NHAN_VIEN,
    department: "Phòng VH-XH",
    source: "Trưởng phòng",
    dueDate: "2026-03-28",
    status: "DANG_XU_LY",
    completionRate: 42,
  },
  {
    id: "CA-006",
    title: "Kế hoạch đảm bảo an ninh trật tự dịp lễ",
    assignee: "Nguyễn Văn Bình",
    assigneeRole: Role.NHAN_VIEN,
    department: "Công an xã",
    source: "Chủ tịch",
    dueDate: "2026-03-24",
    status: "DANG_XU_LY",
    completionRate: 52,
  },
  {
    id: "QS-007",
    title: "Rà soát lực lượng dân quân tự vệ thường trực",
    assignee: "Lê Văn Tâm",
    assigneeRole: Role.NHAN_VIEN,
    department: "Quân sự xã",
    source: "Phó Chủ tịch",
    dueDate: "2026-04-02",
    status: "DANG_XU_LY",
    completionRate: 39,
  },
  {
    id: "YT-008",
    title: "Tổng hợp báo cáo công tác phòng chống dịch bệnh theo tuần",
    assignee: "Trần Thị Mỹ",
    assigneeRole: Role.NHAN_VIEN,
    department: "Trạm y tế",
    source: "Sở/Ban/Ngành",
    dueDate: "2026-03-21",
    status: "DANG_XU_LY",
    completionRate: 75,
  },
  {
    id: "HCC-009",
    title: "Đánh giá mức độ hài lòng người dân tại Bộ phận Một cửa",
    assignee: "Phạm Minh Đức",
    assigneeRole: Role.NHAN_VIEN,
    department: "Trung tâm HCC",
    source: "UBND Tỉnh",
    dueDate: "2026-04-05",
    status: "CHO_DUYET",
    completionRate: 93,
  },
  {
    id: "VP-010",
    title: "Theo dõi kết quả xử lý văn bản đến liên thông",
    assignee: "Tạ Hồng Điền",
    assigneeRole: Role.NHAN_VIEN,
    department: "Văn phòng HĐND và UBND",
    source: "Trưởng phòng",
    dueDate: "2026-03-30",
    status: "DANG_XU_LY",
    completionRate: 56,
  },
  {
    id: "KT-011",
    title: "Thẩm định nhu cầu hỗ trợ phát triển sản xuất vụ hè thu",
    assignee: "Nguyễn Tuấn Vũ",
    assigneeRole: Role.NHAN_VIEN,
    department: "Phòng Kinh tế",
    source: "Sở/Ban/Ngành",
    dueDate: "2026-03-16",
    status: "DANG_XU_LY",
    completionRate: 67,
  },
  {
    id: "VH-012",
    title: "Tổ chức hội nghị tuyên truyền pháp luật cấp xã",
    assignee: "Võ Thị Tình",
    assigneeRole: Role.NHAN_VIEN,
    department: "Phòng VH-XH",
    source: "Phó Chủ tịch",
    dueDate: "2026-04-08",
    status: "MOI_NHAN",
    completionRate: 22,
  },
  {
    id: "CA-013",
    title: "Rà soát tình hình vi phạm pháp luật quý I",
    assignee: "Nguyễn Văn Bình",
    assigneeRole: Role.NHAN_VIEN,
    department: "Công an xã",
    source: "UBND Tỉnh",
    dueDate: "2026-03-25",
    status: "DANG_XU_LY",
    completionRate: 50,
  },
  {
    id: "QS-014",
    title: "Báo cáo kết quả huấn luyện dân quân tự vệ đợt 1",
    assignee: "Lê Văn Tâm",
    assigneeRole: Role.NHAN_VIEN,
    department: "Quân sự xã",
    source: "Trưởng phòng",
    dueDate: "2026-04-10",
    status: "MOI_NHAN",
    completionRate: 18,
  },
  {
    id: "YT-015",
    title: "Cập nhật dữ liệu tiêm chủng mở rộng tháng 3",
    assignee: "Trần Thị Mỹ",
    assigneeRole: Role.NHAN_VIEN,
    department: "Trạm y tế",
    source: "Sở/Ban/Ngành",
    dueDate: "2026-03-29",
    status: "DANG_XU_LY",
    completionRate: 58,
  },
  {
    id: "HCC-016",
    title: "Tổng hợp hồ sơ trễ hạn tại bộ phận một cửa",
    assignee: "Phạm Minh Đức",
    assigneeRole: Role.NHAN_VIEN,
    department: "Trung tâm HCC",
    source: "Chủ tịch",
    dueDate: "2026-03-18",
    status: "DANG_XU_LY",
    completionRate: 64,
  },
  {
    id: "TP-017",
    title: "Đôn đốc nhiệm vụ trọng điểm của các đơn vị phụ trách",
    assignee: "Trưởng phòng Kinh tế",
    assigneeRole: Role.TRUONG_PHONG,
    department: "Phòng Kinh tế",
    source: "Phó Chủ tịch",
    dueDate: "2026-03-26",
    status: "DANG_XU_LY",
    completionRate: 46,
  },
  {
    id: "PCT-018",
    title: "Điều phối xử lý nhóm nhiệm vụ liên phòng ban",
    assignee: "PCT phụ trách nội chính",
    assigneeRole: Role.PCT,
    department: "Văn phòng HĐND và UBND",
    source: "Chủ tịch",
    dueDate: "2026-03-31",
    status: "DANG_XU_LY",
    completionRate: 53,
  },
  {
    id: "CT-019",
    title: "Tổng hợp báo cáo điều hành toàn xã tháng 3",
    assignee: "Chủ tịch UBND xã",
    assigneeRole: Role.CHU_TICH,
    department: "Văn phòng HĐND và UBND",
    source: "UBND Tỉnh",
    dueDate: "2026-04-01",
    status: "DANG_XU_LY",
    completionRate: 41,
  },
  {
    id: "TH-020",
    title: "Phân loại nguồn giao nhiệm vụ và cảnh báo trễ hạn",
    assignee: "Tổ tổng hợp",
    assigneeRole: Role.TONG_HOP,
    department: "Văn phòng HĐND và UBND",
    source: "Chủ tịch",
    dueDate: "2026-03-27",
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
      return tasks.filter(
        (task) =>
          ["Văn phòng HĐND và UBND", "Phòng Kinh tế", "Phòng VH-XH"].includes(task.department) ||
          task.assigneeRole === Role.TRUONG_PHONG
      );
    case Role.PCT:
      return tasks.filter((task) =>
        [
          "Văn phòng HĐND và UBND",
          "Phòng Kinh tế",
          "Phòng VH-XH",
          "Công an xã",
          "Quân sự xã",
          "Trạm y tế",
          "Trung tâm HCC",
        ].includes(task.department)
      );
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
