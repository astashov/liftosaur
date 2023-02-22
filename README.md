# 🏋 Liftosaur: Open-source powerful weight lifting tracker PWA for coders.

Link: https://www.liftosaur.com/about

<img src="https://raw.github.com/astashov/liftosaur/master/screenshot2.png" alt="Liftosaur Screenshot" width="360" />

It's a mobile app, that's available as:

- [PWA](https://www.liftosaur.com) - meaning you can open the page in a browser on your mobile phone, add it to a home screen, and it will behave exactly as a regular app.
- [Android app](https://play.google.com/store/apps/details?id=com.liftosaur.www.twa) - thin Android app around this PWA with some native features added.
- [iOS app](https://apps.apple.com/us/app/liftosaur/id1661880849) - thin iOS app around this PWA with some native features added.

The main idea is to make a weightlifting tracker app, that is flexible enough to implement pretty much any weightlifting routine. It would be a platform for your experiments in weightlifting, you can try any progression and deloading logic you want to see what suits you better. It automatically handles progressive overloads and deloads based on the logic you define. Any program should be possible to implement - Stronglifts 5x5, GZCLP, any 5/3/1s, any PPL, you name it.

To describe the logic, there's a built-in scripting language called [Liftoscript](https://www.liftosaur.com/docs/docs.html#liftoscript-tutorial), which is a very simple programming language with JavaScript-like syntax. It has some built-in variables and some custom number types (e.g. `kg` and `lb`), but other than that it's pretty simple. E.g. Stronglifts 5x5 logic could look like this if written in Liftoscript:

```js
if (completedReps >= reps) {
  state.weight = state.weight + 5lb
} else {
  state.failures = state.failures + 1
}
if (state.failures > 2) {
  state.failures = 0
  state.weight = state.weight * 0.9
}
```

# Features

- Built-in workout programs - 5/3/1, GZCLP, Starting Strength, etc
- Any workout program is fully customizable - you can clone existing one and adjust it to your needs. Every single program is written using Liftoscript right in the app, so every bit of it could be changed.
- Simple exercise editor if you don't want to mess with Liftoscript, that still allows to specify simple progression/deload logic.
- Advanced exercise editor if you want to unleash the full power of Liftoscript.
- Workout history
- Offline mode, it doesn't need Internet to work (still needs though if you have an account and want to save progress).
- Plates calculator right on the progress screen. Each weight is prefixed with plates you need to use to get to that weight, it looks like: `45/25/25/10 255lb` meaning you need to add 1x45lb, 2x25lb and 1x10lb plates on each side of the olympic barbell to get `255lb`. You define your plates inventory in Settings.
- All weights are rounded according to your available bars and plates, which you set up in Settings.
- Rest Timers - configurable, with Web Push when the timer is expired (works only on Android though).
- Cloud storage - if you create an account, your progress will be saved on the server.
- Graphs - see the visual progression of your lifts, define what Graphs you need on the Graphs screen.
- Muscle map - see what muscles get activated in your day or in the whole program relatively to each other.
- Exercise substitution based on similar activated muscles.
- Custom exercises.
- Warmup sets, which you can configure as a percentage of the weight of the first set, or just as an absolute lb or kg value. Each exercise has defaults, but you can change it.
- "Playgrounds" when editing exercises, so you could test the logic or exercises.
- Previews of each program available, with playgrounds, e.g. [Basic Beginner Routine](https://www.liftosaur.com/programs/basicBeginner).
- If you did similar sets x reps for some exercise previously, it shows your last results. Same for AMRAPs.
- Optional public profile page, e.g. this is [mine](https://www.liftosaur.com/profile/tiolnbjbleke).
- Track bodyweight and other body measurements (biceps, chest, waist, etc)
- Correlate bodyweight changes with lifts graphs
- Web Editor to create programs

# Implementation details

It's a regular Preact/TypeScript app. State manager is custom, similar to Redux + Thunks, but with using [lens-shmens](https://github.com/astashov/lens-shmens#why) to avoid Redux-like boilerplate. It's a PWA, so there's a simple service worker, that caches the network calls. The setup is similar to what's described in [this blog post](https://www.liftosaur.com/blog/posts/offline-mode-in-liftosaur/).

I try to be efficient with the JavaScript size, and avoid heavy third-party libraries. As a result, the whole app weights ~200kb, where ~100kb are various third-party libs. The major third-party libs are:

- [CodeMirror](https://codemirror.net/) for the code editor
- [Preact](https://preactjs.com/) for a view layer
- [Prism](https://prismjs.com/) for code highlighting
- [uPlot](https://github.com/leeoniya/uPlot) for graphs
- [Webpushr](https://www.webpushr.com/) to send notifications when Rest Timer is expired
- [Rollbar](https://rollbar.com/) for error reporting
- [11ty](https://www.11ty.dev/) for the blog
- [Cypress][https://www.cypress.io/] for integration tests
- [Tailwind CSS](https://tailwindcss.com/) for CSS
- [Jimp](https://github.com/oliver-moran/jimp) for generating dynamic `og:image` images (like [this](https://www.liftosaur.com/profileimage/tiolnbjbleke)) for social media

Server-side part is AWS Lambdas + DynamoDB + S3 + a bunch of other AWS services. DynamoDB is not a great choice for this app, I'd prefer a relational database here, frankly. But AWS Lambdas + DynamoDB + S3 are pretty cheap, easily scalable, fully managed with backups, so sticking with it for now.

I deploy everything via AWS CDK, the setup is described in [this blog post](liftosaur.com/blog/posts/how-i-moved-liftosaur-from-cloudflare-workers-to-lambda/). I also created an [AWS CDK Lambda TypeScript starter](https://github.com/astashov/aws-cdk-lambda-typescript-starter), to simplify creating similar environment for pet projects.

# How to run locally

If you for some reason want to run it locally, just do the standard set of commands:

```
$ yarn install
$ yarn start
```

Then, open http://localhost:8080/. That's it! But that will only give you offline-like experience, so there will be no local API server running.

Running the server is a bit trickier, and frankly still tied to `liftosaur.com` domain, so probably would not be easy to run, you'd need to modify a bunch of things in `liftosaur-cdk/liftosaur-cdk.ts` file. If you still want to try, then you need to set up AWS account, add `AWS_ACCESS_KEY_ID`,`AWS_SECRET_ACCESS_KEY`,`AWS_REGION` env vars, and set the necessary permission policies for your user:

- SecretsManagerReadWrite
- AmazonDynamoDBFullAccess
- AmazonEC2ContainerRegistryFullAccess
- AmazonS3FullAccess
- CloudFrontFullAccess
- AmazonSESFullAccess
- AmazonAPIGatewayAdministrator
- AmazonSSMFullAccess
- AmazonRoute53FullAccess
- AWSCloudFormationFullAccess
- AmazonElasticContainerRegistryPublicFullAccess
- AWSLambdaFullAccess

Create new secrets in AWS Secrets Manager, with the names listed in `secretArns` variable in `liftosaur-cdk.ts`. Those could be pretty much any random strings.

Then, run `yarn cdk-deploy`, that should create 2 environments - one for prod, one for dev. Again, there could be some things you want to change in `lifosaur-cdk.ts` to make it work. After that, run `yarn start:server`, and it will start a local server.

# Contributing

If you want to propose a feature, or found a bug - [create an issue](https://github.com/astashov/liftosaur/issues) on Github.
