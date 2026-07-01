import { Router, Request, Response } from 'express';
import Joi from 'joi';
import { query } from '../config/database';
import { verifyJWT, requireRole, captureRequestMetadata } from '../middleware/auth';
import { validate, schemas, validateParams } from '../middleware/validation';
import { asyncHandler } from '../middleware/errorHandler';
import { AuditLogService } from '../services/auditLogService';
import logger from '../config/logger';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

/**
 * Get purchase orders
 */
router.get(
  '/',
  verifyJWT,
  captureRequestMetadata,
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const { department, status, limit, offset } = req.query;
    let whereClause = 'WHERE 1=1';
    const params: any[] = [];
    let paramCount = 1;

    // PO Owners only see their department
    if (req.user.role === 'po_owner') {
      whereClause += ` AND department = $${paramCount}`;
      params.push(req.user.department);
      paramCount++;
    } else if (department) {
      whereClause += ` AND department = $${paramCount}`;
      params.push(department);
      paramCount++;
    }

    if (status) {
      whereClause += ` AND status = $${paramCount}`;
      params.push(status);
      paramCount++;
    }

    const resultLimit = Math.min(parseInt(limit as string) || 50, 100);
    const resultOffset = parseInt(offset as string) || 0;

    const result = await query(
      `SELECT * FROM purchase_orders ${whereClause} ORDER BY created_at DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`,
      [...params, resultLimit, resultOffset]
    );

    res.status(200).json({ purchase_orders: result.rows, count: result.rows.length });
  })
);

/**
 * Create purchase order
 */
router.post(
  '/',
  verifyJWT,
  requireRole('po_owner'),
  captureRequestMetadata,
  validate(
    Joi.object({
      po_number: schemas.poNumber,
      vendor_id: schemas.uuid,
      department: Joi.string().required(),
      description: Joi.string().min(10).max(500).required(),
      amount: schemas.amount,
      expected_completion_date: Joi.date().iso().required(),
      reporting_period: Joi.string().regex(/^\d{4}-\d{2}$/).required(),
    })
  ),
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const { po_number, vendor_id, department, description, amount, expected_completion_date, reporting_period } = req.body;

    // PO Owner can only create for their own department
    if (req.user.role === 'po_owner' && department !== req.user.department) {
      res.status(403).json({ error: 'Cannot create PO for other departments' });
      return;
    }

    // Check if PO already exists
    const existing = await query('SELECT id FROM purchase_orders WHERE po_number = $1', [po_number]);
    if (existing.rows.length > 0) {
      res.status(409).json({ error: 'PO number already exists' });
      return;
    }

    const id = uuidv4();

    const result = await query(
      `INSERT INTO purchase_orders (id, po_number, vendor_id, department, description, amount, created_by, expected_completion_date, reporting_period, status, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'DRAFT', NOW(), NOW())
       RETURNING *`,
      [id, po_number, vendor_id, department, description, amount, req.user.id, expected_completion_date, reporting_period]
    );

    // Log audit event
    await AuditLogService.log({
      user_id: req.user.id,
      user_email: req.user.email,
      action: 'PO_CREATED',
      resource_type: 'PURCHASE_ORDER',
      resource_id: id,
      changes: { po_number, department, amount },
      ip_address: req.clientIp,
      user_agent: req.userAgent,
      status: 'SUCCESS',
    });

    logger.info(`Purchase order created: ${po_number} by ${req.user.email}`);

    res.status(201).json({ purchase_order: result.rows[0] });
  })
);

export default router;
