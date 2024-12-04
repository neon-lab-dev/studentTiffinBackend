import { Schema, model } from "mongoose";
import { hash, compare } from "bcrypt";
import pkg from "jsonwebtoken";
const { sign } = pkg;
import crypto from "crypto";
const UserSchema = new Schema({
  firstName: {
    type: String,

  },
  lastName: {
    type: String,

  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
    select: false,
  },
  role: {
    type: String,
    enum: ["USER", "ADMIN"],
    default: "USER",
  },
  phone: {
    type: String,
    required: true,
  },
  address:
  {
    street: { type: String },
    city: { type: String },
    pin: { type: String },
    country: { type: String },
  },

  otp: {
    type: Number,
  },
  isVerified: {
    type: Boolean,
    default: false,
  },
  otpExpiry: { type: Date },
  resetPasswordToken: { type: String },
  resetPasswordExpiry: { type: Date },
});

// Pre-save middleware to hash passwords
UserSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await hash(this.password, 10);
  next();
});

// Method to generate JWT token
UserSchema.methods.getJWTToken = function () {
  return sign({ id: this._id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE,
  });
};

// Method to compare passwords
UserSchema.methods.comparePassword = async function (enteredPassword) {
  return compare(enteredPassword, this.password);
};

UserSchema.methods.getResetPasswordToken = function () {

  const resetToken = crypto.randomBytes(20).toString("hex");

  //Hashing and adding resetPasswordToken to user schema
  this.resetPasswordToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");

  this.resetPasswordExpire = Date.now() + 15 * 60 * 1000;

  return resetToken;
};

export default model("User", UserSchema);
