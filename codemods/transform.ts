import { Project, SyntaxKind, Node, SourceFile, FunctionDeclaration } from "ts-morph";

interface MemberMapping {
  oldName: string;
  newName: string;
  kind: "function" | "variable" | "type" | "interface" | "enum";
}

interface Target {
  containerName: string;
  filePath: string;
  members: MemberMapping[];
  kind: "namespace" | "class";
}

function main(): void {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const typeFilter = args.find((a) => a.startsWith("--type="))?.split("=")[1] || "all";
  const targetFilter = args.find((a) => a.startsWith("--target="))?.split("=")[1];
  const fileFilter = args.find((a) => a.startsWith("--file="))?.split("=")[1];

  console.log("Loading project...");
  const project = new Project({
    tsConfigFilePath: "./tsconfig.json",
    skipAddingFilesFromTsConfig: false,
  });

  const targets = findTargets(project, typeFilter, targetFilter, fileFilter);
  console.log(`Found ${targets.length} targets to transform\n`);

  if (dryRun) {
    for (const t of targets) {
      const memberCount = t.members.length;
      console.log(`${t.kind}: ${t.containerName} (${memberCount} members) — ${t.filePath}`);
      for (const m of t.members) {
        console.log(`    ${m.oldName} → ${m.newName} [${m.kind}]`);
      }
    }
    return;
  }

  for (const target of targets) {
    try {
      processTarget(project, target);
    } catch (e) {
      console.error(`FAILED to process ${target.containerName}: ${e}`);
    }
  }

  console.log("\nSaving...");
  project.saveSync();
  console.log("Done!");
}

function findTargets(project: Project, typeFilter: string, targetFilter?: string, fileFilter?: string): Target[] {
  const targets: Target[] = [];

  for (const sf of project.getSourceFiles()) {
    const fp = sf.getFilePath();
    if (fp.includes("node_modules") || fp.endsWith(".d.ts") || fp.includes("/worktrees/") || fp.includes("/lambda/scripts/")) continue;
    if (fileFilter && !fp.includes(fileFilter)) continue;

    if (typeFilter === "all" || typeFilter === "namespace") {
      for (const ns of sf.getModules()) {
        if (!ns.isExported()) continue;
        const name = ns.getName();
        if (targetFilter && name !== targetFilter) continue;

        const members: MemberMapping[] = [];

        for (const fn of ns.getFunctions()) {
          if (!fn.isExported()) continue;
          const fnName = fn.getName();
          if (!fnName) continue;
          members.push({ oldName: fnName, newName: `${name}_${fnName}`, kind: "function" });
        }
        for (const vs of ns.getVariableStatements()) {
          if (!vs.isExported()) continue;
          for (const vd of vs.getDeclarations()) {
            members.push({ oldName: vd.getName(), newName: `${name}_${vd.getName()}`, kind: "variable" });
          }
        }
        for (const ta of ns.getTypeAliases()) {
          if (!ta.isExported()) continue;
          members.push({ oldName: ta.getName(), newName: `${name}_${ta.getName()}`, kind: "type" });
        }
        for (const iface of ns.getInterfaces()) {
          if (!iface.isExported()) continue;
          members.push({ oldName: iface.getName(), newName: `${name}_${iface.getName()}`, kind: "interface" });
        }
        for (const en of ns.getEnums()) {
          if (!en.isExported()) continue;
          members.push({ oldName: en.getName(), newName: `${name}_${en.getName()}`, kind: "enum" });
        }

        if (members.length > 0) {
          targets.push({ containerName: name, filePath: fp, members, kind: "namespace" });
        }
      }
    }

    if (typeFilter === "all" || typeFilter === "class") {
      for (const cls of sf.getClasses()) {
        if (!cls.isExported()) continue;
        const allMembers = cls.getMembers();
        if (allMembers.length === 0) continue;

        const allStatic = allMembers.every((m) => {
          if (Node.isConstructorDeclaration(m)) return false;
          if (Node.isMethodDeclaration(m)) return m.isStatic();
          if (Node.isPropertyDeclaration(m)) return m.isStatic();
          if (Node.isGetAccessorDeclaration(m)) return m.isStatic();
          if (Node.isSetAccessorDeclaration(m)) return m.isStatic();
          return false;
        });
        if (!allStatic) continue;

        const name = cls.getName();
        if (!name) continue;
        if (targetFilter && name !== targetFilter) continue;

        const memberMappings: MemberMapping[] = [];
        for (const method of cls.getMethods()) {
          memberMappings.push({ oldName: method.getName(), newName: `${name}_${method.getName()}`, kind: "function" });
        }
        for (const prop of cls.getProperties()) {
          memberMappings.push({
            oldName: prop.getName(),
            newName: `${name}_${prop.getName()}`,
            kind: "variable",
          });
        }

        if (memberMappings.length > 0) {
          targets.push({ containerName: name, filePath: fp, members: memberMappings, kind: "class" });
        }
      }
    }
  }

  return targets;
}

function getMemberDeclaration(
  container: ReturnType<SourceFile["getModuleOrThrow"]> | ReturnType<SourceFile["getClassOrThrow"]>,
  member: MemberMapping,
  kind: "namespace" | "class"
): Node | undefined {
  if (kind === "namespace") {
    const ns = container as ReturnType<SourceFile["getModuleOrThrow"]>;
    switch (member.kind) {
      case "function": {
        const fns = ns.getFunctions().filter((f) => f.getName() === member.oldName);
        return fns[0];
      }
      case "variable": {
        for (const vs of ns.getVariableStatements()) {
          for (const vd of vs.getDeclarations()) {
            if (vd.getName() === member.oldName) return vd;
          }
        }
        return undefined;
      }
      case "type":
        return ns.getTypeAlias(member.oldName);
      case "interface":
        return ns.getInterface(member.oldName);
      case "enum":
        return ns.getEnum(member.oldName);
    }
  } else {
    const cls = container as ReturnType<SourceFile["getClassOrThrow"]>;
    switch (member.kind) {
      case "function":
        return cls.getMethod(member.oldName);
      case "variable":
        return cls.getProperty(member.oldName);
    }
  }
  return undefined;
}

function processTarget(project: Project, target: Target): void {
  console.log(`Processing ${target.kind}: ${target.containerName} (${target.filePath})`);

  const sourceFile = project.getSourceFileOrThrow(target.filePath);

  const container =
    target.kind === "namespace"
      ? sourceFile.getModuleOrThrow(target.containerName)
      : sourceFile.getClassOrThrow(target.containerName);

  // Phase 1: Rename all exported members using the language service.
  // This updates ALL references (internal and external) automatically.
  // External: Foo.bar → Foo.Foo_bar (we fix the Foo. prefix in phase 2)
  // Internal (namespace): bar() → Foo_bar() (correct already)
  const renamedMembers: string[] = [];
  for (const member of target.members) {
    const decl = getMemberDeclaration(container, member, target.kind);
    if (!decl) {
      console.warn(`  WARNING: Could not find ${member.kind} ${member.oldName}, skipping`);
      continue;
    }

    // Handle overloaded functions - rename all overloads
    if (member.kind === "function" && target.kind === "namespace") {
      const ns = container as ReturnType<SourceFile["getModuleOrThrow"]>;
      const overloads = ns.getFunctions().filter((f) => f.getName() === member.oldName);
      if (overloads.length > 1) {
        // Rename via the implementation (last one), which renames all overloads
        const impl = overloads[overloads.length - 1];
        impl.getNameNode()!.rename(member.newName);
      } else {
        (decl as FunctionDeclaration).getNameNode()!.rename(member.newName);
      }
    } else {
      const nameNode = (decl as any).getNameNode?.();
      if (nameNode) {
        nameNode.rename(member.newName);
      } else {
        console.warn(`  WARNING: No name node for ${member.oldName}, skipping rename`);
        continue;
      }
    }

    renamedMembers.push(member.newName);
    console.log(`  Renamed: ${member.oldName} → ${member.newName}`);
  }

  // Phase 2: Fix property accesses across the project.
  // After rename(), external code has Foo.Foo_bar — we need to replace with just Foo_bar.
  // Also handle qualified names in type positions (Foo.Foo_Bar → Foo_Bar).
  const memberNewNames = new Set(renamedMembers);
  const usagesByFile = new Map<string, Set<string>>();

  for (const sf of project.getSourceFiles()) {
    const fp = sf.getFilePath();
    if (fp.includes("node_modules") || fp.endsWith(".d.ts") || fp.includes("/worktrees/") || fp.includes("/lambda/scripts/")) continue;

    const replacements: { node: Node; newText: string }[] = [];
    const fileUsages = new Set<string>();

    sf.forEachDescendant((node) => {
      // Handle Foo.Foo_bar in expression positions
      if (Node.isPropertyAccessExpression(node)) {
        const expr = node.getExpression();
        if (Node.isIdentifier(expr) && expr.getText() === target.containerName) {
          const propName = node.getName();
          if (memberNewNames.has(propName)) {
            replacements.push({ node, newText: propName });
            fileUsages.add(propName);
          }
        }
      }

      // Handle Foo.Foo_Bar in type positions (QualifiedName)
      if (node.getKind() === SyntaxKind.QualifiedName) {
        const left = node.getChildAtIndex(0);
        const right = node.getChildAtIndex(2); // index 1 is the dot
        if (left && right && Node.isIdentifier(left) && left.getText() === target.containerName) {
          const rightText = right.getText();
          if (memberNewNames.has(rightText)) {
            replacements.push({ node, newText: rightText });
            fileUsages.add(rightText);
          }
        }
      }
    });

    // Apply replacements in reverse position order
    replacements.sort((a, b) => b.node.getStart() - a.node.getStart());
    for (const { node, newText } of replacements) {
      node.replaceWithText(newText);
    }

    if (fileUsages.size > 0 && fp !== target.filePath) {
      usagesByFile.set(fp, fileUsages);
    }
  }

  // Phase 2b: Warn about files that import the container but had no detected property accesses.
  // These may use the container as a value (e.g., sandbox.stub(Foo, "bar")) and need manual fixing.
  for (const sf of project.getSourceFiles()) {
    const fp = sf.getFilePath();
    if (fp.includes("node_modules") || fp.endsWith(".d.ts") || fp.includes("/worktrees/") || fp.includes("/lambda/scripts/")) continue;
    if (fp === target.filePath) continue;
    if (usagesByFile.has(fp)) continue;

    const hasImport = sf.getImportDeclarations().some((imp) =>
      imp.getNamedImports().some((ni) => ni.getName() === target.containerName)
    );
    if (hasImport) {
      console.warn(`  WARNING: ${fp} imports ${target.containerName} but no property accesses were found — needs manual fix`);
    }
  }

  // Phase 3: Unwrap the declaration
  if (target.kind === "namespace") {
    unwrapNamespace(sourceFile, target.containerName);
  } else {
    unwrapStaticClass(sourceFile, target.containerName);
  }

  // Phase 4: Update imports in consuming files
  updateImports(project, target, usagesByFile);

  console.log(`  Updated imports in ${usagesByFile.size} files`);
}

function unwrapNamespace(sourceFile: SourceFile, namespaceName: string): void {
  const ns = sourceFile.getModuleOrThrow(namespaceName);

  // Collect all member texts
  const memberTexts: string[] = [];

  // Non-exported functions (internal helpers)
  for (const fn of ns.getFunctions()) {
    let text = fn.getFullText();
    // Trim leading newlines but keep indentation-stripped version
    text = text.replace(/^\n+/, "");
    // Remove the 'export' keyword for non-exported, add for exported
    if (!fn.isExported()) {
      memberTexts.push(text.replace(/^(\s*)/, ""));
    } else {
      // Already has 'export' keyword
      memberTexts.push(text.replace(/^(\s*)export\s+/, "export "));
    }
  }

  for (const vs of ns.getVariableStatements()) {
    let text = vs.getFullText().replace(/^\n+/, "");
    if (!vs.isExported()) {
      memberTexts.push(text.replace(/^(\s*)/, ""));
    } else {
      memberTexts.push(text.replace(/^(\s*)export\s+/, "export "));
    }
  }

  for (const ta of ns.getTypeAliases()) {
    let text = ta.getFullText().replace(/^\n+/, "");
    if (!ta.isExported()) {
      memberTexts.push(text.replace(/^(\s*)/, ""));
    } else {
      memberTexts.push(text.replace(/^(\s*)export\s+/, "export "));
    }
  }

  for (const iface of ns.getInterfaces()) {
    let text = iface.getFullText().replace(/^\n+/, "");
    if (!iface.isExported()) {
      memberTexts.push(text.replace(/^(\s*)/, ""));
    } else {
      memberTexts.push(text.replace(/^(\s*)export\s+/, "export "));
    }
  }

  for (const en of ns.getEnums()) {
    let text = en.getFullText().replace(/^\n+/, "");
    if (!en.isExported()) {
      memberTexts.push(text.replace(/^(\s*)/, ""));
    } else {
      memberTexts.push(text.replace(/^(\s*)export\s+/, "export "));
    }
  }

  // Replace namespace with extracted members
  // Unindent by 2 spaces (the namespace body indentation)
  const unindented = memberTexts
    .map((text) =>
      text
        .split("\n")
        .map((line) => line.replace(/^  /, ""))
        .join("\n")
    )
    .join("\n\n");

  ns.replaceWithText(unindented);
}

function unwrapStaticClass(sourceFile: SourceFile, className: string): void {
  const cls = sourceFile.getClassOrThrow(className);
  const memberTexts: string[] = [];

  for (const method of cls.getMethods()) {
    let text = method.getFullText().replace(/^\n+/, "");
    // Remove access modifiers and static keyword, add export function
    text = text.replace(/^(\s*)(public\s+|private\s+|protected\s+)?(static\s+)?(async\s+)?/, (_, _ws, _access, _static, asyncKw) => {
      return "export " + (asyncKw || "") + "function ";
    });
    memberTexts.push(text);
  }

  for (const prop of cls.getProperties()) {
    let text = prop.getFullText().replace(/^\n+/, "");
    const isReadonly = prop.isReadonly();
    // Remove access modifiers, static, readonly; add export const/let
    text = text.replace(
      /^(\s*)(public\s+|private\s+|protected\s+)?(static\s+)?(readonly\s+)?/,
      isReadonly ? "export const " : "export let "
    );
    memberTexts.push(text);
  }

  // Unindent by 2 spaces (class body indentation)
  const unindented = memberTexts
    .map((text) =>
      text
        .split("\n")
        .map((line) => line.replace(/^  /, ""))
        .join("\n")
    )
    .join("\n\n");

  cls.replaceWithText(unindented);
}

function updateImports(project: Project, target: Target, usagesByFile: Map<string, Set<string>>): void {
  for (const [filePath, usedNames] of usagesByFile) {
    const sf = project.getSourceFileOrThrow(filePath);

    // Find the import declaration that imports our container
    const importDecl = sf.getImportDeclarations().find((imp) => {
      return imp.getNamedImports().some((ni) => ni.getName() === target.containerName);
    });

    if (!importDecl) {
      // Maybe it's a type-only import
      const typeImportDecl = sf.getImportDeclarations().find((imp) => {
        return imp.getNamedImports().some((ni) => ni.getName() === target.containerName);
      });
      if (!typeImportDecl) continue;
    }

    if (!importDecl) continue;

    // Check if this is a type-only import
    const isTypeOnly = importDecl.isTypeOnly();
    const moduleSpecifier = importDecl.getModuleSpecifierValue();

    // Remove the container from named imports
    const namedImport = importDecl.getNamedImports().find((ni) => ni.getName() === target.containerName);
    if (namedImport) {
      const isNamedTypeOnly = namedImport.isTypeOnly();
      namedImport.remove();

      // Add individual member imports
      const newImports = Array.from(usedNames).map((name) => {
        // Check if this member is a type
        const member = target.members.find((m) => m.newName === name);
        const isType = member && (member.kind === "type" || member.kind === "interface");
        if (isType && !isTypeOnly) {
          return { name, isTypeOnly: true };
        }
        if (isNamedTypeOnly) {
          return { name, isTypeOnly: true };
        }
        return { name };
      });

      if (importDecl.getNamedImports().length === 0 && !importDecl.getDefaultImport() && !importDecl.getNamespaceImport()) {
        // Import is now empty, replace with new import
        importDecl.addNamedImports(newImports);
      } else {
        // Import has other things, add our members
        importDecl.addNamedImports(newImports);
      }

      // Clean up: if import has no specifiers at all, remove it
      if (
        importDecl.getNamedImports().length === 0 &&
        !importDecl.getDefaultImport() &&
        !importDecl.getNamespaceImport()
      ) {
        importDecl.remove();
      }
    }
  }
}

main();
