import ErrorHandler from "../utils/error-handler.js";
import catchAsyncErrors from "./catch-async-error.js";
import pkg from "jsonwebtoken";
const { verify } = pkg;

import { USER_AUTH_TOKEN } from "../constants/cookies.constants.js";
import userModel from "../models/user.model.js";

/**
 * Middleware to authenticate a user based on a JWT token stored in cookies.
 * Optionally checks if the user has the required role.
 *
 * @param {string|null} [requiredRole=null] - The role required to access the route. If null, no role check is performed.
 * @returns {Function} Middleware function to handle authentication.
 *
 * @throws {ErrorHandler} If the token is missing, invalid, expired, or the user does not have the required role.
 */
export const authenticate = (requiredRole = null) =>
  catchAsyncErrors(async (req, res, next) => {
    const token = req.cookies[USER_AUTH_TOKEN];
    if (!token) {
      return next(new ErrorHandler("Please login first!", 401));
    }

    let decodedData;
    try {
      decodedData = verify(token, process.env.JWT_SECRET);
    } catch (error) {
      return next(
        new ErrorHandler("Invalid or expired token, please login again", 401)
      );
    }

    if (!decodedData || !decodedData.id) {
      return next(new ErrorHandler("Invalid token data, please login again", 401));
    }

    const user = await userModel.findById(decodedData.id);
    if (!user) {
      return next(new ErrorHandler("User not found, please login again", 404));
    }

    // Attach user to response locals
    res.locals.user = user;

    // Check for required role (if provided)
    if (requiredRole && user.role !== requiredRole) {
      return next(
        new ErrorHandler(`Access denied: ${requiredRole} role required`, 403)
      );
    }

    next();
  });






// import ErrorHandler from "../utils/errorhandler.js";
// import catchAsyncErrors from "./catchAsyncError.js";
// import pkg from 'jsonwebtoken';
// const { verify } = pkg;

// import { USER_AUTH_TOKEN } from "../constants/cookies.constants.js";
// import userModel from "../models/user.model.js";



// export const isAuthenticated = catchAsyncErrors(async (req, res, next) => {
//   const token = req.cookies;
//   if (!token[USER_AUTH_TOKEN]) {
//     return next(new ErrorHandler("Please Login", 401));
//   }
//   let decodedData;
//   try {
//     decodedData = verify(token[USER_AUTH_TOKEN], process.env.JWT_SECRET);
//   } catch (error) {
//     return next(
//       new ErrorHandler("Invalid or expired token, please login again", 401)
//     );
//   }
//   if (!decodedData || !decodedData.id) {
//     return next(
//       new ErrorHandler("Invalid token data, please login again", 401)
//     );
//   }
//   const user = await userModel.findById(decodedData.id);
//   if (!user) {
//     return next(new ErrorHandler("User not found, please login again", 404));
//   }
//   if (user.role !== "admin") {
//     res.locals.user = user;
//   } else {
//     res.locals.admin = user;
//   }

//   if (!res.locals.admin) {
//     return next(new ErrorHandler("Admin not found, please login again", 404));
//   }
//   next();
// });