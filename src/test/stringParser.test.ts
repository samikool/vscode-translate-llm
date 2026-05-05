import { extractStrings } from "../stringParser";

describe("extractStrings — basic extraction", () => {
  test("double-quoted string", () => {
    const r = extractStrings(`const s = "привет мир";`, "javascript");
    expect(r).toHaveLength(1);
    expect(r[0].text).toBe("привет мир");
    expect(r[0].quoteChar).toBe('"');
  });

  test("single-quoted string", () => {
    const r = extractStrings(`msg = 'привет мир'`, "python");
    expect(r).toHaveLength(1);
    expect(r[0].text).toBe("привет мир");
    expect(r[0].quoteChar).toBe("'");
  });

  test("returns start and end positions", () => {
    const line = `x = "привет";`;
    const r = extractStrings(line, "javascript");
    expect(r).toHaveLength(1);
    expect(r[0].start).toBe(4);  // index of opening "
    expect(r[0].end).toBe(11);   // index of closing "
    expect(line[r[0].start]).toBe('"');
    expect(line[r[0].end]).toBe('"');
  });

  test("multiple strings on one line", () => {
    const r = extractStrings(`f("привет", "мир")`, "javascript");
    expect(r).toHaveLength(2);
    expect(r[0].text).toBe("привет");
    expect(r[1].text).toBe("мир");
  });

  test("line with no strings returns empty array", () => {
    expect(extractStrings("const x = 42;", "javascript")).toHaveLength(0);
  });

  test("empty string is skipped", () => {
    expect(extractStrings(`""`, "javascript")).toHaveLength(0);
  });

  test("single-character string is skipped", () => {
    expect(extractStrings(`"x"`, "javascript")).toHaveLength(0);
  });

  test("whitespace-only string is skipped", () => {
    expect(extractStrings(`" "`, "javascript")).toHaveLength(0);
  });
});

describe("extractStrings — escape handling", () => {
  test("escaped quote inside string does not close it early", () => {
    const r = extractStrings(`"it\\'s a test"`, "javascript");
    expect(r).toHaveLength(1);
    expect(r[0].text).toBe("it\\'s a test");
  });

  test("escaped backslash before closing quote", () => {
    const r = extractStrings(`"hello\\\\"`, "javascript");
    expect(r).toHaveLength(1);
    expect(r[0].text).toBe("hello\\\\");
  });
});

describe("extractStrings — comment boundary", () => {
  test("string before inline comment is found", () => {
    const r = extractStrings(`x = "привет"  // comment`, "javascript");
    expect(r).toHaveLength(1);
    expect(r[0].text).toBe("привет");
  });

  test("string after inline comment is not found", () => {
    const r = extractStrings(`// comment "not a string"`, "javascript");
    expect(r).toHaveLength(0);
  });

  test("stops at # comment in Python", () => {
    const r = extractStrings(`x = "привет"  # note: 'not this'`, "python");
    expect(r).toHaveLength(1);
    expect(r[0].text).toBe("привет");
  });

  test("stops at /* in JS", () => {
    const r = extractStrings(`/* "not this" */`, "javascript");
    expect(r).toHaveLength(0);
  });

  test("stops at -- in SQL", () => {
    const r = extractStrings(`-- 'not this'`, "sql");
    expect(r).toHaveLength(0);
  });
});

describe("extractStrings — language-specific quote rules", () => {
  test("C: single-quote not treated as string delimiter", () => {
    const r = extractStrings(`char c = 'x'; char* s = "привет";`, "c");
    expect(r).toHaveLength(1);
    expect(r[0].text).toBe("привет");
  });

  test("Java: single-quote not treated as string delimiter", () => {
    const r = extractStrings(`String s = "привет"; char c = 'z';`, "java");
    expect(r).toHaveLength(1);
    expect(r[0].text).toBe("привет");
  });

  test("Go: single-quote not treated as string delimiter", () => {
    const r = extractStrings(`s := "привет мир"`, "go");
    expect(r).toHaveLength(1);
    expect(r[0].text).toBe("привет мир");
  });

  test("Python: both quote types are strings", () => {
    const r = extractStrings(`a = "привет"; b = 'мир'`, "python");
    expect(r).toHaveLength(2);
  });

  test("Ruby: both quote types are strings", () => {
    const r = extractStrings(`puts "привет мир"`, "ruby");
    expect(r).toHaveLength(1);
  });
});

describe("extractStrings — unterminated strings", () => {
  test("unterminated string yields no result", () => {
    const r = extractStrings(`x = "no closing quote`, "javascript");
    expect(r).toHaveLength(0);
  });

  test("valid string before unterminated string yields the valid one", () => {
    const r = extractStrings(`f("привет", "no close`, "javascript");
    expect(r).toHaveLength(1);
    expect(r[0].text).toBe("привет");
  });
});

describe("extractStrings — MATLAB transpose heuristic", () => {
  test("single-quoted string after = is extracted", () => {
    const r = extractStrings(`x = 'привет мир'`, "matlab");
    expect(r).toHaveLength(1);
    expect(r[0].text).toBe("привет мир");
  });

  test("single-quoted string inside function call is extracted", () => {
    const r = extractStrings(`disp('привет мир')`, "matlab");
    expect(r).toHaveLength(1);
    expect(r[0].text).toBe("привет мир");
  });

  test("transpose after identifier is not treated as string", () => {
    const r = extractStrings(`B = A'`, "matlab");
    expect(r).toHaveLength(0);
  });

  test("transpose after ] is not treated as string", () => {
    const r = extractStrings(`B = [1 2 3]'`, "matlab");
    expect(r).toHaveLength(0);
  });

  test("transpose after ) is not treated as string", () => {
    const r = extractStrings(`B = sum(A)'`, "matlab");
    expect(r).toHaveLength(0);
  });

  test("mixed line: string and transpose — only string extracted", () => {
    const r = extractStrings(`fprintf('%s', A')`, "matlab");
    expect(r).toHaveLength(1);
    expect(r[0].text).toBe("%s");
  });

  test("double-quoted string always extracted regardless of context", () => {
    const r = extractStrings(`x = "привет мир"`, "matlab");
    expect(r).toHaveLength(1);
    expect(r[0].text).toBe("привет мир");
  });
});

describe("extractStrings — template literals", () => {
  test("simple template literal", () => {
    const r = extractStrings("`привет мир`", "typescript");
    expect(r).toHaveLength(1);
    expect(r[0].text).toBe("привет мир");
    expect(r[0].quoteChar).toBe("`");
  });

  test("template literal with interpolation — full content preserved", () => {
    const r = extractStrings("`Числа: ${numbers}`", "typescript");
    expect(r).toHaveLength(1);
    expect(r[0].text).toBe("Числа: ${numbers}");
  });

  test("template literal positions point to backticks", () => {
    const line = "x = `привет мир`";
    const r = extractStrings(line, "javascript");
    expect(r).toHaveLength(1);
    expect(line[r[0].start]).toBe("`");
    expect(line[r[0].end]).toBe("`");
  });

  test("template literal alongside a regular string", () => {
    const r = extractStrings(`f("привет", \`мир\`)`, "javascript");
    expect(r).toHaveLength(2);
    expect(r[0].text).toBe("привет");
    expect(r[1].text).toBe("мир");
  });

  test("backtick not treated as string delimiter in non-template-literal languages", () => {
    expect(extractStrings("`привет мир`", "python")).toHaveLength(0);
    expect(extractStrings("`привет мир`", "ruby")).toHaveLength(0);
  });

  test("empty template literal is skipped", () => {
    expect(extractStrings("``", "typescript")).toHaveLength(0);
  });
});
