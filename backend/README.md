# Springbok Finance Portal - Backend API

Production-ready backend for the Springbok Finance Control Portal with JWT authentication, comprehensive input validation, audit logging, and role-based access control.

## Features

- ✅ JWT-based authentication with refresh tokens
- ✅ Role-based access control (RBAC)
- ✅ Comprehensive input validation
- ✅ Immutable audit logging
- ✅ PostgreSQL database with constraints
- ✅ Docker containerization
- ✅ GitHub Actions CI/CD
- ✅ Rate limiting
- ✅ CORS security
- ✅ OpenAPI/Swagger documentation

## Prerequisites

- Node.js 18+
- PostgreSQL 12+
- Docker & Docker Compose (optional)

## Installation

### Local Development

```bash
# Install dependencies
cd backend
npm install

# Create .env file
cp .env.example .env

# Update .env with your settings
nano .env

# Create database and run migrations
npm run db:migrate
npm run db:seed

# Start development server
npm run dev
```

### Docker Setup

```bash
# Build and start all services
docker-compose up -d

# Run migrations in Docker
docker-compose exec backend npm run db:migrate

# Seed database
docker-compose exec backend npm run db:seed
```

## API Endpoints

### Authentication
- `POST /api/auth/login` - Login with email/password
- `POST /api/auth/logout` - Logout
- `POST /api/auth/refresh` - Refresh JWT token

### Purchase Orders
- `GET /api/purchase-orders` - List purchase orders
- `POST /api/purchase-orders` - Create purchase order

### Invoices
- `GET /api/invoices` - List invoices
- `POST /api/invoices` - Record invoice
- `POST /api/invoices/{id}/approve` - Approve invoice
- `POST /api/invoices/{id}/mark-paid` - Mark as paid

See `openapi.yaml` for full API documentation.

## Testing

```bash
# Run all tests
npm test

# Run tests with coverage
npm test -- --coverage

# Watch mode
npm run test:watch

# E2E tests
npm run test:e2e
```

## Linting & Format

```bash
# Lint code
npm run lint

# Fix lint errors
npm run lint:fix

# Format code
npm run format

# Type check
npm run typecheck
```

## Database

### Migrations

```bash
# Run pending migrations
npm run db:migrate

# Reset database (drops all tables)
npm run db:migrate -- reset

# Seed with test data
npm run db:seed
```

### Schema

The database includes the following tables:

- `users` - Application users with roles
- `vendors` - Supplier information
- `purchase_orders` - PO records with validation
- `goods_receipts` - GR postings
- `invoices` - Invoice records
- `payments` - Payment records
- `audit_logs` - Immutable audit trail

## Security Features

### Authentication
- Passwords hashed with bcryptjs (10 rounds)
- JWT tokens with 30-minute expiry
- Refresh tokens with 7-day expiry
- Session tracking

### Authorization
- Role-based access control (RBAC)
- Department-level isolation
- Resource ownership checks
- Conflict of interest prevention (no self-approvals)

### Input Validation
- Email format validation
- Invoice number format (5-20 alphanumeric)
- Amount precision (2 decimal places)
- PO number format (PO-YYYY-###)
- GR reference format (GR-YYYY-####)
- Date bounds checking

### Data Protection
- SQL injection prevention (parameterized queries)
- XSS prevention (data validation)
- CSRF protection ready
- Rate limiting (100 requests per 15 minutes)
- CORS configuration
- Helmet.js security headers

### Audit Logging
- Immutable append-only audit log
- User identification
- Action tracking
- Resource changes recorded
- IP address logging
- User agent tracking
- SIEM integration ready

## Environment Variables

See `.env.example` for complete list. Key variables:

```
NODE_ENV=production
PORT=3000
DATABASE_URL=postgresql://user:password@host:5432/dbname
JWT_SECRET=your-secret-key
JWT_REFRESH_SECRET=your-refresh-secret
```

## Production Deployment

### Pre-deployment Checklist

- [ ] All tests passing (npm test)
- [ ] No lint errors (npm run lint)
- [ ] Environment variables configured
- [ ] Database migrations tested
- [ ] SSL/TLS certificate installed
- [ ] Rate limiting configured
- [ ] CORS origins configured
- [ ] Logging aggregation setup
- [ ] Monitoring alerts configured
- [ ] Backup strategy in place

### Docker Build

```bash
# Build production image
docker build -t springbok-finance-backend:latest .

# Push to registry
docker tag springbok-finance-backend:latest your-registry/springbok-backend:latest
docker push your-registry/springbok-backend:latest
```

## Troubleshooting

### Database Connection Errors

```bash
# Check connection string
echo $DATABASE_URL

# Test connection
psql $DATABASE_URL -c "SELECT NOW()"
```

### Port Already in Use

```bash
# Change PORT in .env or:
PORT=3001 npm run dev
```

### Migration Failures

```bash
# Reset and retry
npm run db:reset
```

## Contributing

1. Create feature branch: `git checkout -b feature/description`
2. Make changes and test: `npm test`
3. Commit with message: `git commit -am 'Add feature'`
4. Push branch: `git push origin feature/description`
5. Open Pull Request

## License

MIT
