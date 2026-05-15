import {
  extractComment,
  expandRangeForBlocks,
  DocLike,
  CommentSyntax,
  COMMENT_PREFIXES,
  BLOCK_COMMENT_SYNTAX,
  FALLBACK_PREFIXES,
} from "../commentParser";

// Builds a CommentSyntax from the static maps, mirroring languageConfig.ts resolution
// without pulling in vscode for unit tests.
function syntax(languageId: string): CommentSyntax {
  const linePrefixes = COMMENT_PREFIXES[languageId] ?? [...FALLBACK_PREFIXES];
  return { linePrefixes, block: BLOCK_COMMENT_SYNTAX[languageId] };
}

// Builds a minimal DocLike from an array of line strings.
function mockDoc(lines: string[]): DocLike {
  return {
    lineAt: (i: number) => ({ text: lines[i] }),
    lineCount: lines.length,
  };
}

// ---------------------------------------------------------------------------
// extractComment
// ---------------------------------------------------------------------------

describe("extractComment — line comments", () => {
  test("Python full-line #", () => {
    const r = extractComment("# define numbers", syntax("python"));
    expect(r).not.toBeNull();
    expect(r!.text).toBe("define numbers");
    expect(r!.prefix).toBe("#");
    expect(r!.suffix).toBe("");
  });

  test("Python inline #", () => {
    const r = extractComment("x = 1  # inline comment", syntax("python"));
    expect(r).not.toBeNull();
    expect(r!.text).toBe("inline comment");
  });

  test("JS full-line //", () => {
    const r = extractComment("// calculate total", syntax("javascript"));
    expect(r).not.toBeNull();
    expect(r!.text).toBe("calculate total");
    expect(r!.prefix).toBe("//");
  });

  test("JS inline //", () => {
    const r = extractComment("const x = 1; // inline", syntax("javascript"));
    expect(r).not.toBeNull();
    expect(r!.text).toBe("inline");
  });

  test("SQL full-line --", () => {
    const r = extractComment("-- select all rows", syntax("sql"));
    expect(r).not.toBeNull();
    expect(r!.text).toBe("select all rows");
    expect(r!.prefix).toBe("--");
  });

  test("line with no comment returns null", () => {
    expect(extractComment("const x = 42;", syntax("javascript"))).toBeNull();
  });

  test("empty line returns null", () => {
    expect(extractComment("", syntax("python"))).toBeNull();
  });

  test("// inside a string is not treated as a comment", () => {
    const r = extractComment('const url = "http://example.com"; // real comment', syntax("javascript"));
    expect(r).not.toBeNull();
    expect(r!.text).toBe("real comment");
  });
});

describe("extractComment — single-line block comments", () => {
  test("C single-line /* */", () => {
    const r = extractComment("/* calculate sum */", syntax("c"));
    expect(r).not.toBeNull();
    expect(r!.text).toBe("calculate sum");
    expect(r!.prefix).toBe("/*");
    expect(r!.suffix).toBe("*/");
  });

  test("C decorated /* --- text --- */", () => {
    const r = extractComment("/* ------ main entry point ------ */", syntax("c"));
    expect(r).not.toBeNull();
    expect(r!.text).toBe("------ main entry point ------");
    expect(r!.suffix).toBe("*/");
  });

  test("C inline block after code", () => {
    const r = extractComment("int x = 0; /* initial value */", syntax("c"));
    expect(r).not.toBeNull();
    expect(r!.text).toBe("initial value");
    expect(r!.suffixStart).toBe("int x = 0; /* initial value ".length);
  });

  test("HTML <!-- -->", () => {
    const r = extractComment("<!-- page header -->", syntax("html"));
    expect(r).not.toBeNull();
    expect(r!.text).toBe("page header");
    expect(r!.prefix).toBe("<!--");
    expect(r!.suffix).toBe("-->");
  });

  test("empty block comment returns null", () => {
    expect(extractComment("/**/", syntax("javascript"))).toBeNull();
    expect(extractComment("/* */", syntax("javascript"))).toBeNull();
  });

  test("// before /* means line comment wins", () => {
    const r = extractComment("// not a /* block */", syntax("javascript"));
    expect(r).not.toBeNull();
    expect(r!.prefix).toBe("//");
    expect(r!.text).toBe("not a /* block */");
  });

  test("CSS has no line comments — only block", () => {
    const r = extractComment("/* color: red */", syntax("css"));
    expect(r).not.toBeNull();
    expect(r!.prefix).toBe("/*");
    expect(r!.suffix).toBe("*/");
  });
});

describe("extractComment — new languages (line comments)", () => {
  test("Scala //", () => {
    const r = extractComment("// вычислить сумму", syntax("scala"));
    expect(r).not.toBeNull();
    expect(r!.text).toBe("вычислить сумму");
    expect(r!.prefix).toBe("//");
  });

  test("Zig //", () => {
    const r = extractComment("// основной цикл", syntax("zig"));
    expect(r).not.toBeNull();
    expect(r!.text).toBe("основной цикл");
  });

  test("Elixir #", () => {
    const r = extractComment("# основная функция", syntax("elixir"));
    expect(r).not.toBeNull();
    expect(r!.text).toBe("основная функция");
    expect(r!.prefix).toBe("#");
  });

  test("Julia #", () => {
    const r = extractComment("x = 1  # начальное значение", syntax("julia"));
    expect(r).not.toBeNull();
    expect(r!.text).toBe("начальное значение");
  });

  test("PowerShell #", () => {
    const r = extractComment("# получить список файлов", syntax("powershell"));
    expect(r).not.toBeNull();
    expect(r!.text).toBe("получить список файлов");
  });

  test("Erlang %", () => {
    const r = extractComment("% главный модуль", syntax("erlang"));
    expect(r).not.toBeNull();
    expect(r!.text).toBe("главный модуль");
    expect(r!.prefix).toBe("%");
  });

  test("VHDL --", () => {
    const r = extractComment("-- тактовый сигнал", syntax("vhdl"));
    expect(r).not.toBeNull();
    expect(r!.text).toBe("тактовый сигнал");
    expect(r!.prefix).toBe("--");
  });

  test("Verilog //", () => {
    const r = extractComment("// тактовый генератор", syntax("verilog"));
    expect(r).not.toBeNull();
    expect(r!.text).toBe("тактовый генератор");
  });

  test("PHP // prefix", () => {
    const r = extractComment("// получить данные", syntax("php"));
    expect(r).not.toBeNull();
    expect(r!.text).toBe("получить данные");
    expect(r!.prefix).toBe("//");
  });

  test("PHP # prefix", () => {
    const r = extractComment("# получить данные", syntax("php"));
    expect(r).not.toBeNull();
    expect(r!.text).toBe("получить данные");
    expect(r!.prefix).toBe("#");
  });
});

describe("extractComment — OCaml/F# (* *) block comments", () => {
  test("OCaml single-line (* *)", () => {
    const r = extractComment("(* вычислить сумму *)", syntax("ocaml"));
    expect(r).not.toBeNull();
    expect(r!.text).toBe("вычислить сумму");
    expect(r!.prefix).toBe("(*");
    expect(r!.suffix).toBe("*)");
  });

  test("OCaml inline (* *) after code", () => {
    const r = extractComment("let x = 0 (* начальное значение *)", syntax("ocaml"));
    expect(r).not.toBeNull();
    expect(r!.text).toBe("начальное значение");
    expect(r!.suffix).toBe("*)");
  });

  test("F# single-line (* *)", () => {
    const r = extractComment("(* основная функция *)", syntax("fsharp"));
    expect(r).not.toBeNull();
    expect(r!.text).toBe("основная функция");
    expect(r!.prefix).toBe("(*");
    expect(r!.suffix).toBe("*)");
  });

  test("F# line comment //", () => {
    const r = extractComment("// вычислить сумму", syntax("fsharp"));
    expect(r).not.toBeNull();
    expect(r!.text).toBe("вычислить сумму");
    expect(r!.prefix).toBe("//");
  });

  test("empty OCaml block comment returns null", () => {
    expect(extractComment("(**)", syntax("ocaml"))).toBeNull();
    expect(extractComment("(* *)", syntax("ocaml"))).toBeNull();
  });
});

describe("expandRangeForBlocks — OCaml (* *) multi-line", () => {
  const OCAML_BLOCK = { open: "(*", close: "*)" };

  test("selection covers entire block — no change", () => {
    const doc = mockDoc(["(*", " * interior", " *)"]);
    const r = expandRangeForBlocks(doc, 0, 2, OCAML_BLOCK);
    expect(r).toEqual({ startLine: 0, endLine: 2 });
  });

  test("selection starts on interior line — pulls back to (*", () => {
    const doc = mockDoc(["(*", " * interior", " *)"]);
    const r = expandRangeForBlocks(doc, 1, 2, OCAML_BLOCK);
    expect(r.startLine).toBe(0);
    expect(r.endLine).toBe(2);
  });

  test("selection covers only (* opening line — pushes to *)", () => {
    const doc = mockDoc(["(*", " * interior", " *)"]);
    const r = expandRangeForBlocks(doc, 0, 0, OCAML_BLOCK);
    expect(r.startLine).toBe(0);
    expect(r.endLine).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// expandRangeForBlocks
// ---------------------------------------------------------------------------

const C_BLOCK = { open: "/*", close: "*/" };

describe("expandRangeForBlocks — no expansion needed", () => {
  test("single-line /* */ selection does not expand", () => {
    const doc = mockDoc(["/* comment */"]);
    const r = expandRangeForBlocks(doc, 0, 0, C_BLOCK);
    expect(r).toEqual({ startLine: 0, endLine: 0 });
  });

  test("selection with no block comments does not expand", () => {
    const doc = mockDoc(["// line 1", "// line 2"]);
    const r = expandRangeForBlocks(doc, 0, 1, C_BLOCK);
    expect(r).toEqual({ startLine: 0, endLine: 1 });
  });

  test("selection covers entire multi-line block — no change", () => {
    const doc = mockDoc(["/*", " * text", " */"]);
    const r = expandRangeForBlocks(doc, 0, 2, C_BLOCK);
    expect(r).toEqual({ startLine: 0, endLine: 2 });
  });
});

describe("expandRangeForBlocks — start expansion", () => {
  test("selection starts on interior line — pulls back to /*", () => {
    const doc = mockDoc(["/*", " * interior", " */"]);
    const r = expandRangeForBlocks(doc, 1, 2, C_BLOCK);
    expect(r.startLine).toBe(0);
    expect(r.endLine).toBe(2);
  });

  test("selection starts on closing */ line — pulls back to /*", () => {
    const doc = mockDoc(["/*", " * interior", " */"]);
    const r = expandRangeForBlocks(doc, 2, 2, C_BLOCK);
    expect(r.startLine).toBe(0);
  });

  test("closed block above does not cause false expansion", () => {
    const doc = mockDoc(["/* closed */", "// regular", "// regular"]);
    const r = expandRangeForBlocks(doc, 1, 2, C_BLOCK);
    expect(r).toEqual({ startLine: 1, endLine: 2 });
  });
});

describe("expandRangeForBlocks — end expansion", () => {
  test("selection covers only /* opening line — pushes to */", () => {
    const doc = mockDoc(["/*", " * interior", " */"]);
    const r = expandRangeForBlocks(doc, 0, 0, C_BLOCK);
    expect(r.startLine).toBe(0);
    expect(r.endLine).toBe(2);
  });

  test("selection ends on interior line — pushes to */", () => {
    const doc = mockDoc(["/*", " * interior", " */"]);
    const r = expandRangeForBlocks(doc, 0, 1, C_BLOCK);
    expect(r.endLine).toBe(2);
  });
});

describe("expandRangeForBlocks — both ends expand", () => {
  test("selection is only interior lines of a block", () => {
    const doc = mockDoc(["/*", " * line 1", " * line 2", " */"]);
    const r = expandRangeForBlocks(doc, 1, 2, C_BLOCK);
    expect(r.startLine).toBe(0);
    expect(r.endLine).toBe(3);
  });
});
