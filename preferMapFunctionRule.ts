import * as ts from "typescript";
import * as Lint from "../index";

export class Rule extends Lint.Rules.AbstractRule {
    /* tslint:disable:object-literal-sort-keys */
    public static metadata: Lint.IRuleMetadata = {
        ruleName: "prefer-map-function",
        description: "Recommends a map-function over a standard 'forof' loop if only another array is populated based on the array of the forof-loop",
        hasFix: true,
        rationale: "A map function reduces the complexity of code.",
        optionsDescription: "Not configurable.",
        options: null,
        optionExamples: [true],
        type: "typescript",
        typescriptOnly: false,
    };
    /* tslint:enable:object-literal-sort-keys */

    public static FAILURE_STRING = "Expected a map-function instead of a 'forof' loop";

    public apply(sourceFile: ts.SourceFile): Lint.RuleFailure[] {
        return this.applyWithFunction(sourceFile, walk);
    }
}

function walk(ctx: Lint.WalkContext<void>): void {
    const { sourceFile } = ctx;

    return ts.forEachChild(sourceFile, function cb(node): void {
        if (node.kind === ts.SyntaxKind.ForOfStatement) {
            const forofnode: ts.ForOfStatement = node as ts.ForOfStatement;
            if (canBeConvertedToMap(forofnode)) {
                visitForOfStatement(forofnode);
            }
        }
        return ts.forEachChild(node, cb);
    });

    function visitForOfStatement(node: ts.ForOfStatement): void {
        const mapCode: string = getMapTypescriptCode(node);
        const fix = new Lint.Replacement(node.getStart(sourceFile), node.getWidth(), mapCode);
        ctx.addFailureAtNode(node, Rule.FAILURE_STRING, fix);
    }
}

function getMapTypescriptCode(pNode: ts.ForOfStatement): string {
    const node = getMapArrayFunction(pNode, false);
    const tsCode = getTypescriptCode(node);
    // if (pOptions.emitJs) {
    //     return transpileToJavascript(tsCode);
    // }
    return tsCode;
}
function getTypescriptCode(pNode: ts.Node): string {
    const dummyFile: ts.SourceFile = ts.createSourceFile("dummy.ts", "", ts.ScriptTarget.Latest, false, ts.ScriptKind.TS);
    const printer: ts.Printer = ts.createPrinter();
    return printer.printNode(ts.EmitHint.Unspecified, pNode, dummyFile);
}

// function transpileToJavascript(pTsCode: string): string {
//     const transpileOptions: ts.TranspileOptions = {
//         compilerOptions: {
//             target: pOptions.jsScriptTarget,
//         },
//     };
//     const jsCode: ts.TranspileOutput = ts.transpileModule(pTsCode, transpileOptions);
//     return jsCode.outputText;
// }

// function makeMapFunctionNode(): ts.Node {
//     const paramName: ts.Identifier = ts.createIdentifier("a");
//     const param: ts.ParameterDeclaration = ts.createParameter(
//         /* decorators */        undefined,
//         /* modifiers */         undefined,
//         /* dotDotDotToken */    undefined,
//                                 paramName,
//         /* questionToken */     undefined,
//         /* type */              undefined,
//         /* initializer */       undefined);
//     const parameters: ReadonlyArray<ts.ParameterDeclaration> = [param];
//
//     const arrow: ts.ArrowFunction = ts.createArrowFunction(
//         /* modifiers */                 undefined,
//         /* typeParameters */            undefined,
//                                         parameters,
//         /* type */                      undefined,
//         /* equalsGreaterThanToken */    undefined,
//                                         paramName);
//
//     const assRightHand: ts.CallExpression = ts.createCall(ts.createPropertyAccess(ts.createIdentifier("arr"), "map"), undefined, [arrow]);
//     const assLefHand: ts.Identifier = ts.createIdentifier("output");
//
//     return ts.createStatement(ts.createAssignment(assLefHand, assRightHand));
// }

function canBeConvertedToMap(pNode: ts.ForOfStatement): boolean {
    if (pNode) {
        const forofBody: ts.Statement = pNode.statement;
        const statementKind: ts.SyntaxKind = forofBody.kind;

        // forof with a block
        if (statementKind === ts.SyntaxKind.Block) {
            // last statement must be an array push node
            const block: ts.Block = forofBody as ts.Block;
            const len: number = block.statements.length;
            if (len > 0) {
                const lastNodeIsArrayPush: boolean = isArrayPushNode(block.statements[len - 1]);
                if (lastNodeIsArrayPush) {
                    // need to check for break/continue/return (should not be present)
                    // should not push several times to the same array
                    return true;
                }
                return false;
            }
        } else {
            // forof with a single statement
            if (statementKind === ts.SyntaxKind.ExpressionStatement) {
                return isArrayPushNode(forofBody);
            }
        }
    }
    return false;
}

function isArrayPushNode(pNode: ts.Node): boolean {
    if (pNode.kind !== ts.SyntaxKind.ExpressionStatement) {
        return false;
    }
    const node: ts.ExpressionStatement = pNode as ts.ExpressionStatement;
    if (node.expression.kind !== ts.SyntaxKind.CallExpression) {
        return false;
    }

    const callExpression: ts.CallExpression = node.expression as ts.CallExpression;
    if (callExpression.expression.kind !== ts.SyntaxKind.PropertyAccessExpression) {
        return false;
    }

    const propaccessExpression: ts.PropertyAccessExpression = callExpression.expression as ts.PropertyAccessExpression;

    const functionName: ts.Identifier = propaccessExpression.name;
    if (functionName.text !== "push") {
        return false;
    }

    if (propaccessExpression.expression.kind !== ts.SyntaxKind.Identifier) {
        return false;
    }

    /*
        we could check whether arrayName is of type array, but we will not do
        this as we think it is bad practice to make a push method on something
        that is not an array. We assume that this will not happen in real code.
    */
    // const arrayName: ts.Identifier = <ts.Identifier> propaccessExpression.expression;

    return true;
}

function getMapArrayFunction(pNode: ts.ForOfStatement, pUseConcat: boolean): ts.Node {
    /*
    for (const el of input) {
        const x = el * 2;
        output.push(x)
    }
    */
    const forOfInitializer: string = getForOfInitializer(pNode); // el
    const forOfExpression: ts.Expression = pNode.expression; // input
    const forOfBody: ts.Statement = pNode.statement; // const x ... push(x);
    const pushInfo: IArrayPushInfo = getForOfArrayPushInfo(forOfBody);

    const mapBody: ts.ArrowFunction = createMapBody(forOfBody, forOfInitializer, pushInfo.args); // el => { const x ... return x; }
    let mapNode: ts.ExpressionStatement = createArrayMapNode(forOfExpression, mapBody); // input.map(...)

    if (pUseConcat) {
        mapNode = createArrayConcatNode(pushInfo.arrayName, mapNode); // output.concat(input.map ...)
    }

    const completeNode: ts.Node = createAssignment(pushInfo.arrayName, mapNode); // output = input.map ...  || output = output.concat(...
    return completeNode;
}

interface IArrayPushInfo {
    arrayName: string;
    args: ts.Expression;
}

function getForOfInitializer(pNode: ts.ForOfStatement): string {
    const forOfIdentifier: ts.ForInitializer = pNode.initializer;
    if (forOfIdentifier.kind === ts.SyntaxKind.Identifier) {
        return (forOfIdentifier as ts.Identifier).text;
    }
    const vars: ts.VariableDeclarationList = forOfIdentifier as ts.VariableDeclarationList;
    return (vars.declarations[0].name as ts.Identifier).text;
}

function getForOfArrayPushInfo(pForOfBody: ts.Statement): IArrayPushInfo {
    const statementKind: ts.SyntaxKind = pForOfBody.kind;

    // forof with a block
    if (statementKind === ts.SyntaxKind.Block) {
        // last statement must be an array push node
        const block: ts.Block = pForOfBody as ts.Block;
        const len: number = block.statements.length;
        return getArrayPushInfo(block.statements[len - 1]);
    }
    return getArrayPushInfo(pForOfBody);
}

function getArrayPushInfo(pNode: ts.Node): IArrayPushInfo {
    const node: ts.ExpressionStatement = pNode as ts.ExpressionStatement;
    const callExpression: ts.CallExpression = node.expression as ts.CallExpression;
    return {
        "arrayName": ((callExpression.expression as ts.PropertyAccessExpression).expression as ts.Identifier).text,
        "args": callExpression.arguments[0],
    };
}

function createMapBody(pForOfBody: ts.Statement, pInitializer: string, pPushArgs: ts.Expression): ts.ArrowFunction {
    const statementKind: ts.SyntaxKind = pForOfBody.kind;

    let body: ts.ConciseBody = pPushArgs;
    // forof with a block
    if (statementKind === ts.SyntaxKind.Block) {
        // last statement must be an array push node
        const block: ts.Block = pForOfBody as ts.Block;
        const len: number = block.statements.length;
        if (len > 0) {
            if (len > 1) {
                let statements: ts.Statement[] = block.statements.slice(0, len - 1);
                statements = statements.concat(ts.createReturn(pPushArgs));
                body = ts.createBlock(statements, true);
            }
        }
    }

    const paramName: ts.Identifier = ts.createIdentifier(pInitializer);
    const param: ts.ParameterDeclaration = ts.createParameter(
        /*decorators*/      undefined,
        /*modifiers*/       undefined,
        /*dotDotDotToken*/  undefined,
                            paramName,
        /*questionToken*/   undefined,
        /*type*/            undefined,
        /*initializer*/     undefined);
    const parameters: ReadonlyArray<ts.ParameterDeclaration> = [param];

    const arrow: ts.ArrowFunction = ts.createArrowFunction(
        /*modifiers*/               undefined,
        /*typeParameters*/          undefined,
                                    parameters,
        /*type*/                    undefined,
        /*equalsGreaterThanToken*/  undefined,
                                    body);

    return arrow;
}

function createArrayMapNode(pArray: ts.Expression, pElementToPush: ts.ArrowFunction): ts.ExpressionStatement {
    const mapName: ts.Identifier = ts.createIdentifier("map");
    const properyAccess: ts.PropertyAccessExpression = ts.createPropertyAccess(
        pArray,
        mapName);

    const args: ReadonlyArray<ts.Expression> = [pElementToPush];

    const call: ts.CallExpression = ts.createCall(
                            properyAccess,
        /*typeArguments*/   undefined,
                            args);

    const completeNode: ts.ExpressionStatement = ts.createStatement(call);
    return completeNode;
}

function createArrayConcatNode(pArrayName: string, pElementToPush: ts.ExpressionStatement): ts.ExpressionStatement {
    const array: ts.Identifier = ts.createIdentifier(pArrayName);
    const mapName: ts.Identifier = ts.createIdentifier("concat");
    const properyAccess: ts.PropertyAccessExpression = ts.createPropertyAccess(
        array,
        mapName);

    const args: ReadonlyArray<ts.Expression> = [pElementToPush.expression];

    const call: ts.CallExpression = ts.createCall(
                            properyAccess,
        /*typeArguments*/   undefined,
                            args);

    const completeNode: ts.ExpressionStatement = ts.createStatement(call);
    return completeNode;
}

function createAssignment(pArrayName: string, pValue: ts.ExpressionStatement): ts.Node {
    const array: ts.Identifier = ts.createIdentifier(pArrayName);
    const assignment: ts.BinaryExpression = ts.createBinary(array, ts.SyntaxKind.FirstAssignment, pValue.expression);
    const retval: ts.Statement = ts.createStatement(assignment);
    return retval;
}
