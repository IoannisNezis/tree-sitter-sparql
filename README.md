tree-sitter-sparql
==================

SPARQL grammar for [tree-sitter](https://github.com/tree-sitter/tree-sitter).

Important
=========

This is a fork of [tree-sitter-sparql](https://github.com/GordianDziwis/tree-sitter-sparql)!
It's just updated and adjusted for Rust.

Usage
=====

All you need to know is written in the [docs](https://tree-sitter.github.io/tree-sitter/creating-parsers)

To summarize:

- install the tree-sitter-cli on your system
- build the parser and all bindings with: `tree-sitter generate`
- test the parser with `tree-sitter test`
- tests are defined in `test/`
- the grammar is specified in `grammar.js`

If you want to use this in your rust project:

- install the [tree-sitter](https://crates.io/crates/tree-sitter) crate
- install [this](https://crates.io/crates/tree-sitter-sparql) crate

Everything further is written in the [docs](https://docs.rs/tree-sitter/0.22.6/tree_sitter/)

References
==========

- The Core of this project [tree-sitter](https://tree-sitter.github.io/tree-sitter/)
- The [SPARQL grammar](https://www.w3.org/TR/sparql11-query/#rQueryUnit).
