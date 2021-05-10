  #!/bin/bash

default_verdaccio_package=verdaccio@4.5.1
custom_registry_url=http://localhost:4873

function startLocalRegistry {
  # Start local registry
  tmp_registry_log=`mktemp`
  echo "Registry output file: $tmp_registry_log"
  (cd && nohup npx ${VERDACCIO_PACKAGE:-$default_verdaccio_package} -c $1 &>$tmp_registry_log &)
  # Wait for Verdaccio to boot
  grep -q 'http address' <(tail -f $tmp_registry_log)
}

function loginToLocalRegistry {
  # Login so we can publish packages
  (cd && npm_config_yes=true npx npm-auth-to-token@1.0.0 -u user -p password -e user@example.com -r "$custom_registry_url")
}

function unsetNpmRegistryUrl {
  # Restore the original NPM and Yarn registry URLs and stop Verdaccio
  npm set registry "https://registry.npmjs.org/"
  yarn config set registry "https://registry.npmjs.org/"
}

function setNpmRegistryUrlToLocal {
  # Set registry to local registry
  npm set registry "$custom_registry_url"
  yarn config set registry "$custom_registry_url"
}
