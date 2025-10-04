const winston = require('winston');

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console()
  ]
});

module.exports = (err, req, res, next) => {
  const requestId = req.requestId || 'N/A';
  const url = req.originalUrl || req.url;

  logger.error('Error occurred', {
    message: err.message,
    stack: err.stack,
    url,
    method: req.method,
    requestId
  });

  // Check if this is an express-validator error (comes through validationResult)
  const errors = require('express-validator').validationResult(req);
  if (!errors.isEmpty()) {
    const firstError = errors.array()[0];
    return res.status(400).json({
      error: firstError.msg
    });
  }

  // Handle specific error messages from service
  if (err.message === 'Comic not found') {
    return res.status(404).json({ 
      error: 'Comic not found', 
      message: 'The requested comic does not exist' 
    });
  }
  
  if (err.message === 'Invalid comic ID') {
    return res.status(400).json({ 
      error: 'Invalid comic ID', 
      message: 'Comic ID must be a positive integer' 
    });
  }

  if (err.message === 'Query must be between 1 and 100 characters') {
    return res.status(400).json({ 
      error: 'Query must be between 1 and 100 characters' 
    });
  }

  // Handle JSON parsing errors
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({
      error: 'Invalid JSON'
    });
  }
  
  // Handle operational errors
  if (err.isOperational) {
    return res.status(err.statusCode || 500).json({ 
      error: err.message,
      timestamp: new Date().toISOString()
    });
  }
  
  // Default case
  return res.status(500).json({
    error: 'Internal Server Error',
    message: 'Something went wrong on our end'
  });
};