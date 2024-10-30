diff --ignore-space-change \
  ./src/vendor/@graphql-codegen/core/VERSION \
  <(yarn list --pattern @graphql-codegen/core | grep @graphql-codegen/core | cut -d '@' -f 3) || \
  ( \
    echo 'The version of @graphql-codegen/core has changed. Please go through the instructions in ./vendors/@graphql-codegen/core/MAINTENANCE.md' \
    && exit 1 \
  )