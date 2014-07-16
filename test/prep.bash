#!/usr/bin/env bash

if [ -z "$FIREBASE_USER" ] || [ -z "$FIREBASE_PASS" ]; then
  read -p "Firebase username: " FB_U
  read -s -p "Password: " FB_PW
  export FIREBASE_USER=$FB_U
  export FIREBASE_PASS=$FB_PW
fi
