import mongoose from 'mongoose'

const KPIModel = new mongoose.Schema({
    form_no: {
        type: String,
        unique: true,
        default: () => `FORM-${Math.floor(Math.random() * 1000)}`
    },
    employee_code : {
        type : String,
        required : true
    },   
    employee_name: {
    type: String,
    required: true
    },
    kpi_batch: {
        type: String,
        required: true
    },
    kpi_batch_semester: {
        type: String,
        required: true
    },
    kpi_do_count: {
        type: Number,
        required: true
    },
    kpi_batch_attendence_percentage: {
        type: String,
        required: true
    },
    form_title: {
        type: String,
        default: "Key Performance Indicator - KPI"
    },
    form_status: {
        type: String,
        enum: ["pending", "approved", "rejected"],
      default: "pending"
    },
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
        }
      ]
})

const KPIForms = mongoose.model("KPIForm", KPIModel);

export default KPIForms;