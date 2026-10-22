import mongoose from "mongoose";

const usersModel = new mongoose.Schema({
  user_fullname: {
    type: String,
    required: true,
  },
  user_email: {
    type: String,
    required: true,
    unique: true,
  },
  user_code: {
    type: String,
    required: true,
    unique: true,
  },
  user_password: {
    type: String,
    default: "123",
  },
  user_role: {
    type: String,
    default: "user",
  },
  user_designation: {
    type: String,
    required: true,
  },
  user_image: {
    type: String,
    default: "fallback-avatar.svg",
  },
  is_manager: {
    type: Boolean,
    default: false,
  },
  firm_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Firm",
    index: true,
  },
  must_change_password: {
    type: Boolean,
    default: false,
  }
});

const Users = mongoose.model("User", usersModel);

export default Users;
