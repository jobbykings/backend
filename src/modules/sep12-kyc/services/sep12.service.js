const { v4: uuidv4 } = require('uuid');
const SEP12Fields = require('../utils/sep12-fields');
const KYCCustomerDTO = require('../dto/kyc-customer.dto');

class SEP12Service {
  constructor(dbManager) {
    this.dbManager = dbManager;
    this.models = {};
  }

  async initialize() {
    // Initialize models if using Sequelize
    // For now, we'll use the existing database manager
  }

  async getCustomerStatus(account, memo = null, memoType = null, type = null) {
    try {
      // Check if customer exists
      let customer;
      if (memo) {
        customer = await this.dbManager.query(
          'SELECT * FROM kyc_customers WHERE account = $1 AND memo = $2',
          [account, memo]
        );
      } else {
        customer = await this.dbManager.query(
          'SELECT * FROM kyc_customers WHERE account = $1 AND memo IS NULL',
          [account]
        );
      }

      if (customer.length === 0) {
        // Return required fields for new customer
        const requiredFields = this.getRequiredFieldsForType(type);
        return KYCCustomerDTO.toFieldsResponse(requiredFields);
      }

      // Get customer's fields
      const fields = await this.dbManager.query(
        'SELECT * FROM kyc_fields WHERE customer_id = $1',
        [customer[0].id]
      );

      return KYCCustomerDTO.toCustomerResponse(customer[0], fields);
    } catch (error) {
      throw new Error(`Failed to get customer status: ${error.message}`);
    }
  }

  async updateCustomer(customerData) {
    try {
      const { id, account, memo, memoType, type, ...fields } = customerData;
      
      let customer;
      
      if (id) {
        // Update existing customer
        customer = await this.dbManager.query(
          'SELECT * FROM kyc_customers WHERE id = $1',
          [id]
        );
        
        if (customer.length === 0) {
          throw new Error('Customer not found');
        }
        
        customer = customer[0];
      } else {
        // Create new customer or find existing
        const existingCustomer = await this.findOrCreateCustomer(account, memo, memoType, type);
        customer = existingCustomer;
      }

      // Process and validate fields
      const processedFields = await this.processCustomerFields(customer.id, fields, type);
      
      // Update customer status based on field completion
      const newStatus = this.determineCustomerStatus(processedFields);
      await this.updateCustomerStatus(customer.id, newStatus);

      // Return updated customer status
      return await this.getCustomerStatus(account, memo, memoType, type);
    } catch (error) {
      throw new Error(`Failed to update customer: ${error.message}`);
    }
  }

  async deleteCustomer(account, memo = null) {
    try {
      const customer = await this.findCustomer(account, memo);
      
      if (!customer) {
        throw new Error('Customer not found');
      }

      // Delete customer and associated fields (cascade delete should handle this)
      await this.dbManager.query(
        'DELETE FROM kyc_customers WHERE id = $1',
        [customer.id]
      );

      return { success: true, message: 'Customer deleted successfully' };
    } catch (error) {
      throw new Error(`Failed to delete customer: ${error.message}`);
    }
  }

  async uploadCustomerFile(customerId, fieldName, fileBuffer, originalName) {
    try {
      // For now, store file info in database
      // In production, you'd store to cloud storage (S3, etc.)
      const filePath = `uploads/kyc/${customerId}/${fieldName}_${Date.now()}_${originalName}`;
      
      // Update or create field record
      await this.dbManager.query(`
        INSERT INTO kyc_fields (customer_id, field_name, field_type, description, status, file_path, is_optional)
        VALUES ($1, $2, 'binary', $3, 'PROCESSING', $4, false)
        ON CONFLICT (customer_id, field_name) 
        DO UPDATE SET 
          file_path = EXCLUDED.file_path,
          status = EXCLUDED.status,
          updated_at = CURRENT_TIMESTAMP
      `, [customerId, fieldName, `Uploaded file: ${originalName}`, filePath]);

      return { success: true, filePath };
    } catch (error) {
      throw new Error(`Failed to upload file: ${error.message}`);
    }
  }

  async findOrCreateCustomer(account, memo, memoType, type) {
    try {
      // Try to find existing customer
      let existingCustomer;
      if (memo) {
        existingCustomer = await this.dbManager.query(
          'SELECT * FROM kyc_customers WHERE account = $1 AND memo = $2',
          [account, memo]
        );
      } else {
        existingCustomer = await this.dbManager.query(
          'SELECT * FROM kyc_customers WHERE account = $1 AND memo IS NULL',
          [account]
        );
      }

      if (existingCustomer.length > 0) {
        return existingCustomer[0];
      }

      // Create new customer
      const newCustomer = await this.dbManager.query(`
        INSERT INTO kyc_customers (account, memo, memo_type, type, status)
        VALUES ($1, $2, $3, $4, 'NEEDS_INFO')
        RETURNING *
      `, [account, memo, memoType, type]);

      // Initialize required fields for this customer type
      await this.initializeRequiredFields(newCustomer[0].id, type);

      return newCustomer[0];
    } catch (error) {
      throw new Error(`Failed to find or create customer: ${error.message}`);
    }
  }

  async findCustomer(account, memo) {
    try {
      let customer;
      if (memo) {
        customer = await this.dbManager.query(
          'SELECT * FROM kyc_customers WHERE account = $1 AND memo = $2',
          [account, memo]
        );
      } else {
        customer = await this.dbManager.query(
          'SELECT * FROM kyc_customers WHERE account = $1 AND memo IS NULL',
          [account]
        );
      }

      return customer.length > 0 ? customer[0] : null;
    } catch (error) {
      throw new Error(`Failed to find customer: ${error.message}`);
    }
  }

  getRequiredFieldsForType(type) {
    const fieldDefinitions = SEP12Fields.getFieldsByCustomerType(type);
    
    return Object.keys(fieldDefinitions).map(fieldName => ({
      field_name: fieldName,
      field_type: fieldDefinitions[fieldName].type,
      description: fieldDefinitions[fieldName].description,
      is_optional: fieldDefinitions[fieldName].optional,
      choices: fieldDefinitions[fieldName].choices || null,
      status: 'REQUIRED',
    }));
  }

  async initializeRequiredFields(customerId, type) {
    try {
      const requiredFields = this.getRequiredFieldsForType(type);
      
      for (const field of requiredFields) {
        await this.dbManager.query(`
          INSERT INTO kyc_fields (customer_id, field_name, field_type, description, is_optional, status, choices)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
        `, [
          customerId,
          field.field_name,
          field.field_type,
          field.description,
          field.is_optional,
          field.status,
          field.choices
        ]);
      }
    } catch (error) {
      throw new Error(`Failed to initialize required fields: ${error.message}`);
    }
  }

  async processCustomerFields(customerId, fields, customerType) {
    try {
      const processedFields = [];
      const fieldDefinitions = SEP12Fields.getFieldsByCustomerType(customerType);

      for (const [fieldName, fieldValue] of Object.entries(fields)) {
        const fieldDef = fieldDefinitions[fieldName];
        if (!fieldDef) {
          continue; // Skip unknown fields
        }

        // Validate field
        const validationErrors = SEP12Fields.validateField(fieldName, fieldValue, fieldDef.type);
        if (validationErrors.length > 0) {
          throw new Error(`Validation failed for ${fieldName}: ${validationErrors.join(', ')}`);
        }

        // Update field in database
        await this.dbManager.query(`
          INSERT INTO kyc_fields (customer_id, field_name, field_type, description, status, value, is_optional)
          VALUES ($1, $2, $3, $4, 'PROCESSING', $5, $6)
          ON CONFLICT (customer_id, field_name) 
          DO UPDATE SET 
            value = EXCLUDED.value,
            status = EXCLUDED.status,
            updated_at = CURRENT_TIMESTAMP
        `, [customerId, fieldName, fieldDef.type, fieldDef.description, fieldValue, fieldDef.optional]);

        processedFields.push({
          field_name: fieldName,
          status: 'PROCESSING',
        });
      }

      return processedFields;
    } catch (error) {
      throw new Error(`Failed to process customer fields: ${error.message}`);
    }
  }

  determineCustomerStatus(fields) {
    const requiredFields = fields.filter(f => !f.is_optional);
    const acceptedFields = fields.filter(f => f.status === 'ACCEPTED');
    const processingFields = fields.filter(f => f.status === 'PROCESSING');

    if (acceptedFields.length === requiredFields.length) {
      return 'ACCEPTED';
    } else if (processingFields.length > 0) {
      return 'PROCESSING';
    } else {
      return 'NEEDS_INFO';
    }
  }

  async updateCustomerStatus(customerId, status, message = null) {
    try {
      await this.dbManager.query(`
        UPDATE kyc_customers 
        SET status = $1, message = $2, updated_at = CURRENT_TIMESTAMP
        WHERE id = $3
      `, [status, message, customerId]);
    } catch (error) {
      throw new Error(`Failed to update customer status: ${error.message}`);
    }
  }
}

module.exports = SEP12Service;
