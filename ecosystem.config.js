module.exports = {
  apps: [
    {
      name: 'memoribooth',
      script: './backend/server.js',
      cwd: '/var/www/memoribooth-server',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'production',
        PORT: 3001,
        JWT_SECRET: 'GANTI_INI_DENGAN_STRING_RANDOM_PANJANG',
        FRONTEND_URL: 'https://yourdomain.com'
      }
    }
  ]
}
