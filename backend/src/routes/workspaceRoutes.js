// src/routes/workspaceRoutes.js
import express from 'express';
const router = express.Router();
import authMiddleware from "../middleware/authmiddleware.js";
import * as workspaceController from '../controllers/workspaceController.js';
import * as projectModel from '../models/projectModel.js';

// Get all workspaces for current user
router.get('/', authMiddleware, workspaceController.getWorkspaces);

// Get workspace by ID
router.get("/:id", authMiddleware, workspaceController.getWorkspaceById);

// Get projects for a workspace
router.get("/:workspaceId/projects", authMiddleware, async (req, res) => {
  try {
    const { workspaceId } = req.params;
    const projects = await projectModel.getProjectsByWorkspaceId(workspaceId);
    res.json(projects);
  } catch (err) {
    console.error("Get projects for workspace error:", err);
    res.status(err.status || 500).json({ error: err.message });
  }
});

// Create new workspace
router.post("/", authMiddleware, workspaceController.createWorkspace);

// Update workspace
router.put("/:id", authMiddleware, workspaceController.updateWorkspace);

// Remove member from workspace
router.delete(
  "/:workspaceId/members/:userId",
  authMiddleware,
  workspaceController.removeMemberFromWorkspace
);

// Delete workspace
router.delete("/:id", authMiddleware, workspaceController.deleteWorkspace);

export default router;