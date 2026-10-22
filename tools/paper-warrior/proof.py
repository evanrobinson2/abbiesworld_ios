import sys, os, json
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import build
p = json.load(open(sys.argv[1])); build.setup(p, level=2, W=1024, H=1024); build.render(sys.argv[2], 1024, 1024, samples=64)
