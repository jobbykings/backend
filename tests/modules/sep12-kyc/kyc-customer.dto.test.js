const KYCCustomerDTO = require('../../../src/modules/sep12-kyc/dto/kyc-customer.dto');

describe('KYCCustomerDTO', () => {
  describe('toCustomerResponse', () => {
    it('should create a basic customer response', () => {
      const customer = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        status: 'ACCEPTED',
        message: 'Customer approved'
      };

      const response = KYCCustomerDTO.toCustomerResponse(customer);

      expect(response).toEqual({
        id: '123e4567-e89b-12d3-a456-426614174000',
        status: 'ACCEPTED',
        message: 'Customer approved'
      });
    });

    it('should include provided fields when customer has fields', () => {
      const customer = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        status: 'ACCEPTED'
      };

      const fields = [
        {
          field_name: 'first_name',
          description: "The customer's first name",
          field_type: 'string',
          status: 'ACCEPTED'
        },
        {
          field_name: 'last_name',
          description: "The customer's last name",
          field_type: 'string',
          status: 'ACCEPTED'
        }
      ];

      const response = KYCCustomerDTO.toCustomerResponse(customer, fields);

      expect(response.provided_fields).toBeDefined();
      expect(response.provided_fields.first_name).toEqual({
        description: "The customer's first name",
        type: 'string',
        status: 'ACCEPTED'
      });
    });

    it('should include required fields when customer needs more info', () => {
      const customer = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        status: 'NEEDS_INFO'
      };

      const fields = [
        {
          field_name: 'first_name',
          description: "The customer's first name",
          field_type: 'string',
          status: 'ACCEPTED'
        },
        {
          field_name: 'mobile_number',
          description: "Phone number of the customer",
          field_type: 'string',
          status: 'REQUIRED',
          is_optional: true
        }
      ];

      const response = KYCCustomerDTO.toCustomerResponse(customer, fields);

      expect(response.fields).toBeDefined();
      expect(response.fields.mobile_number).toEqual({
        description: "Phone number of the customer",
        type: 'string',
        optional: true
      });
      expect(response.provided_fields).toBeDefined();
      expect(response.provided_fields.first_name).toBeDefined();
    });
  });

  describe('toFieldsResponse', () => {
    it('should create a fields response for new customers', () => {
      const fields = [
        {
          field_name: 'first_name',
          description: "The customer's first name",
          field_type: 'string',
          is_optional: false,
          choices: null
        },
        {
          field_name: 'id_type',
          description: "Government issued ID type",
          field_type: 'string',
          is_optional: false,
          choices: ['Passport', 'Drivers License', 'State ID']
        }
      ];

      const response = KYCCustomerDTO.toFieldsResponse(fields);

      expect(response.status).toBe('NEEDS_INFO');
      expect(response.fields).toBeDefined();
      expect(response.fields.first_name).toEqual({
        description: "The customer's first name",
        type: 'string',
        optional: false
      });
      expect(response.fields.id_type).toEqual({
        description: "Government issued ID type",
        type: 'string',
        optional: false,
        choices: ['Passport', 'Drivers License', 'State ID']
      });
    });
  });

  describe('validateCustomerRequest', () => {
    it('should pass validation for valid request', () => {
      const data = {
        account: 'GBORFR3GDNVZ5PLUTBDQHKGWVD26CQUHORO2T3SDQ2JPLGLUJCCA5GK6',
        memo: '12345',
        memo_type: 'id'
      };

      const errors = KYCCustomerDTO.validateCustomerRequest(data);
      expect(errors).toHaveLength(0);
    });

    it('should fail validation when neither account nor id is provided', () => {
      const data = {};

      const errors = KYCCustomerDTO.validateCustomerRequest(data);
      expect(errors).toContain('Either account or id is required');
    });

    it('should fail validation for invalid Stellar account format', () => {
      const data = {
        account: 'invalid-account'
      };

      const errors = KYCCustomerDTO.validateCustomerRequest(data);
      expect(errors).toContain('Invalid Stellar account format');
    });

    it('should fail validation for invalid memo_type', () => {
      const data = {
        account: 'GBORFR3GDNVZ5PLUTBDQHKGWVD26CQUHORO2T3SDQ2JPLGLUJCCA5GK6',
        memo: '12345',
        memo_type: 'invalid'
      };

      const errors = KYCCustomerDTO.validateCustomerRequest(data);
      expect(errors).toContain('Invalid memo_type. Must be text, id, or hash');
    });

    it('should validate different account types', () => {
      // Test G... account
      const gAccount = {
        account: 'GBORFR3GDNVZ5PLUTBDQHKGWVD26CQUHORO2T3SDQ2JPLGLUJCCA5GK6'
      };
      let errors = KYCCustomerDTO.validateCustomerRequest(gAccount);
      expect(errors).toHaveLength(0);

      // Test M... account (muxed)
      const mAccount = {
        account: 'MAAAAAAAAAAAAAB7BQ2L7E5M7MNYY7FQWEA4LUBDTQFDJ32KBOHEDZCQHD3ADFZM6GAAAAABLGU'
      };
      errors = KYCCustomerDTO.validateCustomerRequest(mAccount);
      expect(errors).toHaveLength(0);

      // Test C... account (contract)
      const cAccount = {
        account: 'CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACAAA'
      };
      errors = KYCCustomerDTO.validateCustomerRequest(cAccount);
      expect(errors).toHaveLength(0);
    });
  });
});
