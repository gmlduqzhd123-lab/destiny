// 브라우저용 스크립트(전역 const 모듈)를 Node vm 안에서 차례로 불러와 테스트합니다.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.join(__dirname, '..', '..');
const CORE = [
    'js/vendor/korean-lunar-calendar.min.js',
    'js/engine.js',
    'js/saju.js',
    'js/data/saju-data.js',
    'js/data/fortune-data.js',
    'js/fortune.js',
    'js/data/extra-data.js',
    'js/compat.js'
];

function load(files = CORE, extra = {}) {
    const ctx = vm.createContext({ URL, console, Math, Date, ...extra });
    for (const f of files) vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), ctx, { filename: f });
    // 최상위 const 선언은 컨텍스트 속성이 아니므로 표현식으로 꺼냅니다.
    ctx.get = expr => vm.runInContext(expr, ctx);
    return ctx;
}

module.exports = { load, CORE, ROOT };
