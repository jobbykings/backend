class KYCCustomerDTO {
  static toCustomerResponse(customer, fields = []) {
    const response = {
      id: customer.id,
      status: customer.status,
    };

    if (customer.message) {
      response.message = customer.message;
    }

    // Add provided fields if customer has any
    if (fields.length > 0) {
      response.provided_fields = {};
      response.fields = {};

      fields.forEach(field => {
        const fieldData = {
          description: field.description,
          type: field.field_type,
        };

        if (field.status === 'ACCEPTED' || field.status === 'PROCESSING') {
          fieldData.status = field.status;
          response.provided_fields[field.field_name] = fieldData;
        } else if (field.status === 'REQUIRED') {
          fieldData.optional = field.is_optional;
          if (field.choices) {
            fieldData.choices = field.choices;
          }
          response.fields[field.field_name] = fieldData;
        }
      });
    }

    return response;
  }

  static toFieldsResponse(fields) {
    const response = {
      status: 'NEEDS_INFO',
      fields: {},
    };

    fields.forEach(field => {
      const fieldData = {
        description: field.description,
        type: field.field_type,
        optional: field.is_optional,
      };

      if (field.choices) {
        fieldData.choices = field.choices;
      }

      response.fields[field.field_name] = fieldData;
    });

    return response;
  }

  static validateCustomerRequest(data) {
    const errors = [];

    if (!data.account && !data.id) {
      errors.push('Either account or id is required');
    }

    if (data.account && !data.account.match(/^(G|M|C)[A-Z0-9]{55}$/)) {
      errors.push('Invalid Stellar account format');
    }

    if (data.memo && data.memo_type && !['text', 'id', 'hash'].includes(data.memo_type)) {
      errors.push('Invalid memo_type. Must be text, id, or hash');
    }

    return errors;
  }
}

module.exports = KYCCustomerDTO;
