# Upgrading Fuge
This short guide details how to upgrade your Fuge configuration if you have been running Fuge with Docker Compose based configuration. Full documentation on new Fuge configuration  format is [available here](https://github.com/apparatus/fuge-config).

## TL;DR
Fuge now uses a YAML configuration file format. This can be used to configure fuge in it's entirety or you may #include a docker compose file. Fuge now supports compose V1, V2 and V3. If you are running fuge using an existing Docker Compose file you can continue to do so by creating a fuge configuration file (fuge.yml) as follows:

```
fuge_global:
  run_containers: true
  tail: true
  monitor: true
  monitor_excludes:
    - '**/node_modules/**'
    - '**/.git/**'
    - '**/*.log'
include:
  - './compose.yml'
```

Start fuge as follows:

```
$ fuge shell fuge.yml
```

## The Details
Fuge configuration has changed. The rational for this is as follows:

* The original configuration mechanism of using a Docker Compose file along with a JSON file was clumsy and unintuitive.

* There were a number of key features (such as Kubernetes emulation) that we needed to add to Fuge that we could not cleanly add using the Docker Compose file mechanism.

* Docker Compose does not allow for arbitrary extension of the file format.

In order to cope with these requirements, fuge is now configured using a single YAML file. This YAML file can however include Docker Compose files. All supported settings within these compose files will be honored by fuge.

Full Documentation on the Fuge configuration format is [available here](https://github.com/apparatus/fuge-config).

## Example
The Following example shows a system that has three services and a redis container. Firstly fuge.yml:

```
fuge_global:
  tail: true
  monitor: true
  monitor_excludes:
    - '**/node_modules/**'
    - '**/.git/**'
    - '**/*.log'
service_1:
  type: process
  path: ./service_1
  run: node index.js
  ports:
    - main=8080
  environment:
    - wibble=bibble
include:
  - './compose.yml'
```

The included compose file:

```
version: '2'
services:
  service_2:
    build: ./service_2/
    container_name: service_2
    ports:
      - "9090-9091:8080-8081"
      - "49100:22"
    env_file: './s2.env'
  service_3:
    build: ./service_4/
    env_file:
      - ./s4_one.env
      - ./s4_two.env
    environment:
      - RACK_ENV=development
    ports:
      - "3000-3005"
  redis:
    image: redis
    container_name: redis
    ports:
      - 6379:6379
```

Fuge will load and interpret this as follows:

* service_1 is a process that can be started with `node index.js` in the directory `./service_1`

* service_2 has a build command therefore treat it as a process that can be started with the command specified in the Dockerfile that I expect to find in the directory `../service_2`

* service_3 has a build command therefore treat it as a process that can be started with the command specified in the Dockerfile that I expect to find in the directory `../service_3`

* redis is a container that will be started through the local docker api

In addition to this Fuge will load and expose environment variables specified under the env_file section in the docker file and also all other port and environment settings.
