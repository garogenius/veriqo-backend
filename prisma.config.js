const { defineConfig } = require('@prisma/config');

module.exports = defineConfig({
  earlyAccess: true,
  schema: {
    kind: 'single',
    filePath: 'prisma/schema.prisma',
  },
  migrate: {
    connection: {
      url: "postgresql://postgres:MQsyzsFsYKAVWrUnIPciuHIBlUZkASvK@thomas.proxy.rlwy.net:34210/railway",
    },
  },
});
