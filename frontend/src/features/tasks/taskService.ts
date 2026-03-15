import {
  addDoc,
  collection,
  doc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { db } from "../../firebase/firebase";
import { Role } from "../../types/role";
import type { TaskRecord, TaskStatus } from "./taskData";
import { TASK_SEED_DATA } from "./taskData";

const TASK_COLLECTION = "tasks";

type TaskDoc = Omit<TaskRecord, "id"> & {
  createdAt?: unknown;
  updatedAt?: unknown;
};

type CreateTaskInput = {
  title: string;
  assignee: string;
  assigneeRole: Role;
  department: string;
  source: string;
  dueDate: string;
  createdBy: string;
};

type AssignTaskInput = {
  taskId: string;
  assignee: string;
  assigneeRole: Role;
  department: string;
  actorName: string;
};

type FeedbackInput = {
  taskId: string;
  feedback: string;
  completionRate: number;
  actorName: string;
};

type EvaluateInput = {
  taskId: string;
  score: number;
  comment: string;
  approved: boolean;
  actorName: string;
};

const taskCollectionRef = collection(db, TASK_COLLECTION);

const toTaskRecord = (id: string, data: TaskDoc): TaskRecord => ({
  id,
  title: data.title,
  assignee: data.assignee,
  assigneeRole: data.assigneeRole,
  department: data.department,
  source: data.source,
  dueDate: data.dueDate,
  status: data.status,
  completionRate: data.completionRate,
  feedback: data.feedback,
  evaluationComment: data.evaluationComment,
  evaluationScore: data.evaluationScore,
  cancelledReason: data.cancelledReason,
});

export const subscribeTasks = (
  onData: (tasks: TaskRecord[]) => void,
  onError?: (message: string) => void
) => {
  const q = query(taskCollectionRef, orderBy("dueDate", "asc"));

  return onSnapshot(
    q,
    (snapshot) => {
      const tasks = snapshot.docs.map((docSnap) => toTaskRecord(docSnap.id, docSnap.data() as TaskDoc));
      onData(tasks);
    },
    (error) => {
      onError?.(error.message);
    }
  );
};

export const createTask = async (input: CreateTaskInput) => {
  const payload: TaskDoc = {
    title: input.title,
    assignee: input.assignee,
    assigneeRole: input.assigneeRole,
    department: input.department,
    source: input.source,
    dueDate: input.dueDate,
    status: "MOI_NHAN",
    completionRate: 0,
    feedback: `Khởi tạo bởi ${input.createdBy}`,
  };

  await addDoc(taskCollectionRef, {
    ...payload,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
};

export const assignTask = async (input: AssignTaskInput) => {
  const taskRef = doc(db, TASK_COLLECTION, input.taskId);
  await updateDoc(taskRef, {
    assignee: input.assignee,
    assigneeRole: input.assigneeRole,
    department: input.department,
    status: "DANG_XU_LY" satisfies TaskStatus,
    feedback: `Được giao bởi ${input.actorName}`,
    updatedAt: serverTimestamp(),
  });
};

export const reassignTask = async (input: AssignTaskInput) => {
  const taskRef = doc(db, TASK_COLLECTION, input.taskId);
  await updateDoc(taskRef, {
    assignee: input.assignee,
    assigneeRole: input.assigneeRole,
    department: input.department,
    status: "DANG_XU_LY" satisfies TaskStatus,
    feedback: `Được giao lại bởi ${input.actorName}`,
    updatedAt: serverTimestamp(),
  });
};

export const submitTaskFeedback = async (input: FeedbackInput) => {
  const taskRef = doc(db, TASK_COLLECTION, input.taskId);
  await updateDoc(taskRef, {
    status: "CHO_DUYET" satisfies TaskStatus,
    completionRate: input.completionRate,
    feedback: `${input.actorName}: ${input.feedback}`,
    updatedAt: serverTimestamp(),
  });
};

export const evaluateTask = async (input: EvaluateInput) => {
  const taskRef = doc(db, TASK_COLLECTION, input.taskId);
  await updateDoc(taskRef, {
    status: (input.approved ? "HOAN_THANH" : "DANG_XU_LY") satisfies TaskStatus,
    evaluationScore: input.score,
    evaluationComment: `${input.actorName}: ${input.comment}`,
    completionRate: input.approved ? 100 : Math.min(95, input.score),
    updatedAt: serverTimestamp(),
  });
};

export const cancelTask = async (taskId: string, reason: string, actorName: string) => {
  const taskRef = doc(db, TASK_COLLECTION, taskId);
  await updateDoc(taskRef, {
    status: "DA_HUY" satisfies TaskStatus,
    cancelledReason: `${actorName}: ${reason}`,
    updatedAt: serverTimestamp(),
  });
};

export const seedTasksIfEmpty = async () => {
  const countSnapshot = await getDocs(query(taskCollectionRef, limit(1)));

  if (!countSnapshot.empty) {
    return;
  }

  await Promise.all(
    TASK_SEED_DATA.map((task) =>
      addDoc(taskCollectionRef, {
        ...task,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
    )
  );
};
