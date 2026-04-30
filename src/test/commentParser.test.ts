import { extractComment, expandRangeForBlocks, DocLike } from "../commentParser";

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
    const r = extractComment("# define numbers", "python");
    expect(r).not.toBeNull();
    expect(r!.text).toBe("define numbers");
    expect(r!.prefix).toBe("#");
    expect(r!.suffix).toBe("");
  });

  test("Python inline #", () => {
    const r = extractComment("x = 1  # inline comment", "python");
    expect(r).not.toBeNull();
    expect(r!.text).toBe("inline comment");
  });

  test("JS full-line //", () => {
    const r = extractComment("// calculate total", "javascript");
    expect(r).not.toBeNull();
    expect(r!.text).toBe("calculate total");
    expect(r!.prefix).toBe("//");
  });

  test("JS inline //", () => {
    const r = extractComment("const x = 1; // inline", "javascript");
    expect(r).not.toBeNull();
    expect(r!.text).toBe("inline");
  });

  test("SQL full-line --", () => {
    const r = extractComment("-- select all rows", "sql");
    expect(r).not.toBeNull();
    expect(r!.text).toBe("select all rows");
    expect(r!.prefix).toBe("--");
  });

  test("line with no comment returns null", () => {
    expect(extractComment("const x = 42;", "javascript")).toBeNull();
  });

  test("empty line returns null", () => {
    expect(extractComment("", "python")).toBeNull();
  });

  test("// inside a string is not treated as a comment", () => {
    const r = extractComment('const url = "http://example.com"; // real comment', "javascript");
    expect(r).not.toBeNull();
    expect(r!.text).toBe("real comment");
  });
});

describe("extractComment — single-line block comments", () => {
  test("C single-line /* */", () => {
    const r = extractComment("/* calculate sum */", "c");
    expect(r).not.toBeNull();
    expect(r!.text).toBe("calculate sum");
    expect(r!.prefix).toBe("/*");
    expect(r!.suffix).toBe("*/");
  });

  test("C decorated /* --- text --- */", () => {
    const r = extractComment("/* ------ main entry point ------ */", "c");
    expect(r).not.toBeNull();
    expect(r!.text).toBe("------ main entry point ------");
    expect(r!.suffix).toBe("*/");
  });

  test("C inline block after code", () => {
    const r = extractComment("int x = 0; /* initial value */", "c");
    expect(r).not.toBeNull();
    expect(r!.text).toBe("initial value");
    expect(r!.suffixStart).toBe("int x = 0; /* initial value ".length);
  });

  test("HTML <!-- -->", () => {
    const r = extractComment("<!-- page header -->", "html");
    expect(r).not.toBeNull();
    expect(r!.text).toBe("page header");
    expect(r!.prefix).toBe("<!--");
    expect(r!.suffix).toBe("-->");
  });

  test("empty block comment returns null", () => {
    expect(extractComment("/**/", "javascript")).toBeNull();
    expect(extractComment("/* */", "javascript")).toBeNull();
  });

  test("// before /* means line comment wins", () => {
    const r = extractComment("// not a /* block */", "javascript");
    expect(r).not.toBeNull();
    expect(r!.prefix).toBe("//");
    expect(r!.text).toBe("not a /* block */");
  });

  test("CSS has no line comments — only block", () => {
    const r = extractComment("/* color: red */", "css");
    expect(r).not.toBeNull();
    expect(r!.prefix).toBe("/*");
    expect(r!.suffix).toBe("*/");
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
