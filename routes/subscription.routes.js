import { Router } from "express";
import { authenticate } from "../middlewares/auth.js";

import SubscriptionController from "../controllers/subscription.controller.js";
const router = Router();
const subscriptionController = new SubscriptionController();

router.route("/create").post(authenticate(), subscriptionController.createSubscription);
router.route("/all").get(authenticate("ADMIN"), subscriptionController.getAllSubscriptions);
router.route("/:id").get(authenticate(), subscriptionController.getSingleSubscription);
router.route("/me").get(subscriptionController.getMySubscriptions);
router.route("/confirm-subscription").post(authenticate(), subscriptionController.subscriptionConfirmation);

export default router;