# Offline Russian word graph

`ru.trie.gz` is a derived, minimised acyclic word graph built from
[`dictionary-ru@3.0.0`](https://github.com/wooorm/dictionaries/tree/main/dictionaries/ru)
(BSD-3-Clause; see `RU-LICENSE`). Affix expansion uses
[`nspell@2.1.5`](https://github.com/wooorm/nspell) and `is-buffer@2.0.5` at build
time only. Their original MIT notices are included. No engine code or expanded
JavaScript word-object table is loaded at runtime.

Rebuild: `node scripts/vendor-spell-v213.cjs`. Archives are pinned by version and
SHA-512, extracted without npm lifecycle scripts into a separate build directory.
The builder writes `manifest.json` and the binary gzip asset mechanically.

The little-endian UInt32 format is: magic `0x45585350`, version, number of states,
number of edges, root state; two integers per state (first edge, `count*2+final`);
then sorted edges as `(UTF-16 character code, target state)`. Case is folded and
Russian е/ё variants are accepted. The graph contains 1,366,410 word forms and
uses 2,118,484 decoded bytes; gzip download is 652,225 bytes for this build.

The dictionary is not precached during app startup. The worker requests this
same-origin immutable version only when a nonempty Russian draft needs checking.
Ordinary service-worker runtime caching permits reuse/offline checking after the
first download. Draft words never appear in URLs or network request bodies.
