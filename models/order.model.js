import { Schema, model } from "mongoose";

const OrderSchema = new Schema({
  user: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  products: [
    {
      product: {
        type: Schema.Types.ObjectId,
        ref: "Product",
      },
      quantity: {
        type: Number,
        required: true,
      },
    },
  ],
  paid: {
    type: Boolean,
    default: false,
  },
  paymentId: {
    type: String,
  },
  shippingInfo: {
    street: {
      type: String,
      required: true,
    },
    city: {
      type: String,
      required: true,
    },

    pinCode: {
      type: Number,
      required: true,
    },
    phoneNo: {
      type: Number,
      required: true,
    },
  },
  status: {
    type: String,
    enum: ["PENDING", "APPROVED", "DELIVERED", "CANCELLED", "REFUNDED"],
    default: "PENDING",
  },
  totalAmount: {
    type: Number,
    required: true,
  },

}, { timestamps: true });
export default model("Order", OrderSchema);