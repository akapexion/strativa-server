import Employees from '../models/employees.js';
import Users from '../models/users.js';
import { createNotification } from '../utils/notifications.js';

// ── 1. Apply for leave ──
export const applyLeave = async (req, res) => {
  try {
    const { employee_code, leave_type, leave_from, leave_to, leave_days, leave_reason } = req.body;
    const prescription_image = req.file ? req.file.filename : undefined;

    const employee = await Employees.findOne({ employee_code });
    if (!employee) return res.status(404).json({ message: "Employee not found." });

    const alloted = employee.alloted_leaves?.[leave_type] ?? 0;
    if (alloted <= 0) {
      return res.status(400).json({ message: "No balance for this leave type." });
    }

    const newRequest = {
      leave_type,
      leave_from,
      leave_to,
      leave_days,
      leave_reason,
      prescription_image,
    };

    employee.leave_requests.push(newRequest);
    await employee.save();

    // Get the newly created request
    const savedRequest = employee.leave_requests[employee.leave_requests.length - 1];
    const requestId = savedRequest._id;

    // Notify the first manager in chronological order
    const managers = await Users.find({ user_role: "manager" }).sort({ _id: 1 });
    if (managers.length > 0) {
      await createNotification(
        managers[0]._id,
        "New Leave Request Pending",
        `A leave request from ${employee.employee_fname} ${employee.employee_lname} requires your approval.`,
        "leave_submission",
        requestId
      );
    }

    res.status(201).json({ success: true, message: "Leave request submitted." });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ── 2. Get my leave requests (employee) ──
export const getMyLeaveRequests = async (req, res) => {
  try {
    const employee = await Employees.findOne(
      { employee_code: req.params.employee_code },
      { leave_requests: 1 }
    );
    res.status(200).json({ success: true, requests: employee?.leave_requests || [] });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ── 3. Get ALL leave requests (manager) ──
export const getAllLeaveRequests = async (req, res) => {
  try {
    const managers = await Users.find({ user_role: "manager" }).sort({ _id: 1 });
    const myIndex = managers.findIndex(m => m._id.toString() === req.user.user_id.toString());
    if (myIndex === -1) {
      return res.status(200).json({ success: true, requests: [] });
    }

    // Pull leave_requests from all employees and flatten into one array
    const employees = await Employees.find(
      { "leave_requests.0": { $exists: true } },  // only employees who have requests
      { employee_code: 1, employee_fname: 1, employee_lname: 1, leave_requests: 1 }
    );

    // Flatten — attach employee info to each request
    const allRequests = employees.flatMap((emp) =>
      emp.leave_requests.map((req) => ({
        ...req.toObject(),
        employee_code: emp.employee_code,
        employee_name: `${emp.employee_fname} ${emp.employee_lname}`,
      }))
    );

    // Filter requests sequentially
    const visibleRequests = allRequests.filter((r) => {
      const approvedRemarks = r.manager_remarks ? r.manager_remarks.filter(rm => rm.status === "approved") : [];
      const approvedCount = approvedRemarks.length;

      // Current turn
      const isMyTurn = myIndex === approvedCount && r.leave_status !== "rejected" && r.leave_status !== "approved";

      // Already reviewed by me
      const alreadyReviewed = r.manager_remarks?.some(
        (rm) => rm.manager_id?.toString() === req.user.user_id.toString()
      );

      return isMyTurn || alreadyReviewed;
    });

    // Sort by latest first
    visibleRequests.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.status(200).json({ success: true, requests: visibleRequests });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ── 4. Approve / Reject (manager) ──
export const actionLeaveRequest = async (req, res) => {
  try {
    const { employee_code, request_id, leave_status } = req.body;
    const managerId = req.user.user_id;

    const managerUser = await Users.findById(managerId);
    if (!managerUser) {
      return res.status(404).json({ message: "Manager user not found." });
    }

    const employee = await Employees.findOne({ employee_code, "leave_requests._id": request_id });
    if (!employee) {
      return res.status(404).json({ message: "Employee not found." });
    }

    const request = employee.leave_requests.id(request_id);
    if (!request) {
      return res.status(404).json({ message: "Leave request not found." });
    }

    if (request.leave_status === "approved" || request.leave_status === "rejected") {
      return res.status(400).json({ message: `Leave request is already ${request.leave_status}.` });
    }

    // Prevent duplicate review by same manager
    const alreadyReviewed = request.manager_remarks?.some(
      (r) => r.manager_id?.toString() === managerId.toString()
    );
    if (alreadyReviewed) {
      return res.status(400).json({ message: "You have already submitted your review." });
    }

    const managers = await Users.find({ user_role: "manager" }).sort({ _id: 1 });
    const myIndex = managers.findIndex(m => m._id.toString() === managerId.toString());
    if (myIndex === -1) {
      return res.status(403).json({ message: "Only managers can take action." });
    }

    // Push this manager's remark
    request.manager_remarks.push({
      manager_id: managerId,
      manager_name: managerUser.user_fullname,
      manager_designation: managerUser.user_designation || "",
      remark: req.body.action_remark || "",
      status: leave_status,
      date: new Date(),
    });

    if (leave_status === "rejected") {
      request.leave_status = "rejected";

      // Notify employee
      await createNotification(
        employee._id,
        "Leave Request Rejected",
        `Your ${request.leave_type.replace(/_/g, " ")} leave request has been rejected by manager ${managerUser.user_fullname}.`,
        "leave_action",
        request_id
      );
    } else {
      const approvedRemarks = request.manager_remarks.filter(r => r.status === "approved");
      const approvedCount = approvedRemarks.length;

      if (approvedCount === managers.length) {
        request.leave_status = "approved";

        // Final approval: deduct leave days
        employee.alloted_leaves[request.leave_type] -= request.leave_days;

        // Notify employee of final approval
        await createNotification(
          employee._id,
          "Leave Request Approved",
          `Your ${request.leave_type.replace(/_/g, " ")} leave request has been fully approved!`,
          "leave_action",
          request_id
        );
      } else {
        request.leave_status = "pending"; // Keep pending

        // Notify next manager in sequence
        const nextManager = managers[myIndex + 1];
        if (nextManager) {
          await createNotification(
            nextManager._id,
            "Leave Request Awaiting Your Approval",
            `A leave request from ${employee.employee_fname} ${employee.employee_lname} is now awaiting your approval.`,
            "leave_submission",
            request_id
          );
        }

        // Notify employee of intermediate approval
        await createNotification(
          employee._id,
          "Leave Request Approved by Manager",
          `Your leave request has been approved by manager ${managerUser.user_fullname} and forwarded to the next manager.`,
          "leave_action",
          request_id
        );
      }
    }

    await employee.save();
    res.status(200).json({ success: true, message: `Leave ${leave_status}.` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
};

// ── 5. Get all leave types (for dropdown) ──
export const getAllLeaveTypes = async (req, res) => {
  try {
    // Fetch all employees that have alloted_leaves assigned
    const employees = await Employees.find(
      { alloted_leaves: { $exists: true } },
      { employee_code: 1, alloted_leaves: 1 }
    );

    res.status(200).json({ success: true, leaveTypesAvailable: employees });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};