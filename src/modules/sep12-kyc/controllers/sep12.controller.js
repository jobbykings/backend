const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const SEP12Service = require('../services/sep12.service');
const KYCCustomerDTO = require('../dto/kyc-customer.dto');

class SEP12Controller {
  constructor(dbManager) {
    this.sep12Service = new SEP12Service(dbManager);
    this.initializeFileUpload();
  }

  initializeFileUpload() {
    // Configure multer for file uploads
    const storage = multer.diskStorage({
      destination: async (req, file, cb) => {
        const uploadDir = path.join(process.cwd(), 'uploads', 'kyc');
        try {
          await fs.mkdir(uploadDir, { recursive: true });
          cb(null, uploadDir);
        } catch (error) {
          cb(error);
        }
      },
      filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
      }
    });

    this.upload = multer({
      storage: storage,
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit
      },
      fileFilter: (req, file, cb) => {
        // Accept common image and document formats
        const allowedTypes = [
          'image/jpeg',
          'image/png',
          'image/gif',
          'application/pdf',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        ];
        
        if (allowedTypes.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(new Error('Invalid file type. Only images and PDFs are allowed.'), false);
        }
      }
    });
  }

  // GET /customer - Get customer status and required fields
  async getCustomer(req, res) {
    try {
      const { account, memo, memo_type, type } = req.query;
      
      // Validate request
      const validationErrors = KYCCustomerDTO.validateCustomerRequest({ account, memo, memo_type });
      if (validationErrors.length > 0) {
        return res.status(400).json({
          error: 'Validation failed',
          message: validationErrors.join(', ')
        });
      }

      const result = await this.sep12Service.getCustomerStatus(account, memo, memo_type, type);
      
      res.json(result);
    } catch (error) {
      console.error('GET /customer error:', error.message);
      res.status(500).json({
        error: 'Failed to get customer status',
        message: error.message
      });
    }
  }

  // PUT /customer - Update customer information
  async updateCustomer(req, res) {
    try {
      const customerData = req.body;
      
      // Validate request
      const validationErrors = KYCCustomerDTO.validateCustomerRequest(customerData);
      if (validationErrors.length > 0) {
        return res.status(400).json({
          error: 'Validation failed',
          message: validationErrors.join(', ')
        });
      }

      const result = await this.sep12Service.updateCustomer(customerData);
      
      res.json(result);
    } catch (error) {
      console.error('PUT /customer error:', error.message);
      res.status(500).json({
        error: 'Failed to update customer',
        message: error.message
      });
    }
  }

  // DELETE /customer - Delete customer information
  async deleteCustomer(req, res) {
    try {
      const { account, memo } = req.query;
      
      if (!account) {
        return res.status(400).json({
          error: 'Validation failed',
          message: 'Account parameter is required'
        });
      }

      const result = await this.sep12Service.deleteCustomer(account, memo);
      
      res.json(result);
    } catch (error) {
      console.error('DELETE /customer error:', error.message);
      res.status(500).json({
        error: 'Failed to delete customer',
        message: error.message
      });
    }
  }

  // POST /customer/files - Upload customer files
  uploadCustomerFiles() {
    return this.upload.array('files', 5); // Allow up to 5 files
  }

  async handleFileUpload(req, res) {
    try {
      const { customer_id, field_name } = req.body;
      
      if (!customer_id || !field_name) {
        return res.status(400).json({
          error: 'Validation failed',
          message: 'customer_id and field_name are required'
        });
      }

      if (!req.files || req.files.length === 0) {
        return res.status(400).json({
          error: 'Validation failed',
          message: 'No files uploaded'
        });
      }

      const uploadedFiles = [];
      
      for (const file of req.files) {
        const result = await this.sep12Service.uploadCustomerFile(
          customer_id,
          field_name,
          file.buffer,
          file.originalname
        );
        
        uploadedFiles.push({
          field_name,
          filename: file.originalname,
          path: result.filePath
        });
      }

      res.json({
        success: true,
        message: 'Files uploaded successfully',
        files: uploadedFiles
      });
    } catch (error) {
      console.error('File upload error:', error.message);
      res.status(500).json({
        error: 'Failed to upload files',
        message: error.message
      });
    }
  }

  // GET /customer/files/:field_name - Get customer file
  async getCustomerFile(req, res) {
    try {
      const { customer_id, field_name } = req.params;
      
      // Get file info from database
      const fileInfo = await this.sep12Service.dbManager.query(
        'SELECT file_path FROM kyc_fields WHERE customer_id = $1 AND field_name = $2 AND file_path IS NOT NULL',
        [customer_id, field_name]
      );

      if (fileInfo.length === 0) {
        return res.status(404).json({
          error: 'File not found'
        });
      }

      const filePath = fileInfo[0].file_path;
      
      // Check if file exists
      try {
        await fs.access(filePath);
      } catch (error) {
        return res.status(404).json({
          error: 'File not found on disk'
        });
      }

      // Send file
      res.sendFile(path.resolve(filePath));
    } catch (error) {
      console.error('Get file error:', error.message);
      res.status(500).json({
        error: 'Failed to get file',
        message: error.message
      });
    }
  }

  // Middleware for parsing different content types
  parseRequestBody(req, res, next) {
    const contentType = req.headers['content-type'];
    
    if (contentType && contentType.includes('multipart/form-data')) {
      // Already handled by multer
      next();
    } else if (contentType && contentType.includes('application/x-www-form-urlencoded')) {
      // Parse URL encoded data
      const data = {};
      for (const [key, value] of Object.entries(req.body)) {
        data[key] = value;
      }
      req.body = data;
      next();
    } else if (contentType && contentType.includes('application/json')) {
      // JSON is already parsed by Express
      next();
    } else {
      next();
    }
  }

  // Register all SEP-12 routes
  registerRoutes(app) {
    // Apply request parsing middleware
    app.use('/kyc', this.parseRequestBody.bind(this));

    // Customer endpoints
    app.get('/kyc/customer', this.getCustomer.bind(this));
    app.put('/kyc/customer', this.updateCustomer.bind(this));
    app.delete('/kyc/customer', this.deleteCustomer.bind(this));

    // File endpoints
    app.post('/kyc/customer/files', 
      this.uploadCustomerFiles(), 
      this.handleFileUpload.bind(this)
    );
    app.get('/kyc/customer/files/:customer_id/:field_name', 
      this.getCustomerFile.bind(this)
    );

    // Health check for SEP-12 module
    app.get('/kyc/health', (req, res) => {
      res.json({
        status: 'healthy',
        module: 'SEP-12 KYC',
        timestamp: new Date().toISOString()
      });
    });
  }
}

module.exports = SEP12Controller;
