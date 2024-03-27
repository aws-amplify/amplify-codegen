import { defineConfig } from 'cypress';

process.env.NODE_ENV = 'test';
process.env.BABEL_ENV = 'test';
require('react-app-rewired/config/webpack.config')('development');
export default defineConfig({
  component: {
    devServer: {
      framework: 'create-react-app',
      bundler: 'webpack',
    },
  },
});
