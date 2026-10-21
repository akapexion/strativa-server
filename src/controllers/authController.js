import Users from "../models/users.js";
import jwt from "jsonwebtoken";

export const login = async (req, res) => {
    try {
      const { user_code, user_password } = req.body;
  
      if (!user_code || !user_password) {
        return res.status(400).json({ success: false, message: "Please provide code and password" });
      }
  
      // Find user by code
      const user = await Users.findOne({ user_code });
  
      if (!user) {
        return res.status(404).json({ success: false, message: "User not found" });
      }
  
      // Check password (plain text for now)
      if (user.user_password !== user_password) {
        return res.status(401).json({ success: false, message: "Invalid password" });
      }
  
      // Generate JWT Token
      const token = jwt.sign(
        {
          user_id: user._id,
          user_role: user.user_role,
          user_designation: user.user_designation,
        },
        process.env.JWT_SECRET || "supersecretkeyforstrativaerp",
        { expiresIn: "1d" }
      );

      // Successful login
      res.status(200).json({
        success: true,
        message: "Login successful",
        token,
        loggedUser: {
          user_id: user._id,
          user_fullname: user.user_fullname,
          user_email: user.user_email,
          user_code: user.user_code,
          user_role: user.user_role,
          user_designation: user.user_designation,
          user_image: user.user_image,
          is_manager: user.is_manager
        },
      });
  
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: "Server error" });
    }
  }


export const allManagers = async(req, res) => {
  try{
    const allManagers = await Users.find({user_role: "manager"});

    res.status(200).send({success: true, allManagers});
  }
  catch(err){
    res.status(500).send({success: false, err});
  }
}