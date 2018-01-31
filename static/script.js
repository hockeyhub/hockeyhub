function parseQueryPairs(href) {
    var params = {};

    var a = document.createElement('a');
    a.href = href;

    var search = a.search;
    if (search.length > 1) {
        search = search.substring(1);
        var pairs = search.split('&');
        for (var i = 0; i < pairs.length; i++) {
            var parts = pairs[i].split('=');
            var key = key = decodeURIComponent(parts[0]);
            var val = decodeURIComponent(parts[1]);
            params[key] = val;
        }
    }
    return params;
}

function insertVariants(obj, name, val) {
    name = name.toLowerCase();
    obj[name] = val;
    obj[name.replace(/\s/g, "")] = val;
    obj[name.replace(/[\s\.]/g, "")] = val;
}

var app = new Vue({
    el: '#app',
    data: {
        teams: [],
        names: {},
        cities: {},
        codes: {},
        query: '',
        url: '',
        params: {},
    },
    created: function () {
        var data = JSON.parse(document.getElementById('data').innerText);
        this.load(data.teams);
    },
    watch: {
        query: function (text) {
            var s = this.parse(text);
            if (s) {
                this.url = s;
                this.params = parseQueryPairs(s);
            } else {
                this.url = '';
            }
        }
    },
    methods: {
        load: function (teams) {
            this.teams = teams;
            for (var i = 0; i < teams.length; i++) {
                var team = teams[i];
                for (var j = 0; j < team.names.length; j++) {
                    insertVariants(this.names, team.names[j], team);
                }
                if (team.city != null) {
                    insertVariants(this.cities, team.city, team);
                }
                this.codes[team.code] = team;
            }
        },
        teamFromID: function (id) {
            var team = this.codes[id] || this.names[id] || this.cities[id] || false;
            return team;
        },
        parse: function (text) {
            var commands = {
                'lines': this.cmdLines,
                'draft': this.cmdDraft,
                'depth': this.cmdDepth,
                'cap': this.cmdCap,
                'prospects': this.cmdProspects,
                'reddit': this.cmdReddit,
                'trades': this.cmdTrades,
            };

            var index = text.indexOf(' ');
            if (index >= 0 && text[0] == '!') {
                var cmd = text.substring(1, index).toLowerCase();
                var arg = text.substring(index + 1).toLowerCase();
                var func = commands[cmd];
                if (func) {
                    return func(arg);
                }

            }
        },
        cmdLines: function (arg) {
            var team = this.teamFromID(arg);
            if (team) {
                var ref = team.refs.dailyfaceoff;
                return `https://www.dailyfaceoff.com/teams/${ref}/line-combinations`;
            }
        },
        cmdDraft: function (arg) {
            if (/^\d{4}$/.test(arg)) {
                return `https://www.hockeydb.com/ihdb/draft/nhl${arg}e.html`;
            }
            var team = this.teamFromID(arg);
            if (team) {
                var ref = team.refs.hockeydb;
                return `https://www.hockeydb.com/ihdb/draft/teams/dr${ref}.html`;
            }
        },
        cmdDepth: function (arg) {
            var team = this.teamFromID(arg);
            if (team) {
                var ref = team.refs.eliteprospects;
                return `https://eliteprospects.com/depthchart.php?team=${ref}`;
            }
        },
        cmdProspects: function (arg) {
            var team = this.teamFromID(arg);
            if (team) {
                var ref = team.refs.eliteprospects;
                return `https://eliteprospects.com/in_the_system.php?team=${ref}`;
            }
        },
        cmdCap: function (arg) {
            var team = this.teamFromID(arg);
            if (team) {
                var ref = team.refs.capfriendly;
                return `https://capfriendly.com/team/${ref}`;
            }
            if (arg.length > 0) {
                var query = encodeURIComponent(arg);
                return `https://capfriendly.com/search?s=${query}`;
            }
        },
        cmdReddit: function (arg) {
            var team = this.teamFromID(arg);
            if (team) {
                return `https://reddit.com/r/${team.refs.reddit}`;
            }
        },
        cmdTrades: function (arg) {
            var team = this.teamFromID(arg);
            if (team) {
                return `https://nhltradetracker.com/user/trade_list_by_team/${team.refs.nhltradetracker}/1`;
            }

        }
    }
});
