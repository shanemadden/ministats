Simple Screeps seasonal leaderboard/scoreboard collector.

```sh
cp .example-screeps.yaml .screeps.yaml
# edit file, add token

cp .example-env .env
# edit file, update passwords

# start containers
docker compose up -d

# grafana instance listening on port 3000

# log in with admin/admin
# add influx data source:
# URL: http://influxdb:8086
# database: stats
# user: admin
# password: token from .env
```
