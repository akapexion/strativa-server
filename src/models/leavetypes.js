import mongoose from 'mongoose'

const leaveTypesModel = new mongoose.Schema({
    leave_type_title : {
        type: String,
        required: true,
    },
    leave_type_annual_quantity : {
        type: Number,
        required: true,
    },
    firm_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Firm",
        index: true,
    }
})

const LeaveTypes = mongoose.models.LeaveType || mongoose.model("LeaveType", leaveTypesModel);

export default LeaveTypes;