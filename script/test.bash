#!/usr/bin/env bash

source ./test/prep.bash
./node_modules/mocha/bin/mocha --recursive -u bdd -t 30000 -s 2000 -r ./test/setup test/spec
