import { Schema, model } from "mongoose";


const SubscriptionSchema = new Schema({
  name: {
    type: String,
    required: true,
  },
  productId: {
    type: String,
    required: true,
  },
  user: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  total: {
    type: Number,
    required: true,
  },
  paymentType: {
    type: String,
    enum: ["COD", "ONLINE"],
    default: "ONLINE",
  },
  duration: {
    enum: ["MONTHLY", "DAILY", "WEEKLY"],
    type: String,
    required: true,
  },

  pickUpLocation: {
    type: String,
  },
  startDate: {
    type: String,
    required: true,
  },
  endDate: {
    type: String,
    required: true,
  },
  totalMeals: {
    type: Number,
  },
  mealType: {
    enum: ["VEG", "MEAT"],
    type: String,
  },
  isPaid: {
    type: Boolean,
    default: false,
  },
  paymentId: {
    type: String,
  },
  status: {
    type: String,
    enum: ["PENDING", "RECEIVED", "OUTOFDELIVERY", "CANCELLED", "REFUNDED"],
    default: "PENDING",
  },
}, { timestamps: true });

export default model("Subscription", SubscriptionSchema);