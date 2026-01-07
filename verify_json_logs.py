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

print("Sending request to /run...")
try:
    response = requests.post(url, files=files, data=data)
    print("Response Status:", response.status_code)
    
    if response.status_code == 200:
        json_data = response.json()
        if 'logs' in json_data:
            print("PASS: 'logs' key found in JSON response.")
            print("Logs returned:", json_data['logs'])
            
            # Check content
            logs = json_data['logs']
            has_autoconfig = any("Auto-Configuration Applied" in l for l in logs)
            has_engine = any("Auto-selected Engine" in l for l in logs)
            
            if has_autoconfig: print("PASS: Auto-Configuration log present.")
            else: print("FAIL: Auto-Configuration log missing.")
            
            if has_engine: print("PASS: Auto-selected Engine log present.")
            else: print("FAIL: Auto-selected Engine log missing.")
            
        else:
            print("FAIL: 'logs' key MISSING in JSON response.")
    else:
        print("FAIL: Request failed.")

except Exception as e:
    print("Request failed:", e)
