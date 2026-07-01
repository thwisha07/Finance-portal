import { v4 as uuidv4 } from 'uuid';
import { query } from '../config/database';
import logger from '../config/logger';

export interface AuditLogData {
  user_id: string;
  user_email: string;
  action: string;
  resource_type: string;
  resource_id?: string;
  changes?: Record<string, any>;
  ip_address?: string;
  user_agent?: string;
  status: 'SUCCESS' | 'FAILURE';
  error_message?: string;
}

/**
 * Audit logging service
 */
export class AuditLogService {
  /**
   * Log audit event
   */
  static async log(data: AuditLogData): Promise<void> {
    const id = uuidv4();

    try {
      await query(
        `INSERT INTO audit_logs (id, timestamp, user_id, user_email, action, resource_type, resource_id, changes, ip_address, user_agent, status, error_message)
         VALUES ($1, NOW(), $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        [
          id,
          data.user_id,
          data.user_email,
          data.action,
          data.resource_type,
          data.resource_id,
          JSON.stringify(data.changes),
          data.ip_address,
          data.user_agent,
          data.status,
          data.error_message,
        ]
      );

      // Forward to SIEM if enabled
      if (process.env.SIEM_ENABLED === 'true') {
        this.forwardToSIEM(data);
      }
    } catch (error) {
      logger.error('Failed to log audit event:', error);
    }
  }

  /**
   * Forward audit log to SIEM
   */
  private static async forwardToSIEM(data: AuditLogData): Promise<void> {
    if (!process.env.SPLUNK_HEC_URL || !process.env.SPLUNK_HEC_TOKEN) {
      return;
    }

    try {
      const response = await fetch(process.env.SPLUNK_HEC_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Splunk ${process.env.SPLUNK_HEC_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          event: data,
          source: 'springbok-finance-portal',
          sourcetype: '_json',
        }),
      });

      if (!response.ok) {
        logger.warn(`SIEM forwarding failed: ${response.statusText}`);
      }
    } catch (error) {
      logger.error('Error forwarding to SIEM:', error);
    }
  }

  /**
   * Get audit logs
   */
  static async getAuditLogs(filters: {
    user_id?: string;
    action?: string;
    resource_type?: string;
    start_date?: Date;
    end_date?: Date;
    limit?: number;
    offset?: number;
  }) {
    let whereClause = 'WHERE 1=1';
    const params: any[] = [];
    let paramCount = 1;

    if (filters.user_id) {
      whereClause += ` AND user_id = $${paramCount}`;
      params.push(filters.user_id);
      paramCount++;
    }

    if (filters.action) {
      whereClause += ` AND action = $${paramCount}`;
      params.push(filters.action);
      paramCount++;
    }

    if (filters.resource_type) {
      whereClause += ` AND resource_type = $${paramCount}`;
      params.push(filters.resource_type);
      paramCount++;
    }

    if (filters.start_date) {
      whereClause += ` AND timestamp >= $${paramCount}`;
      params.push(filters.start_date);
      paramCount++;
    }

    if (filters.end_date) {
      whereClause += ` AND timestamp <= $${paramCount}`;
      params.push(filters.end_date);
      paramCount++;
    }

    const limit = filters.limit || 100;
    const offset = filters.offset || 0;

    const result = await query(
      `SELECT * FROM audit_logs ${whereClause} ORDER BY timestamp DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`,
      [...params, limit, offset]
    );

    return result.rows;
  }
}
