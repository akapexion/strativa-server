import Appraisals from "../models/appraisals.js";
import DFIForms from "../models/dfi.js";
import KPIForms from "../models/kpi.js";
import Users from "../models/users.js";
import CustomFormSubmission from "../models/CustomFormSubmission.js";
import { createNotification } from "../utils/notifications.js";

export const allFormRequests = async (req, res) => {
  try {
    const managers = await Users.find({ user_role: "manager" }).sort({ _id: 1 });
    const myIndex = managers.findIndex(m => m._id.toString() === req.user?.user_id?.toString());
    
    // Check if the logged-in user is the CEO
    const isCEO = req.user?.user_role === "ceo" || req.user?.user_designation === "CEO";

    if (myIndex === -1 && !isCEO) {
      return res.status(200).json({ success: true, AllFormSubmissions: [] });
    }

    const AppraisalRequests = await Appraisals.find();
    const DFIRequests = await DFIForms.find();
    const KPIRequests = await KPIForms.find();
    const CustomRequests = await CustomFormSubmission.find();

    const AllFormSubmissions = [...AppraisalRequests, ...DFIRequests, ...KPIRequests, ...CustomRequests];

    // Build a map of user code -> whether they are a manager
    const allUsers = await Users.find({}, 'user_code is_manager user_role');
    const managerMap = {};
    allUsers.forEach(u => {
      managerMap[u.user_code] = u.is_manager || u.user_role === "manager";
    });

    // Filter requests sequentially
    const visibleRequests = AllFormSubmissions.filter((r) => {
      const isAuthorManager = managerMap[r.employee_code];

      if (isAuthorManager) {
        // Manager-raised form. Bypasses normal sequential managers, goes ONLY to CEO.
        if (isCEO) {
          const alreadyReviewed = r.manager_remarks?.some(
            (rm) => rm.manager_id?.toString() === req.user?.user_id?.toString()
          );
          const isMyTurn = r.form_status === "pending" && !alreadyReviewed;
          return isMyTurn || alreadyReviewed;
        }
        return false;
      } else {
        // Employee-raised form. Bypasses CEO, goes to sequential managers.
        if (isCEO) return false;
        if (myIndex === -1) return false;

        const approvedRemarks = r.manager_remarks ? r.manager_remarks.filter(rm => rm.status === "approved") : [];
        const approvedCount = approvedRemarks.length;

        // Current turn
        const isMyTurn = myIndex === approvedCount && r.form_status !== "rejected" && r.form_status !== "approved";

        // Already reviewed by me
        const alreadyReviewed = r.manager_remarks?.some(
          (rm) => rm.manager_id?.toString() === req.user?.user_id?.toString()
        );

        return isMyTurn || alreadyReviewed;
      }
    });

    // Sort by latest first using ObjectId timestamp
    visibleRequests.sort((a, b) => b._id.getTimestamp() - a._id.getTimestamp());

    res.status(200).json({ success: true, AllFormSubmissions: visibleRequests });

  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const singleFormRequest = async (req, res) => {
  try {
    const { id } = req.params;

    let form = await Appraisals.findById(id);
    if (!form) form = await DFIForms.findById(id);
    if (!form) form = await KPIForms.findById(id);
    if (!form) form = await CustomFormSubmission.findById(id);

    if (!form) {
      return res.status(404).json({ success: false, message: "Form not found" });
    }

    let formObj = form.toObject ? form.toObject() : form;

    // Check if creator is a manager
    const creatorUser = await Users.findOne({ user_code: form.employee_code });
    const isAuthorManager = creatorUser && (creatorUser.is_manager || creatorUser.user_role === "manager");

    if (isAuthorManager) {
      formObj.is_manager_raised = true;
      const ceo = await Users.findOne({
        $or: [
          { user_role: "ceo" },
          { user_designation: "CEO" }
        ]
      });
      if (ceo) {
        formObj.ceo_user = {
          _id: ceo._id,
          user_fullname: ceo.user_fullname,
          user_designation: ceo.user_designation
        };
      }
    }

    res.status(200).json({ success: true, formSubmission: formObj });

  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const managerAction = async (req, res) => {
  try {
    const { id } = req.params;
    const { manager_remarks, form_status } = req.body;
    
    // Prefer authenticated manager user ID
    const managerId = req.user?.user_id || req.body.user?.user_id;
    if (!managerId) {
      return res.status(401).json({ message: "Access denied. Manager user not found." });
    }

    const managerUser = await Users.findById(managerId);
    if (!managerUser) {
      return res.status(404).json({ message: "Manager user not found." });
    }

    const collections = [Appraisals, DFIForms, KPIForms, CustomFormSubmission];
    let doc = null;

    for (let Model of collections) {
      doc = await Model.findById(id);
      if (doc) {
        break;
      }
    }

    if (!doc) {
      return res.status(404).json({ message: "Form not found" });
    }

    // ✅ If already finally approved or rejected — lock it
    if (doc.form_status === "approved" || doc.form_status === "rejected") {
      return res.status(400).json({
        message: `Form is already ${doc.form_status}. No further actions allowed.`,
      });
    }

    // Check if creator is a manager
    const creatorUser = await Users.findOne({ user_code: doc.employee_code });
    const isAuthorManager = creatorUser && (creatorUser.is_manager || creatorUser.user_role === "manager");

    const isCEO = managerUser.user_role === "ceo" || managerUser.user_designation === "CEO";

    if (isAuthorManager) {
      // Manager-raised form. ONLY the CEO can approve.
      if (!isCEO) {
        return res.status(403).json({ message: "Only the CEO can approve manager-raised forms." });
      }

      // Push CEO's remark
      doc.manager_remarks.push({
        manager_id: managerId,
        manager_name: managerUser.user_fullname,
        manager_designation: managerUser.user_designation || "",
        remark: manager_remarks || "",
        status: form_status,
        date: new Date(),
      });

      doc.form_status = form_status; // approved or rejected directly

      if (creatorUser) {
        await createNotification(
          creatorUser._id,
          `${doc.form_title} ${form_status === "approved" ? "Approved" : "Rejected"}`,
          `Your ${doc.form_title} has been ${form_status} by CEO ${managerUser.user_fullname}.`,
          "form_action",
          id
        );
      }

      await doc.save();
      return res.json({ message: "Action recorded by CEO", data: doc });
    }

    // ✅ Prevent duplicate review by same manager (for standard employee sequential approvals)
    const alreadyReviewed = doc.manager_remarks.some(
      (r) => r.manager_id.toString() === managerId.toString()
    );

    if (alreadyReviewed) {
      return res.status(400).json({
        message: "You have already submitted your review.",
        alreadyReviewed: true,
      });
    }

    const managers = await Users.find({ user_role: "manager" }).sort({ _id: 1 });
    const myIndex = managers.findIndex(m => m._id.toString() === managerId.toString());
    if (myIndex === -1) {
      return res.status(403).json({ message: "Only managers can take action." });
    }

    // Ensure it is actually their turn
    const approvedRemarksBefore = doc.manager_remarks.filter(r => r.status === "approved");
    const approvedCountBefore = approvedRemarksBefore.length;
    if (myIndex !== approvedCountBefore) {
      return res.status(400).json({ message: "It is not your turn to review this request." });
    }

    // ✅ Push this manager's remark
    doc.manager_remarks.push({
      manager_id: managerId,
      manager_name: managerUser.user_fullname,
      manager_designation: managerUser.user_designation || "",
      remark: manager_remarks || "",
      status: form_status,
      date: new Date(),
    });

    const employeeUser = await Users.findOne({ user_code: doc.employee_code });
    const employeeUserId = employeeUser ? employeeUser._id : null;

    // ✅ If ANY manager rejects → immediately final reject, lock form
    if (form_status === "rejected") {
      doc.form_status = "rejected";

      if (employeeUserId) {
        await createNotification(
          employeeUserId,
          `${doc.form_title} Rejected`,
          `Your ${doc.form_title} has been rejected by manager ${managerUser.user_fullname}.`,
          "form_action",
          id
        );
      }
    } else {
      // ✅ Count total approvals so far
      const approvedCount = doc.manager_remarks.filter(
        (r) => r.status === "approved"
      ).length;

      // ✅ Only mark approved when ALL managers have approved
      if (approvedCount === managers.length) {
        doc.form_status = "approved";

        if (employeeUserId) {
          await createNotification(
            employeeUserId,
            `${doc.form_title} Approved`,
            `Your ${doc.form_title} has been fully approved!`,
            "form_action",
            id
          );
        }
      } else {
        doc.form_status = "pending";

        // Notify next manager in sequence
        const nextManager = managers[myIndex + 1];
        if (nextManager) {
          await createNotification(
            nextManager._id,
            "Form Request Awaiting Your Approval",
            `A ${doc.form_title} from ${doc.employee_name} is now awaiting your approval.`,
            "form_submission",
            id
          );
        }

        // Notify employee of intermediate approval
        if (employeeUserId) {
          await createNotification(
            employeeUserId,
            `${doc.form_title} Approved by Manager`,
            `Your ${doc.form_title} has been approved by manager ${managerUser.user_fullname} and forwarded to the next manager.`,
            "form_action",
            id
          );
        }
      }
    }

    await doc.save();
    res.json({ message: "Action recorded", data: doc });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
};