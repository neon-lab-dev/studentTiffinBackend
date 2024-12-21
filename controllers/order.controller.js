import catchAsyncError from "../middlewares/catch-async-error.js";
import Stripe from "stripe";
import productModel from "../models/product.model.js";
import orderModel from "../models/order.model.js";
import ErrorHandler from "../utils/error-handler.js";
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);
class OrderController {

  createOrder = catchAsyncError(async (req, res, next) => {
    const user = res.locals.user;
    if (!user.address || user.address.length < 1 || !user.firstName || !user.lastName) {
      return res.status(400).json({ message: 'Please update your details and address' });
    }

    const { products } = req.body;


    const orderItems = [];
    let totalAmount = 0;


    const data = await Promise.all(
      products.map(async (item) => {
        const product = await productModel.findById(item.product);

        if (!product) {
          throw new Error(`Product not found for ID: ${item.product}`);
        }

        totalAmount += item.quantity * Number(product.price);
        orderItems.push({
          product: product,
          quantity: item.quantity
        });
      })
    );

    const order = await orderModel.create({
      user: user._id,
      products: orderItems,
      totalAmount: totalAmount,
      shippingInfo: {
        street: user.address.street,
        city: user.address.city,
        pinCode: user.address.pin,
        phoneNo: user.phone
      }
    })

    res.status(200).json({ success: true, order, message: "Order placed successfully! Please pay for order verification" });
  });



  checkoutSession = catchAsyncError(async (req, res, next) => {
    const { orderId } = req.body;
    const user = res.locals.user;

    // Check if orderId is provided
    if (!orderId) {
      return next(new ErrorHandler("Please provide order ID", 400));
    }

    // Find the order by ID
    const order = await orderModel.findById(orderId);
    if (!order) {
      return next(new ErrorHandler("Order not found", 404));
    }

    // Check if the order belongs to the user
    if (order.user.toString() !== user._id.toString()) {
      return next(new ErrorHandler("You are not authorized to perform this action", 403));
    }

    // Get product details for each order item
    const products = await Promise.all(
      order.products.map(async (item) => await productModel.findById(item.product))
    );

    // If any product is not found, return an error
    if (products.includes(null)) {
      return next(new ErrorHandler("One or more products not found", 404));
    }

    // Calculate total amount for the order
    let calculatedTotalAmount = 0;
    const quantities = [];
    order.products.forEach((item, index) => {
      const product = products[index];
      calculatedTotalAmount += item.quantity * product.price;
      quantities.push(item.quantity); // Collect quantities for Stripe
    });

    // Ensure the totalAmount in the order matches the calculated total
    if (calculatedTotalAmount !== order.totalAmount) {
      return next(new ErrorHandler("Total amount mismatch", 400));
    }

    // Prepare line items for Stripe
    const line_items = products.map((product, index) => ({
      price_data: {
        currency: "eur",
        product_data: {
          name: product.name,
          description: product.description,
          images: [product.image.url],
          metadata: {
            orderId: order._id.toString(),
            productId: product._id.toString(),
            quantity: quantities[index],
          },
        },
        unit_amount: product.price * 100,
      },
      quantity: quantities[index],
    }));

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items,
      mode: "payment",
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

    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["payment_intent.payment_method"],
    });

    // const lineItems = await stripe.checkout.sessions.listLineItems(sessionId);
    const orderId = session.metadata.orderId;
    const paymentId = session.payment_intent.id
    if (!orderId) {
      return next(new ErrorHandler("Payment Error", 400));
    }
    const order = await orderModel.findById(orderId);
    if (!order) {
      return next(new ErrorHandler("Order not found", 404));
    }
    order.paid = true;
    order.paymentId = paymentId;
    order.status = "RECEIVED";

    await order.save();
    res.status(200).json({ success: true, message: "Order placed successfully!" });

  });
  getMyOrders = catchAsyncError(async (req, res, next) => {
    const user = res.locals.user;
    const orders = await orderModel.find({ user: user._id });
    if (!orders) {
      return next(new ErrorHandler("No orders found", 404));
    }
    res.status(200).json({ success: true, orders });
  });
  //* get all orders Admin
  getAllOrders = catchAsyncError(async (req, res, next) => {
    const orders = await orderModel
      .find()
      .populate("user", "-password -resetPasswordExpiry -resetPasswordToken -otp -otpExpiry -role")
      .populate({
        path: "products.product",
        model: "Product",
      });
    res.status(200).json({ success: true, orders });
  });

  //* update order status
  updateOrderStatus = catchAsyncError(async (req, res, next) => {
    const { orderId } = req.params;
    const { status } = req.body;

    const order = await order.findById(orderId);
    if (!order) {
      return next(new ErrorHandler("Order not found", 404));
    }

    order.status = status;
    await order.save();
    res.status(200).json({ success: true });
  });
}
export default OrderController;