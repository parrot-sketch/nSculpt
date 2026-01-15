import json
import sys

def update_td(filename, new_image_tag):
    with open(filename, 'r') as f:
        data = json.load(f)
    
    td = data['taskDefinition']
    # Build clean_td with only allow fields
    clean_td = {
        'family': td['family'],
        'containerDefinitions': td['containerDefinitions'],
        'volumes': td.get('volumes', []),
    }
    
    # Optional fields - only include if not None
    api_fields = [
        'taskRoleArn', 'executionRoleArn', 'networkMode', 
        'placementConstraints', 'requiresCompatibilities', 
        'cpu', 'memory', 'runtimePlatform'
    ]
    
    for field in api_fields:
        val = td.get(field)
        if val is not None:
            clean_td[field] = val
    
    # Update image for each container
    for cd in clean_td['containerDefinitions']:
        image_base = cd['image'].split(':')[0]
        cd['image'] = f"{image_base}:{new_image_tag}"
    
    with open(filename, 'w') as f:
        json.dump(clean_td, f, indent=4)

if __name__ == "__main__":
    update_td(sys.argv[1], sys.argv[2])
