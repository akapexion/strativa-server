import mongoose from "mongoose";

const CustomFormFieldSchema = new mongoose.Schema({
  field_label: { type: String, required: true },
  field_type: { type: String, enum: ["text", "textarea", "select", "number"], required: true },
  field_options: [String], // for select type
  field_required: { type: Boolean, default: false }
});

const CustomFormSchema = new mongoose.Schema({
  form_title: { type: String, required: true },
  form_target_role: { type: String, required: true }, // department name or "all"
  fields: [CustomFormFieldSchema]
}, { timestamps: true });

const CustomForm = mongoose.model("CustomForm", CustomFormSchema);
export default CustomForm;
