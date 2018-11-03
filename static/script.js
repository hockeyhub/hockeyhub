"use scrict";

function parseQueryString(search) {
    var params = {};

    if (search.length > 1) {
        search = search.substring(1);
        var pairs = search.split('&');
        for (var i = 0; i < pairs.length; i++) {
            var parts = pairs[i].split('=');
            var key = decodeURIComponent(parts[0]);
            var val = decodeURIComponent(parts[1]);
            params[key] = val;
        }
    }
    return params;
}

function parseURLQueryString(href) {
    var a = document.createElement('a');
    a.href = href;

    return parseQueryString(a.search);
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

function pad(num) {
    var x = parseInt(num, 10);
    if (x < 10) {
        return format("0{}", x);
    }
    return format("{}", x);
}


function makeHelp(name, options, text) {
    return {
        name: name,
        args: options.args,
        opts: options.opts,
        or: options.or,
        text: text,
    };
}

var help_queries = [
    makeHelp('lines', { args: ['team'] }, "Team lines on Daily Faceoff"),
    makeHelp('stats', { args: ['team'], opts: ['year'] }, "Team stats on nhl.com, year optional"),
    makeHelp('schedule', { args: ['team'] }, "Team schedule on nhl.com"),
    makeHelp('draft', { or: ['team', 'year'] }, "Draft history for team or year on Elite Prospects"),
    makeHelp('cap', { or: ['team', 'player'] }, "Cap information for team or player on CapFriendly"),
    makeHelp('player', { args: ['player'] }, "Search for player on Elite Prospects"),
    makeHelp('depth', { args: ['team'] }, "Team depth chart on Elite Prospects"),
    makeHelp('prospects', { args: ['team'] }, "Team prospects on Elite Prospects"),
    makeHelp('trades', { args: ['team'] }, "Team trade history on NHL Trade Tracker"),
    makeHelp('jersey', { or: ['number', 'name'], opts: ["team"] }, "Find a player by jersey number"),
    makeHelp('highlights', { opts: ['team'] }, "Game Highlights, team optional"),
    makeHelp('reddit', { args: ['team'] }, "Team subreddit on Reddit"),
];

var app = new Vue({
    el: '#app',
    data: {
        teams: [],
        names: {},
        cities: {},
        codes: {},
        query: '',
        url: '',
        method: 'get',
        params: {},
        commands: {},
        help_teams: {},
        examples: [
            "jersey habs 15",
            "habs lines",
            "2012 draft",
            "player victor mete",
            "cap brent seabrook",
            "reddit leafs",
            "oilers trades",
            "jersey brendan",
        ],
        help_queries: help_queries,
        rosters: null,
        answer: "",
    },
    created: function () {
        var self = this;
        var data = JSON.parse(document.getElementById('data').innerText);
        var teams = data.teams;

        axios.get("https://statsapi.web.nhl.com/api/v1/teams?expand=team.roster").then(function (data) {
            data = data.data;
            var rosters = {};
            for (var i = 0; i < data.teams.length; i++) {
                var team = data.teams[i];
                var roster = {};
                team.roster.roster.forEach(function (player) {
                    roster[player.jerseyNumber] = player.person.fullName;
                });
                rosters[team.abbreviation.toLowerCase()] = roster;
            }
            self.rosters = rosters;

            // Parse and analyze the query after loading roster information.
            // When a shared link is used, the query is parsed and displayed before the roster information
            // is loaded, so it says "no results". By parsing the query again after loading the roster
            // information, we make sure that this issue does not happen.
            self.runQuery(self.query);
        });

        this.load(teams);
        this.commands = {
            'lines': this.buildCmdTeam("https://www.dailyfaceoff.com/teams/{}/line-combinations", "dailyfaceoff"),
            'stats': this.cmdStats,
            'schedule': this.buildCmdTeam("https://www.nhl.com/{}/schedule", "nhl"),
            'draft': this.cmdDraft, // custom
            'depth': this.buildCmdTeam("https://www.eliteprospects.com/team/{}/{}/depth-chart", ["eliteprospects_id", "eliteprospects_name"]),
            'cap': this.cmdCap, // custom
            'prospects': this.buildCmdTeam("https://www.eliteprospects.com/team/{}/{}/in-the-system", ["eliteprospects_id", "eliteprospects_name"]),
            'reddit': this.buildCmdTeam("https://reddit.com/r/{}", "reddit"),
            'trades': this.buildCmdTeam("https://nhltradetracker.com/user/trade_list_by_team/{}/1", "nhltradetracker"),
            'highlights': this.cmdHighlights,
            'jersey': this.cmdJersey,
            'player': this.cmdPlayer,
        };

        for (var i = 0; i < teams.length; i++) {
            this.help_teams[teams[i].fullname] = [];
        }

        function addHelp(obj) {
            for (var key in obj) {
                if (obj.hasOwnProperty(key)) {
                    self.help_teams[obj[key].fullname].push(key);
                }
            }
        }

        addHelp(this.names);
        addHelp(this.codes);
        addHelp(this.cities);

        var params = parseQueryString(window.location.search);
        if (params.search) {
            var app = this;
            this.query = params.search;
            setTimeout(function () {
                if (app.url) {
                    var form = document.getElementById('query_form');
                    form.setAttribute('target', '');
                    form.submit();
                }
            });
        }
    },
    watch: {
        query: function (text) {
            this.runQuery(text);
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
            document.getElementById("query").focus();
            window.scrollTo(0, 0);
        },
        shareLink: function (event) {
            var base = window.location.href;
            var cut = base.lastIndexOf('?');
            if (cut < 0) {
                cut = base.length;
            }
            base = base.substring(0, cut);
            prompt("Copy the URL", format("{}?search={}", base, encodeURIComponent(this.query)));
        },
        // Process the query and display the result(s) if there's any.
        runQuery: function (text) {
            var res = this.parseQuery(text);
            this.answer = '';
            if (res.command) {
                var url = res.command(res);
                if (url) {
                    if (typeof url === 'string') {
                        this.url = url;
                        this.params = parseURLQueryString(url);
                        this.method = "get";
                    } else {
                        this.url = url.url;
                        this.method = url.method;
                        this.params = url.params;
                    }
                } else {
                    this.url = '';
                    this.params = {};
                    this.method = "get";
                }
            }
        },

        /**
         * Try to detect particular tokens in a query.
         * - Year
         * - Team
         * - Command
         * - Jersey
         */
        parseQuery: function (text) {
            var tokens = text.trim().toLowerCase().split(/\s+/);
            var res = {
                text: null,
                team: null,
                year: null,
                jersey: null,
                command: null,
            };
            var text_tokens = [];

            for (var idx = 0; idx < tokens.length; idx++) {
                var token = tokens[idx];
                var team = this.teamFromID(res.token);

                if (team) {
                    // check if the token is a team
                    res.team = team;
                } else if (/^\d{1,2}$/.test(token)) {
                    // check if token is a jersey
                    res.jersey = token;
                } else if (/^\d{4}$/.test(token)) {
                    // check if token is a year
                    res.year = token;
                } else {
                    var cmd = null;
                    if (token[0] == '!') {
                        // legacy bang support
                        var stripped = token.substring(1);
                        cmd = this.commands[stripped];
                    }
                    // check if the token is a command
                    cmd = cmd || this.commands[token];
                    if (cmd != null) {
                        res.command = cmd;
                    } else {
                        // otherwise it's normal text
                        text_tokens.push(token);
                    }
                }
            }
            res.text = text_tokens.join(' ');

            // If no team was found before, check if the joined text represents a team.
            // This case happens when a team name has a space in it, it gets split into
            // multiple tokens that cannot identify the team on their own.
            if (!res.team) {
                var team = this.teamFromID(res.text);
                if (team) {
                    res.team = team;
                    res.text = null;
                }
            }
            return res;
        },
        teamFromID: function (id) {
            var team = this.codes[id] || this.names[id] || this.cities[id] || false;
            return team;
        },
        urlFromTeamRefs: function (team, url, refs) {
            if (typeof refs === 'string') {
                refs = [refs];
            }
            var datums = refs.map(function (ref) { return team.refs[ref]; });
            datums.unshift(url);
            return format.apply(this, datums);
        },
        buildCmdTeam: function (url, refs) {
            if (typeof refs === 'string') {
                refs = [refs];
            }
            var self = this;
            var func = function (res) {
                if (res.team != null) {
                    return self.urlFromTeamRefs(res.team, url, refs);
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
                return format("https://www.eliteprospects.com/draft/nhl-entry-draft/{}", res.year);
            } else if (res.team != null) {
                return this.urlFromTeamRefs(res.team,
                    "https://www.eliteprospects.com/draft/nhl-entry-draft/team/{}/{}",
                    ["eliteprospects_id", "eliteprospects_name"]);
            }
        },
        cmdCap: function (res) {
            if (res.team != null) {
                return this.urlFromTeamRefs(res.team, "https://capfriendly.com/team/{}", "capfriendly");
            } else if (res.text.length > 0) {
                var query = encodeURIComponent(res.text);
                return format("https://capfriendly.com/search?s={}", query);
            }
        },
        cmdHighlights: function (res) {
            if (res.team != null) {
                return this.urlFromTeamRefs(res.team, "https://highlights.hockey/{}.html", "highlights");
            } else if (res.text.length == 0) {
                return "https://highlights.hockey/";
            }
        },
        cmdPlayer: function (res) {
            if (res.text.length > 0) {
                return format("https://www.eliteprospects.com/search/player?q={}", encodeURIComponent(res.text));
            }
        },
        cmdJersey: function (res) {
            var self = this;
            console.log(res);
            if (res.jersey != null) {
                var players = [];
                if (res.team) {
                    // we have a team, look for the jersey number within the team
                    var player = this.rosters[res.team.code][res.jersey];
                    if (player) {
                        players.push(player);
                    }
                } else {
                    // we do not have a team, look for the jersey within all teams
                    for (var code in this.rosters) {
                        var roster = this.rosters[code];
                        var player = roster[res.jersey];
                        if (player) {
                            players.push(player);
                        }
                    };
                }
                if (players.length > 0) {
                    players.sort();
                    players.splice(0, 0, format("Players wearing {}:\n", res.jersey));
                    self.answer = players.join("\n");
                } else {
                    self.answer = "No results";
                }
            } else if (res.text.length > 3) {
                // we don't have a jersey, look for the jersey number by name
                var search = res.text.toLowerCase();
                var players = [];
                for (var code in self.rosters) {
                    var roster = self.rosters[code];
                    for (var number in roster) {
                        var name = roster[number];
                        if (name.toLowerCase().indexOf(search) > -1) {
                            players.push([number, name]);
                        }
                    }
                };
                if (players.length > 0) {
                    players.sort(function (a, b) { return a[0] - b[0]; });
                    self.answer = players.map(function (pair) { return format("{}: {}", pad(pair[0]), pair[1]); }).join("\n");
                } else {
                    self.answer = "No results";
                }
            }
        },
    }
});
