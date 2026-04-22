const SEP12Fields = require('../../../src/modules/sep12-kyc/utils/sep12-fields');

describe('SEP12Fields', () => {
  describe('getStandardFields', () => {
    it('should return all standard KYC fields', () => {
      const fields = SEP12Fields.getStandardFields();
      
      expect(fields).toHaveProperty('first_name');
      expect(fields).toHaveProperty('last_name');
      expect(fields).toHaveProperty('email_address');
      expect(fields).toHaveProperty('id_type');
      expect(fields).toHaveProperty('photo_id_front');
      
      expect(fields.first_name).toEqual({
        description: "The customer's first name",
        type: "string",
        optional: false,
      });
    });
  });

  describe('getFieldsByCustomerType', () => {
    it('should return appropriate fields for sep31-sender type', () => {
      const fields = SEP12Fields.getFieldsByCustomerType('sep31-sender');
      
      expect(fields).toHaveProperty('first_name');
      expect(fields).toHaveProperty('last_name');
      expect(fields).toHaveProperty('email_address');
      expect(fields).toHaveProperty('birth_date');
      expect(fields).toHaveProperty('photo_id_front');
      
      // Should not include organization fields
      expect(fields).not.toHaveProperty('organization_name');
      expect(fields).not.toHaveProperty('registration_number');
    });

    it('should return appropriate fields for counterparty_organization type', () => {
      const fields = SEP12Fields.getFieldsByCustomerType('counterparty_organization');
      
      expect(fields).toHaveProperty('organization_name');
      expect(fields).toHaveProperty('organization_type');
      expect(fields).toHaveProperty('registration_number');
      expect(fields).toHaveProperty('first_name'); // Contact person
      expect(fields).toHaveProperty('last_name');  // Contact person
      
      // Should not include personal ID fields for organizations
      expect(fields).not.toHaveProperty('birth_date');
      expect(fields).not.toHaveProperty('photo_id_front');
    });

    it('should return default fields for unknown type', () => {
      const fields = SEP12Fields.getFieldsByCustomerType('unknown_type');
      
      expect(fields).toHaveProperty('first_name');
      expect(fields).toHaveProperty('last_name');
      expect(fields).toHaveProperty('email_address');
      expect(fields).toHaveProperty('photo_id_front');
    });
  });

  describe('validateField', () => {
    it('should validate string fields correctly', () => {
      const errors = SEP12Fields.validateField('first_name', 'John', 'string');
      expect(errors).toHaveLength(0);
    });

    it('should reject empty string fields', () => {
      const errors = SEP12Fields.validateField('first_name', '', 'string');
      expect(errors).toContain('first_name cannot be empty');
    });

    it('should reject non-string values for string fields', () => {
      const errors = SEP12Fields.validateField('first_name', 123, 'string');
      expect(errors).toContain('first_name must be a string');
    });

    it('should validate number fields correctly', () => {
      const errors = SEP12Fields.validateField('age', 25, 'number');
      expect(errors).toHaveLength(0);
    });

    it('should reject non-number values for number fields', () => {
      const errors = SEP12Fields.validateField('age', 'twenty-five', 'number');
      expect(errors).toContain('age must be a number');
    });

    it('should validate date fields correctly', () => {
      const errors = SEP12Fields.validateField('birth_date', '1990-01-01', 'date');
      expect(errors).toHaveLength(0);
    });

    it('should reject invalid date fields', () => {
      const errors = SEP12Fields.validateField('birth_date', 'invalid-date', 'date');
      expect(errors).toContain('birth_date must be a valid date');
    });

    it('should validate boolean fields correctly', () => {
      const errors = SEP12Fields.validateField('is_verified', true, 'boolean');
      expect(errors).toHaveLength(0);
    });

    it('should reject non-boolean values for boolean fields', () => {
      const errors = SEP12Fields.validateField('is_verified', 'true', 'boolean');
      expect(errors).toContain('is_verified must be a boolean');
    });
  });
});
