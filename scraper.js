const util = require('util');
const { ScreepsAPI } = require('screeps-api');
const { InfluxDB, Point } = require("@influxdata/influxdb-client");
const argv = require('yargs')
  .option('server', {
    describe: 'server to connect to; must be defined in .screeps.yaml servers section',
  })
  .demandOption('server')
  .option('influx', {
    describe: 'influxdb host',
  })
  .demandOption('influx')
  .argv;

const url = `http://${argv.influx}:8086`;
const token = "insecure-token";
const org = "season";
const bucket = "stats";

const PAGE_LIMIT = 20;
const INTERVAL = 60000;
const WATCH_ROOM = "E0N0";

const client = new InfluxDB({ url: url, token: token });

const sleep = util.promisify(setTimeout);

async function get_leaderboard(api, writeApi) {
  let players = 1;
  let checked = 0;
  let tst = new Date();
  while (checked < players) {
    let resp = await api.raw.leaderboard.list(limit = PAGE_LIMIT, mode='world', offset = checked);
    if (resp.count > players) {
      players = resp.count;
    }
    for (user_info of Object.values(resp.users)) {
      console.log("l", user_info.username, user_info.gcl);
      const point = new Point("gcl")
        .tag("username", user_info.username)
        .intField("value", user_info.gcl)
        .timestamp(tst);
      writeApi.writePoint(point);
    }
    checked += PAGE_LIMIT;
  }
  writeApi.flush();
}

async function get_scoreboard(api, writeApi) {
  let players = 1;
  let checked = 0;
  let tst = new Date();
  while (checked < players) {
    let resp = await api.raw.scoreboard.list(limit = PAGE_LIMIT, offset = checked);
    if (resp.meta.length > players) {
      players = resp.meta.length;
    }
    for (user_info of resp.users) {
      console.log("s", user_info.username, user_info.score);
      if (user_info.score) {
        const point = new Point("score")
          .tag("username", user_info.username)
          .intField("value", user_info.score)
          .timestamp(tst);
        writeApi.writePoint(point);
      }
    }
    checked += PAGE_LIMIT;
  }
  writeApi.flush();
}

async function run() {
  const api = await ScreepsAPI.fromConfig(argv.server);
  const writeApi = client.getWriteApi(org, bucket);
  api.socket.connect();
  // watch a random highway room, allowing us to get at what the current tick number is
  // when it sends updates
  api.socket.subscribe(`room:shardSeason/${WATCH_ROOM}`, (event) => {
    if (event.data.gameTime) {
      const point = new Point("tick")
        .intField("value", event.data.gameTime)
        .timestamp(new Date());
      writeApi.writePoint(point);
      writeApi.flush();
    }
  })
  while (true) {
    // let r = await api.raw.game.shards.info();
    // console.log(r.shards[0].lastTicks);
    get_leaderboard(api, writeApi);
    get_scoreboard(api, writeApi);
    await sleep(INTERVAL);
  }
}

run().catch(console.error)
