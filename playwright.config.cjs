// 화면 흐름(E2E) 테스트 설정 — 휴대폰 크기 화면에서 주요 기능을 눌러 봅니다.
const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
    testDir: 'tests/e2e',
    testMatch: /.*\.spec\.cjs$/,
    timeout: 30000,
    retries: process.env.CI ? 1 : 0,
    reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
    use: {
        baseURL: 'http://localhost:4173/',
        ...devices['Pixel 7'],
        serviceWorkers: 'block',
        locale: 'ko-KR',
        timezoneId: 'Asia/Seoul'
    },
    projects: [{
        name: 'mobile-chromium',
        use: {
            browserName: 'chromium',
            // 브라우저가 미리 설치된 환경에서는 PW_CHROMIUM_PATH로 실행 파일을 지정할 수 있습니다.
            launchOptions: process.env.PW_CHROMIUM_PATH ? { executablePath: process.env.PW_CHROMIUM_PATH } : {}
        }
    }],
    webServer: {
        command: 'node tests/e2e/server.cjs 4173',
        url: 'http://localhost:4173/',
        reuseExistingServer: !process.env.CI
    }
});
