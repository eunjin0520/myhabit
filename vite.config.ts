/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// GitHub Pages 주소: https://<아이디>.github.io/myhabit/
// PWA 설정(vite-plugin-pwa)은 3단계에서 추가합니다.
export default defineConfig({
  base: '/myhabit/',
  plugins: [react()],
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
    // 테스트 파일마다 별도 프로세스: 시간대(TZ)를 바꾸는 테스트가 서로 섞이지 않게
    pool: 'forks',
    env: { TZ: 'Asia/Seoul' },
  },
});
