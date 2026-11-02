// E2E 공통 도우미
const FONT_HOSTS = /fonts\.googleapis\.com|fonts\.gstatic\.com/;

async function open(page, path = '/') {
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    // 외부 글꼴은 테스트 환경에 따라 막힐 수 있어 미리 끊어 둡니다.
    await page.route(FONT_HOSTS, r => r.abort());
    await page.goto(path);
    return errors;
}

async function fillUser(page, { name = '김별빛', birth = '2015.05.05', gender = 'F', mbti = 'ENFP', cal = 'solar' } = {}) {
    await page.fill('#userName', name);
    if (cal === 'lunar') await page.click('.seg[data-for=calType] [data-v=lunar]');
    await page.fill('#birthDate', birth);
    await page.click(`.seg[data-for=gender] [data-v=${gender}]`);
    for (const L of mbti) await page.click(`#mbtiPick [data-v=${L}]`);
}

async function submitUser(page, user) {
    await fillUser(page, user);
    await page.click('#btnSubmit');
    await page.waitForSelector('#resultView', { state: 'visible' });
}

module.exports = { open, fillUser, submitUser };
