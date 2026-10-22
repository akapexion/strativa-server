import Firm from "../models/Firm.js";
import Users from "../models/users.js";
import Employees from "../models/employees.js";
import Attendance from "../models/Attendance.js";
import Appraisals from "../models/appraisals.js";
import DFIForms from "../models/dfi.js";
import KPIForms from "../models/kpi.js";
import CustomForm from "../models/CustomForm.js";
import CustomFormSubmission from "../models/CustomFormSubmission.js";
import LeaveTypes from "../models/leavetypes.js";
import Notifications from "../models/notifications.js";

export const ensureDefaultFirmAndMigrate = async () => {
  try {
    let primaryFirm = await Firm.findOne();
    if (!primaryFirm) {
      primaryFirm = await Firm.create({
        firm_name: "Apexion Strativa Global",
        firm_code: "APEX",
        firm_email: "apexionspace@gmail.com",
        firm_phone: "+92 300 0000000",
        firm_address: "Strativa Tech Tower, Suite 400",
        employee_limit: 50,
        status: "active",
      });
      console.log("Created primary default firm:", primaryFirm.firm_name);
    }

    const firmId = primaryFirm._id;

    // Backfill any documents missing firm_id
    await Promise.all([
      Users.updateMany({ firm_id: { $exists: false } }, { $set: { firm_id: firmId } }),
      Employees.updateMany({ firm_id: { $exists: false } }, { $set: { firm_id: firmId } }),
      Attendance.updateMany({ firm_id: { $exists: false } }, { $set: { firm_id: firmId } }),
      Appraisals.updateMany({ firm_id: { $exists: false } }, { $set: { firm_id: firmId } }),
      DFIForms.updateMany({ firm_id: { $exists: false } }, { $set: { firm_id: firmId } }),
      KPIForms.updateMany({ firm_id: { $exists: false } }, { $set: { firm_id: firmId } }),
      CustomForm.updateMany({ firm_id: { $exists: false } }, { $set: { firm_id: firmId } }),
      CustomFormSubmission.updateMany({ firm_id: { $exists: false } }, { $set: { firm_id: firmId } }),
      LeaveTypes.updateMany({ firm_id: { $exists: false } }, { $set: { firm_id: firmId } }),
      Notifications.updateMany({ firm_id: { $exists: false } }, { $set: { firm_id: firmId } }),
    ]);

    return primaryFirm;
  } catch (err) {
    console.error("Migration/ensureDefaultFirm error:", err);
  }
};
