/* Reproducible vendor build. No npm scripts, account data or credentials. */
'use strict';
const fs = require('node:fs'),
  path = require('node:path'),
  crypto = require('node:crypto'),
  zlib = require('node:zlib'),
  cp = require('node:child_process');
const root = path.resolve(__dirname, '..'),
  work = path.resolve(root, '../spell-build-v213'),
  out = path.join(root, 'vendor/spell-v213');
const packages = [
  [
    'nspell',
    '2.1.5',
    'sha512-PSStyugKMiD9mHmqI/CR5xXrSIGejUXPlo88FBRq5Og1kO5QwQ5Ilu8D8O5I/SHpoS+mibpw6uKA8rd3vXd2Sg==',
  ],
  [
    'is-buffer',
    '2.0.5',
    'sha512-i2R6zNFDwgEHJyQUtJEk0XFi1i0dPFn/oqjK3/vPCcDeJvW5NQ83V8QbicfF1SupOaB0h8ntgBC2YiE7dfyctQ==',
  ],
  [
    'dictionary-ru',
    '3.0.0',
    'sha512-tigem0CDnNpxEciW6ktwVH3wWB4FYpuvpwA6IR6UlF7bVu2kez6vOejVNyZgBX1TJIjuYTCTuLxzg/YOls2mRQ==',
  ],
];
(async () => {
  fs.mkdirSync(work, { recursive: true });
  fs.mkdirSync(out, { recursive: true });
  for (const [name, version, integrity] of packages) {
    const meta = await fetch('https://registry.npmjs.org/' + name + '/' + version).then((r) =>
      r.json(),
    );
    if (meta.dist?.integrity !== integrity) throw Error('Unexpected integrity: ' + name);
    const bytes = Buffer.from(await fetch(meta.dist.tarball).then((r) => r.arrayBuffer()));
    if ('sha512-' + crypto.createHash('sha512').update(bytes).digest('base64') !== integrity)
      throw Error('Bad archive: ' + name);
    const folder = path.join(work, 'node_modules', name),
      archive = path.join(work, name.replaceAll('/', '-') + '.tgz');
    fs.mkdirSync(folder, { recursive: true });
    fs.writeFileSync(archive, bytes);
    const members = cp
      .execFileSync('tar', ['-tzf', archive], { encoding: 'utf8', windowsHide: true })
      .split(/\r?\n/)
      .filter(Boolean);
    if (members.some((f) => !f.startsWith('package/') || f.split('/').includes('..')))
      throw Error('Unsafe archive');
    cp.execFileSync('tar', ['-xzf', archive, '-C', folder, '--strip-components=1'], {
      windowsHide: true,
    });
  }
  const modules = path.join(work, 'node_modules'),
    ru = path.join(modules, 'dictionary-ru'),
    nspell = require(path.join(modules, 'nspell'));
  const check = nspell({
    aff: fs.readFileSync(path.join(ru, 'index.aff'), 'utf8'),
    dic: fs.readFileSync(path.join(ru, 'index.dic'), 'utf8'),
  });
  const words = [
    ...new Set(
      Object.keys(check.data)
        .filter((word) => /^[а-яё]+$/i.test(word) && check.correct(word))
        .map((word) => word.toLowerCase().replaceAll('ё', 'е')),
    ),
  ].sort();
  // Minimal acyclic word graph: dictionary expansion happens only at build time.
  // Runtime keeps flat integer arrays instead of a million JS string objects.
  const node = () => ({ final: false, edges: new Map(), id: 0 }),
    rootNode = node(),
    unchecked = [],
    registry = new Map(),
    nodes = [];
  let previous = '';
  function minimize(depth) {
    for (let i = unchecked.length - 1; i >= depth; i--) {
      const [parent, letter, child] = unchecked[i],
        signature =
          (child.final ? '1' : '0') +
          '|' +
          [...child.edges].map(([c, n]) => c + ':' + n.id).join(',');
      if (registry.has(signature)) parent.edges.set(letter, registry.get(signature));
      else {
        child.id = nodes.length;
        nodes.push(child);
        registry.set(signature, child);
      }
      unchecked.pop();
    }
  }
  for (const word of words) {
    let common = 0;
    while (common < word.length && common < previous.length && word[common] === previous[common])
      common++;
    minimize(common);
    let current = common ? unchecked[common - 1][2] : rootNode;
    for (const letter of word.slice(common)) {
      const child = node();
      current.edges.set(letter, child);
      unchecked.push([current, letter, child]);
      current = child;
    }
    current.final = true;
    previous = word;
  }
  minimize(0);
  rootNode.id = nodes.length;
  nodes.push(rootNode);
  const edgeCount = nodes.reduce((sum, n) => sum + n.edges.size, 0),
    binary = new Uint32Array(5 + nodes.length * 2 + edgeCount * 2);
  binary.set([0x45585350, 1, nodes.length, edgeCount, rootNode.id]);
  let edge = 0;
  for (const current of nodes) {
    binary[5 + current.id * 2] = edge;
    binary[6 + current.id * 2] = current.edges.size * 2 + Number(current.final);
    for (const [letter, next] of current.edges) {
      const offset = 5 + nodes.length * 2 + edge * 2;
      binary[offset] = letter.charCodeAt(0);
      binary[offset + 1] = next.id;
      edge++;
    }
  }
  const compressed = zlib.gzipSync(Buffer.from(binary.buffer), { level: 9 });
  fs.writeFileSync(path.join(out, 'ru.trie.gz'), compressed);
  fs.writeFileSync(
    path.join(out, 'manifest.json'),
    JSON.stringify(
      {
        dictionary: 'dictionary-ru@3.0.0',
        builder: 'nspell@2.1.5',
        words: words.length,
        states: nodes.length,
        edges: edgeCount,
        bytes: binary.byteLength,
        gzip: compressed.length,
        sha256: crypto.createHash('sha256').update(compressed).digest('hex'),
      },
      null,
      2,
    ) + '\n',
  );
  for (const [name, file] of [
    ['nspell', 'NSPELL-LICENSE'],
    ['is-buffer', 'IS-BUFFER-LICENSE'],
    ['dictionary-ru', 'RU-LICENSE'],
  ]) {
    const folder = path.join(modules, name),
      source = ['license', 'LICENSE', 'LICENSE.md']
        .map((f) => path.join(folder, f))
        .find((f) => fs.existsSync(f));
    if (!source) throw Error('License missing: ' + name);
    fs.copyFileSync(source, path.join(out, file));
  }
  console.log(
    'Built ' +
      words.length +
      ' forms; ' +
      binary.byteLength +
      ' runtime bytes, ' +
      compressed.length +
      ' download bytes.',
  );
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
