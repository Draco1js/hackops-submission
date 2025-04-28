module.exports = {
  apps: [
    {
      name: 'todo-app-server',
      script: 'packages/server/dist/index.js',
      env: {
        NODE_ENV: 'production',
        PORT: 3001
      }
    },
    {
      name: 'todo-app-client',
      script: 'node_modules/.bin/serve',
      args: '-s packages/client/dist -l 3000',
      env: {
        NODE_ENV: 'production'
      }
    }
  ]
};