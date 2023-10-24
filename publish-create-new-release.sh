#!/bin/bash

if [[ $1 =~ ^v([\\d])* ]]; then
    cp -r "./dist" "./release"
    tar -czvf "./release/api.tar.gz" "./release"
    gh release create "$1" ./release/*.tar.gz
else
    echo "Please specify a version arg0 vX.X.X"
fi