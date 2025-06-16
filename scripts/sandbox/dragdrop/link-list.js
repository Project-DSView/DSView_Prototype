const canvas = document.getElementById('canvas');
const editor = CodeMirror.fromTextArea(document.getElementById('editor'), {
    mode: 'python',
    lineNumbers: true,
});

let linkedListValues = [];

function handleDrop(event) {
    const value = event.dataTransfer.getData('text/plain');

    // Add node + arrow (if not first)
    if (linkedListValues.length > 0) {
        const arrow = document.createElement('span');
        arrow.className = 'arrow';
        arrow.textContent = '→';
        canvas.appendChild(arrow);
    }

    const wrapper = document.createElement('div');
    wrapper.className = 'canvas-node';

    const newNode = document.createElement('div');
    newNode.className = 'node';
    newNode.draggable = true;
    newNode.textContent = value;
    newNode.dataset.value = value;
    newNode.addEventListener('dragstart', dragFromCanvas);
    wrapper.appendChild(newNode);

    canvas.appendChild(wrapper);

    linkedListValues.push(value);
    updateCode();
}

function dragFromCanvas(event) {
    event.dataTransfer.setData('text/plain', event.target.dataset.value);
    event.dataTransfer.setData('from-canvas', 'true'); // mark as removable
    event.dataTransfer.setData('node-id', [...canvas.children].indexOf(event.target.parentElement));
}

function handleRemove(event) {
    if (event.dataTransfer.getData('from-canvas') !== 'true') return;

    const nodeId = parseInt(event.dataTransfer.getData('node-id'));

    // Remove from linkedListValues
    const visualItems = [...canvas.children];
    const index = Math.floor(nodeId / 2); // Because each node = [arrow, node] or just node
    linkedListValues.splice(index, 1);

    // Clear canvas and rebuild
    canvas.innerHTML = '';
    linkedListValues.forEach((val, i) => {
        if (i > 0) {
            const arrow = document.createElement('span');
            arrow.className = 'arrow';
            arrow.textContent = '→';
            canvas.appendChild(arrow);
        }

        const wrapper = document.createElement('div');
        wrapper.className = 'canvas-node';

        const node = document.createElement('div');
        node.className = 'node';
        node.draggable = true;
        node.textContent = val;
        node.dataset.value = val;
        node.addEventListener('dragstart', dragFromCanvas);
        wrapper.appendChild(node);

        canvas.appendChild(wrapper);
    });

    updateCode();
}

document.querySelectorAll('#palette .node').forEach(node => {
    node.addEventListener('dragstart', event => {
        event.dataTransfer.setData('text/plain', node.dataset.value);
    });
});

function updateCode() {
    if (linkedListValues.length === 0) {
        editor.setValue('// Code will appear here');
        return;
    }

    let code = 'class Node:\n' +
        '    def __init__(self, data):\n' +
        '        self.data = data\n' +
        '        self.next = None\n\n' +
        `head = Node("${linkedListValues[0]}")\n`;

    for (let i = 1; i < linkedListValues.length; i++) {
        code += `node${i} = Node("${linkedListValues[i]}")\n`;
        if (i === 1) {
            code += `head.next = node${i}\n`;
        } else {
            code += `node${i - 1}.next = node${i}\n`;
        }
    }

    editor.setValue(code);
}