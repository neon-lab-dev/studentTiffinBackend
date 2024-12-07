import { Router } from "express";
import AuthController from "../controllers/auth.controller.js";
import { authenticate } from "../middlewares/auth.js";
const router = Router();

const authController = new AuthController();
router.route("/register").post(authController.register);
router.route("/login").post(authController.login);
router.route("/verify").post(authController.otpVerify);
router.route("/forgot-password").post(authController.forgotPassword);
router.route("/reset-password/:token").post(authController.resetPassword);
router.route("/update-password").post(authenticate(), authController.updatePassword);
router.route("/me").get(authenticate(), authController.me);
router.route("/me/update").put(authenticate(), authController.updateProfile);
router.route("/logout").get(authController.logout);
router.route("/allUsers").get(authenticate("ADMIN"), authController.getAllUsers);
export default router;