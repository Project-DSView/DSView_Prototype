const editor = CodeMirror(document.getElementById("editor"), {
    mode: "python",
    lineNumbers: true,
    value: `execution_log = []
instances = {}

class Node:
    def __init__(self, val):
        self.val = val
        self.next = None

class LinkedList:
    def __init__(self):
        self.head = None

    def append(self, val):
        if not self.head:
            self.head = Node(val)
            return
        curr = self.head
        while curr.next:
            curr = curr.next
        curr.next = Node(val)

    def remove(self, val):
        prev = None
        curr = self.head
        while curr:
            if curr.val == val:
                if prev:
                    prev.next = curr.next
                else:
                    self.head = curr.next
                return
            prev = curr
            curr = curr.next

    def to_list(self):
        res = []
        curr = self.head
        while curr:
            res.append(curr.val)
            curr = curr.next
        return res

def log_step(line_num, code_line, action=""):
    step_data = {
        'line': line_num,
        'code': code_line.strip(),
        'action': action,
        'instances': {}
    }
    
    for name, obj in instances.items():
        if isinstance(obj, LinkedList):
            step_data['instances'][name] = obj.to_list()
    
    execution_log.append(step_data)

# Example execution
ll = LinkedList()
instances['ll'] = ll
log_step(1, "ll = LinkedList()", "Created LinkedList 'll'")

ll.append(10)
log_step(2, "ll.append(10)", "Appended 10 to 'll'")

ll.append(20)
log_step(3, "ll.append(20)", "Appended 20 to 'll'")

sl = LinkedList()
instances['sl'] = sl
log_step(4, "sl = LinkedList()", "Created LinkedList 'sl'")

sl.append(100)
log_step(5, "sl.append(100)", "Appended 100 to 'sl'")

ll.append(30)
log_step(6, "ll.append(30)", "Appended 30 to 'll'")

ll.remove(20)
log_step(7, "ll.remove(20)", "Removed 20 from 'll'")

sl.append(200)
log_step(8, "sl.append(200)", "Appended 200 to 'sl'")

ll.append(40)
log_step(9, "ll.append(40)", "Appended 40 to 'll'")
`
});

let pyodideReadyPromise = loadPyodide();

let currentStep = 0;
let stepsData = [];
let currentHighlight = null;

function highlightLine(lineNum) {
    // Remove previous highlight
    if (currentHighlight) {
        editor.removeLineClass(currentHighlight, 'background', 'highlight-line');
    }

    // Add new highlight (CodeMirror uses 0-based indexing)
    if (lineNum > 0) {
        currentHighlight = lineNum - 1;
        editor.addLineClass(currentHighlight, 'background', 'highlight-line');
    }
}

function updateVisualizationStep(step) {
    const container = document.getElementById("visualizations");
    const currentLineDiv = document.getElementById("currentLine");
    const stepsDiv = document.getElementById("steps");
    const stepInfo = document.getElementById("stepInfo");

    if (!stepsData.length) {
        container.innerHTML = "<div class='empty-list'>No data to visualize.</div>";
        currentLineDiv.textContent = "Current Line: -";
        stepsDiv.textContent = "Steps will appear here";
        stepInfo.textContent = "Step 0 of 0";
        return;
    }

    const stepData = stepsData[step];

    // Update step info
    stepInfo.textContent = `Step ${step + 1} of ${stepsData.length}`;

    // Update current line display
    currentLineDiv.textContent = `Current Line: ${stepData.line} | Code: ${stepData.code}`;

    // Highlight current line in editor
    highlightLine(stepData.line);

    // Update steps description
    stepsDiv.textContent = `${step + 1}. ${stepData.action || stepData.code}`;

    // Clear and rebuild visualizations
    container.innerHTML = "";

    if (Object.keys(stepData.instances).length === 0) {
        container.innerHTML = "<div class='empty-list'>No LinkedList instances created yet.</div>";
        return;
    }

    // Create visualization for each LinkedList instance
    for (const [instanceName, data] of Object.entries(stepData.instances)) {
        const vizContainer = document.createElement("div");
        vizContainer.className = "visualization-container";

        const title = document.createElement("div");
        title.className = "visualization-title";
        title.textContent = `${instanceName}: [${data.join(', ')}]`;
        vizContainer.appendChild(title);

        const visualization = document.createElement("div");
        visualization.className = "visualization";

        if (data.length === 0) {
            const emptyMsg = document.createElement("div");
            emptyMsg.className = "empty-list";
            emptyMsg.textContent = "Empty List";
            visualization.appendChild(emptyMsg);
        } else {
            for (let i = 0; i < data.length; i++) {
                const node = document.createElement("div");
                node.className = "node";
                node.textContent = data[i];
                visualization.appendChild(node);

                if (i !== data.length - 1) {
                    const arrow = document.createElement("div");
                    arrow.className = "arrow";
                    arrow.textContent = "→";
                    visualization.appendChild(arrow);
                }
            }
        }

        vizContainer.appendChild(visualization);
        container.appendChild(vizContainer);
    }

    // Update button states
    document.getElementById("prevStep").disabled = (step === 0);
    document.getElementById("nextStep").disabled = (step === stepsData.length - 1);
}

document.getElementById("runBtn").addEventListener("click", async () => {
    const pyodide = await pyodideReadyPromise;
    const code = editor.getValue();

    try {
        let output = await pyodide.runPythonAsync(`
import sys
import io
sys.stdout = io.StringIO()
` + code + `
sys.stdout.getvalue()
    `);

        document.getElementById("output").textContent = output || "Code executed successfully";

        let resultJSON = await pyodide.runPythonAsync(`
import json

try:
    json.dumps(execution_log)
    result = execution_log
except Exception as e:
    result = []

json.dumps(result)
    `);

        let result = JSON.parse(resultJSON);
        stepsData = result;

        currentStep = 0;
        updateVisualizationStep(currentStep);

    } catch (err) {
        document.getElementById("output").textContent = "Error: " + err;
        document.getElementById("visualizations").innerHTML = "Visualizations will appear here";
        document.getElementById("steps").textContent = "Steps will appear here";
        document.getElementById("currentLine").textContent = "Current Line: -";
        if (currentHighlight) {
            editor.removeLineClass(currentHighlight, 'background', 'highlight-line');
            currentHighlight = null;
        }
    }
});

document.getElementById("prevStep").addEventListener("click", () => {
    if (currentStep > 0) {
        currentStep--;
        updateVisualizationStep(currentStep);
    }
});

document.getElementById("nextStep").addEventListener("click", () => {
    if (currentStep < stepsData.length - 1) {
        currentStep++;
        updateVisualizationStep(currentStep);
    }
});

document.getElementById("downloadBtn").addEventListener("click", () => {
    const visualization = document.getElementById("visualizations");
    html2canvas(visualization).then(canvas => {
        const dataURL = canvas.toDataURL("image/png");
        const link = document.createElement("a");
        link.href = dataURL;
        link.download = `step_${currentStep + 1}.png`;
        link.click();
    });
});

// Initial button states
document.getElementById("prevStep").disabled = true;
document.getElementById("nextStep").disabled = true;