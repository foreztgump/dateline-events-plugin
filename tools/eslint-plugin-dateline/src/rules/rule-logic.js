const ALLOW_COMMENT = "dateline-allow-bare-promise";
const ASYNC_NAME_PATTERN = /(?:Async|Promise|Deferred|Fetch|Email)/u;
const CHAIN_METHODS = new Set(["then", "catch", "finally"]);
const HOOK_PREFIXES = ["content:", "media:", "email:"];

export function createNoBarePromisesInHooks(context) {
  return {
    ExpressionStatement(node) {
      if (!isInsideHookHandler(node) || hasAllowComment(context, node)) {
        return;
      }
      if (isBarePromiseExpression(node.expression)) {
        context.report({ node, messageId: "barePromise" });
      }
    },
  };
}

function isInsideHookHandler(node) {
  const func = findFunctionAncestor(node);
  const property = func?.parent;
  return property?.type === "Property" && isHookName(property.key);
}

function findFunctionAncestor(node) {
  let current = node.parent;
  while (current) {
    if (isFunctionNode(current)) {
      return current;
    }
    current = current.parent;
  }
  return null;
}

function isFunctionNode(node) {
  return [
    "ArrowFunctionExpression",
    "FunctionExpression",
    "FunctionDeclaration",
  ].includes(node.type);
}

function isHookName(key) {
  const name = getPropertyName(key);
  return name === "cron" || HOOK_PREFIXES.some((prefix) => name.startsWith(prefix));
}

function getPropertyName(key) {
  if (key.type === "Identifier") {
    return key.name;
  }
  return typeof key.value === "string" ? key.value : "";
}

function hasAllowComment(context, node) {
  const comments = context.sourceCode.getCommentsBefore(node);
  const previous = comments.at(-1);
  if (!previous || previous.loc.end.line < node.loc.start.line - 1) {
    return false;
  }
  return hasJustifiedEscape(previous.value);
}

function hasJustifiedEscape(commentValue) {
  const trimmedComment = commentValue.trimStart();
  if (!trimmedComment.startsWith(ALLOW_COMMENT)) {
    return false;
  }
  return trimmedComment.slice(ALLOW_COMMENT.length).trim().length > 0;
}

function isBarePromiseExpression(expression) {
  if (expression.type !== "CallExpression") {
    return false;
  }
  if (isWaitUntilCall(expression)) {
    return false;
  }
  return isPromiseChain(expression) || ASYNC_NAME_PATTERN.test(getCalleeName(expression.callee));
}

function isWaitUntilCall(callExpression) {
  const callee = callExpression.callee;
  return callee.type === "MemberExpression" && getPropertyName(callee.property) === "waitUntil";
}

function isPromiseChain(callExpression) {
  const callee = callExpression.callee;
  return callee.type === "MemberExpression" && CHAIN_METHODS.has(getPropertyName(callee.property));
}

function getCalleeName(callee) {
  if (callee.type === "Identifier") {
    return callee.name;
  }
  if (callee.type === "MemberExpression") {
    return getPropertyName(callee.property);
  }
  return "";
}
