import { Schema, model } from "mongoose";
import { ROLE_VALUES, USER_STATUS_VALUES } from "./enums.js";

const userSchema = new Schema(
  {
    userId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      match: /^USR-[0-9]{4}$/,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: /^[^@\s]+@[^@\s]+\.[^@\s]+$/,
    },
    apiToken: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      minlength: 12,
      maxlength: 20,
      match: /^DX-[0-9]{4}-[A-Z0-9]{4}$/,
    },
    passwordHash: {
      type: String,
      required: true,
      trim: true,
      minlength: 64,
      maxlength: 64,
      match: /^[a-f0-9]{64}$/,
    },
    fullName: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 150,
    },
    role: {
      type: String,
      required: true,
      enum: ROLE_VALUES,
    },
    status: {
      type: String,
      required: true,
      enum: USER_STATUS_VALUES,
      default: "ACTIVE",
    },
    departmentCode: {
      type: String,
      trim: true,
      uppercase: true,
      match: /^[A-Z0-9_]{2,30}$/,
    },
    managedDepartments: {
      type: [String],
      default: [],
    },
    parentUserId: {
      type: String,
      trim: true,
      match: /^USR-[0-9]{4}$/,
    },
    parentEmail: {
      type: String,
      trim: true,
      lowercase: true,
      match: /^[^@\s]+@[^@\s]+\.[^@\s]+$/,
    },
    parentName: {
      type: String,
      trim: true,
      minlength: 2,
      maxlength: 150,
    },
    requestedRole: {
      type: String,
      enum: ROLE_VALUES,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

userSchema.pre("validate", function enforceDepartmentForStaff(next) {
  if ((this.role === "NHAN_VIEN" || this.role === "TRUONG_PHONG") && !this.departmentCode) {
    next(new Error("departmentCode is required for NHAN_VIEN and TRUONG_PHONG"));
    return;
  }

  next();
});

export const UserModel = model("User", userSchema);
