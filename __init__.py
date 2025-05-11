from flask import Flask
from .pywebshell_blueprint import pywebshell  # Import Blueprint from your file

app = Flask(__name__)
app.register_blueprint(pywebshell, url_prefix="/shell")  # Register Blueprint
