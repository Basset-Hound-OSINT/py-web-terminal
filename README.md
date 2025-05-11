# py-web-terminal
A simple web-based terminal multiplexor.


## Add as blueprint to a Flask app

```
from flask import Flask
from submodules.py-web-terminal.pywebshell_blueprint import pywebshell  # Import Blueprint

app = Flask(__name__)

app.register_blueprint(pywebshell, url_prefix="/shell")  # Register Blueprint

if __name__ == "__main__":
    app.run(debug=True)

```