import nodemailer from "nodemailer";

const SENDER_EMAIL = process.env.EMAIL_FROM || "apexionspace@gmail.com";

// Create reusable transporter object using SMTP or Gmail
const createTransporter = () => {
  const host = process.env.SMTP_HOST || "smtp.gmail.com";
  const port = Number(process.env.SMTP_PORT) || 465;
  const user = process.env.SMTP_USER || process.env.EMAIL_USER || "apexionspace@gmail.com";
  const pass = process.env.SMTP_PASS || process.env.EMAIL_PASS;

  if (!pass) {
    return null; // Signals simulation mode if no credentials configured
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });
};

/**
 * Send initial employee credentials and onboarding instructions
 */
export const sendEmployeeOnboardingEmail = async ({
  toEmail,
  employeeName,
  employeeCode,
  firmName = "Strativa Global",
  portalUrl = process.env.CLIENT_URL || "https://strativa-erp.vercel.app",
}) => {
  try {
    const subject = `Welcome to ${firmName} - Your Employee Portal Access`;
    const htmlContent = `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden;">
        <div style="background: linear-gradient(135deg, #1e1b4b, #312e81, #4338ca); padding: 32px 24px; text-align: center; color: #ffffff;">
          <h1 style="margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.02em;">Welcome to ${firmName}</h1>
          <p style="margin: 8px 0 0; color: #c7d2fe; font-size: 14px;">Your Employee Account Has Been Created</p>
        </div>
        
        <div style="padding: 32px 24px; color: #1e293b; line-height: 1.6;">
          <p style="font-size: 15px; margin-top: 0;">Dear <strong>${employeeName}</strong>,</p>
          <p style="font-size: 14px; color: #475569;">
            Your profile has been created in the HRMS portal. You can now log in to track your attendance, manage leaves, view payroll payslips, and communicate with your team.
          </p>

          <div style="background: #f8fafc; border: 1.5px solid #e2e8f0; border-radius: 12px; padding: 20px; margin: 24px 0;">
            <p style="margin: 0 0 10px; font-size: 12px; font-weight: 800; text-transform: uppercase; color: #64748b; letter-spacing: 0.05em;">Your Login Credentials</p>
            <div style="margin-bottom: 8px; font-size: 14px;"><strong>Employee Code:</strong> <span style="font-family: monospace; background: #e0e7ff; color: #3730a3; padding: 3px 8px; border-radius: 6px;">${employeeCode}</span></div>
            <div style="margin-bottom: 8px; font-size: 14px;"><strong>Registered Email:</strong> ${toEmail}</div>
            <div style="font-size: 14px;"><strong>Temporary Password:</strong> <span style="font-family: monospace; background: #fef3c7; color: #92400e; padding: 3px 8px; border-radius: 6px;">123</span></div>
          </div>

          <p style="font-size: 13px; color: #b45309; background: #fffbeb; border: 1px solid #fde68a; padding: 12px 16px; border-radius: 8px;">
            ⚠️ <strong>Security Requirement:</strong> You must change this temporary password upon your first login.
          </p>

          <div style="text-align: center; margin: 32px 0 16px;">
            <a href="${portalUrl}/login" style="display: inline-block; background: #4f46e5; color: #ffffff; padding: 12px 28px; font-weight: 700; font-size: 14px; text-decoration: none; border-radius: 10px; box-shadow: 0 4px 12px rgba(79, 70, 229, 0.3);">
              Log In to Employee Portal
            </a>
          </div>
        </div>

        <div style="background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 16px 24px; text-align: center; font-size: 12px; color: #94a3b8;">
          Sent by Strativa Enterprise HRMS &bull; Apexion Systems
        </div>
      </div>
    `;

    const transporter = createTransporter();
    if (!transporter) {
      console.log(`[EMAIL SIMULATED - ONBOARDING] To: ${toEmail} | Code: ${employeeCode} | Sender: ${SENDER_EMAIL}`);
      return { success: true, simulated: true };
    }

    const info = await transporter.sendMail({
      from: `"${firmName} HR" <${SENDER_EMAIL}>`,
      to: toEmail,
      subject,
      html: htmlContent,
    });

    console.log(`[EMAIL SENT - ONBOARDING] ID: ${info.messageId} to ${toEmail}`);
    return { success: true, messageId: info.messageId };
  } catch (err) {
    console.error("sendEmployeeOnboardingEmail Error:", err);
    return { success: false, error: err.message };
  }
};

/**
 * Send official appraisal outcome email when appraisal is approved
 */
export const sendAppraisalApprovedEmail = async ({
  toEmail,
  employeeName,
  formTitle = "Annual Appraisal",
  updatedSalary = "",
  effectiveDate = new Date(),
  remarks = "Approved by management",
  firmName = "Strativa Global",
}) => {
  try {
    const formattedDate = new Date(effectiveDate).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    const subject = `Congratulations! Your ${formTitle} has been Approved`;
    const htmlContent = `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden;">
        <div style="background: linear-gradient(135deg, #065f46, #047857, #10b981); padding: 32px 24px; text-align: center; color: #ffffff;">
          <h1 style="margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.02em;">Appraisal Approved! 🎉</h1>
          <p style="margin: 8px 0 0; color: #d1fae5; font-size: 14px;">Performance Review Outcome</p>
        </div>
        
        <div style="padding: 32px 24px; color: #1e293b; line-height: 1.6;">
          <p style="font-size: 15px; margin-top: 0;">Dear <strong>${employeeName}</strong>,</p>
          <p style="font-size: 14px; color: #475569;">
            We are pleased to inform you that your <strong>${formTitle}</strong> has been officially approved by management.
          </p>

          <div style="background: #f0fdf4; border: 1.5px solid #bbf7d0; border-radius: 12px; padding: 20px; margin: 24px 0;">
            <p style="margin: 0 0 12px; font-size: 12px; font-weight: 800; text-transform: uppercase; color: #166534; letter-spacing: 0.05em;">Appraisal Outcome Summary</p>
            <div style="margin-bottom: 8px; font-size: 14px;"><strong>Status:</strong> <span style="background: #dcfce7; color: #15803d; font-weight: bold; padding: 2px 8px; border-radius: 6px;">Approved</span></div>
            ${updatedSalary ? `<div style="margin-bottom: 8px; font-size: 14px;"><strong>Revised Salary:</strong> <span style="font-weight: 800; color: #065f46;">PKR ${Number(updatedSalary).toLocaleString()}</span></div>` : ""}
            <div style="margin-bottom: 8px; font-size: 14px;"><strong>Effective Date:</strong> ${formattedDate}</div>
            <div style="font-size: 14px;"><strong>Management Remarks:</strong> <em>"${remarks}"</em></div>
          </div>

          <p style="font-size: 14px; color: #475569;">
            Thank you for your continued dedication, diligence, and contribution to ${firmName}.
          </p>
        </div>

        <div style="background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 16px 24px; text-align: center; font-size: 12px; color: #94a3b8;">
          Sent by Strativa Enterprise HRMS &bull; Apexion Systems
        </div>
      </div>
    `;

    const transporter = createTransporter();
    if (!transporter) {
      console.log(`[EMAIL SIMULATED - APPRAISAL] To: ${toEmail} | Salary: ${updatedSalary} | Sender: ${SENDER_EMAIL}`);
      return { success: true, simulated: true };
    }

    const info = await transporter.sendMail({
      from: `"${firmName} HR" <${SENDER_EMAIL}>`,
      to: toEmail,
      subject,
      html: htmlContent,
    });

    console.log(`[EMAIL SENT - APPRAISAL] ID: ${info.messageId} to ${toEmail}`);
    return { success: true, messageId: info.messageId };
  } catch (err) {
    console.error("sendAppraisalApprovedEmail Error:", err);
    return { success: false, error: err.message };
  }
};
