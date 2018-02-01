import json
import sys
from collections import OrderedDict
from pathlib import Path


def empty_none(line):
    if len(line) == 0:
        return None
    else:
        return line


def read_entries(path):
    with open(path) as f:
        return list(map(empty_none, f.read().splitlines()))


def read_names(path):
    return [name.split('|') for name in read_entries(path)]


fullnames = read_entries('data/fullnames')
names = read_names('data/names')
places = read_entries('data/places')
codes = read_entries('data/codes')

refs_paths = list(Path('data/refs').iterdir())
refs_paths.sort(key=lambda p: p.name)
refs = OrderedDict()
for path in refs_paths:
    refs[path.name] = read_entries(str(path))

if __name__ == '__main__':
    teams = []

    for i in range(31):
        obj_refs = OrderedDict()
        for ref_name, ref_vals in refs.items():
            obj_refs[ref_name] = ref_vals[i]
        team = OrderedDict()
        team['fullname'] = fullnames[i]
        team['names'] = names[i]
        team['city'] = places[i]
        team['code'] = codes[i]
        team['refs'] = obj_refs

        teams.append(team)

    data = dict(teams=teams)

    target = Path(sys.argv[1])
    target.mkdir(parents=True, exist_ok=True)

    index_path = target / 'index.html'
    data_path = target / 'data.json'

    rendered = Path("static/index.html").read_text().replace('$$JSON_DATA$$', json.dumps(data))

    index_path.write_text(rendered)
    data_path.write_text(json.dumps(data, indent=2))
