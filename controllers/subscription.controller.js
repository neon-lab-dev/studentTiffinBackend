import catchAsyncError from "../middlewares/catch-async-error.js";
import subscriptionModel from "../models/subscription.model.js";


class SubscriptionController {

  create = catchAsyncError(async (req, res) => {
    const { name, price, duration, description, discount } = req.body;

    if (!name || !price || !duration) {
      return res.status(400).json({ message: "Please fill all the fields" });
    }
    if (Array.isArray(description) && description.length === 0) {
      return res.status(400).json({ message: "Description is array of strings!" });
    }
    let discountedPrice = price;
    if (discount) {
      discountedPrice = price - (price * discount) / 100;
    }
    const subscription = await subscriptionModel.create({
      name,
      price,
      duration,
      description,
      discount,
      discountedPrice,
    });

    res.status(201).json({ message: "Subscription created successfully", status: 200, subscription });
  });


  getAllSubscriptions = catchAsyncError(async (req, res) => {
    const subscriptions = await subscriptionModel.find();
    res.status(200).json({ status: 200, subscriptions });
  });

  getSingleSubscription = catchAsyncError(async (req, res) => {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ message: "Please provide subscription id" });
    }
    const subscription = await subscriptionModel.findById(id);
    if (!subscription) {
      return res.status(404).json({ message: "Subscription not found" });
    }
    res.status(200).json({ status: 200, subscription });
  });

  editSubscription = catchAsyncError(async (req, res) => {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ message: "Please provide subscription id" });
    }

    const subscription = await subscriptionModel.findById(id);
    if (!subscription) {
      return res.status(404).json({ message: "Subscription not found" });
    }

    const { name, price, duration, description, discount } = req.body;
    let updatedFields = {};

    if (name) updatedFields.name = name;
    if (price) updatedFields.price = price;
    if (duration) updatedFields.duration = duration;
    if (discount !== undefined) {
      updatedFields.discount = discount;
      updatedFields.discountedPrice = price - (price * discount) / 100;
    }


    if (description) {
      if (!Array.isArray(description)) {
        return res.status(400).json({ message: "Description must be an array of strings!" });
      }

      const existingDescription = subscription.description || [];
      const newDescriptions = description.filter(
        (desc) => !existingDescription.includes(desc)
      );

      updatedFields.description = [...existingDescription, ...newDescriptions];
    }

    const updatedSubscription = await subscriptionModel.findByIdAndUpdate(id, updatedFields, {
      new: true,
      runValidators: true,
    });

    res.status(200).json({
      message: "Subscription updated successfully",
      status: 200,
      subscription: updatedSubscription,
    });
  });

  deleteSubscription = catchAsyncError(async (req, res) => {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ message: "Please provide subscription id" });
    }

    const subscription = await subscriptionModel.findById(id);
    if (!subscription) {
      return res.status(404).json({ message: "Subscription not found" });
    }

    await subscriptionModel.findByIdAndDelete(id);
    res.status(200).json({ message: "Subscription deleted successfully", status: 200 });

  });
}

export default SubscriptionController;