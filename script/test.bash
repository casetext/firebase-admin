#!/usr/bin/env bash

source ./test/prep.bash
./node_modules/mocha/bin/mocha --recursive -u bdd -t 10000 -s 1000 -r ./test/setup test/spec
