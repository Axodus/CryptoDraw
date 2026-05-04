import json

def load_config(file_path):
    with open(file_path, 'r') as file:
        config = json.load(file)
    return config

def get_value(key):
    config = load_config('src/config.json')
    return config.get(key, None)

