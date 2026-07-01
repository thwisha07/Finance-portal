import { v4 as uuidv4 } from 'uuid';
import { query } from '../config/database';
import { Invoice, PurchaseOrder } from '../types';
import { AuditLogService } from './auditLogService';
import logger from '../config/logger';

/**
 * Invoice service
 */
export class InvoiceService {
  /**
   * Record invoice with validation
   */
  static async recordInvoice(
    invoiceNumber: string,
    poId: string,
    vendorId: string,
    amount: number,
    userId: string,
    userEmail: string,
    clientIp?: string,
    userAgent?: string
  ): Promise<Invoice> {
    // Get PO to validate amount
    const poResult = await query('SELECT amount FROM purchase_orders WHERE id = $1', [poId]);
    if (!poResult.rows[0]) {
      throw new Error('Purchase order not found');
    }

    const po = poResult.rows[0];

    // Validate amount doesn't exceed 15% variance
    if (amount > po.amount * 1.15) {
      throw new Error(`Invoice amount exceeds PO value by more than 15%`);
    }

    // Check for duplicate invoice number
    const dupResult = await query(
      'SELECT id FROM invoices WHERE invoice_number = $1 AND status != \'REJECTED\'',
      [invoiceNumber]
    );

    if (dupResult.rows.length > 0) {
      throw new Error('Invoice number already exists');
    }

    const id = uuidv4();

    const result = await query(
      `INSERT INTO invoices (id, invoice_number, po_id, vendor_id, amount, status, received_by, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, 'RECEIVED', $6, NOW(), NOW())
       RETURNING *`,
      [id, invoiceNumber, poId, vendorId, amount, userId]
    );

    // Log audit event
    await AuditLogService.log({
      user_id: userId,
      user_email: userEmail,
      action: 'INVOICE_RECORDED',
      resource_type: 'INVOICE',
      resource_id: id,
      changes: { invoice_number: invoiceNumber, amount, po_id: poId },
      ip_address: clientIp,
      user_agent: userAgent,
      status: 'SUCCESS',
    });

    logger.info(`Invoice recorded: ${invoiceNumber} for PO ${poId} by ${userEmail}`);
    return result.rows[0];
  }

  /**
   * Approve invoice
   */
  static async approveInvoice(
    invoiceId: string,
    userId: string,
    userEmail: string,
    approvalNotes?: string,
    clientIp?: string,
    userAgent?: string
  ): Promise<Invoice> {
    const result = await query(
      `UPDATE invoices SET status = 'APPROVED', approved_by = $1, approved_at = NOW(), approval_notes = $2, updated_at = NOW()
       WHERE id = $3
       RETURNING *`,
      [userId, approvalNotes, invoiceId]
    );

    if (result.rows.length === 0) {
      throw new Error('Invoice not found');
    }

    // Log audit event
    await AuditLogService.log({
      user_id: userId,
      user_email: userEmail,
      action: 'INVOICE_APPROVED',
      resource_type: 'INVOICE',
      resource_id: invoiceId,
      changes: { status: 'APPROVED', approval_notes: approvalNotes },
      ip_address: clientIp,
      user_agent: userAgent,
      status: 'SUCCESS',
    });

    logger.info(`Invoice approved: ${invoiceId} by ${userEmail}`);
    return result.rows[0];
  }

  /**
   * Mark invoice as paid
   */
  static async markInvoicePaid(
    invoiceId: string,
    paymentMethod: string,
    reference: string,
    userId: string,
    userEmail: string,
    clientIp?: string,
    userAgent?: string
  ): Promise<void> {
    const result = await query(
      `UPDATE invoices SET status = 'PAID', updated_at = NOW() WHERE id = $1 RETURNING *`,
      [invoiceId]
    );

    if (result.rows.length === 0) {
      throw new Error('Invoice not found');
    }

    const invoice = result.rows[0];

    // Record payment
    await query(
      `INSERT INTO payments (id, invoice_id, amount, payment_date, payment_method, reference, marked_by, marked_at, created_at)
       VALUES (gen_random_uuid(), $1, $2, NOW(), $3, $4, $5, NOW(), NOW())`,
      [invoiceId, invoice.amount, paymentMethod, reference, userId]
    );

    // Log audit event
    await AuditLogService.log({
      user_id: userId,
      user_email: userEmail,
      action: 'PAYMENT_MARKED',
      resource_type: 'INVOICE',
      resource_id: invoiceId,
      changes: { status: 'PAID', payment_method: paymentMethod },
      ip_address: clientIp,
      user_agent: userAgent,
      status: 'SUCCESS',
    });

    logger.info(`Invoice marked as paid: ${invoiceId} (${invoice.amount}) by ${userEmail}`);
  }

  /**
   * Get invoices with filtering
   */
  static async getInvoices(filters: {
    status?: string;
    po_id?: string;
    vendor_id?: string;
    limit?: number;
    offset?: number;
  }) {
    let whereClause = 'WHERE 1=1';
    const params: any[] = [];
    let paramCount = 1;

    if (filters.status) {
      whereClause += ` AND status = $${paramCount}`;
      params.push(filters.status);
      paramCount++;
    }

    if (filters.po_id) {
      whereClause += ` AND po_id = $${paramCount}`;
      params.push(filters.po_id);
      paramCount++;
    }

    if (filters.vendor_id) {
      whereClause += ` AND vendor_id = $${paramCount}`;
      params.push(filters.vendor_id);
      paramCount++;
    }

    const limit = filters.limit || 50;
    const offset = filters.offset || 0;

    const result = await query(
      `SELECT * FROM invoices ${whereClause} ORDER BY created_at DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`,
      [...params, limit, offset]
    );

    return result.rows;
  }
}
