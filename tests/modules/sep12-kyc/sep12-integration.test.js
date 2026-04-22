const request = require('supertest');
const express = require('express');
const SEP12Module = require('../../../src/modules/sep12-kyc/sep12.module');

// Mock database manager
const mockDbManager = {
  query: jest.fn(),
  getStatus: jest.fn(() => ({ status: 'healthy', uptime: 0 })),
  close: jest.fn()
};

describe('SEP-12 Integration Tests', () => {
  let app;
  let sep12Module;

  beforeAll(async () => {
    app = express();
    app.use(express.json());
    
    sep12Module = new SEP12Module(mockDbManager);
    await sep12Module.initialize();
    sep12Module.registerRoutes(app);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /kyc/customer', () => {
    it('should return required fields for new customer', async () => {
      // Mock database to return no existing customer
      mockDbManager.query.mockResolvedValue([]);

      const response = await request(app)
        .get('/kyc/customer')
        .query({
          account: 'GBORFR3GDNVZ5PLUTBDQHKGWVD26CQUHORO2T3SDQ2JPLGLUJCCA5GK6',
          type: 'sep31-sender'
        });

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('NEEDS_INFO');
      expect(response.body.fields).toBeDefined();
      expect(response.body.fields.first_name).toBeDefined();
      expect(response.body.fields.photo_id_front).toBeDefined();
    });

    it('should return customer status for existing customer', async () => {
      // Mock existing customer
      const mockCustomer = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        status: 'PROCESSING',
        message: 'Processing KYC documents'
      };
      mockDbManager.query
        .mockResolvedValueOnce([mockCustomer]) // Customer query
        .mockResolvedValueOnce([ // Fields query
          {
            field_name: 'first_name',
            description: "The customer's first name",
            field_type: 'string',
            status: 'ACCEPTED'
          },
          {
            field_name: 'photo_id_front',
            description: 'A clear photo of the front of the government issued ID',
            field_type: 'binary',
            status: 'PROCESSING'
          }
        ]);

      const response = await request(app)
        .get('/kyc/customer')
        .query({
          account: 'GBORFR3GDNVZ5PLUTBDQHKGWVD26CQUHORO2T3SDQ2JPLGLUJCCA5GK6',
          memo: '12345'
        });

      expect(response.status).toBe(200);
      expect(response.body.id).toBe('123e4567-e89b-12d3-a456-426614174000');
      expect(response.body.status).toBe('PROCESSING');
      expect(response.body.message).toBe('Processing KYC documents');
      expect(response.body.provided_fields).toBeDefined();
      expect(response.body.provided_fields.first_name.status).toBe('ACCEPTED');
      expect(response.body.provided_fields.photo_id_front.status).toBe('PROCESSING');
    });

    it('should validate request parameters', async () => {
      const response = await request(app)
        .get('/kyc/customer')
        .query({
          account: 'invalid-account'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Validation failed');
      expect(response.body.message).toContain('Invalid Stellar account format');
    });
  });

  describe('PUT /kyc/customer', () => {
    it('should update customer information', async () => {
      // Mock customer creation and field updates
      mockDbManager.query
        .mockResolvedValueOnce([]) // No existing customer
        .mockResolvedValueOnce([{ // New customer created
          id: '123e4567-e89b-12d3-a456-426614174000',
          account: 'GBORFR3GDNVZ5PLUTBDQHKGWVD26CQUHORO2T3SDQ2JPLGLUJCCA5GK6',
          status: 'NEEDS_INFO'
        }])
        .mockResolvedValueOnce([]) // Initialize required fields
        .mockResolvedValueOnce([]) // Process customer fields
        .mockResolvedValueOnce([{ // Get updated customer status
          id: '123e4567-e89b-12d3-a456-426614174000',
          status: 'PROCESSING'
        }])
        .mockResolvedValueOnce([ // Get updated fields
          {
            field_name: 'first_name',
            description: "The customer's first name",
            field_type: 'string',
            status: 'PROCESSING'
          }
        ]);

      const response = await request(app)
        .put('/kyc/customer')
        .send({
          account: 'GBORFR3GDNVZ5PLUTBDQHKGWVD26CQUHORO2T3SDQ2JPLGLUJCCA5GK6',
          type: 'sep31-sender',
          first_name: 'John',
          last_name: 'Doe',
          email_address: 'john.doe@example.com'
        });

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('PROCESSING');
    });

    it('should validate customer data', async () => {
      const response = await request(app)
        .put('/kyc/customer')
        .send({
          account: 'invalid-account',
          first_name: 'John'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Validation failed');
      expect(response.body.message).toContain('Invalid Stellar account format');
    });
  });

  describe('DELETE /kyc/customer', () => {
    it('should delete customer information', async () => {
      // Mock existing customer
      mockDbManager.query
        .mockResolvedValueOnce([{ // Find customer
          id: '123e4567-e89b-12d3-a456-426614174000',
          account: 'GBORFR3GDNVZ5PLUTBDQHKGWVD26CQUHORO2T3SDQ2JPLGLUJCCA5GK6'
        }])
        .mockResolvedValueOnce({}); // Delete customer

      const response = await request(app)
        .delete('/kyc/customer')
        .query({
          account: 'GBORFR3GDNVZ5PLUTBDQHKGWVD26CQUHORO2T3SDQ2JPLGLUJCCA5GK6'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should return error for non-existent customer', async () => {
      // Mock no existing customer
      mockDbManager.query.mockResolvedValue([]);

      const response = await request(app)
        .delete('/kyc/customer')
        .query({
          account: 'GBORFR3GDNVZ5PLUTBDQHKGWVD26CQUHORO2T3SDQ2JPLGLUJCCA5GK6'
        });

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Failed to delete customer');
    });
  });

  describe('GET /kyc/health', () => {
    it('should return health status', async () => {
      const response = await request(app)
        .get('/kyc/health');

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('healthy');
      expect(response.body.module).toBe('SEP-12 KYC');
      expect(response.body.timestamp).toBeDefined();
    });
  });
});
