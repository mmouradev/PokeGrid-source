// PIW-QOL embutido (edicao PokeGrid), ligado por padrao.
// Contexto: o anuncio do Poke Idle World proibe, por extensao, comprar/vender pelo Mark, usar o
// Mercado Global e o Depot durante a hunt, e automatizar acoes do jogo. A edicao tira o
// auto-reconnect, as compras +1.000/+10.000 e o "Vender itens" da loja da hunt, e deixa as janelas
// portateis (Lojas e Depot) so fora da hunt. Aqui a trava REAL do preset roda num DOM falso.
// Roda com: node test/piw-qol.test.js
const fs = require('fs');
const path = require('path');
const RAIZ = path.join(__dirname, '..');
const s = fs.readFileSync(path.join(RAIZ, 'index.html'), 'utf8');
const pq = fs.readFileSync(path.join(RAIZ, 'presets', 'piw-qol.js'), 'utf8').replace(/\r\n/g, '\n');
let fail = 0;
const ok = (c, l) => { console.log((c ? 'OK  ' : 'FAIL') + ' ' + l); if (!c) fail = 1; };
const pedaco = (a, fim) => { const i = pq.indexOf(a), j = pq.indexOf(fim, i + a.length); if (i < 0 || j < 0) throw new Error('nao achei no preset: ' + a); return pq.slice(i, j); };

const re = /<script>([\s\S]*?)<\/script>/g; let m, b = '';
while ((m = re.exec(s))) { if (m[1].length > b.length) b = m[1]; }

console.log('\n--- o preset ---');
try { new Function(pq); ok(true, 'preset parseia'); } catch (e) { ok(false, 'parse do preset: ' + e.message); }
ok(b.includes("{ id: 'piwqol', name: 'PIW-QOL: Quality of Life (edição PokeGrid)', file: 'piw-qol.js', author: 'JulianoCLI', version: '10.1.1-pg1', padrao: true }"), 'registrado nos presets, ligado por padrao');
ok(/@version\s+10\.1\.1-pg1\n/.test(pq), 'versao do cabecalho bate com a da lista');
ok(!/@updateURL|@downloadURL/.test(pq), 'sem atualizacao pelo original (voltaria com o que saiu)');

console.log('\n--- o que as regras vetam saiu ---');
ok(!pq.includes("'leave-hunt'") && !pq.includes("'enter-hunt'"), 'auto-reconnect: nenhum leave-hunt/enter-hunt enviado pelo script');
ok(!pq.includes('location.reload('), 'auto-reconnect: o script nao recarrega a pagina sozinho');
ok(!/cfg-auto-reconnect|Auto-reconnect da hunt/.test(pq), 'auto-reconnect: a opcao sumiu das configuracoes');
ok(!pq.includes('injectHuntShopLauncher') && !pq.includes('script-open-global-market'), 'botao de Mercado Global na barra de captura da hunt saiu');
ok(!pq.includes("captureShopLink.style.display = 'none'"), 'o link de loja nativo da barra de captura nao e mais escondido');
ok(!pq.includes('injectHuntBallEnhancements') && !pq.includes('script-hunt-bulk') && !pq.includes('hunt-sell-open'), 'loja de bolas da hunt: sem +1.000/+10.000 e sem "Vender itens"');
ok(!/btn-hunt-(market|bulk|sell)/.test(pq), 'as opcoes desses recursos sairam das configuracoes');
ok(!pq.includes('applyChatState') && !pq.includes('btn-chat-on'), 'chat fica com o botao 💬 do app (o script nao briga mais com ele)');

console.log('\n--- o que ficou ---');
ok(pq.includes('function teleportToFavorite()') && pq.includes("tpBtn.id = 'dock-btn-quick-tp'"), 'teleporte ⭐/↻ ficou');
ok(pq.includes('teleportToTarget(pokeName)'), 'Fast Travel da Pokedex ficou');
ok(pq.includes('async function injectMarkBuyQuantities(mkWindow)') && pq.includes('[1, 10, 100, 1000, 10000].forEach'), 'compras rapidas no Mark (cidade) ficaram');
ok(pq.includes('function trackHuntAnalyzer()') && pq.includes('function showCompareModal()'), 'Hunt Analyzer e comparador ficaram');

console.log('\n--- janelas portateis so fora da hunt ---');
['showPortableDepot', 'showHuntSellWindow', 'showHuntPokemonSellWindow', 'showGlobalMarketWindow', 'showPortableBallShop'].forEach((fn) => {
  ok(new RegExp('function ' + fn + '\\(\\) \\{\\n        if \\(portableBlockedNotice\\(\\)\\) return;').test(pq), fn + ' comeca pela trava');
});
ok(pq.includes("if (HUNT_BLOCKED_API.test(url) && isPortableBlocked()) throw new Error(tr('huntBlocked'));"), 'gameApiRequest barra os endpoints vetados na hunt (janela aberta na cidade nao segue operando)');
ok(pq.includes('if (HUNT_BLOCKED_SOCKET_TYPES.has(message?.type) && isPortableBlocked()) return false;'), 'sendGameMessage barra poke-store, poke-withdraw e family-action na hunt');
ok(pq.includes('updatePortableAvailability();\n            if (Date.now() - lastHuntNameRefreshAt >= 5000)') && pq.includes('setInterval(updatePortableAvailability, 2000);'), 'botoes e janelas acompanham a entrada na hunt (DOM e socket)');

// a trava real: HUNT_DOM_SELECTOR, isPortableBlocked, HUNT_BLOCKED_API e os tipos de socket
const trava = new Function('document', 'window', 'isCityName', 'getCurrentHuntLocation',
  'let serverHuntActive = null;\n' + pedaco('    const HUNT_DOM_SELECTOR = [', '\n    function handleGameSocketMessage(')
  + '\nreturn { isPortableBlocked, HUNT_BLOCKED_API, HUNT_BLOCKED_SOCKET_TYPES, setServer: (v) => { serverHuntActive = v; } };');
const CITY = new Function(pedaco('    const CITY_NAMES = ', '\n    function isCityMarker(') + '\nreturn isCityName;')();
const monta = ({ hud = '', dom = [], poke } = {}) => {
  const doc = { querySelector: (sel) => (dom.some((d) => sel.split(',').includes(d)) ? {} : null) };
  return trava(doc, { __poke: poke }, CITY, () => hud);
};
ok(monta({ hud: 'Cerulean City' }).isPortableBlocked() === false, 'na cidade (HUD Cerulean City): libera');
ok(monta({ hud: 'Kanto · Viridian City' }).isPortableBlocked() === false, 'HUD com regiao e cidade: libera');
ok(monta({ hud: 'Paras Cave' }).isPortableBlocked() === true, 'HUD numa hunt: barra');
ok(monta({ hud: '' }).isPortableBlocked() === true, 'HUD vazio (conexao caida, tela carregando): barra, a trava falha fechada');
ok(monta({ hud: 'Cerulean City', dom: ['[data-guide="capture-bar"]'] }).isPortableBlocked() === true, 'barra de captura na tela: barra, mesmo com o HUD dizendo cidade');
ok(monta({ hud: 'Cerulean City', dom: ['.boss-window'] }).isPortableBlocked() === true, 'luta de boss na tela: barra');
ok(monta({ hud: 'Cerulean City', poke: { ws: { 'field-init': { slug: 'paras' } } } }).isPortableBlocked() === true, 'o PokeGrid viu field-init (entrou na hunt): barra');
ok(monta({ hud: 'Cerulean City', poke: { ws: { 'field-init': null } } }).isPortableBlocked() === false, 'field-init zerado pelo PokeGrid (field-none/teleporte pra cidade): libera');
const t1 = monta({ hud: 'Cerulean City' }); t1.setServer(true);
ok(t1.isPortableBlocked() === true, 'o proprio script viu field-init: barra');
t1.setServer(false);
ok(t1.isPortableBlocked() === false, 'e viu field-teleport-city: libera de novo');
ok(pq.includes("if (message?.type === 'field-init') serverHuntActive = true;\n        else if (message?.type === 'field-none' || message?.type === 'field-teleport-city') serverHuntActive = false;"), 'o socket alimenta o estado de hunt com os mesmos tipos que o PokeGrid usa');

const { HUNT_BLOCKED_API: API, HUNT_BLOCKED_SOCKET_TYPES: SOCK } = monta();
['/api/game/shop/buy', '/api/game/shop/sell', '/api/game/pokemon/sell', '/api/game/balls/buy', '/api/game/depot', '/api/game/depot/move', '/api/game/market?category=items', '/api/game/market/action']
  .forEach((u) => ok(API.test(u), 'na hunt barra ' + u));
['/api/game/shop', '/api/characters/me', '/api/game/pokedex', '/api/game/capture-log?filter=all', '/api/game/item/lock', '/api/game/map-markers', '/api/game/marketplace']
  .forEach((u) => ok(!API.test(u), 'nao mexe em ' + u));
ok(['poke-store', 'poke-withdraw', 'family-action'].every((x) => SOCK.has(x)) && !SOCK.has('inv-get') && !SOCK.has('pokes-get'), 'socket: barra mover Pokemon e a familia, deixa as leituras');

console.log('\n--- no app ---');
const scOn = (salvo) => new Function('lsObj', 'PRESETS', 'let scriptsOn = {}; try { scriptsOn = lsObj(\'scriptsOn\'); } catch {}\n'
  + b.slice(b.indexOf('  PRESETS.forEach(p => { if (p.padrao'), b.indexOf('\n', b.indexOf('  PRESETS.forEach(p => { if (p.padrao'))) + '\nreturn scriptsOn;')(() => salvo, [{ id: 'justpokedex' }, { id: 'piwqol', padrao: true }]);
ok(scOn({}).piwqol === true && !('justpokedex' in scOn({})), 'instalacao nova: PIW-QOL ligado, o resto como estava');
ok(scOn({ piwqol: false }).piwqol === false, 'quem desligou continua desligado');
const pausa = new Function('scriptsOn', b.slice(b.indexOf('  const piwOriginal = '), b.indexOf('\n', b.indexOf('  const pausadoPeloPreset = '))) + '\nreturn { piwOriginal, pausadoPeloPreset };');
const P1 = pausa({ piwqol: true }), P0 = pausa({ piwqol: false });
const original = { id: 'u1', name: 'Poke Idle World - Quality of Life (PIW-QOL)', url: 'https://raw.githubusercontent.com/JulianoCLI/PIW-QOL/main/piw-qol.user.js' };
ok(P1.pausadoPeloPreset(original) && P1.pausadoPeloPreset({ id: 'u2', name: 'x', url: 'https://github.com/JulianoCLI/PIW-QOL/blob/main/piw-qol.user.js' }), 'PIW-QOL original instalado pelo usuario fica parado com o embutido ligado');
ok(!P0.pausadoPeloPreset(original), 'com o embutido desligado o original volta a rodar');
ok(!P1.pausadoPeloPreset({ id: 'piwqol', name: 'PIW-QOL: Quality of Life (edição PokeGrid)', file: 'piw-qol.js' }) && !P1.pausadoPeloPreset({ id: 'u3', name: 'Meu script' }), 'o proprio preset e scripts de outros nao param');
ok(b.includes('if (!scriptsOn[s.id] || pausadoPeloPreset(s)) continue;') && b.includes('if (!s || pausadoPeloPreset(s)) return;'), 'injecao e ligar pulam o original pausado');
['scPiwDup'].forEach((k) => ok(s.split(k + ":'").length - 1 === 3, k + ' nos 3 idiomas'));
ok(!/scPiwDup:'[^']*—/.test(s) && !/PIW-QOL[^'<]*—/.test(s), 'sem travessao nos textos');

console.log(fail ? '\nFALHOU' : '\nTODOS PASSARAM');
process.exit(fail);
