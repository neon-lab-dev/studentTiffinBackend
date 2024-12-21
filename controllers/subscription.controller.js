import catchAsyncError from "../middlewares/catch-async-error.js";
import subscriptionModel from "../models/subscription.model.js";
import Stripe from "stripe";
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);
class SubscriptionController {
  createSubscription = catchAsyncError(async (req, res) => {
    const user = res.locals.user;
    const { name, productId, total, paymentType, duration, pickUpLocation, startDate, endDate, totalMeals, mealType } = req.body;

    // Validate required fields
    if (!name || !productId || !total || !paymentType || !duration || !startDate || !endDate || !mealType) {
      return res.status(400).json({ message: "Please provide all required fields" });
    }

    const subscription = await subscriptionModel.create({
      name,
      productId,
      user: user._id,
      total,
      paymentType,
      duration,
      pickUpLocation,
      startDate,
      endDate,
      totalMeals,
      mealType,
    });

    if (paymentType === "COD") {
      return res.status(201).json({
        success: true,
        subscription,
        message: "Subscription created successfully! Your mode of payment is cash on delivery!",
      });
    }

    const line_items = [
      {
        price_data: {
          currency: "eur",
          product_data: {
            name: subscription.name,
            metadata: {
              subscriptionId: subscription._id.toString(),
            },
          },
          unit_amount: total * 100,
        },
        quantity: 1,
      },
    ];

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items,
      mode: "payment",
      success_url: `${process.env.FRONTEND_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL}/cancel`,
      metadata: {
        subscriptionId: subscription._id.toString(),
      },
    });

    res.status(201).json({ success: true, url: session.url, subscription });
  });

  subscriptionConfirmation = catchAsyncError(async (req, res, next) => {
    const { sessionId } = req.body;

    if (!sessionId) {
      return next(new ErrorHandler("Please provide a session ID", 400));
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["payment_intent.payment_method"],
    });

    const subscriptionId = session.metadata.subscriptionId;
    const paymentId = session.payment_intent;

    if (!subscriptionId) {
      return next(new ErrorHandler("Payment Error: Missing subscription ID", 400));
    }

    const subscription = await subscriptionModel.findById(subscriptionId);
    if (!subscription) {
      return next(new ErrorHandler("Subscription not found", 404));
    }

    subscription.isPaid = true;
    subscription.paymentId = paymentId.id;
    subscription.status = "RECEIVED";

    await subscription.save();
    res.status(200).json({ success: true, message: "Subscription verified successfully!" });
  });

  getAllSubscriptions = catchAsyncError(async (req, res) => {
    const { page = 1, limit = 10 } = req.query;

    const subscriptions = await subscriptionModel
      .find()
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .populate("user", "firstName lastName phone email");

    const totalSubscriptions = await subscriptionModel.countDocuments();


    res.status(200).json({
      success: true,
      subscriptions,
      pagination: {
        total: totalSubscriptions,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(totalSubscriptions / limit),
      },
    });
  });

  getSingleSubscription = catchAsyncError(async (req, res) => {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ message: "Please provide a subscription ID" });
    }

    const subscription = await subscriptionModel.findById(id);
    if (!subscription) {
      return res.status(404).json({ message: "Subscription not found" });
    }

    res.status(200).json({ success: true, subscription });
  });

  getMySubscriptions = catchAsyncError(async (req, res) => {
    const user = res.locals.user;
    const subscriptions = await subscriptionModel.find({ user: user._id });
    if (!subscriptions) {
      return res.status(404).json({ message: "No subscriptions found" });
    }
    res.status(200).json({ success: true, subscriptions });
  });
  updateSubscriptionStatus = catchAsyncError(async (req, res) => {
    const { id } = req.params;
    const { isPaid, status } = req.body;

    let updatedFields = {};
    if (!id) {
      return res.status(400).json({ message: "Please provide a subscription ID and status" });
    }
    const subscription = await subscriptionModel.findById(id);
    if (!subscription) {
      return res.status(404).json({ message: "Subscription not found" });
    }
    if (isPaid) {
      updatedFields.isPaid = isPaid;
    }
    if (status) {
      updatedFields.status = status;
    }


    const updatedSubscription = await subscriptionModel.findByIdAndUpdate(id, updatedFields, { new: true });

    res.status(200).json({ success: true, subscription: updatedSubscription });
  });
}

export default SubscriptionController;

