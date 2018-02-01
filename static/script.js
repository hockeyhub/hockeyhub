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

function format(text) {
    var args = arguments;
    var idx = 0;
    return text.replace(/\{\}/g, function () {
        return String(args[++idx]);
    });
}

function makeHelp(name, options, text) {
    return {
        name: name,
        args: options.args,
        opts: options.opts,
        or: options.or,
        text: text,
    }
}

var help = [
    makeHelp('lines', { args: ['team'] }, "Team lines on Daily Faceoff"),
    makeHelp('stats', { args: ['team'], opts: ['year'] }, "Team stats on nhl.com, year optional"),
    makeHelp('schedule', { args: ['team'] }, "Team schedule on nhl.com"),
    makeHelp('draft', { or: ['team', 'year'] }, "Draft history for team or year on HockeyDB"),
    makeHelp('cap', { or: ['team', 'player'] }, "Cap information for team or player on CapFriendly"),
    makeHelp('depth', { args: ['team'] }, "Team depth chart on Elite Prospects"),
    makeHelp('prospects', { args: ['team'] }, "Team prospects on Elite Prospects"),
    makeHelp('trades', { args: ['team'] }, "Team trade history on NHL Trade Tracker"),
    makeHelp('reddit', { args: ['team'] }, "Team subreddit on Reddit"),
]

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
        commands: {},
        help_names: {},
        examples: [
            "habs lines",
            "2012 draft",
            "hawks cap",
            "cap brent seabrook",
            "reddit leafs",
            "oilers trades",
        ],
        help_cmd: help,
    },
    created: function () {
        var self = this;
        var data = JSON.parse(document.getElementById('data').innerText);
        var teams = data.teams;

        this.load(teams);
        this.commands = {
            'lines': this.buildCmdTeam("https://www.dailyfaceoff.com/teams/{}/line-combinations", "dailyfaceoff"),
            'stats': this.cmdStats,
            'schedule': this.buildCmdTeam("https://www.nhl.com/{}/schedule", "nhl"),
            'draft': this.cmdDraft, // custom
            'depth': this.buildCmdTeam("https://eliteprospects.com/depthchart.php?team={}", "eliteprospects"),
            'cap': this.cmdCap, // custom
            'prospects': this.buildCmdTeam("https://eliteprospects.com/in_the_system.php?team={}", "eliteprospects"),
            'reddit': this.buildCmdTeam("https://reddit.com/r/{}", "reddit"),
            'trades': this.buildCmdTeam("https://nhltradetracker.com/user/trade_list_by_team/{}/1", "nhltradetracker"),
        };
        for (var i = 0; i < teams.length; i++) {
            this.help_names[teams[i].fullname] = [];
        }

        function addHelp(obj) {
            for (var key in obj) {
                if (obj.hasOwnProperty(key)) {
                    self.help_names[obj[key].fullname].push(key);
                }
            }
        }
        addHelp(this.names);
        addHelp(this.codes);
        addHelp(this.cities);
    },
    watch: {
        query: function (text) {
            var s = this.parse(text.trim());
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

        loadExample: function (event) {
            this.query = event.target.innerText.trim();
        },

        /**
         * Try to detect particular tokens in a query.
         * - Year
         * - Team
         * - Command
         */
        parseQuery: function (text) {
            var tokens = text.trim().toLowerCase().split(/\s+/);
            var res = {
                text: null,
                team: null,
                year: null,
                command: null,
            };
            var text_tokens = [];
            for (var idx = 0; idx < tokens.length; idx++) {
                var token = tokens[idx];

                if (/\d{4}/.test(token)) {
                    // check if token is year
                    res.year = token;

                } else {
                    var cmd = null;
                    if (token[0] == '!') {
                        // legacy bang support
                        var stripped = token.substring(1);
                        var cmd = this.commands[stripped];
                    }
                    // check if the token is a command
                    var cmd = cmd || this.commands[token];
                    if (cmd != null) {
                        res.command = cmd;
                    } else {
                        // otherwise it's normal text
                        text_tokens.push(token);
                    }
                }
            }
            res.text = text_tokens.join(' ');
            // check if the text identifies a team
            var team = this.teamFromID(res.text);
            if (team) {
                res.team = team;
            }
            return res;
        },
        teamFromID: function (id) {
            var team = this.codes[id] || this.names[id] || this.cities[id] || false;
            return team;
        },
        urlFromTeamRef: function (team, url, refname) {
            var ref = team.refs[refname];
            return format(url, ref);
        },
        parse: function (text) {
            var res = this.parseQuery(text);
            if (res.command) {
                return res.command(res);
            }
        },
        buildCmdTeam: function (url, refname) {
            var self = this;
            var func = function (res) {
                if (res.team != null) {
                    return self.urlFromTeamRef(res.team, url, refname);
                }
            };
            return func;
        },
        cmdStats: function (res) {
            if (res.team != null) {
                var ref = res.team.refs.nhl;
                if (res.year != null) {
                    var end = parseInt(res.year);
                    var begin = end - 1;
                    return format("https://www.nhl.com/{}/stats/{}-{}", ref, begin, end);
                }
                return format("https://www.nhl.com/{}/stats", ref);
            }
        },
        cmdDraft: function (res) {
            if (res.year != null) {
                return format("https://www.hockeydb.com/ihdb/draft/nhl{}e.html", res.year);
            } else if (res.team != null) {
                return this.urlFromTeamRef(res.team, "https://www.hockeydb.com/ihdb/draft/teams/dr{}.html", "hockeydb");
            }
        },
        cmdCap: function (res) {
            if (res.team != null) {
                return this.urlFromTeamRef(res.team, "https://capfriendly.com/team/{}", "capfriendly");
            } else if (res.text.length > 0) {
                var query = encodeURIComponent(res.text);
                return format("https://capfriendly.com/search?s={}", query);
            }
        },
    }
});
