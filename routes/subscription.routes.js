import { Router } from "express";
import { authenticate } from "../middlewares/auth.js";

import SubscriptionController from "../controllers/subscription.controller.js";
const router = Router();
const subscriptionController = new SubscriptionController();

router.route("/create").post(authenticate("ADMIN"), subscriptionController.create);
router.route("/").get(subscriptionController.getAllSubscriptions);
router.route("/:id").get(subscriptionController.getSingleSubscription).put(authenticate("ADMIN"), subscriptionController.editSubscription).delete(authenticate("ADMIN"), subscriptionController.deleteSubscription);


export default router;