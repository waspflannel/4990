window.SP = window.SP || {};

SP.parse = function(input) {
  var str = input.replace(/\s+/g, '');
  var pos = 0;

  function expect(ch) {
    if (pos >= str.length || str[pos] !== ch)
      throw new Error("Expected '" + ch + "' at position " + pos + ", got '" + (str[pos] || 'EOF') + "'");
    pos++;
  }

  function parseNum() {
    var start = pos;
    while (pos < str.length && str[pos] >= '0' && str[pos] <= '9') pos++;
    if (pos === start) throw new Error('Expected number at position ' + pos);
    return parseInt(str.substring(start, pos), 10);
  }

  function parseExpr() {
    if (str.substr(pos, 3) === 'SC(') {
      pos += 3;
      var left = parseExpr();
      expect(',');
      var right = parseExpr();
      expect(')');
      return { type: 'S', left: left, right: right };
    }
    if (str.substr(pos, 3) === 'PC(') {
      pos += 3;
      var left = parseExpr();
      expect(',');
      var right = parseExpr();
      expect(')');
      return { type: 'P', left: left, right: right };
    }
    if (str.substr(pos, 2) === 'e(') {
      pos += 2;
      var source = parseNum();
      expect(',');
      var sink = parseNum();
      expect(')');
      return { type: 'e', source: source, sink: sink };
    }
    throw new Error("Unexpected token at position " + pos + ": '" + str.substring(pos, pos + 10) + "'");
  }

  var tree = parseExpr();
  if (pos < str.length) throw new Error("Unexpected content at position " + pos + ": '" + str.substring(pos) + "'");
  return tree;
};

SP.nodeToExpression = function(node) {
  if (node.type === 'e') return 'e(' + node.source + ',' + node.sink + ')';
  var prefix = node.type === 'S' ? 'SC' : 'PC';
  return prefix + '(' + SP.nodeToExpression(node.left) + ',' + SP.nodeToExpression(node.right) + ')';
};
