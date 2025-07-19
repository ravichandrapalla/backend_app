const jwt = require("jsonwebtoken");

function authenticate(req, res, next) {
  const token = req.cookies.access_token;
  console.log(" token is ", req.cookies);
  if (!token) return res.status(401).json({ message: "Access token missing" });
  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res
        .status(403)
        .json({ message: "Invalid or expired access token" });
    }

    req.user = user;
    next();
  });
}
module.exports = { authenticate };
