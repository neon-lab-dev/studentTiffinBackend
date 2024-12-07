import catchAsyncError from "../middlewares/catch-async-error.js";
import userModel from "../models/user.model.js";
import { generateOTP } from "../utils/generate-otp.js";
import ErrorHandler from "../utils/error-handler.js";
import { USER_AUTH_TOKEN } from "../constants/cookies.constants.js";
import sendToken from "../utils/jwt-token.js";
import crypto from "crypto";
import { sendWelcomeMail } from "../mailers/welcome-user.js";
import omit from "../utils/omit.js";
async function deleteUsersWithExpiredOTP() {
  try {
    const currentTime = Date.now();

    await userModel.deleteMany({
      otpExpiry: { $lte: currentTime },
      otp: { $ne: null },
    });
  } catch (error) {
    console.error("Error deleting users with expired OTP:", error);
  }
}

setInterval(deleteUsersWithExpiredOTP, 5 * 60 * 1000);

class AuthController {
  //* controller to register
  register = catchAsyncError(async (req, res, next) => {
    const { email, password, phone, confirm_password } = req.body;

    // Validate inputs
    if (!email || !password || !phone || !confirm_password) {
      return next(new ErrorHandler("Please enter all fields", 400));
    }
    if (password !== confirm_password) {
      return next(new ErrorHandler("Passwords do not match", 400));
    }

    // Check if user already exists
    const existingUser = await userModel.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "User already exists",
      });
    }

    // Generate OTP
    const otp = generateOTP();
    console.log("Your register otp is ", otp); // Remove this in production

    // TODO: Send OTP to user's email (integration needed)
    await sendWelcomeMail(email, email, otp);
    // Create new user
    const user = await userModel.create({
      email,
      password,
      phone,
      otp,
      otpExpiry: new Date(Date.now() + process.env.OTP_EXPIRE * 60 * 1000),
    });
    console.log(`OTP will expire in ${user.otpExpiry} seconds.`);

    res.status(200).json({
      success: true,
      message: "User registered successfully. Please verify your OTP.",
    });
  });


  //* controller to login
  login = catchAsyncError(async (req, res, next) => {
    const { email, password } = req.body;

    if (!email || !password) {
      return next(new ErrorHandler("Please enter all fields", 400));
    }

    const user = await userModel.findOne({ email }).select("+password");
    if (!user) {
      return next(new ErrorHandler("Invalid credentials", 401));
    }

    const isPasswordMatched = await user.comparePassword(password);
    if (!isPasswordMatched) {
      return next(new ErrorHandler("Invalid credentials", 401));
    }
    sendToken(user, 200, res, "Welcome Back!", USER_AUTH_TOKEN);
  });
  // * controller to verify OTP
  otpVerify = catchAsyncError(async (req, res, next) => {
    if (!req.body.email || !req.body.otp) {
      return next(new ErrorHandler("Please enter email and OTP", 400));
    }
    const otp = Number(req.body.otp);

    const user = await userModel.findOne({ email: req.body.email });

    if (!user) {
      return next(new ErrorHandler("User Doesn't exist", 404));
    }

    if (user.otp !== parseInt(otp) || user.otpExpiry < Date.now()) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid OTP or has been Expired" });
    }

    user.isVerified = true;
    user.otp = null;
    user.otpExpiry = null;

    await user.save();
    sendToken(user, 200, res, "Welcome Back!", USER_AUTH_TOKEN);
  });

  forgotPassword = catchAsyncError(async (req, res, next) => {
    const { email } = req.body;

    if (!email) {
      return next(new ErrorHandler("Please enter email", 404));
    }

    const user = await userModel.findOne({ email: req.body.email });

    if (!user) {
      return next(new ErrorHandler("User not found", 404));
    }
    const resetToken = user.getResetPasswordToken();
    const resetTokenExpire = new Date(Date.now() + 2 * 60 * 1000);
    user.resetPasswordExpiry = resetTokenExpire;
    await user.save({ validateBeforeSave: false });

    const resetPasswordUrl = `${req.protocol}://${req.get(
      "host"
    )}/api/v1/auth/reset-password/${resetToken}`;

    const frontendurl = `https://localhost:3000/reset-password/${resetToken}`;

    try {
      // await sendEmail(user.email, "Password Reset Link for Java Sports Account", message);

      res.status(200).json({
        success: true,
        message: `Email sent to ${user.email} successfully`,
        resetPasswordUrl,
        frontendurl,
      });
    } catch (error) {
      user.resetPasswordToken = undefined;
      user.resetPasswordExpiry = undefined;

      await user.save({ validateBeforeSave: false });

      return next(new ErrorHandler(error.message, 500));
    }


  });

  //* controller to reset password
  resetPassword = catchAsyncError(async (req, res, next) => {
    const resetPasswordToken = crypto
      .createHash("sha256")
      .update(req.params.token)
      .digest("hex");

    const user = await userModel.findOne({
      resetPasswordToken,
      resetPasswordExpiry: { $gt: Date.now() },
    });
    console.log(user)
    if (!user) {
      return next(
        new ErrorHandler(
          "Reset Password Token is invalid or has been expired",
          400
        )
      );
    }

    if (!req.body.password || !req.body.confirmPassword) {
      return next(new ErrorHandler("Please Enter Password", 400));
    }

    if (req.body.password !== req.body.confirmPassword) {
      return next(new ErrorHandler("Password does not password", 400));
    }

    user.password = req.body.password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpiry = undefined;

    await user.save();

    res.status(200).json({
      success: true,
      message: "Password reset successfully ",
    });
  })
  //* controller to update password
  updatePassword = catchAsyncError(async (req, res, next) => {
    const id = res.locals.user._id;

    if (!id) {
      return next(new ErrorHandler("Please login to update password", 401));
    }
    const user = await userModel.findById(id).select("+password");
    const { oldPassword, newPassword, confirmPassword } = req.body;
    if (!oldPassword || !newPassword || !confirmPassword) {
      return next(new ErrorHandler("Please enter all fields", 400));
    }
    const isPasswordMatched = await user.comparePassword(oldPassword);
    if (!isPasswordMatched) {
      return next(new ErrorHandler("Invalid credentials", 401));
    }
    if (newPassword !== confirmPassword) {
      return next(new ErrorHandler("Passwords do not match", 400));
    }
    user.password = newPassword;
    await user.save();


    res.status(200).json({ message: "Password updated successfully", success: true });
  });
  //* update profile 
  updateProfile = catchAsyncError(async (req, res, next) => {
    const id = res.locals.user._id;

    if (!id) {
      return next(new ErrorHandler("Please login to update profile", 401));
    }

    const user = await userModel.findById(id);
    if (!user) {
      return next(new ErrorHandler("User not found", 404));
    }

    const { firstName, lastName, phone, address } = req.body;

    if (firstName) user.firstName = firstName;
    if (lastName) user.lastName = lastName;
    if (phone) user.phone = phone;

    if (Array.isArray(address) && address.length > 0) {
      const updatedAddresses = [];

      address.forEach((newAddress) => {
        if (
          !newAddress.street ||
          !newAddress.city ||
          !newAddress.pin ||
          !newAddress.country
        ) {
          return next(new ErrorHandler("Incomplete address details provided", 400));
        }

        const exists = user.address.some(
          (existingAddress) =>
            existingAddress.street === newAddress.street &&
            existingAddress.city === newAddress.city
        );


        // If it exists, replace it; otherwise, push the new address
        if (!exists) {
          updatedAddresses.push(newAddress);
        } else {
          user.address = user.address.map((existingAddress) =>
            existingAddress.street === newAddress.street &&
              existingAddress.city === newAddress.city
              ? newAddress
              : existingAddress
          );
        }
      });

      // Add unique new addresses to the user addresses
      user.address.push(...updatedAddresses);
    }

    await user.save();

    res.status(200).json({
      message: "Profile updated successfully",
      success: true,
      data: user, // Return updated addresses for confirmation
    });
  });
  updateProfile = catchAsyncError(async (req, res, next) => {
    const id = res.locals.user._id;

    if (!id) {
      return next(new ErrorHandler("Please login to update profile", 401));
    }

    const user = await userModel.findById(id);
    if (!user) {
      return next(new ErrorHandler("User not found", 404));
    }

    const { firstName, lastName, phone, address } = req.body;

    if (firstName) user.firstName = firstName;
    if (lastName) user.lastName = lastName;
    if (phone) user.phone = phone;

    if (address) {
      const { street, city, pin, country } = address;
      if (!street || !city || !pin || !country) {
        return next(new ErrorHandler("Incomplete address details provided", 400));
      }
      user.address = { street, city, pin, country };
    }
    await user.save();

    res.status(200).json({
      message: "Profile updated successfully",
      success: true,
    });
  });


  me = catchAsyncError(async (req, res, next) => {
    const user = await userModel.findById(res.locals.user._id);
    if (!user) {
      return next(new ErrorHandler("User not found", 404));
    }
    const omittedUser = omit(user._doc, ["password", "role", "otp", "otpExpiry", "resetPasswordToken", "resetPasswordExpiry"]);
    res.status(200).json({
      success: true,
      data: omittedUser,
    });
  }
  )
  //* controller to logout
  logout = catchAsyncError(async (req, res, next) => {
    res.cookie(USER_AUTH_TOKEN, "", {
      expires: new Date(0), // Set the expiration date to a past date to immediately expire the cookie
      httpOnly: true,
      secure: "true", // Set to true in production, false in development
      sameSite: "None", // Ensure SameSite is set to None for cross-site cookies
    });

    res.status(200).json({
      success: true,
      message: "Logged out successfully",
    });
  });

  getAllUsers = catchAsyncError(async (req, res, next) => {
    const users = await userModel.find();
    const usersCount = await userModel.countDocuments();
    res.status(200).json({
      success: true,
      data: users,
      usersCount,
    });

  });
}

export default AuthController;
