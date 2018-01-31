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

function format(text, repl) {
    return text.replace(/\{\}/, String(repl));
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
        commands: {},
        help_names: {},
        examples: [
            "!lines habs",
            "!prospects canadiens",
            "!cap hawks",
            "!cap brent seabrook",
            "!reddit leafs",
            "!trades oilers",
        ]
    },
    created: function () {
        var self = this;
        var data = JSON.parse(document.getElementById('data').innerText);
        var teams = data.teams;

        this.load(teams);
        this.commands = {
            'lines': this.buildCmdTeam("https://www.dailyfaceoff.com/teams/{}/line-combinations", "dailyfaceoff"),
            'stats': this.buildCmdTeam("https://www.nhl.com/{}/stats", "nhl"),
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
            for (key in obj) {
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
        teamFromID: function (id) {
            var team = this.codes[id] || this.names[id] || this.cities[id] || false;
            return team;
        },
        urlFromTeamRef: function (id, url, refname) {
            var team = this.teamFromID(id);
            if (team) {
                var ref = team.refs[refname];
                return format(url, ref);
            }
        },
        buildCmdTeam: function (url, refname) {
            var self = this;
            var func = function (arg) {
                return self.urlFromTeamRef(arg, url, refname);
            };
            return func;
        },
        parse: function (text) {
            var index = text.indexOf(' ');
            if (index >= 0 && text[0] == '!') {
                var cmd = text.substring(1, index).toLowerCase();
                var arg = text.substring(index + 1).toLowerCase();
                var func = this.commands[cmd];
                if (func) {
                    return func(arg);
                }

            }
        },
        cmdDraft: function (arg) {
            if (/^\d{4}$/.test(arg)) {
                return format("https://www.hockeydb.com/ihdb/draft/nhl{}e.html", arg);
            }
            return this.urlFromTeamRef(arg, "https://www.hockeydb.com/ihdb/draft/teams/dr{}.html", "hockeydb");
        },
        cmdCap: function (arg) {
            var url = this.urlFromTeamRef(arg, "https://capfriendly.com/team/{}", "capfriendly");
            if (url != null) {
                return url;
            }
            if (arg.length > 0) {
                var query = encodeURIComponent(arg);
                return format("https://capfriendly.com/search?s={}", arg);
            }
        },
        loadExample: function (event) {
            this.query = event;
        },
    }
});
