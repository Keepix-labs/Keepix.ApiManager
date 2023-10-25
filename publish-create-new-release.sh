#!/bin/bash

if [[ $1 =~ ^v([\\d])* ]]; then
    rm -rf "./release"
    cp -r "./dist" "./release"
    cp -r "./keepix.application-interface" "./release/keepix.application-interface"
    tar -czvf "./release/api.tar.gz" "./release"
    gh release create "$1" ./release/*.tar.gz
else
    echo "Please specify a version arg0 vX.X.X"
fi