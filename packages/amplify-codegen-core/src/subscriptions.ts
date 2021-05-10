/* tslint:disable */
/* eslint-disable */
// this is an auto generated file. This will be overwritten

export const onCreateRestaurant = /* GraphQL */ `
  subscription OnCreateRestaurant($owner: String!) {
    onCreateRestaurant(owner: $owner) {
      id
      name
      description
      city
      owner
      createdAt
      updatedAt
    }
  }
`;
export const onUpdateRestaurant = /* GraphQL */ `
  subscription OnUpdateRestaurant($owner: String!) {
    onUpdateRestaurant(owner: $owner) {
      id
      name
      description
      city
      owner
      createdAt
      updatedAt
    }
  }
`;
export const onDeleteRestaurant = /* GraphQL */ `
  subscription OnDeleteRestaurant($owner: String!) {
    onDeleteRestaurant(owner: $owner) {
      id
      name
      description
      city
      owner
      createdAt
      updatedAt
    }
  }
`;
