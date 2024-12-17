import { Router } from "express";
import OrderController from "../controllers/order.controller.js";
import { authenticate } from "../middlewares/auth.js";

const router = Router();
const orderController = new OrderController();


router.post("/create", authenticate(), orderController.createOrder);
router.post("/checkout-session", authenticate(), orderController.checkoutSession);
router.post("/confirm-order", authenticate(), orderController.orderConfirmation);
router.get("/me", authenticate(), orderController.getMyOrders);
router.get("/all", authenticate("ADMIN"), orderController.getAllOrders);
router.get("/active", authenticate(), orderController.getActiveSubscription);



export default router;