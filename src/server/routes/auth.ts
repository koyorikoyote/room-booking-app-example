import { Router, Request, Response } from "express";
import { authService, loginSchema } from "../services/authService";
import { authMiddleware, AuthRequest } from "../middleware/auth";

const router = Router();

router.post("/login", async (req: Request, res: Response): Promise<void> => {
  try {
    const validatedData = loginSchema.parse(req.body);
    const result = await authService.login(
      validatedData.username,
      validatedData.password
    );

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "Invalid credentials") {
        res.status(401).json({
          success: false,
          error: "Invalid username or password",
        });
        return;
      }
      console.error("Login error:", error.message, error.stack);
    } else {
      console.error("Login error (non-Error):", error);
    }

    res.status(500).json({
      success: false,
      error: "Login failed",
    });
  }
});

router.post(
  "/logout",
  authMiddleware,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const authHeader = req.headers.authorization;
      const token = authHeader?.substring(7) || "";

      if (req.user) {
        await authService.logout(req.user.userId, token);
      }

      res.json({
        success: true,
        message: "Logged out successfully",
      });
    } catch {
      res.status(500).json({
        success: false,
        error: "Logout failed",
      });
    }
  }
);

router.get(
  "/me",
  authMiddleware,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: "Unauthorized",
        });
        return;
      }

      const user = await authService.getCurrentUser(req.user.userId);

      res.json({
        success: true,
        data: user,
      });
    } catch {
      res.status(500).json({
        success: false,
        error: "Failed to get user information",
      });
    }
  }
);

router.put(
  "/language",
  authMiddleware,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: "Unauthorized",
        });
        return;
      }

      const { language } = req.body;

      if (!language || (language !== "en" && language !== "ja")) {
        res.status(400).json({
          success: false,
          error: "Invalid language preference",
        });
        return;
      }

      await authService.updateLanguagePreference(req.user.userId, language);

      res.json({
        success: true,
        message: "Language preference updated",
      });
    } catch {
      res.status(500).json({
        success: false,
        error: "Failed to update language preference",
      });
    }
  }
);

export default router;
