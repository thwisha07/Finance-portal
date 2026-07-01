import { Router, Request, Response } from 'express';
import Joi from 'joi';
import { InvoiceService } from '../services/invoiceService';
import { verify JWT, requireFinanceRole, captureRequestMetadata } from '../middleware/auth';
import { validate, schemas, validateParams } from '../middleware/validation';
import { asyncHandler } from '../middleware/errorHandler';
import logger from '../config/logger';

const router = Router();

/**
 * Get invoices
 */
router.get(
  '/',
  verifyJWT,
  captureRequestMetadata,
  asyncHandler(async (req: Request, res: Response) => {
    const { status, po_id, vendor_id, limit, offset } = req.query;

    const invoices = await InvoiceService.getInvoices({
      status: status as string,
      po_id: po_id as string,
      vendor_id: vendor_id as string,
      limit: parseInt(limit as string) || 50,
      offset: parseInt(offset as string) || 0,
    });

    res.status(200).json({ invoices, count: invoices.length });
  })
);

/**
 * Record invoice
 */
router.post(
  '/',
  verifyJWT,
  requireFinanceRole,
  captureRequestMetadata,
  validate(
    Joi.object({
      invoice_number: schemas.invoiceNumber,
      po_id: schemas.uuid,
      vendor_id: schemas.uuid,
      amount: schemas.amount,
    })
  ),
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const { invoice_number, po_id, vendor_id, amount } = req.body;

    const invoice = await InvoiceService.recordInvoice(
      invoice_number,
      po_id,
      vendor_id,
      amount,
      req.user.id,
      req.user.email,
      req.clientIp,
      req.userAgent
    );

    res.status(201).json({ invoice });
  })
);

/**
 * Approve invoice
 */
router.post(
  '/:id/approve',
  verifyJWT,
  requireFinanceRole,
  captureRequestMetadata,
  validateParams(
    Joi.object({
      id: schemas.uuid,
    })
  ),
  validate(
    Joi.object({
      approval_notes: Joi.string().max(500).optional(),
    })
  ),
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const { id } = req.params;
    const { approval_notes } = req.body;

    const invoice = await InvoiceService.approveInvoice(
      id,
      req.user.id,
      req.user.email,
      approval_notes,
      req.clientIp,
      req.userAgent
    );

    res.status(200).json({ invoice });
  })
);

/**
 * Mark invoice as paid
 */
router.post(
  '/:id/mark-paid',
  verifyJWT,
  requireFinanceRole,
  captureRequestMetadata,
  validateParams(
    Joi.object({
      id: schemas.uuid,
    })
  ),
  validate(
    Joi.object({
      payment_method: Joi.string().valid('BANK_TRANSFER', 'CHEQUE', 'CARD').required(),
      reference: Joi.string().max(100).required(),
    })
  ),
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const { id } = req.params;
    const { payment_method, reference } = req.body;

    await InvoiceService.markInvoicePaid(
      id,
      payment_method,
      reference,
      req.user.id,
      req.user.email,
      req.clientIp,
      req.userAgent
    );

    res.status(200).json({ message: 'Invoice marked as paid' });
  })
);

export default router;
