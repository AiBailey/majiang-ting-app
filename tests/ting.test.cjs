const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const assert = require('node:assert/strict');
const { test } = require('node:test');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const script = html.match(/<script>([\s\S]*?)<\/script>/)[1];
const context = vm.createContext({ document: { addEventListener() {} }, setTimeout, clearTimeout });
vm.runInContext(script.slice(0, script.indexOf('// 初始化')), context);
const { findTingTiles, findDiscardPlans } = vm.runInContext('({ findTingTiles, findDiscardPlans })', context);

function counts(indices) {
    const result = Array(34).fill(0);
    for (const i of indices) result[i]++;
    return result;
}

function plain(value) {
    return JSON.parse(JSON.stringify(value));
}

test('13 张听牌：单吊、两面听、四张上限和现有特殊牌型范围', () => {
    assert.deepEqual(plain(findTingTiles(counts([0, 1, 2, 9, 10, 11, 18, 19, 20, 27, 27, 27, 31]))), [31]);
    assert.deepEqual(plain(findTingTiles(counts([0, 1, 2, 9, 10, 11, 18, 19, 20, 27, 27, 3, 4]))), [2, 5]);
    assert.deepEqual(plain(findTingTiles(counts([27, 27, 27, 27, 0, 1, 2, 9, 10, 11, 18, 19, 20]))), []);
    assert.deepEqual(plain(findTingTiles(counts([0, 0, 2, 2, 4, 4, 9, 9, 11, 11, 18, 18, 31]))), []);
});

test('14 张手牌列出全部不同出牌方案，同一种牌不重复且输入不变', () => {
    const hand = counts([0, 1, 2, 9, 10, 11, 18, 19, 20, 27, 27, 27, 31, 31]);
    const snapshot = hand.slice();
    assert.deepEqual(plain(findDiscardPlans(hand)), [
        { discard: 0, waits: [0, 3] },
        { discard: 1, waits: [1] },
        { discard: 2, waits: [2] },
        { discard: 9, waits: [9, 12] },
        { discard: 10, waits: [10] },
        { discard: 11, waits: [11] },
        { discard: 18, waits: [18, 21] },
        { discard: 19, waits: [19] },
        { discard: 20, waits: [20] },
        { discard: 27, waits: [27, 31] },
        { discard: 31, waits: [31] }
    ]);
    assert.deepEqual(hand, snapshot);
});

test('打出的牌计为已见，原手牌四张相同牌不能推荐再摸该牌', () => {
    const hand = counts([0, 0, 0, 0, 1, 2, 9, 10, 11, 18, 19, 20, 27, 27]);
    const remaining = hand.slice();
    remaining[0]--;
    assert.ok(findTingTiles(remaining).includes(0));
    const plan = findDiscardPlans(hand).find(p => p.discard === 0);
    assert.deepEqual(plain(plan.waits), [3, 27]);
});

test('九面听保留完整听牌列表', () => {
    const hand = counts([0, 0, 0, 1, 2, 3, 4, 5, 6, 7, 8, 8, 8, 27]);
    const plan = findDiscardPlans(hand).find(p => p.discard === 27);
    assert.deepEqual(plain(plan.waits), [0, 1, 2, 3, 4, 5, 6, 7, 8]);
});

test('无法打一张听牌时返回空方案', () => {
    assert.deepEqual(plain(findDiscardPlans(counts([0, 2, 4, 6, 8, 9, 11, 13, 15, 17, 27, 28, 29, 30]))), []);
});

test('两个 HTML 入口同步，页面和离线脚本语法有效', () => {
    assert.equal(html, fs.readFileSync(path.join(root, 'mahjong-ting-calculator.html'), 'utf8'));
    new vm.Script(script);
    new vm.Script(fs.readFileSync(path.join(root, 'sw.js'), 'utf8'));
});
