import { Schema, model } from "mongoose";
import { FileSchema } from "./file.model.js";

const ProductSchema = Schema({

  name: {
    type: String,
    required: [true, "Please enter the dish name"]
  },
  ingredients: {
    type: [String],
    required: [true, "Please enter the ingredients"]
  },
  description: {
    type: String,
    required: [true, "Please enter the description"]
  },
  price: {
    type: Number,
    required: [true, "Please enter the price"]
  },
  availability: {
    type: Boolean,
    default: [true, "Please enter the availability"]
  },
  image: {
    type: FileSchema,
    required: [true, "Please upload a dish image!"]
  }
})

export default model("Product", ProductSchema);
