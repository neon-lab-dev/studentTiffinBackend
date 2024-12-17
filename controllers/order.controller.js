import catchAsyncError from "../middlewares/catch-async-error.js";
import Stripe from "stripe";
import productModel from "../models/product.model.js";
import subscriptionModel from "../models/subscription.model.js";
import orderModel from "../models/order.model.js";
import ErrorHandler from "../utils/error-handler.js";

const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

class OrderController {

  createOrder = catchAsyncError(async (req, res, next) => {
    const user = res.locals.user;

    if (!user.address || !user.address.street || !user.address.city || !user.address.pin || !user.phone || !user.firstName || !user.lastName) {
      return next(new ErrorHandler('Please update your details and address', 400));
    }

    const { items } = req.body;

    const orderItems = [];
    let totalAmount = 0;

    await Promise.all(
      items.map(async (item) => {
        if (item.itemTypeRef === "Product") {
          const product = await productModel.findById(item.product);
          if (!product) {
            throw new ErrorHandler(`Product not found for ID: ${item.product}`, 404);
          }

          totalAmount += item.quantity * Number(product.price);
          orderItems.push({
            product: item.product,
            itemTypeRef: "Product",
            quantity: item.quantity,
            price: product.price,
          });
        } else if (item.itemTypeRef === "Subscription") {
          const subscription = await subscriptionModel.findById(item.product);
          if (!subscription) {
            throw new ErrorHandler(`Subscription not found for ID: ${item.product}`, 404);
          }

          totalAmount += Number(subscription.price);
          orderItems.push({
            product: item.product,
            itemTypeRef: "Subscription",
            quantity: 1,
            price: subscription.price,
          });
        }
      })
    );

    const order = await orderModel.create({
      user: user._id,
      items: orderItems,
      totalAmount,
      shippingInfo: {
        street: user.address.street,
        city: user.address.city,
        pinCode: user.address.pin,
        phoneNo: user.phone,
      },
      orderType: items.every(item => item.itemTypeRef === "Product") ? "PRODUCT_ONLY" : items.every(item => item.itemTypeRef === "Subscription") ? "SUBSCRIPTION_ONLY" : "MIXED",
    });

    res.status(201).json({ success: true, order, message: "Order placed successfully! Please proceed to payment." });
  });

  checkoutSession = catchAsyncError(async (req, res, next) => {
    const { orderId } = req.body;
    const user = res.locals.user;

    if (!orderId) {
      return next(new ErrorHandler("Please provide order ID", 400));
    }

    const order = await orderModel.findById(orderId).populate("items.product");

    if (!order) {
      return next(new ErrorHandler("Order not found", 404));
    }

    if (order.user.toString() !== user._id.toString()) {
      return next(new ErrorHandler("You are not authorized to perform this action", 403));
    }

    // Process line_items
    const line_items = await Promise.all(
      order.items.map(async (item) => {
        if (item.itemTypeRef === "Product") {
          return {
            price_data: {
              currency: "eur",
              product_data: {
                name: item.product.name,
                description: item.product.description,
                images: [item.product.image.url],
                metadata: {
                  orderId: order._id.toString(),
                  productId: item.product._id.toString(),
                },
              },
              unit_amount: item.price * 100,
            },
            quantity: item.quantity,
          };
        } else if (item.itemTypeRef === "Subscription") {
          const prices = await stripe.prices.list({
            lookup_keys: ["MONTHLY"], // Update with your actual lookup key
            expand: ['data.product'],
          });

          if (!prices.data.length) {
            throw new ErrorHandler("Subscription pricing not found", 404);
          }

          return {
            price: prices.data[0].id, // Use existing price ID for subscriptions
            quantity: 1, // Subscriptions typically have quantity of 1
          };
        }
      })
    );

    // Determine the session mode
    const sessionMode = order.orderType === "PRODUCT_ONLY" ? "payment" : "subscription";

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items,
      mode: sessionMode,
      success_url: `${process.env.FRONTEND_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL}/cancel`,
      metadata: {
        orderId: order._id.toString(),
      },
    });

    res.status(200).json({
      success: true,
      sessionId: session.id,
      url: session.url,
    });
  });


  orderConfirmation = catchAsyncError(async (req, res, next) => {
    const { sessionId } = req.body;

    if (!sessionId) {
      return next(new ErrorHandler("Please provide a session ID", 400));
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId);
    const orderId = session.metadata.orderId;
    const paymentId = session.payment_intent;

    if (!orderId) {
      return next(new ErrorHandler("Payment Error", 400));
    }

    const order = await orderModel.findById(orderId);

    if (!order) {
      return next(new ErrorHandler("Order not found", 404));
    }


    if (order.orderType === "SUBSCRIPTION_ONLY" || order.orderType === "MIXED") {
      const subscriptionItem = order.items.find(item => item.itemTypeRef === "Subscription");
      if (subscriptionItem) {
        const subscription = await subscriptionModel.findById(subscriptionItem.product);
        if (!subscription) {
          return next(new ErrorHandler("Associated subscription not found", 404));
        }


        const startDate = new Date(); // Current date as the start
        let endDate = new Date(startDate);

        switch (subscription.duration) {
          case "MONTHLY":
            endDate.setMonth(startDate.getMonth() + 1);
            break;
          case "WEEKLY":
            endDate.setDate(startDate.getDate() + 7);
            break;
          case "DAILY":
            endDate.setDate(startDate.getDate() + 1);
            break;
          default:
            return next(new ErrorHandler("Invalid subscription duration", 400));
        }

        order.endOfSubscription = endDate; // Update the endOfSubscription field
      }
    }

    // Update order status
    order.paid = true;
    order.paymentId = paymentId;
    order.status = "APPROVED";

    await order.save();
    res.status(200).json({ success: true, message: "Order payment confirmed successfully!" });
  });



  getMyOrders = catchAsyncError(async (req, res, next) => {
    const user = res.locals.user;
    const orders = await orderModel.find({ user: user._id });
    res.status(200).json({ success: true, orders });
  });

  getAllOrders = catchAsyncError(async (req, res, next) => {
    const orders = await orderModel
      .find()
      .populate("user", "-password -resetPasswordExpiry -resetPasswordToken -otp -otpExpiry -role")
      .populate("items.product");

    res.status(200).json({ success: true, orders });
  });

  updateOrderStatus = catchAsyncError(async (req, res, next) => {
    const { orderId } = req.params;
    const { status } = req.body;

    const order = await orderModel.findById(orderId);

    if (!order) {
      return next(new ErrorHandler("Order not found", 404));
    }

    if (!["PENDING", "APPROVED", "DELIVERED", "CANCELLED", "REFUNDED"].includes(status)) {
      return next(new ErrorHandler("Invalid order status", 400));
    }

    order.status = status;
    await order.save();

    res.status(200).json({ success: true, message: "Order status updated successfully" });
  });
  getActiveSubscription = catchAsyncError(async (req, res, next) => {
    const user = res.locals.user;


    const activeSubscriptions = await orderModel.find({
      user: user._id,
      orderType: { $in: ["SUBSCRIPTION_ONLY", "MIXED"] },
      endOfSubscription: { $gte: new Date() },
      paid: true,
    }).populate("items.product");

    if (!activeSubscriptions || activeSubscriptions.length === 0) {
      return res.status(404).json({ success: false, message: "No active subscriptions found" });
    }

    res.status(200).json({ success: true, subscriptions: activeSubscriptions });
  });

}

export default OrderController;
