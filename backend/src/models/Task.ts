import { Schema, model } from "mongoose";
import { TASK_SOURCE_VALUES, TASK_STATUS_VALUES } from "./enums.js";

const taskSchema = new Schema(
  {
    id: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      match: /^[A-Z]{2,4}-[0-9]{3,6}$/,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      minlength: 3,
      maxlength: 400,
    },
    documentCode: {
      type: String,
      trim: true,
      maxlength: 160,
    },
    documentDate: {
      type: Date,
    },
    priorityLabel: {
      type: String,
      trim: true,
      maxlength: 120,
    },
    assigneeUserId: {
      type: String,
      required: true,
      trim: true,
      match: /^USR-[0-9]{4}$/,
    },
    createdByUserId: {
      type: String,
      required: true,
      trim: true,
      match: /^USR-[0-9]{4}$/,
    },
    departmentCode: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      match: /^[A-Z0-9_]{2,30}$/,
    },
    source: {
      type: String,
      required: true,
      enum: TASK_SOURCE_VALUES,
    },
    dueDate: {
      type: Date,
      required: true,
    },
    status: {
      type: String,
      required: true,
      enum: TASK_STATUS_VALUES,
      default: "MOI_NHAN",
    },
    completionRate: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
      default: 0,
    },
    feedback: {
      type: String,
      maxlength: 2000,
    },
    evaluationScore: {
      type: Number,
      min: 0,
      max: 100,
    },
    evaluationComment: {
      type: String,
      maxlength: 2000,
    },
    cancelledReason: {
      type: String,
      maxlength: 2000,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

taskSchema.pre("validate", function enforceTaskState(next) {
  if (this.status === "DA_HUY" && !this.cancelledReason) {
    next(new Error("cancelledReason is required when status is DA_HUY"));
    return;
  }

  if (this.status !== "DA_HUY" && this.cancelledReason) {
    next(new Error("cancelledReason must be empty unless status is DA_HUY"));
    return;
  }

  if (this.status === "HOAN_THANH" && this.completionRate !== 100) {
    next(new Error("completionRate must be 100 when status is HOAN_THANH"));
    return;
  }

  next();
});

taskSchema.index({ dueDate: 1 });
taskSchema.index({ status: 1 });
taskSchema.index({ departmentCode: 1 });

export const TaskModel = model("Task", taskSchema);
