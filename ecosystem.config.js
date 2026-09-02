module.exports = {
  apps: [
    {
      name: "hotspot-auth",
      cwd: __dirname,
      script: "node_modules/next/dist/bin/next",
      args: "start -p 5000",
      env: {
        NODE_ENV: "production",
      },
      instances: 1,
      autorestart: true,
      max_memory_restart: "300M",
    },
  ],
};
