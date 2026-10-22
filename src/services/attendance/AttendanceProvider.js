/**
 * Base abstract interface for Attendance Integration Providers.
 * Supports vendor SDKs, Network Pull/Push, Webhooks, and CSV/Excel import.
 */
export class AttendanceProvider {
  constructor(name) {
    if (this.constructor === AttendanceProvider) {
      throw new Error("Cannot instantiate abstract AttendanceProvider directly");
    }
    this.name = name;
  }

  /**
   * Fetches or parses raw attendance events from the external source or input
   * @param {Object} context - Device configuration, payload, or file buffer
   * @returns {Promise<Array<{ employee_code: string, timestamp: Date, punch_type: string, device_id: string }>>}
   */
  async getEvents(context) {
    throw new Error("getEvents() must be implemented by provider");
  }

  /**
   * Performs device connectivity / health check
   * @param {Object} deviceConfig
   * @returns {Promise<{ isOnline: boolean, message: string }>}
   */
  async testConnection(deviceConfig) {
    throw new Error("testConnection() must be implemented by provider");
  }

  /**
   * Triggers device synchronization
   * @param {Object} deviceConfig
   * @returns {Promise<{ success: boolean, syncedCount: number, error: string|null }>}
   */
  async sync(deviceConfig) {
    throw new Error("sync() must be implemented by provider");
  }
}
