// Create Token and saving in cookie

const sendToken = (user, statusCode, res, message, tokenKey) => {
  const token = user.getJWTToken();

  //option for cookie
  const options = {
    expires: new Date(
      Date.now() + process.env.COOKIE_EXPIRE * 24 * 60 * 60 * 1000
    ),
    httpOnly: true,
    secure: true,
    sameSite: "none",
  };

  const userData = {
    _id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    role: user.role,


  };

  res.status(statusCode).cookie(tokenKey, token, options).json({
    success: true,
    message,
    user: userData,
  });
};

export default sendToken;