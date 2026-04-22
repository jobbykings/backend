const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const KYCField = sequelize.define('KYCField', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    customer_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'kyc_customers',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    },
    field_name: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: 'Name of the KYC field (e.g., first_name, email_address)',
    },
    field_type: {
      type: DataTypes.ENUM('string', 'number', 'date', 'binary', 'boolean'),
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: false,
      comment: 'Human readable description of the field',
    },
    status: {
      type: DataTypes.ENUM('ACCEPTED', 'PROCESSING', 'REJECTED', 'REQUIRED'),
      allowNull: false,
      defaultValue: 'REQUIRED',
    },
    value: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Field value (for string/number/date/boolean types)',
    },
    file_path: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Path to uploaded file (for binary types)',
    },
    is_optional: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    choices: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Array of valid choices for select fields',
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  }, {
    tableName: 'kyc_fields',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      {
        fields: ['customer_id'],
      },
      {
        fields: ['field_name'],
      },
      {
        unique: true,
        fields: ['customer_id', 'field_name'],
      },
    ],
  });

  return KYCField;
};
