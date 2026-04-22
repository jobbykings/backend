const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const KYCCustomer = sequelize.define('KYCCustomer', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    account: {
      type: DataTypes.STRING(56),
      allowNull: false,
      comment: 'Stellar account address (G..., M..., or C...)',
    },
    memo: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Client-generated memo to uniquely identify customer',
    },
    memo_type: {
      type: DataTypes.ENUM('text', 'id', 'hash'),
      allowNull: true,
      defaultValue: 'id',
    },
    type: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Customer type (e.g., sep31-sender, counterparty_organization)',
    },
    status: {
      type: DataTypes.ENUM('NEEDS_INFO', 'PROCESSING', 'ACCEPTED', 'REJECTED'),
      allowNull: false,
      defaultValue: 'NEEDS_INFO',
    },
    message: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Human readable message about KYC status',
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
    tableName: 'kyc_customers',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      {
        unique: true,
        fields: ['account', 'memo'],
      },
      {
        fields: ['status'],
      },
    ],
  });

  return KYCCustomer;
};
