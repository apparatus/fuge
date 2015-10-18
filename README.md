# fuge
[![Gitter][gitter-badge]][gitter-url]

Fuge provides a generation and execution environment for microservice development.

If you're using this module, and need help, you can:

- Post a [github issue][],
- Ask on the [Gitter][gitter-url].

## Install
To install, use npm to install globally.

```sh
npm install -g fuge
```

## Test
To run tests, use npm:

```
npm run test
```

## Usage

To generate a skeletal fuge microservice system run

```
mkdir mysystem
cd mysystem
fuge generate system
```

Fuge will create a front end site and two micro services. The directory layout is as follows:

```
├── fuge
│   └── compose-dev.yml
├── service1
├── service2
└── site
    ├── api
    └── public
```

* fuge - contains compose-dev.yml. This serves as the main control ponit for the system
* service1 - contains a basic http point to point microservice
* service2 - contains a basic http point to point microservice
* site - contains a frontend site for the system. This is comprised of an api and a public site

To execute the system run

```
fuge run ./fuge/compose-dev.yml
```

This will spin up the site and the two related microservices. Point your browser to http://localhost:10000/public/basic.html to open the front end
and exercise the microservices.

Fuge watches your code for changes and will automatically restart the front end and services as you make changes, providing a rapid development
environment for integration testing.

To generate a new service run

```
fuge generate service
```

Fuge will create a new service for you and will optionally add it into compose-dev.yml.

## Contributing
The [microbial-lab team][] encourage open participation. If you feel you can help in any way, be it with
documentation, examples, extra testing, or new features please get in touch.

## License
Copyright the microbial-lab team 2015, Licensed under [MIT][].

[microbial-lab team]: https://github.com/microbial-lab
[travis-badge]: https://travis-ci.org/microbial-lab/fuge-runner.svg
[travis-url]: https://travis-ci.org/microbial-lab/fuge-runner
[gitter-badge]: https://badges.gitter.im/Join%20Chat.svg
[gitter-url]: https://gitter.im/microbial-lab

[MIT]: ./LICENSE
[github issue]: https://github.com/microbial-lab/fuge-runner/issues/new
