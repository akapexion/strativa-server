import mongoose from 'mongoose'

const employeesModel = new mongoose.Schema({
    employee_code : {
        type: String,
        required: true,
        unique: true
    },
    employee_fname : {
        type: String,
        required: true
    },
    employee_lname : {
        type: String,
        required: true
    },
    employee_email : {
        type: String,
        required: true,
        unique: true
    },
    employee_phonenumber : {
        type: String,
        required: true,
        trim: true
    },
    employee_cnicnumber : {
        type: Number,
        required: true,
        trim: true
    },
    employee_dob : {
        type: Date,
        required: true,
    },
    employee_maritalstatus : {
        type: String,
        required: true,
    },
    employee_image : {
        type: String,
        required: true,
    },
    employee_department : {
        type: String,
        required: true,
    },
    employee_designation : {
        type: String,
        required: true,
    },
    employee_qualification : {
        type: String,
        required: true,
    },
    employee_lastorganization : {
        type: String,
        required: true,
    },
    employee_salary : {
        type: String,
        required: true,
    },
    employee_joiningdate : {
        type: Date,
        required: true
    },
    is_manager: {
    type: Boolean,
    default: false,
  },
  alloted_leaves: {
    type: mongoose.Schema.Types.Mixed,
    default: {
      causual_leaves: 0,
      medical_leaves: 5,
      special_leaves: 5,
      annual_leaves: 0
    }
  },
    employment_status: {
      type: String,
      enum: ["Probation", "Permanent", "Terminated", "Ex"],
      default: "Probation"
    },
    leave_requests: [
      {
        leave_type:   { type: String },   
        leave_from:   { type: Date },
        leave_to:     { type: Date },
        leave_days:   { type: Number },
        leave_reason: { type: String },
        leave_status: { type: String, enum: ["pending", "approved", "rejected"], default: "pending" },
        prescription_image: { type: String },
        createdAt:    { type: Date, default: Date.now },
        manager_remarks: [
          {
            manager_id: {
              type: mongoose.Schema.Types.ObjectId,
              ref: "User",
            },
            manager_name: String,
            manager_designation: { type: String, default: "" },
            remark: String,
            status: {
              type: String,
              enum: ["approved", "rejected"],
            },
            date: {
              type: Date,
              default: Date.now,
            },
          },
        ],
      }
    ]
})

const Employees = mongoose.model("Employee", employeesModel);

export default Employees;