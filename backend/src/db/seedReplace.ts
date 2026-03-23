import { DepartmentModel } from "../models/Department.js";
import { TaskModel } from "../models/Task.js";
import { UserModel } from "../models/User.js";
import { connectMongo, disconnectMongo } from "./mongo.js";

const departments = [
  { code: "PHONG_KINH_TE", name: "Phòng Kinh tế" },
  { code: "PHONG_VH_XH", name: "Phòng VH-XH" },
  { code: "VAN_PHONG_HDNDU_BND", name: "Văn phòng HĐND và UBND" },
  { code: "CONG_AN_XA", name: "Công an xã" },
  { code: "QUAN_SU_XA", name: "Quân sự xã" },
  { code: "TRAM_Y_TE", name: "Trạm y tế" },
  { code: "TRUNG_TAM_HCC", name: "Trung tâm HCC" },
] as const;

const DEFAULT_PASSWORD_HASH = "8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92";

const run = async () => {
  await connectMongo();

  try {
    await Promise.all([TaskModel.deleteMany({}), UserModel.deleteMany({}), DepartmentModel.deleteMany({})]);

    await DepartmentModel.insertMany(departments);

    const users = await UserModel.insertMany([
      {
        userId: "USR-0001",
        email: "admin@duan.gov.vn",
        apiToken: "DX-0001-ADM1",
        passwordHash: DEFAULT_PASSWORD_HASH,
        fullName: "Quản trị hệ thống",
        role: "ADMIN",
        status: "ACTIVE",
        departmentCode: "VAN_PHONG_HDNDU_BND",
      },
      {
        userId: "USR-0002",
        email: "chutich@duan.gov.vn",
        apiToken: "DX-0002-CHU1",
        passwordHash: DEFAULT_PASSWORD_HASH,
        fullName: "Chủ tịch UBND xã",
        role: "CHU_TICH",
        status: "ACTIVE",
        departmentCode: "VAN_PHONG_HDNDU_BND",
      },
      {
        userId: "USR-0003",
        email: "pct@duan.gov.vn",
        apiToken: "DX-0003-PCT1",
        passwordHash: DEFAULT_PASSWORD_HASH,
        fullName: "Phó Chủ tịch UBND xã",
        role: "PCT",
        status: "ACTIVE",
        departmentCode: "VAN_PHONG_HDNDU_BND",
      },
      {
        userId: "USR-0004",
        email: "truongphong@duan.gov.vn",
        apiToken: "DX-0004-TRP1",
        passwordHash: DEFAULT_PASSWORD_HASH,
        fullName: "Trưởng phòng Kinh tế",
        role: "TRUONG_PHONG",
        status: "ACTIVE",
        departmentCode: "PHONG_KINH_TE",
      },
      {
        userId: "USR-0005",
        email: "nvkinhte@duan.gov.vn",
        apiToken: "DX-0005-NVK1",
        passwordHash: DEFAULT_PASSWORD_HASH,
        fullName: "Nguyễn Tuấn Vũ",
        role: "NHAN_VIEN",
        status: "ACTIVE",
        departmentCode: "PHONG_KINH_TE",
      },
      {
        userId: "USR-0006",
        email: "nvvhxh@duan.gov.vn",
        apiToken: "DX-0006-NVX1",
        passwordHash: DEFAULT_PASSWORD_HASH,
        fullName: "Võ Thị Tình",
        role: "NHAN_VIEN",
        status: "ACTIVE",
        departmentCode: "PHONG_VH_XH",
      },
      {
        userId: "USR-0007",
        email: "nvvphdnd@duan.gov.vn",
        apiToken: "DX-0007-NVP1",
        passwordHash: DEFAULT_PASSWORD_HASH,
        fullName: "Tạ Hồng Điền",
        role: "NHAN_VIEN",
        status: "ACTIVE",
        departmentCode: "VAN_PHONG_HDNDU_BND",
      },
      {
        userId: "USR-0008",
        email: "nvcaxa@duan.gov.vn",
        apiToken: "DX-0008-CAX1",
        passwordHash: DEFAULT_PASSWORD_HASH,
        fullName: "Nguyễn Văn Bình",
        role: "NHAN_VIEN",
        status: "ACTIVE",
        departmentCode: "CONG_AN_XA",
      },
      {
        userId: "USR-0009",
        email: "nvquansu@duan.gov.vn",
        apiToken: "DX-0009-QSX1",
        passwordHash: DEFAULT_PASSWORD_HASH,
        fullName: "Lê Văn Tâm",
        role: "NHAN_VIEN",
        status: "ACTIVE",
        departmentCode: "QUAN_SU_XA",
      },
      {
        userId: "USR-0010",
        email: "nvyt@duan.gov.vn",
        apiToken: "DX-0010-YTE1",
        passwordHash: DEFAULT_PASSWORD_HASH,
        fullName: "Trần Thị Mỹ",
        role: "NHAN_VIEN",
        status: "ACTIVE",
        departmentCode: "TRAM_Y_TE",
      },
      {
        userId: "USR-0011",
        email: "nvhcc@duan.gov.vn",
        apiToken: "DX-0011-HCC1",
        passwordHash: DEFAULT_PASSWORD_HASH,
        fullName: "Phạm Minh Đức",
        role: "NHAN_VIEN",
        status: "ACTIVE",
        departmentCode: "TRUNG_TAM_HCC",
      },
    ]);

    const userIdByEmail = new Map(users.map((user) => [user.email, user.userId]));

    const createdByUserId = userIdByEmail.get("chutich@duan.gov.vn");
    const assigneeKT = userIdByEmail.get("nvkinhte@duan.gov.vn");
    const assigneeVH = userIdByEmail.get("nvvhxh@duan.gov.vn");
    const assigneeVP = userIdByEmail.get("nvvphdnd@duan.gov.vn");
    const assigneeCA = userIdByEmail.get("nvcaxa@duan.gov.vn");
    const assigneeQS = userIdByEmail.get("nvquansu@duan.gov.vn");
    const assigneeYT = userIdByEmail.get("nvyt@duan.gov.vn");
    const assigneeHCC = userIdByEmail.get("nvhcc@duan.gov.vn");

    if (
      !createdByUserId ||
      !assigneeKT ||
      !assigneeVH ||
      !assigneeVP ||
      !assigneeCA ||
      !assigneeQS ||
      !assigneeYT ||
      !assigneeHCC
    ) {
      throw new Error("Seed users missing");
    }

    await TaskModel.insertMany([
      {
        id: "VP-101",
        title: "Công văn V/v báo cáo nhanh tiến độ công tác bầu cử",
        assigneeUserId: assigneeVP,
        createdByUserId,
        departmentCode: "VAN_PHONG_HDNDU_BND",
        source: "UBND_TINH",
        dueDate: new Date("2026-01-27T00:00:00.000Z"),
        status: "DANG_XU_LY",
        completionRate: 45,
      },
      {
        id: "KT-102",
        title: "Công văn V/v hướng dẫn nguồn kinh phí và báo cáo tình hình thực hiện",
        assigneeUserId: assigneeKT,
        createdByUserId,
        departmentCode: "PHONG_KINH_TE",
        source: "SO_BAN_NGANH",
        dueDate: new Date("2026-01-29T00:00:00.000Z"),
        status: "DANG_XU_LY",
        completionRate: 50,
      },
      {
        id: "VP-103",
        title: "Công văn hướng dẫn sử dụng vốn NSNN giai đoạn 2021-2025",
        assigneeUserId: assigneeVP,
        createdByUserId,
        departmentCode: "VAN_PHONG_HDNDU_BND",
        source: "UBND_TINH",
        dueDate: new Date("2026-01-30T00:00:00.000Z"),
        status: "DANG_XU_LY",
        completionRate: 52,
      },
      {
        id: "KT-104",
        title: "Công văn V/v lấy ý kiến góp ý và phản biện xã hội dự thảo quyết định",
        assigneeUserId: assigneeKT,
        createdByUserId,
        departmentCode: "PHONG_KINH_TE",
        source: "PHO_CHU_TICH",
        dueDate: new Date("2026-01-30T00:00:00.000Z"),
        status: "DANG_XU_LY",
        completionRate: 48,
      },
      {
        id: "KT-105",
        title: "Công văn góp ý hồ sơ dự thảo quyết định quy định chức năng nhiệm vụ",
        assigneeUserId: assigneeKT,
        createdByUserId,
        departmentCode: "PHONG_KINH_TE",
        source: "SO_BAN_NGANH",
        dueDate: new Date("2026-01-30T00:00:00.000Z"),
        status: "DANG_XU_LY",
        completionRate: 47,
      },
      {
        id: "KT-106",
        title: "Công văn phối hợp góp ý nội dung tham mưu UBND tỉnh ban hành văn bản",
        assigneeUserId: assigneeKT,
        createdByUserId,
        departmentCode: "PHONG_KINH_TE",
        source: "SO_BAN_NGANH",
        dueDate: new Date("2026-01-30T00:00:00.000Z"),
        status: "DANG_XU_LY",
        completionRate: 44,
      },
      {
        id: "KT-107",
        title: "Công văn báo cáo kết quả thực hiện sản xuất thủy sản năm 2025",
        assigneeUserId: assigneeKT,
        createdByUserId,
        departmentCode: "PHONG_KINH_TE",
        source: "SO_BAN_NGANH",
        dueDate: new Date("2026-01-31T00:00:00.000Z"),
        status: "DANG_XU_LY",
        completionRate: 58,
      },
      {
        id: "VP-108",
        title: "Công văn tham gia ý kiến dự thảo Kế hoạch triển khai thi hành Luật",
        assigneeUserId: assigneeVP,
        createdByUserId,
        departmentCode: "VAN_PHONG_HDNDU_BND",
        source: "UBND_TINH",
        dueDate: new Date("2026-01-31T00:00:00.000Z"),
        status: "DANG_XU_LY",
        completionRate: 50,
      },
      {
        id: "VP-109",
        title: "Công văn tham gia ý kiến dự thảo Kế hoạch triển khai thi hành Luật - bổ sung",
        assigneeUserId: assigneeVP,
        createdByUserId,
        departmentCode: "VAN_PHONG_HDNDU_BND",
        source: "UBND_TINH",
        dueDate: new Date("2026-01-31T00:00:00.000Z"),
        status: "DANG_XU_LY",
        completionRate: 51,
      },
      {
        id: "VH-110",
        title: "Công văn nộp hồ sơ và cử người nhận hồ sơ ứng cử đại biểu HĐND cấp xã",
        assigneeUserId: assigneeVH,
        createdByUserId,
        departmentCode: "PHONG_VH_XH",
        source: "CHU_TICH",
        dueDate: new Date("2026-02-01T00:00:00.000Z"),
        status: "DANG_XU_LY",
        completionRate: 53,
      },
      {
        id: "CA-111",
        title: "V/v thực hiện công tác phòng, chống tội phạm liên quan dịp Tết",
        assigneeUserId: assigneeCA,
        createdByUserId,
        departmentCode: "CONG_AN_XA",
        source: "CHU_TICH",
        dueDate: new Date("2026-02-03T00:00:00.000Z"),
        status: "DANG_XU_LY",
        completionRate: 49,
      },
      {
        id: "QS-112",
        title: "Rà soát lực lượng dân quân tự vệ thường trực quý I",
        assigneeUserId: assigneeQS,
        createdByUserId,
        departmentCode: "QUAN_SU_XA",
        source: "PHO_CHU_TICH",
        dueDate: new Date("2026-02-06T00:00:00.000Z"),
        status: "DANG_XU_LY",
        completionRate: 42,
      },
      {
        id: "YT-113",
        title: "Báo cáo công tác y tế dự phòng và phòng chống dịch theo tháng",
        assigneeUserId: assigneeYT,
        createdByUserId,
        departmentCode: "TRAM_Y_TE",
        source: "SO_BAN_NGANH",
        dueDate: new Date("2026-02-07T00:00:00.000Z"),
        status: "DANG_XU_LY",
        completionRate: 57,
      },
      {
        id: "HC-114",
        title: "Tổng hợp tỷ lệ hài lòng người dân tại bộ phận một cửa",
        assigneeUserId: assigneeHCC,
        createdByUserId,
        departmentCode: "TRUNG_TAM_HCC",
        source: "UBND_TINH",
        dueDate: new Date("2026-02-10T00:00:00.000Z"),
        status: "CHO_DUYET",
        completionRate: 92,
      },
      {
        id: "KT-115",
        title: "Đề án đào tạo nguồn nhân lực chất lượng cao người dân tộc thiểu số",
        assigneeUserId: assigneeKT,
        createdByUserId,
        departmentCode: "PHONG_KINH_TE",
        source: "SO_BAN_NGANH",
        dueDate: new Date("2026-02-12T00:00:00.000Z"),
        status: "DANG_XU_LY",
        completionRate: 40,
      },
      {
        id: "VH-116",
        title: "Kế hoạch tuyên truyền pháp luật tại thôn buôn năm 2026",
        assigneeUserId: assigneeVH,
        createdByUserId,
        departmentCode: "PHONG_VH_XH",
        source: "PHO_CHU_TICH",
        dueDate: new Date("2026-02-14T00:00:00.000Z"),
        status: "DANG_XU_LY",
        completionRate: 37,
      },
      {
        id: "VP-117",
        title: "Tổng hợp danh sách cán bộ chưa được khởi tạo trên hệ thống",
        assigneeUserId: assigneeVP,
        createdByUserId,
        departmentCode: "VAN_PHONG_HDNDU_BND",
        source: "TRUONG_PHONG",
        dueDate: new Date("2026-02-16T00:00:00.000Z"),
        status: "HOAN_THANH",
        completionRate: 100,
      },
      {
        id: "KT-118",
        title: "Phối hợp kiểm tra đối chiếu kinh phí thẩm định thực hiện chính sách",
        assigneeUserId: assigneeKT,
        createdByUserId,
        departmentCode: "PHONG_KINH_TE",
        source: "SO_BAN_NGANH",
        dueDate: new Date("2026-02-18T00:00:00.000Z"),
        status: "DANG_XU_LY",
        completionRate: 55,
      },
    ]);

    console.table(
      users.map((user) => ({
        email: user.email,
        apiToken: user.apiToken,
      }))
    );

    console.log("Mongo seed replace completed");
  } finally {
    await disconnectMongo();
  }
};

void run();
