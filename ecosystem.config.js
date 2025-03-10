module.exports = {
  apps: [
    {
      name: "scanner-api-server",
      script: "server.js",
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "1G",
      env: {
        NODE_ENV: "production",
        API_PORT: 3001,
        CLIENT_URL: "http://10.255.20.6:3000", // Replace with your actual server IP
      },
      log_date_format: "YYYY-MM-DD HH:mm:ss",
      error_file: "logs/api-error.log",
      out_file: "logs/api-output.log",
      merge_logs: true,
      node_args: "--max-old-space-size=2048",
      exec_mode: "cluster",
      kill_timeout: 5000,
      exp_backoff_restart_delay: 100,
    },
    {
      name: "scanner-client",
      script: "node_modules/next/dist/bin/next",
      args: "start -p 3000",
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "1G",
      env: {
        NODE_ENV: "production",
        API_URL: "http://10.255.20.6:3001", // Replace with your actual server IP
      },
      log_date_format: "YYYY-MM-DD HH:mm:ss",
      error_file: "logs/client-error.log",
      out_file: "logs/client-output.log",
      merge_logs: true,
      kill_timeout: 5000,
    },
  ],
}

