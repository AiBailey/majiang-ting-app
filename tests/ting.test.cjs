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

test('省略已固定面子后，1、4、7、10 张手牌计算听牌且不修改输入', () => {
    const cases = [
        { tiles: [31], waits: [31] },
        { tiles: [1, 2, 22, 22], waits: [0, 3] },
        { tiles: [1, 2, 22, 22, 27, 27, 27], waits: [0, 3] },
        { tiles: [1, 2, 22, 22, 27, 27, 27, 9, 10, 11], waits: [0, 3] },
        { tiles: [0, 0, 1, 1, 2, 2, 3], waits: [0, 3] },
        { tiles: [0, 0, 0, 0, 1, 2, 27], waits: [27] },
        { tiles: [0, 2, 4, 6, 8, 9, 11], waits: [] }
    ];
    for (const { tiles, waits } of cases) {
        const hand = counts(tiles);
        const snapshot = hand.slice();
        assert.deepEqual(plain(findTingTiles(hand)), waits, `${tiles.length} 张：${tiles}`);
        assert.deepEqual(hand, snapshot);
    }
});

test('不合法张数不计算听牌，包括超过 13 张但可以拆成面子加将的输入', () => {
    for (const total of [0, 2, 3, 5, 6, 8, 9, 11, 12, 14]) {
        assert.deepEqual(plain(findTingTiles(counts(Array.from({ length: total }, (_, i) => i)))), []);
    }
    assert.deepEqual(plain(findTingTiles(counts([0, 1, 2, 9, 10, 11, 18, 19, 20, 27, 27, 27, 28, 28, 28, 31]))), []);
});

test('听牌计算入口接受五种张数，其他张数提示补到下一档或移除超出的牌', () => {
    const uiContext = vm.createContext({ document: { addEventListener() {} }, setTimeout, clearTimeout });
    vm.runInContext(script.slice(0, script.indexOf('// 初始化')), uiContext);
    vm.runInContext(`
        showMessage = (text, state) => { globalThis.result = { text, state }; };
        showTingResult = waits => { globalThis.result = { waits }; };
    `, uiContext);
    const fullHand = [0, 1, 2, 9, 10, 11, 18, 19, 20, 27, 27, 27, 31];
    for (const total of [1, 4, 7, 10, 13]) {
        uiContext.inputCounts = counts(fullHand.slice(13 - total));
        vm.runInContext('handCounts = inputCounts; calcTing();', uiContext);
        assert.deepEqual(plain(uiContext.result), { waits: [31] });
    }
    for (const [total, needed] of [[0, 1], [2, 2], [3, 1], [5, 2], [6, 1], [8, 2], [9, 1], [11, 2], [12, 1]]) {
        uiContext.inputCounts = counts(Array.from({ length: total }, (_, i) => i));
        vm.runInContext('handCounts = inputCounts; calcTing();', uiContext);
        assert.equal(uiContext.result.text, `还需选 ${needed} 张（当前 ${total} 张；支持 1、4、7、10、13 张）`);
        assert.equal(uiContext.result.state, 'is-warn');
    }
    uiContext.inputCounts = counts([...fullHand, 31]);
    vm.runInContext('handCounts = inputCounts; calcTing();', uiContext);
    assert.equal(uiContext.result.text, '请移除 1 张手牌（当前 14 张；支持 1、4、7、10、13 张）');
    uiContext.inputCounts = counts([0, 2, 4, 6]);
    vm.runInContext('handCounts = inputCounts; calcTing();', uiContext);
    assert.equal(uiContext.result.text, '当前没有听牌');
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
