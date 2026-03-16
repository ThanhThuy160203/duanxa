import { Role } from "../../types/role";
import type { HighlightStatKey } from "./useDashboardStats";

export type HighlightTone = "default" | "success" | "warning" | "danger";

export const HIGHLIGHT_TONE_COLORS: Record<HighlightTone, "primary" | "secondary" | "info" | "success" | "warning" | "error"> = {
  default: "info",
  success: "success",
  warning: "warning",
  danger: "error",
};

export type RoleDashboardConfig = {
  role: Role;
  name: string;
  description: string;
  summary: string;
  highlights: {
    label: string;
    value?: string;
    detail?: string;
    tone?: HighlightTone;
    statKey?: HighlightStatKey;
    detailStatKey?: HighlightStatKey;
    detailFormatter?: (value: number) => string;
  }[];
  responsibilities: string[];
  filters: string[];
  notifications: string[];
  actions: {
    label: string;
    description: string;
    to?: string;
    primary?: boolean;
  }[];
};

export const ROLE_DASHBOARD_CONFIGS: RoleDashboardConfig[] = [
  {
    role: Role.NHAN_VIEN,
    name: "Nhân viên",
    description:
      "Tiếp nhận nhiệm vụ, phản hồi tiến độ và xác nhận hoàn thành với các cảnh báo quá hạn.",
    summary: "Theo dõi các nhiệm vụ cá nhân và các cảnh báo tức thời khi đăng nhập.",
    highlights: [
      {
        label: "Nhiệm vụ đang xử lý",
        tone: "warning",
        statKey: "tasksProcessing",
        detailStatKey: "tasksOverdue",
        detailFormatter: (value) => (value > 0 ? `${value} quá hạn` : "Không quá hạn"),
      },
      { label: "Hoàn thành tháng này", tone: "success", statKey: "tasksCompleted" },
      { label: "Báo cáo đã xuất", statKey: "reportsReady" },
    ],
    responsibilities: [
      "Nhận nhiệm vụ và phản hồi xác nhận hoàn thành",
      "Theo dõi kết quả cá nhân cùng báo cáo chi tiết",
      "Xuất báo cáo với bộ lọc tháng, quý, năm và trạng thái nhiệm vụ",
      "Nhận thông báo ngay khi có nhiệm vụ quá hạn hoặc sắp đến hạn",
    ],
    filters: ["Tháng", "Quý", "Năm", "Quá hạn", "Sắp đến hạn", "Toàn bộ"],
    notifications: [
      "02 nhiệm vụ quá hạn cần xác nhận",
      "01 nhiệm vụ sắp đến hạn trong 24h",
    ],
    actions: [
      {
        label: "Xem nhiệm vụ cá nhân",
        description: "Danh sách nhiệm vụ và phản hồi",
        to: "/tasks",
        primary: true,
      },
      {
        label: "Xuất báo cáo cá nhân",
        description: "Chọn bộ lọc để tải báo cáo",
      },
    ],
  },
  {
    role: Role.TRUONG_PHONG,
    name: "Trưởng phòng",
    description:
      "Tiếp nhận nhiệm vụ từ cấp trên, phân công cho nhân viên và đánh giá hiệu quả của phòng.",
    summary:
      "Quản lý tổng thể nhiệm vụ của phòng với báo cáo chi tiết nhân viên và trạng thái.",
    highlights: [
      { label: "Nhiệm vụ nhận", statKey: "visibleTasks" },
      { label: "Đã giao cho nhân viên", statKey: "staffAssignments", tone: "success" },
      { label: "Cảnh báo nhân viên", statKey: "tasksNeedAttention", tone: "danger", detail: "Hiệu suất thấp" },
    ],
    responsibilities: [
      "Nhận nhiệm vụ từ cấp trên và giao cho nhân viên",
      "Chuyển nhiệm vụ giữa các nhân viên trong phòng",
      "Phản hồi và đánh giá chất lượng hoàn thành",
      "Xuất báo cáo chi tiết theo nhân viên hoặc toàn phòng",
      "Nhận cảnh báo nhiệm vụ giống nhân viên và theo dõi kết quả phòng",
      "Xếp hạng nhân viên, phòng ban và cảnh báo hiệu suất",
    ],
    filters: ["Nhân viên", "Phòng", "Tháng", "Quý", "Năm", "Trạng thái"],
    notifications: [
      "Phòng A: 01 nhiệm vụ quá hạn",
      "Nhân viên B đạt hiệu suất cao tuần này",
    ],
    actions: [
      {
        label: "Giao nhiệm vụ mới",
        description: "Chia sẻ nhiệm vụ từ cấp trên",
        primary: true,
      },
      {
        label: "Xem xếp hạng phòng",
        description: "Hiệu suất và cảnh báo",
      },
    ],
  },
  {
    role: Role.PCT,
    name: "Phó Chủ tịch",
    description:
      "Có đầy đủ quyền của trưởng phòng và quản lý liên phòng đối với các phòng được giao.",
    summary:
      "Theo dõi kết quả tổng hợp các phòng thuộc phạm vi quản lý với cảnh báo xuyên phòng.",
    highlights: [
      { label: "Phòng quản lý", statKey: "departmentCount" },
      { label: "Nhiệm vụ ưu tiên", statKey: "tasksNeedAttention", tone: "warning" },
      { label: "Báo cáo liên phòng", statKey: "reportsReady" },
    ],
    responsibilities: [
      "Giao nhiệm vụ xuống trưởng phòng hoặc trực tiếp cho nhân viên",
      "Tổng hợp và so sánh kết quả giữa các phòng",
      "Nhận cảnh báo nhiệm vụ tương tự nhân viên/ trưởng phòng",
      "Xuất báo cáo tổng hợp cho từng phòng phụ trách",
    ],
    filters: ["Phòng", "Nguồn giao", "Trạng thái", "Thời gian"],
    notifications: [
      "Phòng Tư pháp có 02 nhiệm vụ sắp đến hạn",
      "Cảnh báo hiệu suất thấp tại phòng Văn hóa",
    ],
    actions: [
      {
        label: "Giao nhiệm vụ xuống phòng",
        description: "Phân bổ nhiệm vụ mới",
        primary: true,
      },
      {
        label: "Xem báo cáo liên phòng",
        description: "Tổng hợp kết quả",
      },
    ],
  },
  {
    role: Role.CHU_TICH,
    name: "Chủ tịch",
    description:
      "Quản trị toàn bộ hệ thống, giao nhiệm vụ đến mọi cấp và theo dõi dashboard tổng thể toàn xã.",
    summary:
      "Dashboard chi tiết nhất với khả năng giao, hủy và theo dõi kết quả toàn địa bàn.",
    highlights: [
      { label: "Nhiệm vụ toàn xã", statKey: "visibleTasks" },
      { label: "Đang xử lý", statKey: "tasksProcessing" },
      { label: "Cần can thiệp", statKey: "tasksNeedAttention", tone: "danger" },
    ],
    responsibilities: [
      "Giao nhiệm vụ đến PCT, trưởng phòng hoặc nhân viên",
      "Theo dõi kết quả từng cấp và từng phòng",
      "Xuất báo cáo chi tiết theo phòng hoặc cá nhân",
      "Giao lại, hủy nhiệm vụ khi cần",
      "Sử dụng toàn bộ quyền của cấp dưới",
    ],
    filters: ["Cấp", "Phòng", "Nguồn giao", "Trạng thái", "Thời gian"],
    notifications: [
      "05 nhiệm vụ cần chỉ đạo",
      "Đề xuất hủy nhiệm vụ Phòng Nội vụ",
    ],
    actions: [
      {
        label: "Tạo nhiệm vụ toàn xã",
        description: "Chỉ đạo mới đến các cấp",
        primary: true,
      },
      {
        label: "Xem dashboard chi tiết",
        description: "Phân tích kết quả từng cấp",
      },
    ],
  },
  {
    role: Role.TONG_HOP,
    name: "Cấp tổng hợp",
    description:
      "Thêm, giao, hủy nhiệm vụ và xuất báo cáo tương đương cấp Chủ tịch với phân loại nguồn.",
    summary:
      "Quản lý nguồn giao nhiệm vụ và báo cáo tổng hợp toàn hệ thống.",
    highlights: [
      { label: "Nguồn giao", statKey: "sourceCount" },
      { label: "Báo cáo đã gửi", statKey: "reportsReady" },
      { label: "Nhiệm vụ đang tổng hợp", statKey: "tasksAwaitingApproval" },
    ],
    responsibilities: [
      "Thêm, giao và hủy nhiệm vụ",
      "Xuất báo cáo tương đương Chủ tịch",
      "Phân loại nguồn giao nhiệm vụ (Sở, Ban, Ngành, UBND tỉnh, Chủ tịch, ...)",
    ],
    filters: [
      "Nguồn giao",
      "Phòng",
      "Trạng thái",
      "Thời gian",
      "Mức độ hoàn thành",
    ],
    notifications: [
      "Nguồn Sở Nội vụ: 03 nhiệm vụ vừa giao",
      "UBND tỉnh yêu cầu báo cáo trong tuần",
    ],
    actions: [
      {
        label: "Phân loại nguồn giao",
        description: "Theo dõi nguồn nhiệm vụ",
        primary: true,
      },
      {
        label: "Xuất báo cáo tổng hợp",
        description: "Tải báo cáo theo mẫu",
      },
    ],
  },
  {
    role: Role.ADMIN,
    name: "Admin",
    description:
      "Quyền quản trị cao nhất: thêm/xóa tài khoản, phân quyền, reset mật khẩu và cấu hình phòng ban.",
    summary:
      "Điều phối người dùng, phòng ban và phân quyền cho toàn hệ thống.",
    highlights: [
      { label: "Tài khoản quản lý", statKey: "activeUsers" },
      { label: "Phòng ban", statKey: "departmentCount" },
      { label: "Yêu cầu hỗ trợ", statKey: "pendingUsers", tone: "warning" },
    ],
    responsibilities: [
      "Thêm, xóa, điều chỉnh thông tin tài khoản",
      "Reset mật khẩu",
      "Phân bổ cá nhân về phòng ban và PCT phụ trách",
      "Kế thừa mọi quyền của các cấp dưới",
    ],
    filters: ["Phòng ban", "Quyền", "Trạng thái", "Ngày cập nhật"],
    notifications: [
      "02 yêu cầu reset mật khẩu chưa xử lý",
      "1 phòng mới chưa gán PCT phụ trách",
    ],
    actions: [
      {
        label: "Quản lý tài khoản",
        description: "Tạo hoặc chỉnh sửa người dùng",
        primary: true,
      },
      {
        label: "Cấu hình phòng ban",
        description: "Gán PCT phụ trách",
      },
    ],
  },
];

export const ROLE_CONFIG_MAP = ROLE_DASHBOARD_CONFIGS.reduce<Record<Role, RoleDashboardConfig>>(
  (acc, config) => {
    acc[config.role] = config;
    return acc;
  },
  {} as Record<Role, RoleDashboardConfig>
);

export const ROLE_MENU_ITEMS = ROLE_DASHBOARD_CONFIGS.map((config) => ({
  key: `/dashboard/${config.role}`,
  label: config.name,
}));
