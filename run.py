# for developing this bluepring, need to register it then can run a flask dev server 

from flask import Flask
from pywebshell_blueprint import pywebshell  # Import your Blueprint

app = Flask(__name__)
app.register_blueprint(pywebshell, url_prefix="/")  # Use root URL when running standalone

if __name__ == "__main__":
    app.run(debug=True)
