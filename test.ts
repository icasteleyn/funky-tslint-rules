import * as ts from "typescript";

function logExerciseToConsole(pName: string, pNode: ts.Node, pEmitTypescript: boolean, pEmitJs: boolean): void {
    if (!pEmitTypescript && !pEmitJs) {
        return;
    }

    console.log("--------- BEGIN " + pName + " ---------");
    const tsCode: string = getTypeScriptCode(pNode);
    if (pEmitTypescript) {
        logToConsole("tscode:", tsCode);
    }

    const jsCode: string = transpileToJavascript(tsCode);
    if (pEmitJs) {
        logToConsole("jscode:", jsCode);
    }
    console.log("---------- END " + pName + " ----------");
}

function logToConsole(pPrefix: string, pCode: string): void {
    console.log(pPrefix);
    console.log(pCode);
}

function makeFactorialFunction(): ts.FunctionDeclaration {
    const functionName: ts.Identifier = ts.createIdentifier("factorial");
    const paramName: ts.Identifier = ts.createIdentifier("n");
    const parameter: ts.ParameterDeclaration = ts.createParameter(
        /*decorators*/ undefined,
        /*modifiers*/ undefined,
        /*dotDotDotToken*/ undefined,
        paramName);

    const condition: ts.BinaryExpression = ts.createBinary(
        paramName,
        ts.SyntaxKind.LessThanEqualsToken,
        ts.createLiteral(1));

    const ifBody: ts.Block = ts.createBlock(
        [ts.createReturn(ts.createLiteral(1))],
        /*multiline*/ true);
    const decrementedArg: ts.BinaryExpression = ts.createBinary(paramName, ts.SyntaxKind.MinusToken, ts.createLiteral(1));
    const recurse: ts.BinaryExpression = ts.createBinary(
        paramName,
        ts.SyntaxKind.AsteriskToken,
        ts.createCall(functionName, /*typeArgs*/undefined, [decrementedArg]));
    const statements: ReadonlyArray<ts.Statement> = [
        ts.createIf(condition, ifBody),
        ts.createReturn(
            recurse
        ),
    ];

    return ts.createFunctionDeclaration(
        /*decorators*/ undefined,
        /*modifiers*/ undefined, // [ts.createToken(ts.SyntaxKind.ExportKeyword)],
        /*asteriskToken*/ undefined,
        functionName,
        /*typeParameters*/ undefined,
        [parameter],
        /*returnType*/ ts.createKeywordTypeNode(ts.SyntaxKind.NumberKeyword),
        ts.createBlock(statements, /*multiline*/ true),
    );
}

function getTypeScriptCode(pNode: ts.Node): string {
    const dummyFile: ts.SourceFile = ts.createSourceFile("dummy.ts", "", ts.ScriptTarget.Latest, false, ts.ScriptKind.TS);
    const printer: ts.Printer = ts.createPrinter();
    return printer.printNode(ts.EmitHint.Unspecified, pNode, dummyFile);
}

function transpileToJavascript(pTsCode: string): string {
    const transpileOptions: ts.TranspileOptions = {
        compilerOptions: {
        }
    };
    const jsCode: ts.TranspileOutput = ts.transpileModule(pTsCode, transpileOptions);
    return jsCode.outputText;
}

function makeTestNode(): ts.ArrowFunction {
    const paramName: ts.Identifier = ts.createIdentifier("a");
    const param: ts.ParameterDeclaration = ts.createParameter(
        /*decorators*/ undefined,
        /*modifiers*/ undefined,
        /*dotDotDotToken*/ undefined,
        paramName,
        /*questionToken*/ undefined,
        /*type*/ undefined,
        /*initializer*/ undefined);
    const parameters: ReadonlyArray<ts.ParameterDeclaration> = [param];

    // const body: ts.ConciseBody = ts.createBlock([ ts.createReturn(paramName) ], false);

    const arrow: ts.ArrowFunction = ts.createArrowFunction(
        /*modifiers*/ undefined,
        /*typeParameters*/ undefined,
        parameters,
        /*type*/ undefined,
        /*equalsGreaterThanToken*/ undefined,
        // body);
        paramName);

    // const assRightHand: ts.CallExpression = ts.createCall
                // (ts.createPropertyAccess(ts.createIdentifier("arr"), "map"), undefined, [arrow]);
    // const assLefHand: ts.Identifier = ts.createIdentifier("output");
    // return ts.createAssignment(assLefHand, assRightHand);
    // return ts.createCall(ts.createIdentifier("map"), undefined, [arrow]);
    return arrow;
    // return ts.createPropertyAccess(ts.createIdentifier("input"), ts.createCall(ts.createIdentifier("map"), undefined, []));
}

// pArrayName.push(pElementToPush)
function makeArrayPushNode(pArrayName: string, pElementToPush: ts.Expression): ts.Node {
    const arrayName: ts.Identifier = ts.createIdentifier(pArrayName);
    const pushName: ts.Identifier = ts.createIdentifier("push");
    const properyAccess: ts.PropertyAccessExpression = ts.createPropertyAccess(
        arrayName,
        pushName);

    const args: ReadonlyArray<ts.Expression> = [pElementToPush];

    const call: ts.CallExpression = ts.createCall(
        properyAccess,
        /*typeArguments*/ undefined,
        args);

    const completeNode: ts.ExpressionStatement = ts.createStatement(call);
    return completeNode;
}

function createArrayMapNode(pArray: ts.Expression, pElementToPush: ts.ArrowFunction): ts.ExpressionStatement {
    const mapName: ts.Identifier = ts.createIdentifier("map");
    const properyAccess: ts.PropertyAccessExpression = ts.createPropertyAccess(
        pArray,
        mapName);

    const args: ReadonlyArray<ts.Expression> = [pElementToPush];

    const call: ts.CallExpression = ts.createCall(
        properyAccess,
        /*typeArguments*/ undefined,
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
        /*typeArguments*/ undefined,
        args);

    const completeNode: ts.ExpressionStatement = ts.createStatement(call);
    return completeNode;
}

function isArrayPushNode(pNode: ts.Node): boolean {
    if (pNode.kind !== ts.SyntaxKind.ExpressionStatement) {
        return false;
    }
    const node: ts.ExpressionStatement = <ts.ExpressionStatement> pNode;
    if (node.expression.kind !== ts.SyntaxKind.CallExpression) {
        return false;
    }

    const callExpression: ts.CallExpression = <ts.CallExpression> node.expression;
    if (callExpression.expression.kind !== ts.SyntaxKind.PropertyAccessExpression) {
        return false;
    }

    const propaccessExpression: ts.PropertyAccessExpression = <ts.PropertyAccessExpression> callExpression.expression;

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

function canBeConvertedToMap(pNode: ts.ForOfStatement): boolean {
    if (pNode) {
        const forofBody: ts.Statement = pNode.statement;
        const statementKind: ts.SyntaxKind = forofBody.kind;

        // forof with a block
        if (statementKind === ts.SyntaxKind.Block) {
            // last statement must be an array push node
            const block: ts.Block = <ts.Block> forofBody;
            const len: number = block.statements.length;
            if (len > 0) {
                let lastNodeIsArrayPush: boolean = isArrayPushNode(block.statements[len - 1]);
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

function getForOfInitializer(pNode: ts.ForOfStatement): string {
    const forOfIdentifier: ts.ForInitializer = pNode.initializer;
    if (forOfIdentifier.kind === ts.SyntaxKind.Identifier) {
        return (<ts.Identifier> forOfIdentifier).text;
    }
    const vars: ts.VariableDeclarationList = <ts.VariableDeclarationList> forOfIdentifier;
    return (<ts.Identifier> vars.declarations[0].name).text;
}

function createMapBody(pForOfBody: ts.Statement, pInitializer: string, pPushArgs: ts.Expression): ts.ArrowFunction {
    const statementKind: ts.SyntaxKind = pForOfBody.kind;

    // let body: ts.ConciseBody = ts.createBlock([], false);
    let body: ts.ConciseBody = pPushArgs;
    // forof with a block
    if (statementKind === ts.SyntaxKind.Block) {
        // last statement must be an array push node
        const block: ts.Block = <ts.Block> pForOfBody;
        const len: number = block.statements.length;
        if (len > 0) {
            // const pushpar: ts.Expression = getArrayPushParameter(block.statements[len - 1]);
            if (len > 1) {
                let statements: ts.Statement[] = block.statements.slice(0, len - 1);
                // statements = statements.concat(ts.createReturn(pushpar));
                statements = statements.concat(ts.createReturn(pPushArgs));
                body = ts.createBlock(statements, true);
            } /* else if (len > 0) {
                body = pushpar;
            }*/
        }
    } /* else {
        // forof with a single statement
        if (statementKind === ts.SyntaxKind.ExpressionStatement) {
            const pushpar: ts.Expression = getArrayPushParameter(pForOfBody);
            body = pushpar;
        }
    }*/

    const paramName: ts.Identifier = ts.createIdentifier(pInitializer);
    const param: ts.ParameterDeclaration = ts.createParameter(
        /*decorators*/ undefined,
        /*modifiers*/ undefined,
        /*dotDotDotToken*/ undefined,
        paramName,
        /*questionToken*/ undefined,
        /*type*/ undefined,
        /*initializer*/ undefined);
    const parameters: ReadonlyArray<ts.ParameterDeclaration> = [param];

    const arrow: ts.ArrowFunction = ts.createArrowFunction(
        /*modifiers*/ undefined,
        /*typeParameters*/ undefined,
        parameters,
        /*type*/ undefined,
        /*equalsGreaterThanToken*/ undefined,
        body);

    return arrow;
}
/*
function getArrayPushParameter(pNode: ts.Node): ts.Expression {
    const node: ts.ExpressionStatement = <ts.ExpressionStatement> pNode;
    const callExpression: ts.CallExpression = <ts.CallExpression> node.expression;
    return callExpression.arguments[0];
}*/

function getForOfArrayPushInfo(pForOfBody: ts.Statement): IArrayPushInfo {
    const statementKind: ts.SyntaxKind = pForOfBody.kind;

    // forof with a block
    if (statementKind === ts.SyntaxKind.Block) {
        // last statement must be an array push node
        const block: ts.Block = <ts.Block> pForOfBody;
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
        "args": callExpression.arguments[0]
    };
}

interface IArrayPushInfo {
    arrayName: string;
    args: ts.Expression;
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

    if(pUseConcat) {
        mapNode = createArrayConcatNode(pushInfo.arrayName, mapNode); // output.concat(input.map ...)
    }

    const completeNode: ts.Node = createAssignment(pushInfo.arrayName, mapNode); // output = input.map ...  || output = output.concat(...
    return completeNode;
}

function createAssignment(pArrayName: string, pValue: ts.ExpressionStatement): ts.Node {
    const array: ts.Identifier = ts.createIdentifier(pArrayName);
    const assignment: ts.BinaryExpression = ts.createBinary(array, ts.SyntaxKind.FirstAssignment, pValue.expression);
    const retval: ts.Statement = ts.createStatement(assignment);
    return retval;
}

logExerciseToConsole("makeFactorialFunction", makeFactorialFunction(), false, false);
logExerciseToConsole("makeTestNode", makeTestNode(), false, false);
// output.push(1);
logExerciseToConsole("makeSimplePushNode Num", makeArrayPushNode("output", ts.createLiteral(1)), false, false);
// output.push("a");
logExerciseToConsole("makeSimplePushNode String", makeArrayPushNode("output", ts.createLiteral("a")), false, false);
// output.push(a);
logExerciseToConsole("makeElementPushNode", makeArrayPushNode("output", ts.createIdentifier("a")), false, false);

// output.push(a);
logExerciseToConsole("makeTestPushNode", makeArrayPushNode("output", makeTestNode()), false, false);

console.log("output.push(1)  -->  " + isArrayPushNode(makeArrayPushNode("output", ts.createLiteral(1))));
console.log("fact  -->  " + isArrayPushNode(makeFactorialFunction()));
console.log("a => a  -->  " + isArrayPushNode(makeTestNode()));
console.log("output.push('a')  -->  " + isArrayPushNode(makeArrayPushNode("output", ts.createLiteral("a"))));

console.log("output.push(a => a)  -->  " + isArrayPushNode(makeArrayPushNode("output", makeTestNode())));
console.log("output.push(a)  -->  " + isArrayPushNode(makeArrayPushNode("output", ts.createIdentifier("a"))));

console.log("------------------");
console.log("check map");
// const code: string = `for(const el of input) {
//     let x = el * 2;
//     let y = x + el;
//     output8.push(mijnfunc(y));
// }`;
const code: string = `for (let el of input()) {
    output.push(el*2);
}`;

const sourcefile: ts.SourceFile = ts.createSourceFile("dummy.ts", code, ts.ScriptTarget.Latest, undefined, ts.ScriptKind.TS);
const st: ts.Statement = sourcefile.statements[0];
if (st.kind === ts.SyntaxKind.ForOfStatement) {
    console.log(canBeConvertedToMap(<ts.ForOfStatement> st));

    let newNode: ts.Node = getMapArrayFunction(<ts.ForOfStatement> st, false);
    let code: string = getTypeScriptCode(newNode);
    console.log("new code directe assignment :");
    console.log(code);

    newNode = getMapArrayFunction(<ts.ForOfStatement> st, true);
    code = getTypeScriptCode(newNode);
    console.log("new code concat:");
    console.log(code);
}
