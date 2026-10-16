import * as Babel from "@babel/standalone";
const allowed = new Set([
  "react",
  "react/jsx-runtime",
  "react-dom/client",
  "@observatory/lab",
  "remotion",
  "@remotion/player",
]);
export function compile(source: string) {
  if (new TextEncoder().encode(source).length > 65536)
    throw Error("Код должен быть меньше 64 КБ");
  const guardPlugin = ({ types: t }: any) => ({
    visitor: {
      Program(path: any) {
        path.traverse({
          ImportDeclaration(p: any) {
            if (!allowed.has(p.node.source.value))
              throw p.buildCodeFrameError(
                "Недоступный импорт. Используйте встроенные библиотеки.",
              );
          },
          ExportNamedDeclaration(p: any) {
            if (p.node.source && !allowed.has(p.node.source.value))
              throw p.buildCodeFrameError("Недоступный импорт");
          },
          CallExpression(p: any) {
            const c = p.node.callee;
            let arity = 0;
            if (
              c.type === "MemberExpression" &&
              c.object.type === "Identifier" &&
              c.object.name === "trace" &&
              c.property.type === "Identifier"
            )
              arity =
                (
                  {
                    render: 2,
                    snapshot: 2,
                    action: 2,
                    effect: 3,
                    cleanup: 2,
                    event: 2,
                  } as Record<string, number>
                )[c.property.name] || 0;
            if (c.type === "Identifier" && c.name === "useSnapshot") arity = 2;
            if (arity && p.node.arguments.length <= arity && p.node.loc) {
              while (p.node.arguments.length < arity)
                p.node.arguments.push(t.identifier("undefined"));
              p.node.arguments.push(t.numericLiteral(p.node.loc.start.line));
            }
            if (
              p.node.callee.type === "Import" ||
              (p.node.callee.type === "Identifier" &&
                p.node.callee.name === "require")
            )
              throw p.buildCodeFrameError(
                "Динамические импорты и require недоступны",
              );
          },
          MetaProperty(p: any) {
            throw p.buildCodeFrameError("import.meta недоступен");
          },
        });
      },
      Loop(path: any) {
        const call = t.expressionStatement(
          t.callExpression(t.identifier("__guard"), []),
        );
        if (!t.isBlockStatement(path.node.body))
          path.node.body = t.blockStatement([path.node.body]);
        path.node.body.body.unshift(call);
      },
      Function(path: any) {
        const call = t.expressionStatement(
          t.callExpression(t.identifier("__guard"), []),
        );
        if (t.isBlockStatement(path.node.body))
          path.node.body.body.unshift(call);
        else
          path.node.body = t.blockStatement([
            call,
            t.returnStatement(path.node.body),
          ]);
      },
    },
  });
  const result = Babel.transform(source, {
    filename: "App.tsx",
    presets: [
      [
        "typescript",
        { allExtensions: true, isTSX: true, onlyRemoveTypeImports: true },
      ],
      ["react", { runtime: "automatic", development: false }],
    ],
    plugins: [guardPlugin, "transform-modules-commonjs"],
    retainLines: true,
    sourceMaps: "inline",
  });
  return result.code || "";
}
