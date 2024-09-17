# clang environment variables for web assembly
export CFLAGS_wasm32_unknown_unknown := `echo "-I$(pwd)/wasm-sysroot -Wbad-function-cast -Wcast-function-type -fno-builtin"`

launch-playground:
	tree-sitter build --wasm
	tree-sitter web-ui

generate:
	tree-sitter generate

test:
	tree-sitter test

watch:
	watchexec --exts js --exts txt --restart "just generate; just test
