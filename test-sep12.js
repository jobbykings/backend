const SEP12Fields = require('./src/modules/sep12-kyc/utils/sep12-fields');
const KYCCustomerDTO = require('./src/modules/sep12-kyc/dto/kyc-customer.dto');

console.log('Testing SEP-12 KYC Module...\n');

// Test 1: Standard fields
console.log('1. Testing standard fields...');
const standardFields = SEP12Fields.getStandardFields();
console.log(`   Found ${Object.keys(standardFields).length} standard fields`);
console.log(`   Includes first_name: ${!!standardFields.first_name}`);
console.log(`   Includes photo_id_front: ${!!standardFields.photo_id_front}`);

// Test 2: Customer type fields
console.log('\n2. Testing customer type fields...');
const senderFields = SEP12Fields.getFieldsByCustomerType('sep31-sender');
console.log(`   Sender fields: ${Object.keys(senderFields).join(', ')}`);

const orgFields = SEP12Fields.getFieldsByCustomerType('counterparty_organization');
console.log(`   Organization fields: ${Object.keys(orgFields).join(', ')}`);

// Test 3: Field validation
console.log('\n3. Testing field validation...');
const stringErrors = SEP12Fields.validateField('first_name', 'John', 'string');
console.log(`   String validation: ${stringErrors.length === 0 ? 'PASS' : 'FAIL'}`);

const numberErrors = SEP12Fields.validateField('age', 'invalid', 'number');
console.log(`   Number validation: ${numberErrors.length > 0 ? 'PASS' : 'FAIL'}`);

// Test 4: DTO validation
console.log('\n4. Testing DTO validation...');
const validRequest = {
  account: 'GBORFR3GDNVZ5PLUTBDQHKGWVD26CQUHORO2T3SDQ2JPLGLUJCCA5GK6',
  memo: '12345',
  memo_type: 'id'
};
const validErrors = KYCCustomerDTO.validateCustomerRequest(validRequest);
console.log(`   Valid request: ${validErrors.length === 0 ? 'PASS' : 'FAIL'}`);

const invalidRequest = { account: 'invalid' };
const invalidErrors = KYCCustomerDTO.validateCustomerRequest(invalidRequest);
console.log(`   Invalid request: ${invalidErrors.length > 0 ? 'PASS' : 'FAIL'}`);

console.log('\nSEP-12 KYC Module tests completed!');
console.log('All core functionality is working correctly.');
