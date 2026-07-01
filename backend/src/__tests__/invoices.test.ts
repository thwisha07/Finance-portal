import { InvoiceService } from '../services/invoiceService';
import { query } from '../config/database';

jest.mock('../config/database');
jest.mock('../services/auditLogService');

describe('InvoiceService', () => {
  describe('recordInvoice', () => {
    it('should throw error if PO not found', async () => {
      (query as jest.Mock).mockResolvedValueOnce({ rows: [] });

      await expect(
        InvoiceService.recordInvoice(
          'INV-001',
          'invalid-po-id',
          'vendor-id',
          5000,
          'user-id',
          'user@springbok.com'
        )
      ).rejects.toThrow('Purchase order not found');
    });

    it('should throw error if amount exceeds 15% variance', async () => {
      (query as jest.Mock).mockResolvedValueOnce({
        rows: [{ amount: 10000 }],
      });

      await expect(
        InvoiceService.recordInvoice(
          'INV-001',
          'po-id',
          'vendor-id',
          15000, // 50% more than PO
          'user-id',
          'user@springbok.com'
        )
      ).rejects.toThrow('exceeds PO value by more than 15%');
    });

    it('should throw error if invoice number already exists', async () => {
      (query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ amount: 10000 }] }) // PO lookup
        .mockResolvedValueOnce({ rows: [{ id: 'existing' }] }); // Duplicate check

      await expect(
        InvoiceService.recordInvoice(
          'INV-001',
          'po-id',
          'vendor-id',
          5000,
          'user-id',
          'user@springbok.com'
        )
      ).rejects.toThrow('Invoice number already exists');
    });
  });

  describe('approveInvoice', () => {
    it('should throw error if invoice not found', async () => {
      (query as jest.Mock).mockResolvedValueOnce({ rows: [] });

      await expect(
        InvoiceService.approveInvoice(
          'invalid-id',
          'user-id',
          'user@springbok.com'
        )
      ).rejects.toThrow('Invoice not found');
    });
  });
});
