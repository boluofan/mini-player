import { defineConfig } from 'weapp-vite/config';
import { UnifiedViteWeappTailwindcssPlugin as uvwt } from 'weapp-tailwindcss/vite';

export default defineConfig({
  weapp: {
    srcRoot: 'miniprogram',
  },
  build: {
    target: 'es2015',
  },
  plugins: [
    // @ts-ignore
    uvwt({
      rem2rpx: true,
    }),
  ],
});
