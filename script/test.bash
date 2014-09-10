#!/usr/bin/env bash

source ./test/prep.bash
if [ -z $ONLY ]; then
  ./node_modules/mocha/bin/mocha --recursive -u bdd -t 30000 -s 2000 -r ./test/setup test/spec
else
  ./node_modules/mocha/bin/mocha --recursive -u bdd -t 30000 -s 2000 -r ./test/setup test/spec/$ONLY
fi
