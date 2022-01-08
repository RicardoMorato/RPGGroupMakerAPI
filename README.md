<p align="center">
  <img width="300" height="300" src="https://user-images.githubusercontent.com/56000167/148627804-6176f65a-be5d-49a7-9ba1-fb5a6cfb9d32.png" />
</p>

<p align="center">
  <img src="https://img.shields.io/github/license/RicardoMorato/RPGTableMakerAPI.svg" />
  <img src="https://img.shields.io/badge/readme%20style-standard-brightgreen.svg?style=flat-square" />
</p>

# RPGGroupMakerAPI

An API to connect players and RPG groups.

If you have ever played RPG, you know that it can be quite hard sometimes to gather a group of friends for a session.

That is the pain point that the RPGGroupMakerAPI comes to fight against.

Using this API you can easily connect with a RPG group and start having fun as soon as the group's next session. Not only this, but you can connect with several groups, and even create your own group to invite your friends!

## Table of Contents

- [Background](#background)
- [Security](#security)
- [Install](#install)
- [Using the API](#using-the-api)
- [License](#license)

## Background

This project was strongly inspired by [Giuliana's Bezerra Adonis course on Udemy](https://www.udemy.com/course/api-completa-com-adonisjs-5-typescript-e-tdd/). I followed her lessons, and dug a little deeper, adding more testing cases, and this custom README section

The entire project was made using TDD, with the [japa test runner](https://github.com/japa/core) and the awesome package [supertest](https://github.com/visionmedia/supertest).

### Important to know

- This is not a comercial API, nor a package of any kind, it was made purely for learning purposes;
- It is a open-source project, so feel free to open an issue, or a PR if you would like to contribute to it.

## Security

All routes have strict authentication and authorization rules.

For every request (besides user login, and user creation) you must send a `Bearer token` following the [opaque token convention](https://medium.com/@piyumimdasanayaka/json-web-token-jwt-vs-opaque-token-984791a3e715).

For some requests that update private info, authorization is also verified using [AdonisJs native bouncer](https://docs.adonisjs.com/guides/authorization)

## Install

In order to run this project you should have a minimum knowledge of [AdonisJs](https://adonisjs.com/).

1. Install all dependencies running

```zsh
yarn
```

or, if you are using `npm`

```zsh
npm i
```

2. To run the project/tests, you will need a copy of the `.env` file. Feel free to contact me on [LinkedIn](https://www.linkedin.com/in/ricardo-morato-673576108/) or [email](mailto:ricardomoratodev@gmail.com) to have a version of this file.

3. Finally, once you have met all requirements above, simply run:

```zsh
yarn dev
```

or, if you are using `npm`

```zsh
npm run dev
```

This should run the development server on your localhost

## Using the API

This API supports several request, such as:

- Creating a user;
- Login with a user;
- Joining a RPG group;
- Creating your own RPG group;
- Accept/Reject others from joining your RPG group;
- Etc.

You can see all supported features and their respective routes on [the routes file](https://github.com/RicardoMorato/RPGTableMakerAPI/blob/main/start/routes.ts)

## License

This repository follows the license [GPL V3.](LICENSE)
