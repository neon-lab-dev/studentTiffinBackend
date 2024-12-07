import { Schema, model } from "mongoose";


const SubscriptionSchema = new Schema({
  name: {
    type: String,
    required: true,

  },
  price: {
    type: Number,
    required: true,
  },
  duration: {
    enum: ["MONTHLY", "DAILY", "WEEKLY"],
    type: String,
    required: true,
  },
  description: [
    {
      type: String,
    }
  ],
  discount: {
    type: Number,
    default: 0,

  },
  discountedPrice: {
    type: Number,
  }
}, { timestamps: true });

export default model("Subscription", SubscriptionSchema);