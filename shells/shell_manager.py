import subprocess
import os
import platform
import getpass
import socket

class ShellManager:
    def __init__(self):
        self.os_name = platform.system()
        self.cwd = os.path.expanduser("~")
        self.user = getpass.getuser()
        self.hostname = socket.gethostname()

        # Determine default shell
        if self.os_name == 'Windows':
            self.shell = ['powershell', '-Command']
        else:
            if subprocess.call(["which", "bash"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL) == 0:
                self.shell = ['bash', '-c']
            else:
                self.shell = ['sh', '-c']

    def get_prompt(self):
        folder = os.path.basename(self.cwd)
        return f"{self.user}@{self.hostname}:{folder}$ "

    def run_command(self, cmd):
        try:
            process = subprocess.Popen(
                self.shell + [cmd],
                cwd=self.cwd,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True
            )
            output, error = process.communicate()
            output = (output or '') + (error or '')
        except Exception as e:
            output = str(e)
        return output.strip(), self.get_prompt()
