import json


def read_entries(path):
    with open(path) as f:
        return list(f.read().splitlines())


names = read_entries('data/names')
places = read_entries('data/places')
capfriendly = read_entries('data/refs/capfriendly')
eliteprospects = read_entries('data/refs/eliteprospects')
hockeydb = read_entries('data/refs/hockeydb')

teams = []

for i in range(31):
    team = {
        "name": names[i],
        "city": places[i],
        "refs": {
            "capfriendly": capfriendly[i],
            "eliteprospects": eliteprospects[i],
            "hockeydb": hockeydb[i],
        }
    }

    teams.append(team)

data = dict(teams=teams)
print(json.dumps(data, indent=4))
