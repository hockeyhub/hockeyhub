import json
import os
import sys
from pathlib import Path
import shutil


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
capfriendly = read_entries('data/refs/capfriendly')
eliteprospects = read_entries('data/refs/eliteprospects')
hockeydb = read_entries('data/refs/hockeydb')
reddit = read_entries('data/refs/reddit')
nhltradetracker = read_entries('data/refs/nhltradetracker')
dailyfaceoff = read_entries('data/refs/dailyfaceoff')

if __name__ == '__main__':
    teams = []

    for i in range(31):
        team = {
            "fullname": fullnames[i],
            "names": names[i],
            "city": places[i],
            "code": codes[i],
            "refs": {
                "capfriendly": capfriendly[i],
                "eliteprospects": eliteprospects[i],
                "hockeydb": hockeydb[i],
                "reddit": reddit[i],
                "nhltradetracker": nhltradetracker[i],
                "dailyfaceoff": dailyfaceoff[i],
            }
        }

        teams.append(team)

    data = dict(teams=teams)

    target = Path(sys.argv[1])
    target.mkdir(parents=True, exist_ok=True)

    index_path = target / 'index.html'
    data_path = target / 'data.json'
    style_path = target / 'style.css'
    script_path = target / 'script.js'

    rendered = Path("static/index.html").read_text().replace('$$JSON_DATA$$', json.dumps(data))

    index_path.write_text(rendered)
    data_path.write_text(json.dumps(data, indent=2))
    shutil.copy("static/style.css", str(style_path))
    shutil.copy("static/script.js", str(script_path))
