const editor = CodeMirror(document.getElementById("editor"), {
    mode: "python",
    lineNumbers: true,
    value: `execution_log = []
instances = {}

class Stack:
    def __init__(self):
        self.items = []

    def push(self, item):
        self.items.append(item)

    def pop(self):
        if self.items:
            return self.items.pop()
        return None

    def peek(self):
        if self.items:
            return self.items[-1]
        return None

    def is_empty(self):
        return len(self.items) == 0

    def size(self):
        return len(self.items)

    def to_list(self):
        return self.items.copy()

def log_step(line_num, code_line, action=""):
    step_data = {
        'line': line_num,
        'code': code_line.strip(),
        'action': action,
        'instances': {}
    }
    
    for name, obj in instances.items():
        if isinstance(obj, Stack):
            step_data['instances'][name] = obj.to_list()
    
    execution_log.append(step_data)

# Example execution
s1 = Stack()
instances['s1'] = s1
log_step(1, "s1 = Stack()", "Created Stack 's1'")

s1.push(10)
log_step(2, "s1.push(10)", "Pushed 10 to 's1'")

s1.push(20)
log_step(3, "s1.push(20)", "Pushed 20 to 's1'")

s2 = Stack()
instances['s2'] = s2
log_step(4, "s2 = Stack()", "Created Stack 's2'")

s2.push(100)
log_step(5, "s2.push(100)", "Pushed 100 to 's2'")

s1.push(30)
log_step(6, "s1.push(30)", "Pushed 30 to 's1'")

s1.pop()
log_step(7, "s1.pop()", "Popped from 's1'")

s2.push(200)
log_step(8, "s2.push(200)", "Pushed 200 to 's2'")

s1.push(40)
log_step(9, "s1.push(40)", "Pushed 40 to 's1'")

s2.pop()
log_step(10, "s2.pop()", "Popped from 's2'")
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
        container.innerHTML = "<div class='empty-stack'>No data to visualize.</div>";
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
        container.innerHTML = "<div class='empty-stack'>No Stack instances created yet.</div>";
        return;
    }

    // Create visualization for each Stack instance
    for (const [instanceName, data] of Object.entries(stepData.instances)) {
        const vizContainer = document.createElement("div");
        vizContainer.className = "visualization-container";

        const title = document.createElement("div");
        title.className = "visualization-title";
        title.textContent = `${instanceName}: [${data.join(', ')}] (size: ${data.length})`;
        vizContainer.appendChild(title);

        const visualization = document.createElement("div");
        visualization.className = "visualization";

        if (data.length === 0) {
            const emptyMsg = document.createElement("div");
            emptyMsg.className = "empty-stack";
            emptyMsg.textContent = "Empty Stack";
            visualization.appendChild(emptyMsg);
        } else {
            // Add stack elements from bottom to top
            for (let i = 0; i < data.length; i++) {
                const node = document.createElement("div");
                node.className = "node";

                // Mark the top element
                if (i === data.length - 1) {
                    node.classList.add("stack-top");
                }

                node.textContent = data[i];
                visualization.appendChild(node);
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
        link.download = `stack_step_${currentStep + 1}.png`;
        link.click();
    });
});

// Initial button states
document.getElementById("prevStep").disabled = true;
document.getElementById("nextStep").disabled = true;