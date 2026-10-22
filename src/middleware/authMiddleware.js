import jwt from "jsonwebtoken";

export const verifyToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ success: false, message: "Access denied. No token provided." });
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "supersecretkeyforstrativaerp");
    req.user = decoded;

    next();
  } catch (err) {
    return res.status(403).json({ success: false, message: "Invalid or expired token." });
  }
};

export const requireAdmin = (req, res, next) => {
  if (req.user?.user_role !== "admin" && req.user?.user_role !== 0) {
    return res.status(403).json({ success: false, message: "Access denied. Admin privileges required." });
  }
  next();
};

export const requireManagerOrAdmin = (req, res, next) => {
  const role = req.user?.user_role;
  const isMgrOrAdmin = role === "admin" || role === "manager" || role === "ceo" || req.user?.user_designation === "CEO" || role === 0;
  if (!isMgrOrAdmin) {
    return res.status(403).json({ success: false, message: "Access denied. Manager or Admin privileges required." });
  }
  next();
};
