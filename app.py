from flask import Flask, render_template, request, jsonify
from shells.shell_manager import ShellManager
import platform

app = Flask(__name__)
shell = ShellManager()


@app.route('/')
def index():
    system_info = f"{platform.system()} {platform.release()}"
    return render_template('index.html', system_info=system_info)

@app.route('/execute', methods=['POST'])
def execute():
    command = request.json.get('command', '')
    if command.strip() == '':
        # Return the prompt without executing any command
        prompt = shell.get_prompt()  # Ensure `get_prompt` returns user@hostname:pwd
        return jsonify({'output': '', 'prompt': prompt})
    else:
        output, prompt = shell.run_command(command)
        return jsonify({'output': output, 'prompt': prompt})

if __name__ == '__main__':
    app.run(debug=True)
