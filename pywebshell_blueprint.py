from flask import Blueprint, render_template, request, jsonify
from shells.shell_manager import ShellManager
import platform

# Create a Blueprint named 'pywebshell'
pywebshell = Blueprint("pywebshell", __name__, template_folder="templates")

shell = ShellManager()

@pywebshell.route("/")
def index():
    system_info = f"{platform.system()} {platform.release()}"
    return render_template("index.html", system_info=system_info)

@pywebshell.route("/execute", methods=["POST"])
def execute():
    command = request.json.get("command", "")
    if command.strip() == "":
        # Return the prompt without executing any command
        prompt = shell.get_prompt()
        return jsonify({"output": "", "prompt": prompt})
    else:
        output, prompt = shell.run_command(command)
        return jsonify({"output": output, "prompt": prompt})

