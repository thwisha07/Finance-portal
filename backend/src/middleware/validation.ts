import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';

/**
 * Validate request body against schema
 */
export const validate = (schema: Joi.ObjectSchema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      res.status(400).json({
        error: 'Validation failed',
        details: error.details.map((d) => ({
          field: d.path.join('.'),
          message: d.message,
        })),
      });
      return;
    }

    req.body = value;
    next();
  };
};

/**
 * Validate request params against schema
 */
export const validateParams = (schema: Joi.ObjectSchema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const { error, value } = schema.validate(req.params, {
      abortEarly: false,
    });

    if (error) {
      res.status(400).json({
        error: 'Invalid parameters',
        details: error.details.map((d) => ({
          field: d.path.join('.'),
          message: d.message,
        })),
      });
      return;
    }

    req.params = value;
    next();
  };
};

/**
 * Common validation schemas
 */
export const schemas = {
  email: Joi.string().email().required(),
  password: Joi.string().min(8).required(),
  invoiceNumber: Joi.string()
    .regex(/^[A-Z0-9]{5,20}$/)
    .required(),
  amount: Joi.number().positive().precision(2).required(),
  uuid: Joi.string().uuid().required(),
  poNumber: Joi.string()
    .regex(/^PO-\d{4}-\d{3}$/)
    .required(),
  grReference: Joi.string()
    .regex(/^GR-\d{4}-\d{4}$/)
    .required(),
};
