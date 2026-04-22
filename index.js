const express = require('express');
const cors = require('cors');
require('dotenv').config();
const DatabaseFailoverManager = require('./database-failover');
const SEP12Module = require('./src/modules/sep12-kyc/sep12.module');

const app = express();
const port = process.env.PORT || 3000;

// Initialize database failover manager
const dbManager = new DatabaseFailoverManager();

// Initialize SEP-12 KYC module
const sep12Module = new SEP12Module(dbManager);

// Middleware
app.use(cors());
app.use(express.json());

// Initialize modules and register routes
async function initializeApp() {
  try {
    // Initialize SEP-12 module
    await sep12Module.initialize();
    
    // Register SEP-12 routes
    sep12Module.registerRoutes(app);
    
    console.log('All modules initialized successfully');
  } catch (error) {
    console.error('Failed to initialize modules:', error.message);
    process.exit(1);
  }
}

app.get('/', (req, res) => {
  const dbStatus = dbManager.getStatus();
  res.json({ 
    project: 'Vesting Vault', 
    status: 'Tracking Locked Tokens', 
    contract: 'CD5QF6KBAURVUNZR2EVBJISWSEYGDGEEYVH2XYJJADKT7KFOXTTIXLHU',
    database: dbStatus
  });
});

// Portfolio aggregation endpoint
app.get('/api/user/:address/portfolio', async (req, res) => {
    const { address } = req.params;
    
    try {
        // Query user's vaults from database
        const vaultsQuery = `
            SELECT type, total_locked as locked, total_claimable as claimable 
            FROM vaults 
            WHERE user_address = $1
        `;
        const vaults = await dbManager.query(vaultsQuery, [address]);
        
        // Calculate totals
        const total_locked = vaults.reduce((sum, vault) => sum + parseFloat(vault.locked || 0), 0);
        const total_claimable = vaults.reduce((sum, vault) => sum + parseFloat(vault.claimable || 0), 0);
        
        // Return the portfolio summary
        res.json({
            total_locked,
            total_claimable,
            vaults: vaults,
            address
        });
    } catch (error) {
        console.error('Portfolio query failed:', error.message);
        res.status(500).json({ 
            error: 'Failed to fetch portfolio data',
            message: error.message 
        });
    }
});

// Paginated vaults endpoint
app.get('/api/vaults', async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    
    try {
        const offset = (page - 1) * limit;
        
        // Get paginated vaults from database
        const vaultsQuery = `
            SELECT id, type, total_locked as locked, total_claimable as claimable, created_at
            FROM vaults 
            ORDER BY created_at DESC 
            LIMIT $1 OFFSET $2
        `;
        const vaults = await dbManager.query(vaultsQuery, [limit, offset]);
        
        // Get total count for pagination
        const countQuery = 'SELECT COUNT(*) as total FROM vaults';
        const countResult = await dbManager.query(countQuery);
        const totalVaults = parseInt(countResult[0].total);
        
        // Calculate pagination metadata
        const totalPages = Math.ceil(totalVaults / limit);
        const hasNextPage = page < totalPages;
        const hasPrevPage = page > 1;
        
        res.json({
            vaults: vaults,
            pagination: {
                current_page: page,
                per_page: limit,
                total_vaults: totalVaults,
                total_pages: totalPages,
                has_next_page: hasNextPage,
                has_prev_page: hasPrevPage
            }
        });
    } catch (error) {
        console.error('Vaults query failed:', error.message);
        res.status(500).json({ 
            error: 'Failed to fetch vaults data',
            message: error.message 
        });
    }
});

// Database health check endpoint
app.get('/api/health', (req, res) => {
    const dbStatus = dbManager.getStatus();
    const health = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        database: dbStatus,
        uptime: process.uptime()
    };
    
    if (dbStatus.uptime > 30000) {
        health.status = 'degraded';
        health.warning = 'Primary database has been unavailable for over 30 seconds';
    }
    
    res.json(health);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
    console.log('SIGTERM received, shutting down gracefully...');
    await dbManager.close();
    process.exit(0);
});

process.on('SIGINT', async () => {
    console.log('SIGINT received, shutting down gracefully...');
    await dbManager.close();
    process.exit(0);
});

// Start the server after initializing modules
initializeApp().then(() => {
  app.listen(port, () => {
    console.log(`Vesting API running on port ${port}`);
    console.log(`SEP-12 KYC endpoints available at http://localhost:${port}/kyc`);
  });
});
