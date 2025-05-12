from flask import Blueprint, render_template, request, jsonify
from shells.shell_manager import ShellManager
import platform
import subprocess
import psutil
import os

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

@pywebshell.route("/get_processes")
def get_processes():
    """Get system process information in a format similar to htop"""
    processes = []
    
    for proc in psutil.process_iter(['pid', 'name', 'username', 'cmdline', 'cpu_percent', 'memory_percent', 
                                    'status', 'nice', 'memory_info', 'cpu_times']):
        try:
            # Get basic info
            pinfo = proc.info
            
            # Calculate additional info
            with proc.oneshot():
                # Get process priority
                try:
                    priority = proc.nice()
                except (psutil.AccessDenied, psutil.ZombieProcess):
                    priority = "NA"
                
                # Get memory info
                try:
                    mem_info = proc.memory_info()
                    virt = format_bytes(mem_info.vms)
                    res = format_bytes(mem_info.rss)
                    # Calculate shared memory - not directly available in all platforms
                    try:
                        shr = format_bytes(mem_info.shared) if hasattr(mem_info, 'shared') else "NA"
                    except:
                        shr = "NA"
                except (psutil.AccessDenied, psutil.ZombieProcess):
                    virt, res, shr = "NA", "NA", "NA"
                
                # Get CPU times
                try:
                    cpu_times = proc.cpu_times()
                    time_plus = format_time(sum([cpu_times.user, cpu_times.system]))
                except (psutil.AccessDenied, psutil.ZombieProcess):
                    time_plus = "NA"
                
                # Get full command
                try:
                    cmd = " ".join(proc.cmdline()) if proc.cmdline() else proc.name()
                except (psutil.AccessDenied, psutil.ZombieProcess):
                    cmd = proc.name()
                
                # Status to single character
                status_map = {
                    'running': 'R',
                    'sleeping': 'S',
                    'disk-sleep': 'D',
                    'stopped': 'T',
                    'tracing-stop': 't',
                    'zombie': 'Z',
                    'dead': 'X',
                    'wake-kill': 'K',
                    'waking': 'W',
                    'idle': 'I',
                    'locked': 'L',
                    'waiting': 'W'
                }
                status = status_map.get(pinfo['status'].lower(), '?')
            
            # Add process to list
            process_data = {
                'pid': pinfo['pid'],
                'user': pinfo['username'][:8] if pinfo['username'] else 'unknown',
                'pr': priority,
                'ni': priority,  # Nice value is the same as priority in this context
                'virt': virt,
                'res': res,
                'shr': shr,
                's': status,
                'cpu': f"{pinfo['cpu_percent']:.1f}",
                'mem': f"{pinfo['memory_percent']:.1f}",
                'time': time_plus,
                'command': cmd[:100]  # Truncate long commands
            }
            
            processes.append(process_data)
            
        except (psutil.NoSuchProcess, psutil.AccessDenied, psutil.ZombieProcess):
            # Skip processes that can't be accessed
            continue
    
    # Sort by CPU usage (descending)
    processes.sort(key=lambda x: float(x['cpu']), reverse=True)
    
    # Limit to top 100 processes to avoid browser performance issues
    return jsonify({"processes": processes[:100]})

def format_bytes(bytes_value):
    """Format bytes to human-readable format"""
    if not isinstance(bytes_value, (int, float)):
        return "NA"
    
    for unit in ['B', 'K', 'M', 'G', 'T']:
        if bytes_value < 1024.0:
            return f"{bytes_value:.1f}{unit}"
        bytes_value /= 1024.0
    return f"{bytes_value:.1f}P"

def format_time(seconds):
    """Format seconds to MM:SS.SS format"""
    if not isinstance(seconds, (int, float)):
        return "NA"
    
    minutes = int(seconds // 60)
    seconds = seconds % 60
    return f"{minutes:02d}:{seconds:04.1f}"