import mongoose from "mongoose";

const attendanceDeviceSchema = new mongoose.Schema(
  {
    firm_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Firm",
      required: true,
      index: true,
    },
    device_name: {
      type: String,
      required: true,
      trim: true,
    },
    device_identifier: {
      type: String, // Serial number or MAC address
      required: true,
      trim: true,
    },
    provider_type: {
      type: String,
      enum: [
        "zkteco_standalone",
        "hikvision_api",
        "essl_pull",
        "generic_webhook",
        "csv_import",
      ],
      default: "csv_import",
    },
    ip_address: {
      type: String,
      default: "",
    },
    port: {
      type: Number,
      default: 4370,
    },
    api_url: {
      type: String,
      default: "",
    },
    api_key_encrypted: {
      type: String,
      default: "",
    },
    status: {
      type: String,
      enum: ["active", "inactive", "error"],
      default: "active",
    },
    last_sync_at: {
      type: Date,
    },
    last_sync_status: {
      type: String,
      default: "Never synced",
    },
    settings: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  { timestamps: true }
);

attendanceDeviceSchema.index({ firm_id: 1, device_identifier: 1 }, { unique: true });

const AttendanceDevice = mongoose.model(
  "AttendanceDevice",
  attendanceDeviceSchema
);
export default AttendanceDevice;
