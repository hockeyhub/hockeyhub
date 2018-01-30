function parseQueryPairs(href) {
    var params = {};

    var a = document.createElement('a');
    a.href = href;

    var search = a.search;
    if (search.length > 1) {
        search = search.substring(1);
        var pairs = search.split('&');
        for (pair of pairs) {
            var [key, val] = pair.split('=');
            key = decodeURIComponent(key);
            val = decodeURIComponent(val);
            params[key] = val;
        }
    }
    return params;
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
        var model = this;
        fetch("data.json").then((res) => {
            res.json().then((json) => {
                model.load(json.teams);
            });
        });
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
                for (var name of team.names) {
                    this.names[name.toLowerCase()] = team;
                    this.names[name.replace(/\s/, "").toLowerCase()] = team;
                }
                if (team.city != null) {
                    this.cities[team.city.toLowerCase()] = team;
                    this.cities[team.city.replace(/\s/, "").toLowerCase()] = team;
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
        cmdDraft: function (arg) {
            if (/^\d{4}$/.test(arg)) {
                return `https://www.hockeydb.com/ihdb/draft/nhl${arg}e.html`;
            }
            var team = this.teamFromID(arg);
            if (team) {
                var ref = team.refs.hockeydb;
                return `https://www.hockeydb.com/ihdb/draft/teams/dr${ref}.html`
            }
        },
        cmdDepth: function (arg) {
            var team = this.teamFromID(arg);
            if (team) {
                var ref = team.refs.eliteprospects;
                return `https://eliteprospects.com/depthchart.php?team=${ref}`
            }
        },
        cmdProspects: function (arg) {
            var team = this.teamFromID(arg);
            if (team) {
                var ref = team.refs.eliteprospects;
                return `https://eliteprospects.com/in_the_system.php?team=${ref}`
            }
        },
        cmdCap: function (arg) {
            var team = this.teamFromID(arg);
            if (team) {
                var ref = team.refs.capfriendly;
                return `https://capfriendly.com/team/${ref}`
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
                return `http://nhltradetracker.com/user/trade_list_by_team/${team.refs.nhltradetracker}/1`;
            }

        }
    }
});
