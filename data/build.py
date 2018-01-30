import json


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


names = read_names('data/names')
places = read_entries('data/places')
codes = read_entries('data/codes')
capfriendly = read_entries('data/refs/capfriendly')
eliteprospects = read_entries('data/refs/eliteprospects')
hockeydb = read_entries('data/refs/hockeydb')
reddit = read_entries('data/refs/reddit')
nhltradetracker = read_entries('data/refs/nhltradetracker')

if __name__ == '__main__':
    teams = []

    for i in range(31):
        team = {
            "names": names[i],
            "city": places[i],
            "code": codes[i],
            "refs": {
                "capfriendly": capfriendly[i],
                "eliteprospects": eliteprospects[i],
                "hockeydb": hockeydb[i],
                "reddit": reddit[i],
                "nhltradetracker": nhltradetracker[i],
            }
        }

        teams.append(team)

    data = dict(teams=teams)
    print(json.dumps(data, indent=4))
