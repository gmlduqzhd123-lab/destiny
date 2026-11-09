// E2E 공통 도우미
async function open(page, path = '/') {
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
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
