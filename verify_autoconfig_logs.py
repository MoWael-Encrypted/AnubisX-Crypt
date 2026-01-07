import requests
import time
import os

# Create dummy
with open("test_dummy.txt", "w") as f:
    f.write("A" * 1024)

url = "http://localhost:5000/run"
files = {'file': open('test_dummy.txt', 'rb')}
# engine=auto to test engine log. valid data for others
data = {
    'engine': 'auto', 
    'threads': '', 
    'procs': '0',
    'mode': 'enc',
    'key': '3',
    'chunk': '1024'
}

print("Sending request...")
try:
    response = requests.post(url, files=files, data=data)
    print("Response:", response.status_code)
except Exception as e:
    print("Request failed:", e)

# Check log
log_path = "backend/logs/system.log"
print(f"Checking {log_path}...")
if os.path.exists(log_path):
    with open(log_path, "r") as f:
        content = f.read()
        print("--- Log Tail ---")
        print(content[-600:])
        print("----------------")
        
        checks = [
            "Auto-Configuration Applied",
            "Auto-selected Engine"
        ]
        
        for c in checks:
            if c in content:
                print(f"PASS: Found '{c}'")
            else:
                print(f"FAIL: Did not find '{c}'")
else:
    print("Log file not found.")
