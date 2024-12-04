import { Router } from "express";

import singleUpload from "../middlewares/multer.js";
import ProductController from "../controllers/product.controller.js";

const router = Router();
const productController = new ProductController();
router.route("/create").post(singleUpload, productController.createProduct);
router.route("/").get(productController.getProducts);
router.route("/:id").get(productController.getProduct).put(singleUpload, productController.editProduct).delete(productController.deleteProduct);


export default router;