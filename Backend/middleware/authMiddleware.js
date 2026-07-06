import jwt from "jsonwebtoken";

export const protect = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      message: "Unauthorized",
    });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // 👇 Debugging
    console.log("Decoded Token:", decoded);

    req.user = {
      id: decoded.userId,
    };

    console.log("req.user:", req.user);

    next();
  } catch (err) {
    console.error(err);

    return res.status(401).json({
      message: "Unauthorized",
    });
  }
};

export default protect;