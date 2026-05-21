module.exports = (err, req, res, next) => {
  console.error('❌ Server Error:', err);
  
  const status = err.status || 500;
  const message = err.message || 'Internal Server Error';
  
  res.status(status).json({
    error: 'SERVER_ERROR',
    message: message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
};
