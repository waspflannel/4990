window.SP = window.SP || {};

SP.H_SPACING = 70;
SP.V_SPACING = 80;
SP.SP_W = 48;
SP.SP_H = 32;
SP.SP_RX = 12;
SP.LEAF_R = 18;

SP.layout = function(root) {
  var leafIndex = 0;
  var nodes = [];
  var nextId = 0;

  function assign(node, depth, parent) {
    node.id = nextId++;
    node.depth = depth;
    node.parent = parent;
    node.dx = 0;
    node.dy = 0;

    if (node.type === 'e') {
      node.x = leafIndex * SP.H_SPACING;
      node.y = depth * SP.V_SPACING;
      leafIndex++;
    } else {
      assign(node.left, depth + 1, node);
      assign(node.right, depth + 1, node);
      node.x = (node.left.x + node.right.x) / 2;
      node.y = depth * SP.V_SPACING;

      if (node.type === 'S') {
        node.source = node.left.source;
        node.sink = node.right.sink;
      } else {
        node.source = node.left.source;
        node.sink = node.left.sink;
      }
    }

    nodes.push(node);
  }

  assign(root, 0, null);
  return nodes;
};
