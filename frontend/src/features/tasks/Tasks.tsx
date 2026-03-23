import {
    Alert,
    Box,
    Button,
    Card,
    CardContent,
    Chip,
    Divider,
    FormControl,
    InputLabel,
    MenuItem,
    Select,
    Stack,
    TextField,
    Typography,
} from "@mui/material";
import Grid from "@mui/material/GridLegacy";
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAppSelector } from "../../app/store";
import { Role, ROLE_LABEL_MAP } from "../../types/role";
import { ROLE_CAPABILITY_MAP, type DeadlineFilter, type TimeFilter } from "../authorization/roleCapabilities";
import { getAssignableRoles } from "../users/roleHierarchy";
import {
    buildTaskAlerts,
    DEADLINE_STATE_COLOR_MAP,
    DEADLINE_STATE_SHORT_LABEL_MAP,
    filterTasks,
    getDeadlineState,
    getVisibleTasksByRole,
    TASK_SOURCES,
    TASK_STATUS_CHIP_COLOR_MAP,
    TASK_STATUS_LABEL_MAP,
} from "./taskData";
import {
    assignTask,
    cancelTask,
    createTask,
    evaluateTask,
    fetchUsersAndDepartmentsByRole,
    fetchUsersByRoleAndDepartment,
    reassignTask,
    replaceTasksWithSeedData,
    submitTaskFeedback,
} from "./taskService";
import { useTasksRealtime } from "./useTasksRealtime";

type UserOption = { id: string; name: string; email: string };
type DepartmentOption = { code: string; name: string };

const Tasks = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const user = useAppSelector((state) => state.auth.user);
  const role = user?.role;
  const capability = role ? ROLE_CAPABILITY_MAP[role] : undefined;
  const { tasks, loading, error } = useTasksRealtime();

  const [periodFilter, setPeriodFilter] = useState<TimeFilter>("THANG");
  const [deadlineFilter, setDeadlineFilter] = useState<DeadlineFilter>("TOAN_BO");
  const [sourceFilter, setSourceFilter] = useState<string>("TOAN_BO");

  const [selectedTaskId, setSelectedTaskId] = useState<string>(() => searchParams.get("taskId") ?? "");
  const [assignee, setAssignee] = useState("");
  const [assigneeRole, setAssigneeRole] = useState<Role>(Role.NHAN_VIEN);
  const [department, setDepartment] = useState("");
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [taskContent, setTaskContent] = useState("");
  const [dueDate, setDueDate] = useState("2026-03-30");
  const [source, setSource] = useState("Chủ tịch");
  const [feedback, setFeedback] = useState("");
  const [completionRate, setCompletionRate] = useState(0);
  const [evaluationScore, setEvaluationScore] = useState(90);
  const [evaluationComment, setEvaluationComment] = useState("");
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [availableAssignees, setAvailableAssignees] = useState<UserOption[]>([]);
  const [availableDepartments, setAvailableDepartments] = useState<DepartmentOption[]>([]);

  const sourceOptions = capability?.visibleSources ?? TASK_SOURCES;
  const assignableRoles = useMemo(() => {
    if (!user) {
      return [] as Role[];
    }

    return getAssignableRoles(user.role);
  }, [user]);

  useEffect(() => {
    const taskIdParam = searchParams.get("taskId") ?? "";
    if (taskIdParam && taskIdParam !== selectedTaskId) {
      setSelectedTaskId(taskIdParam);
    }
  }, [searchParams, selectedTaskId]);

  useEffect(() => {
    if (!assignableRoles.length) {
      return;
    }

    if (!assignableRoles.includes(assigneeRole)) {
      setAssigneeRole(assignableRoles[0]);
    }
  }, [assigneeRole, assignableRoles]);

  useEffect(() => {
    if (sourceFilter !== "TOAN_BO" && !sourceOptions.includes(sourceFilter)) {
      setSourceFilter("TOAN_BO");
    }
  }, [sourceFilter, sourceOptions]);

  useEffect(() => {
    const fetchOptions = async () => {
      try {
        const departments = await fetchUsersAndDepartmentsByRole(assigneeRole);
        setAvailableDepartments(departments);
        setDepartment("");
        setAssignee("");
        setAvailableAssignees([]);
        if (departments.length > 0) {
          setDepartment(departments[0].code);
        }
      } catch (error) {
        console.error("Failed to fetch departments:", error);
      }
    };
    void fetchOptions();
  }, [assigneeRole]);

  useEffect(() => {
    const fetchAssignees = async () => {
      if (!department) {
        setAvailableAssignees([]);
        setAssignee("");
        return;
      }
      try {
        const users = await fetchUsersByRoleAndDepartment(assigneeRole, department);
        setAvailableAssignees(users);
        setAssignee("");
        if (users.length > 0) {
          setAssignee(users[0].id);
        }
      } catch (error) {
        console.error("Failed to fetch assignees:", error);
      }
    };
    void fetchAssignees();
  }, [assigneeRole, department]);

  const visibleTasks = useMemo(() => {
    if (!role) {
      return [];
    }

    return getVisibleTasksByRole(tasks, role);
  }, [role, tasks]);

  const filteredTasks = useMemo(() => {
    const baseTasks = filterTasks(visibleTasks, periodFilter, deadlineFilter);
    if (sourceFilter === "TOAN_BO") {
      return baseTasks;
    }
    return baseTasks.filter((task) => task.source === sourceFilter);
  }, [deadlineFilter, periodFilter, sourceFilter, visibleTasks]);

  const alerts = useMemo(() => buildTaskAlerts(filteredTasks), [filteredTasks]);

  const selectedTask = useMemo(
    () => filteredTasks.find((task) => task.id === selectedTaskId) ?? null,
    [filteredTasks, selectedTaskId]
  );

  const summary = useMemo(() => {
    const processing = filteredTasks.filter((task) => task.status === "DANG_XU_LY").length;
    const completed = filteredTasks.filter((task) => task.status === "HOAN_THANH" || task.completionRate >= 90).length;
    return [
      { label: "Đang thực hiện", value: processing, color: "info" as const },
      { label: "Sắp đến hạn", value: alerts.upcoming, color: "warning" as const },
      { label: "Quá hạn", value: alerts.overdue, color: "error" as const },
      { label: "Hoàn thành", value: completed, color: "success" as const },
    ];
  }, [alerts.overdue, alerts.upcoming, filteredTasks]);

  useEffect(() => {
    if (!selectedTaskId) {
      return;
    }

    const found = filteredTasks.some((task) => task.id === selectedTaskId);
    if (!found) {
      setSelectedTaskId("");
    }
  }, [filteredTasks, selectedTaskId]);

  useEffect(() => {
    if (!selectedTask) {
      return;
    }

    setAssignee(selectedTask.assignee);
    setAssigneeRole(selectedTask.assigneeRole);
    setDepartment(selectedTask.department);
    setSource(selectedTask.source);
    setDueDate(selectedTask.dueDate);
    setCompletionRate(selectedTask.completionRate || 0);
    setFeedback(selectedTask.feedback ?? "");
    setEvaluationComment(selectedTask.evaluationComment ?? "");
    setEvaluationScore(selectedTask.evaluationScore ?? 90);
  }, [selectedTask]);

  const canMutateSelectedTask = !!selectedTask && !["HOAN_THANH", "DA_HUY"].includes(selectedTask.status);
  const canAssignSelectedTask = !!selectedTask && ["MOI_NHAN", "DANG_XU_LY"].includes(selectedTask.status);
  const canEvaluateSelectedTask = !!selectedTask && selectedTask.status === "CHO_DUYET" && !!feedback.trim();
  const hasFeedback = !!feedback.trim() && !!completionRate;

  const withAction = async (handler: () => Promise<void>, successMessage: string) => {
    setSaving(true);
    setActionError(null);
    setActionMessage(null);

    try {
      await handler();
      setActionMessage(successMessage);
    } catch (handlerError) {
      const message = handlerError instanceof Error ? handlerError.message : "Không thể cập nhật nhiệm vụ";
      setActionError(message);
    } finally {
      setSaving(false);
    }
  };

  const handleCreateTask = () => {
    if (!user || !newTaskTitle.trim()) {
      return;
    }

    void withAction(
      () =>
        createTask({
          title: newTaskTitle.trim(),
          assignee,
          assigneeRole,
          department,
          source,
          dueDate,
          createdBy: user.name,
        }),
      "Đã tạo nhiệm vụ mới"
    );
  };

  const handleAssignTask = () => {
    if (!user || !selectedTaskId) {
      return;
    }

    void withAction(
      () =>
        assignTask({
          taskId: selectedTaskId,
          assignee,
          assigneeRole,
          department,
          actorName: user.name,
        }),
      "Đã giao nhiệm vụ"
    );
  };

  const handleReassignTask = () => {
    if (!user || !selectedTaskId) {
      return;
    }

    void withAction(
      () =>
        reassignTask({
          taskId: selectedTaskId,
          assignee,
          assigneeRole,
          department,
          actorName: user.name,
        }),
      "Đã giao lại nhiệm vụ"
    );
  };

  const handleSubmitFeedback = () => {
    if (!user || !selectedTaskId || !feedback.trim()) {
      return;
    }

    void withAction(
      () =>
        submitTaskFeedback({
          taskId: selectedTaskId,
          feedback: feedback.trim(),
          completionRate,
          actorName: user.name,
        }),
      "Đã gửi phản hồi xác nhận hoàn thành"
    );
  };

  const handleEvaluate = (approved: boolean) => {
    if (!user || !selectedTaskId || !evaluationComment.trim()) {
      return;
    }

    void withAction(
      () =>
        evaluateTask({
          taskId: selectedTaskId,
          score: evaluationScore,
          comment: evaluationComment.trim(),
          approved,
          actorName: user.name,
        }),
      approved ? "Đã duyệt hoàn thành" : "Đã phản hồi yêu cầu làm lại"
    );
  };

  const handleCancelTask = () => {
    if (!user || !selectedTaskId) {
      return;
    }

    const reason = window.prompt("Nhập lý do hủy nhiệm vụ:");
    if (!reason?.trim()) {
      return;
    }

    void withAction(() => cancelTask(selectedTaskId, reason.trim(), user.name), "Đã hủy nhiệm vụ");
  };

  const handleSeedData = () => {
    const approved = window.confirm("Thao tác này sẽ ghi đè toàn bộ dữ liệu nhiệm vụ hiện có. Bạn có muốn tiếp tục?");
    if (!approved) {
      return;
    }

    void withAction(() => replaceTasksWithSeedData(), "Đã cập nhật dữ liệu mẫu mới");
  };

  const handleSelectTask = (taskId: string) => {
    if (taskId === selectedTaskId) {
      return;
    }

    setSelectedTaskId(taskId);
    const next = new URLSearchParams(searchParams);
    next.set("taskId", taskId);
    setSearchParams(next, { replace: true });
  };

  return (
    <Stack spacing={3}>
      <Stack direction="row" spacing={1.5} alignItems="center">
        <Box
          component="img"
          src="/logo-daklak.png"
          alt="Logo Dak Lak"
          sx={{ width: 52, height: 52, objectFit: "contain", borderRadius: "50%" }}
        />
        <Box>
          <Typography variant="h5" gutterBottom>
            Quản lý nhiệm vụ theo quyền
          </Typography>
          <Typography color="text.secondary">
            Dữ liệu đồng bộ từ backend API: giao nhiệm vụ, phản hồi hoàn thành, đánh giá và hủy theo đúng quyền vai trò.
          </Typography>
        </Box>
      </Stack>

      {error && <Alert severity="error">{error}</Alert>}
      {actionMessage && <Alert severity="success">{actionMessage}</Alert>}
      {actionError && <Alert severity="error">{actionError}</Alert>}

      <Card sx={{ borderRadius: 3 }}>
        <CardContent>
          <Grid container spacing={2}>
            <Grid item xs={12} md={4}>
              <FormControl fullWidth>
                <InputLabel id="period-filter-label">Chu kỳ</InputLabel>
                <Select
                  labelId="period-filter-label"
                  label="Chu kỳ"
                  value={periodFilter}
                  onChange={(event) => setPeriodFilter(event.target.value as TimeFilter)}
                >
                  <MenuItem value="THANG">Tháng</MenuItem>
                  <MenuItem value="QUY">Quý</MenuItem>
                  <MenuItem value="NAM">Năm</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={4}>
              <FormControl fullWidth>
                <InputLabel id="deadline-filter-label">Mức độ</InputLabel>
                <Select
                  labelId="deadline-filter-label"
                  label="Mức độ"
                  value={deadlineFilter}
                  onChange={(event) => setDeadlineFilter(event.target.value as DeadlineFilter)}
                >
                  <MenuItem value="TOAN_BO">Toàn bộ</MenuItem>
                  <MenuItem value="SAP_DEN_HAN">Sắp đến hạn</MenuItem>
                  <MenuItem value="QUA_HAN">Quá hạn</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={4}>
              <FormControl fullWidth>
                <InputLabel id="source-filter-label">Nguồn giao</InputLabel>
                <Select
                  labelId="source-filter-label"
                  label="Nguồn giao"
                  value={sourceFilter}
                  onChange={(event) => setSourceFilter(event.target.value)}
                >
                  <MenuItem value="TOAN_BO">Toàn bộ</MenuItem>
                  {sourceOptions.map((item) => (
                    <MenuItem key={item} value={item}>
                      {item}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
        {summary.map((item) => (
          <Card key={item.label} sx={{ minWidth: 210, flex: "1 1 210px", borderRadius: 3 }}>
            <CardContent>
              <Typography color="text.secondary" variant="body2">
                {item.label}
              </Typography>
              <Typography variant="h4" fontWeight={700} mt={0.5}>
                {item.value}
              </Typography>
              <Chip size="small" color={item.color} variant="outlined" label={loading ? "Đang đồng bộ" : "API"} sx={{ mt: 1 }} />
            </CardContent>
          </Card>
        ))}
      </Stack>

      <Card sx={{ borderRadius: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Biểu mẫu thao tác nhiệm vụ
          </Typography>
          <Divider sx={{ mb: 2 }} />

          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField fullWidth label="Tiêu đề nhiệm vụ" value={newTaskTitle} onChange={(event) => setNewTaskTitle(event.target.value)} />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Nội dung nhiệm vụ"
                value={taskContent}
                onChange={(event) => setTaskContent(event.target.value)}
                placeholder="Mô tả nội dung chi tiết của nhiệm vụ..."
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <TextField fullWidth label="Hạn xử lý" type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} InputLabelProps={{ shrink: true }} />
            </Grid>
            <Grid item xs={12} md={3}>
              <FormControl fullWidth>
                <InputLabel id="create-source-label">Nguồn giao</InputLabel>
                <Select labelId="create-source-label" label="Nguồn giao" value={source} onChange={(event) => setSource(event.target.value)}>
                  {TASK_SOURCES.map((item) => (
                    <MenuItem key={item} value={item}>
                      {item}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={4}>
              <FormControl fullWidth>
                <InputLabel id="assignee-role-label">Vai trò nhận</InputLabel>
                <Select
                  labelId="assignee-role-label"
                  label="Vai trò nhận"
                  value={assigneeRole}
                  onChange={(event) => setAssigneeRole(event.target.value as Role)}
                >
                  {assignableRoles.map((item) => (
                    <MenuItem key={item} value={item}>
                      {ROLE_LABEL_MAP[item]}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={4}>
              <FormControl fullWidth>
                <InputLabel id="department-label">Phòng ban</InputLabel>
                <Select
                  labelId="department-label"
                  label="Phòng ban"
                  value={department}
                  onChange={(event) => setDepartment(event.target.value)}
                >
                  {availableDepartments.map((dept) => (
                    <MenuItem key={dept.code} value={dept.code}>
                      {dept.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={4}>
              <FormControl fullWidth>
                <InputLabel id="assignee-label">Người nhận</InputLabel>
                <Select
                  labelId="assignee-label"
                  label="Người nhận"
                  value={assignee}
                  onChange={(event) => setAssignee(event.target.value)}
                >
                  {availableAssignees.map((user) => (
                    <MenuItem key={user.id} value={user.id}>
                      {user.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          </Grid>

          <Stack direction="row" spacing={1.5} mt={2} flexWrap="wrap" useFlexGap>
            {capability?.canCreateTask && (
              <Button variant="contained" onClick={handleCreateTask} disabled={saving || !newTaskTitle.trim()}>
                Thêm nhiệm vụ
              </Button>
            )}
            {capability?.canCreateTask && (
              <Button variant="outlined" onClick={handleSeedData} disabled={saving}>
                Cập nhật dữ liệu mẫu
              </Button>
            )}
            {capability?.canAssignTask && (
              <Button variant="outlined" onClick={handleAssignTask} disabled={saving || !selectedTaskId || !canAssignSelectedTask}>
                Giao nhiệm vụ
              </Button>
            )}
            {capability?.canReassignTask && (
              <Button variant="outlined" onClick={handleReassignTask} disabled={saving || !selectedTaskId || !canMutateSelectedTask}>
                Giao lại
              </Button>
            )}
            {capability?.canProvideFeedback && (
              <Button
                variant="outlined"
                onClick={handleSubmitFeedback}
                disabled={saving || !selectedTaskId || !feedback.trim() || !canAssignSelectedTask}
              >
                Cập nhật mức độ hoàn thành
              </Button>
            )}
            {capability?.canEvaluateTask && (
              <>
                <Button
                  variant="outlined"
                  color="success"
                  onClick={() => handleEvaluate(true)}
                  disabled={saving || !selectedTaskId || !evaluationComment.trim() || !canEvaluateSelectedTask || !hasFeedback}
                >
                  Duyệt hoàn thành
                </Button>
                <Button
                  variant="outlined"
                  color="warning"
                  onClick={() => handleEvaluate(false)}
                  disabled={saving || !selectedTaskId || !evaluationComment.trim() || !canEvaluateSelectedTask || !hasFeedback}
                >
                  Yêu cầu làm lại
                </Button>
              </>
            )}
            {capability?.canCancelTask && (
              <Button variant="outlined" color="error" onClick={handleCancelTask} disabled={saving || !selectedTaskId || !canMutateSelectedTask}>
                Hủy nhiệm vụ
              </Button>
            )}
          </Stack>
        </CardContent>
      </Card>

      <Card sx={{ borderRadius: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Danh sách nhiệm vụ hiển thị ({filteredTasks.length})
          </Typography>
          <Typography variant="body2" color="text.secondary" mb={2}>
            Chọn một nhiệm vụ để giao lại/phản hồi/đánh giá/hủy.
          </Typography>
          <Stack spacing={1.5}>
            {filteredTasks.map((task) => {
              const deadlineState = getDeadlineState(task);
              const selected = selectedTaskId === task.id;
              return (
                <Box
                  key={task.id}
                  onClick={() => handleSelectTask(task.id)}
                  sx={{
                    p: 1.5,
                    borderRadius: 2,
                    border: "1px solid",
                    borderColor: selected ? "primary.main" : "divider",
                    bgcolor: selected ? "rgba(15, 98, 254, 0.06)" : "background.paper",
                    cursor: "pointer",
                  }}
                >
                  <Stack direction="row" justifyContent="space-between" alignItems="flex-start" gap={1.5}>
                    <Box>
                      <Typography fontWeight={700}>{task.title}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        {task.id} • {task.department} • {task.assignee}
                      </Typography>

                    </Box>
                    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap justifyContent="flex-end">
                      <Chip label={task.source} size="small" variant="outlined" />
                      <Chip
                        label={TASK_STATUS_LABEL_MAP[task.status]}
                        size="small"
                        color={TASK_STATUS_CHIP_COLOR_MAP[task.status]}
                        variant="outlined"
                      />
                      <Chip
                        label={DEADLINE_STATE_SHORT_LABEL_MAP[deadlineState]}
                        size="small"
                        color={DEADLINE_STATE_COLOR_MAP[deadlineState]}
                      />
                      <Button
                        size="small"
                        onClick={(event) => {
                          event.stopPropagation();
                          navigate(`/tasks/${task.id}`);
                        }}
                      >
                        Chi tiết
                      </Button>
                    </Stack>
                  </Stack>
                </Box>
              );
            })}
          </Stack>
        </CardContent>
      </Card>
    </Stack>
  );
};

export default Tasks;
