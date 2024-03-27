import jwt from "jsonwebtoken";
import dotenv from "dotenv";
dotenv.config();

export const authMiddleware = async (req, res, next) => {
  try {
    const token = req.headers.authorization;

    if (!token) {
      return res.status(401).json({ message: "Token missing" });
    }

    const decode = jwt.verify(token, process.env.SECTERT_KEY);

    req.user = decode;
    next();
  } catch (error) {
    return res.status(401).json({ message: "Token invalid" });
  }
}