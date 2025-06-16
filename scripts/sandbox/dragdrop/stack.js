const stackBox = document.getElementById('stack-box');
const editor = CodeMirror.fromTextArea(document.getElementById('editor'), {
    mode: 'python',
    lineNumbers: true,
});

let stackValues = [];

function handleStackDrop(event) {
    const value = event.dataTransfer.getData('text/plain');
    const isFromStack = event.dataTransfer.getData('from-stack') === 'true';

    if (!isFromStack) {
        // Add new item on stack
        const node = createStackNode(value);
        stackBox.appendChild(node);
        stackValues.push(value);
        updateCode();
    }
}

function handleStackRemove(event) {
    const fromStack = event.dataTransfer.getData('from-stack') === 'true';
    const value = event.dataTransfer.getData('text/plain');

    if (fromStack) {
        // Remove top (LIFO)
        stackBox.removeChild(stackBox.lastElementChild);
        stackValues.pop();
        updateCode();
    }
}

function createStackNode(value) {
    const div = document.createElement('div');
    div.className = 'stack-node';
    div.textContent = value;
    div.dataset.value = value;
    div.draggable = true;

    div.addEventListener('dragstart', event => {
        event.dataTransfer.setData('text/plain', value);
        event.dataTransfer.setData('from-stack', 'true');
    });

    return div;
}

document.querySelectorAll('#palette .stack-node').forEach(node => {
    node.addEventListener('dragstart', event => {
        event.dataTransfer.setData('text/plain', node.dataset.value);
        event.dataTransfer.setData('from-stack', 'false');
    });
});

function updateCode() {
    if (stackValues.length === 0) {
        editor.setValue('// Stack is empty');
        return;
    }

    let code = 'stack = []\n';
    stackValues.forEach(val => {
        code += `stack.append("${val}")\n`;
    });
    editor.setValue(code);
}