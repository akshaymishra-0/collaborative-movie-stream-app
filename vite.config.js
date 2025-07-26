import path from 'node:path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { NodeGlobalsPolyfillPlugin } from '@esbuild-plugins/node-globals-polyfill';
import { NodeModulesPolyfillPlugin } from '@esbuild-plugins/node-modules-polyfill';

export default defineConfig({
	plugins: [react()],
	server: {
		cors: true,
	},
	resolve: {
		extensions: ['.jsx', '.js', '.tsx', '.ts', '.json'],
		alias: {
			'@': path.resolve(__dirname, './src'),
			// Add buffer polyfill
			buffer: 'buffer',
		},
	},
	define: {
		global: 'globalThis',
		'process.env': {},
	},
	optimizeDeps: {
		include: ['simple-peer', 'buffer'],
		esbuildOptions: {
			// Node.js global to browser globalThis
			define: {
				global: 'globalThis',
			},
			// Enable esbuild polyfill plugins
			plugins: [
				NodeGlobalsPolyfillPlugin({
					process: true,
					buffer: true,
				}),
				NodeModulesPolyfillPlugin(),
			],
		},
	},
	build: {
		rollupOptions: {
			external: [],
			output: {
				globals: {
					global: 'globalThis',
				},
			},
		},
	},
});
