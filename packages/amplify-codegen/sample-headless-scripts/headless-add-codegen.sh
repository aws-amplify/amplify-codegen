#!/bin/bash
set -e
IFS='|'

CODEGEN="{\
\"generateCode\":true,\
\"codeLanguage\":\"typescript\",\
\"fileNamePattern\":[\"src/graphql/**/*.ts\"],\
\"generatedFileName\":\"API.ts\",\
\"generateDocs\":true,\
\"maxDepth\":\"2\"\
}"

echo $CODEGEN | amplify codegen add \
--headless \
--yes