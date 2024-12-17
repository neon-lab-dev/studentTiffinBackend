import { Schema, model } from "mongoose";

const OrderSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    items: [
      {
        product: {
          type: Schema.Types.ObjectId,
          required: true,
          refPath: "items.itemTypeRef",
        },
        itemTypeRef: {
          type: String,
          enum: ["Product", "Subscription"],
          required: true,
        },
        quantity: {
          type: Number,
          required: function () {
            return this.itemType === "PRODUCT";
          },
        },
        price: {
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
    orderType: {
      type: String,
      enum: ["PRODUCT_ONLY", "SUBSCRIPTION_ONLY", "MIXED"],
      default: "PRODUCT_ONLY",
    },
    endOfSubscription: {
      type: Date,
    },
  },
  { timestamps: true }
);

export default model("Order", OrderSchema);
