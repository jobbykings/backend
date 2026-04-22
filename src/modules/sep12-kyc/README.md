# SEP-12 KYC Middleware Module

This module implements the [Stellar Ecosystem Proposal 12 (SEP-12)](https://github.com/stellar/stellar-protocol/blob/master/ecosystem/sep-0012.md) for KYC (Know Your Customer) compliance in the Vesting Vault backend.

## Overview

SEP-12 provides a standardized API for anchors to collect KYC information from customers. This module handles:

- Parsing KYC fields requested by wallets
- Mapping KYC fields to internal compliance database schema
- Managing customer status and verification workflows
- File upload support for document verification
- Support for different customer types (individual, organization)

## Features

- **SEP-12 Compliant**: Full implementation of SEP-12 specification
- **Dynamic Field Management**: Configurable KYC fields based on customer type
- **File Upload Support**: Secure handling of identity documents
- **Multi-Database Support**: Compatible with PostgreSQL and MySQL
- **Comprehensive Validation**: Input validation and error handling
- **Test Coverage**: Unit and integration tests

## API Endpoints

### Customer Management

- `GET /kyc/customer` - Get customer status and required fields
- `PUT /kyc/customer` - Update customer information
- `DELETE /kyc/customer` - Delete customer information

### File Management

- `POST /kyc/customer/files` - Upload customer documents
- `GET /kyc/customer/files/:customer_id/:field_name` - Get customer file

### Health Check

- `GET /kyc/health` - Module health status

## Customer Types

### Individual Customers (sep31-sender)
Required fields:
- Personal information (first_name, last_name, email_address)
- Date of birth
- Address information
- Government ID (type, number, expiration, photos)

### Organization Customers (counterparty_organization)
Required fields:
- Organization details (name, type, registration)
- Incorporation information
- Contact person information

## Database Schema

### kyc_customers
Stores customer information and KYC status.

### kyc_fields
Stores dynamic field requirements and submitted values.

## Usage Example

### Get Required Fields
```bash
curl "http://localhost:3000/kyc/customer?account=GBORFR3GDNVZ5PLUTBDQHKGWVD26CQUHORO2T3SDQ2JPLGLUJCCA5GK6&type=sep31-sender"
```

### Submit Customer Information
```bash
curl -X PUT http://localhost:3000/kyc/customer \
  -H "Content-Type: application/json" \
  -d '{
    "account": "GBORFR3GDNVZ5PLUTBDQHKGWVD26CQUHORO2T3SDQ2JPLGLUJCCA5GK6",
    "type": "sep31-sender",
    "first_name": "John",
    "last_name": "Doe",
    "email_address": "john.doe@example.com",
    "birth_date": "1990-01-01",
    "address": "123 Main St",
    "city": "New York",
    "state_province": "NY",
    "country": "USA",
    "postal_code": "10001",
    "id_type": "Passport",
    "id_number": "P123456789",
    "id_expiration_date": "2025-01-01"
  }'
```

### Upload Document
```bash
curl -X POST http://localhost:3000/kyc/customer/files \
  -F "customer_id=123e4567-e89b-12d3-a456-426614174000" \
  -F "field_name=photo_id_front" \
  -F "files=@passport_front.jpg"
```

## Configuration

The module uses the following environment variables:

- `PORT` - Server port (default: 3000)
- Database configuration inherited from main application

## Testing

Run tests with:
```bash
npm test
```

Run specific SEP-12 tests:
```bash
npm test -- --testPathPattern=sep12
```

## Security Considerations

- File uploads are limited to 10MB
- Only specific file types are allowed (images, PDFs, documents)
- All input is validated according to SEP-12 specifications
- Customer data is stored with proper database constraints

## Error Handling

The module returns appropriate HTTP status codes:

- `200` - Success
- `400` - Validation error
- `404` - Resource not found
- `500` - Internal server error

Error responses follow the format:
```json
{
  "error": "Error type",
  "message": "Detailed error message"
}
```

## Dependencies

- `multer` - File upload handling
- `uuid` - UUID generation
- Express.js - Web framework
- Database manager from main application

## Integration

The module is automatically initialized in the main application (`index.js`) and registers its routes under the `/kyc` prefix.

## Migration

Run the database migration to create the required tables:
```sql
-- Run src/modules/sep12-kyc/migrations/001_create_kyc_tables.sql
```

## Compliance

This implementation follows the SEP-12 specification and supports:

- Multiple content types (multipart/form-data, application/json, application/x-www-form-urlencoded)
- Stellar account formats (G..., M..., C...)
- Customer status management (NEEDS_INFO, PROCESSING, ACCEPTED, REJECTED)
- Field validation and choices
- File upload for binary fields
