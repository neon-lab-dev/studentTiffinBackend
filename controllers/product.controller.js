import catchAsyncError from "../middlewares/catch-async-error.js";
import productModel from "../models/product.model.js";
import getDataUri from "../utils/data-uri.js";
import ErrorHandler from "../utils/error-handler.js";
import { deleteImage, uploadImage } from "../utils/upload.js";



class ProductController {
  createProduct = catchAsyncError(async (req, res, next) => {
    const { name, ingredients, availability, description, price } = req.body;


    if (!name || !price || !ingredients || !availability || !description || !Array.isArray(ingredients)) {
      return next(new ErrorHandler('Please enter all the fields', 400));

    }
    if (!req.file) {
      return next(new ErrorHandler("Please upload a dish image!", 400));
    }
    const dishImage = await uploadImage(
      getDataUri(req.file).content,
      getDataUri(req.file).fileName,
      "dish-images"
    );

    const product = await productModel.create({
      name,
      ingredients,
      availability,
      description,
      price: Number(price),
      image: dishImage,
    });

    res.status(201).json({
      success: true,
      product,
    });
  })


  getProducts = catchAsyncError(async (req, res, next) => {
    const products = await productModel.find();

    res.status(200).json({
      success: true,
      products,
    });
  });

  getProduct = catchAsyncError(async (req, res, next) => {
    const id = req.params.id;
    if (!id) {
      return next(new ErrorHandler("Product not found", 404));
    }
    const product = await productModel.findById(id);

    if (!product) {
      return next(new ErrorHandler("Product not found", 404));
    }

    res.status(200).json({
      success: true,
      product,
    });
  });

  editProduct = catchAsyncError(async (req, res, next) => {

    const id = req.params.id;
    if (!id) {
      return next(new ErrorHandler("Product not found", 404));
    }
    const product = await productModel.findById(id);
    if (!product) {
      return next(new ErrorHandler("Product not found", 404));
    }

    const { name, ingredients, availability, description } = req.body;
    const updatedfields = {}

    if (name) updatedfields.name = name;
    if (description) updatedfields.description = description;
    if (availability) updatedfields.availability = availability;
    if (req.file) {
      await deleteImage(product.image.fileId);
      const dishImage = await uploadImage(
        getDataUri(req.file).content,
        getDataUri(req.file).fileName,
        "dish-images"
      );
      updatedfields.image = dishImage;
    }

    if (ingredients) {
      if (!Array.isArray(ingredients)) {
        return next(new ErrorHandler('Ingredients must be an array', 400));
      }
      const updatedIngredients = [...product.ingredients, ...ingredients];
      updatedfields.ingredients = [...new Set(updatedIngredients)];
    }


    if (Object.keys(updatedfields).length === 0) {
      return next(new ErrorHandler("No fields to update", 400));
    }


    const updatedProduct = await productModel.findByIdAndUpdate(id, updatedfields)

    res.status(200).json({
      success: true,
      message: "Product updated successfully",
      updatedProduct,
    });
  });

  deleteProduct = catchAsyncError(async (req, res, next) => {
    const id = req.params.id;
    if (!id) {
      return next(new ErrorHandler("Product not found", 404));
    }
    const product = await productModel.findById(id);
    if (!product) {
      return next(new ErrorHandler("Product not found", 404));
    }

    if (product.image.fileId) {
      await deleteImage(product.image.fileId);
    }

    await productModel.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: "Product deleted successfully",
    });
  });
}



export default ProductController;