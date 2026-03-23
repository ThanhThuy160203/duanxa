import { Router } from "express";
import { DepartmentModel } from "../../models/Department.js";
import { asyncHandler } from "../../utils/asyncHandler.js";

export const departmentsRouter = Router();

departmentsRouter.get(
  "/",
  asyncHandler(async (_req, res) => {
    const departments = await DepartmentModel.find({}, { _id: 0 }).sort({ name: 1 }).lean();
    res.json(departments);
  })
);
