import json
import subprocess
import sys

def deploy(service_name):
    # 1. Get current TD
    cmd = ["aws", "ecs", "describe-task-definition", "--task-definition", service_name]
    res = subprocess.run(cmd, capture_output=True, text=True)
    if res.returncode != 0:
        print(f"Error describing TD: {res.stderr}")
        return
    
    data = json.loads(res.stdout)
    td = data['taskDefinition']
    
    # 2. Build new TD
    new_td = {
        'family': td['family'],
        'containerDefinitions': td['containerDefinitions'],
        'volumes': td.get('volumes', []),
    }
    
    # Optional fields
    api_fields = [
        'taskRoleArn', 'executionRoleArn', 'networkMode', 
        'placementConstraints', 'requiresCompatibilities', 
        'cpu', 'memory', 'runtimePlatform'
    ]
    
    for field in api_fields:
        val = td.get(field)
        if val is not None:
            new_td[field] = val
            
    # 3. Update Image
    new_image_tag = "202601151258"
    for cd in new_td['containerDefinitions']:
        image_base = cd['image'].split(':')[0]
        cd['image'] = f"{image_base}:{new_image_tag}"
    
    # 4. Register new TD
    cmd = ["aws", "ecs", "register-task-definition", "--cli-input-json", json.dumps(new_td)]
    res = subprocess.run(cmd, capture_output=True, text=True)
    if res.returncode != 0:
        print(f"Error registering TD: {res.stderr}")
        return
    
    reg_data = json.loads(res.stdout)
    new_td_arn = reg_data['taskDefinition']['taskDefinitionArn']
    print(f"Registered new TD: {new_td_arn}")
    
    # 5. Update Service
    cmd = ["aws", "ecs", "update-service", "--cluster", service_name, "--service", service_name, "--task-definition", new_td_arn]
    res = subprocess.run(cmd, capture_output=True, text=True)
    if res.returncode != 0:
        print(f"Error updating service: {res.stderr}")
        return
    
    print(f"Service {service_name} updated successfully!")

if __name__ == "__main__":
    deploy("parrot-dev-backend")
    deploy("parrot-dev-frontend")
