5 April 2016 - 0.6.2
---
* Fix for fuge lib required in services (thanks Wyatt)

3 April 2016 - 0.6.1
---
* Fix upstream dependency on simple-grep breaking (thanks marco)

1 April 2016 - 0.6.0
---
* New versions of all custom dependencies.
* Support env_file directive in docker and process services.
* Support host volumes and data containers in docker-based services.
* Added support for 'profile' command using 0x (thank dmclements)
* No longer attempt to detect the buildScript from the Dockerfile.
* Added a config.defaults.build to the fuge-config.js to set script for all services.
* Removed auto-inclusion of .bashrc in builder and runner.
* Switched to using vorpal to drive the shell. (thanks @matt_oc)
* Tab auto-completion of service names. (thanks @matt_oc)
* Aliased exit to quit.
* Generators
  * Merged all generators into one repo [generator-fuge](https://github.com/apparatus/generator-fuge)
  * Removed option for redis or http transports.
  * Added selection of hapi or express for the REST api.
  * Split the API service into an actual api and static file server.
