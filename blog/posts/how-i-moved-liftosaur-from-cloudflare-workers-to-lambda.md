---
date: "2021-06-22"
title: How I moved Liftosaur from Cloudflare Workers to AWS Lambda
og_title: How I moved Liftosaur from Cloudflare Workers to AWS Lambda | Liftosaur blog
og_description: Why did I move Liftosaur to Cloudflare, the process, obstacles, the result, and also the starter skeleton.
og_image: /images/how-i-moved-liftosaur-from-cloudflare-workers-to-lambda-intro.png
tags: ["tech"]
twitter: https://twitter.com/anton_astashov/status/1407492861566783489
reddit: https://www.reddit.com/r/liftosaur/comments/o614tg/how_i_moved_liftosaur_from_cloudflare_workers_to/
---

<div><img src="../../images/how-i-moved-liftosaur-from-cloudflare-workers-to-lambda-intro.png" width="100%" alt="From Cloudflare Workers to AWS Lambda" /></div>

**TLDR; - I moved Liftosaur from Cloudflare Workers to AWS Lambda + Dynamo. It wasn't easy, especially it was bad because of poor local development environment. I built a skeleton to simplify that process for other folks who'd need to start a project in AWS - [https://github.com/astashov/aws-cdk-lambda-typescript-starter](https://github.com/astashov/aws-cdk-lambda-typescript-starter).**

## Everything started with Cloudflare Workers

When I initially was choosing a hosting for server-side part of Liftosaur, I decided to go with Cloudflare
Workers. I liked the idea - you write a service worker, and then run it in a cloud. And there was a bunch of
other benefits too:

- There's a KV (key-value) store as a database, which should be good enough for start
- It integrates well with Cloudflare CDN
- It has a way to store secrets (like API tokens, keys, etc)
- There's a local dev server, that emulates the production environment
- And it's **\$5 per month** flat, which seems quite affordable
- Built-in cache mechanisms, which you can access via Service Worker's Cache API
- Separate production and development environments

But once I began to use Cloudflare Workers for realz, and deploy stuff into production, I quickly started to hit roadblocks:

- That KV store is very limiting. It is what it is - a key-value store. So, no secondary indexes, no range queries. No easy way to even get all records in a collection - you can get collect all the keys, and then fetch values by each key one by one, but that's very slow.
- Because there're no secondary indexes, you have to create separate collections in KV store that works as indexes, and manually maintain the consistency between those manual indexes and the source of truth. It quickly becomes very complicated and hard to maintain.
- There're no good ways to do backups for the KV store. I tried to create a cron task in Cloudflare Dashboard, that'd call a specific endpoint each day, which would try to fetch all the records from the KV stores and save them on S3, but that quickly became incredibly slow.
- Since the app is essentially a Service Worker running in a cloud, you cannot use any Node libraries. That was a big blocker. For example, I needed to create dynamically generated images with workout results when you share your workout in social media. I couldn't find a non-Node image manipulation library for that. I eventually created an AWS Lambda that does just that, using a Node library `jimp`, then exposed it via public REST API, and called that API from a Cloudflare Worker.
- There's a limit of 1MB for the script you can run in a Cloudflare Worker. There's a built-in CLI, that bundles all your code with dependencies into one bundle and uploads it to the Cloudflare Worker. At the time when I migrated to AWS, my Cloudflare Workers bundle was 900kb, and it was starting to concern me - I could hit the limit very soon.
- Local dev server is pretty nice, but it crashes **constantly**! You have to restart it all the time. It's pretty annoying.
- You have almost no monitoring, and logging is weird - you can only tail logs, but cannot really access old logs. That makes debugging pretty challenging.
- It enforces Webpack for bundling, it uses it internally. It's maybe not a big deal, but I wanted to switch to `esbuild` to make my builds faster, and couldn't do it for the server code.

Eventually, all that became unbearable. I was planning a big new feature (add Friends, Likes and Comments), and building all of that on such limited KV store was pretty difficult. Also, backups worked poorly, and that was super concerning - I definitely didn't want to lose users' data and not be able to restore.

## Moving to AWS

I began to think where I could migrate Liftosaur to, and still pay no more than \$5 a month. Would be nice to have a richer set of features, and especially decent database, backups, logging and monitoring. I already had some parts in AWS (e.g. lambdas for the image generators for social media), so decided to check if AWS would address some of the aforementioned issues.

To stay under \$5 a month, in AWS I had to use on-demand payment policies, since Liftosaur traffic is pretty small. Any relational database costs way more than that, but e.g. document database DynamoDB could be within that price range. Moreover, it supports queries, secondary indexes, backups each second (sic!), there's built-in monitoring and logging. To run the server code, EC2 instances were a bit too expensive, but on-demand Lambdas are pretty cheap. Another benefit is that they're pretty similar to Cloudflare Workers (except they're regular Node apps, not Service Workers apps) - you don't have to manage the actual instances. Also, they come with logging/monitoring via Cloudwatch out-of-the-box.

AWS Lambdas has a concept of layers (something similar to Docker ones, I guess?), so you can move all the `node_modules` into a layer, and the actual size of your server code would be significantly smaller. And for caches, I could just use S3 for now.

So the setup I ended up with is something like this:

- Still use Netlify for serving statics (CSS and JS bundles). Though that's probably me being lazy, there's nothing preventing me to just move it to S3.
- All API is moved to AWS Lambda, and all data is stored in AWS Dynamo, and various caches are in S3

I use [AWS CDK](https://aws.amazon.com/cdk/) to describe all the infrastructure I have in AWS. That was the first time I learned about CDK, and wow, it's really amazing! It is somewhat similar to old AWS Cloudformation. But if you ever tried to write Cloudformation YAML files, you're unlikely had very good time. Likely, it was very BAD time. Those are multi kloc YAML files, that are very verbose and very hard to write. It becomes even worse when you have to describe business logic in those YAML files, so you write variables and if/else branches in YAML - it's just as bad as it sounds.

That new CDK tool still generates those YAML files, but allows you to describe the infrastructure in TypeScript instead. So, you'll get autocompletion, typechecking, easier API discovery and all the good stuff that a typesystem gives us. Also, using an actual programming language for describing business logic is way nicer. I highly recommend to give it a try, there's a [pretty cool workshop](https://cdkworkshop.com/) to get some taste of it.

One thing that Lambdas do poorly though is a **local development environment**. There's a product in AWS called SAM (Serverless Application Model). It has CLI to run the lambdas locally, `sam local start-api`. So, you can generate a Cloudformation YAML from the CDK file. Then, that command - `sam local start-api` - will read the YAML file, and based on it will start a local server, that will run your Lambdas in a container. You'll be able to make API calls to it, and it will execute them inside a container.

The biggest caveat is that the SAM local dev server is slow. No, this is not enough. It's _SLOOOOOOOOWWWWW_. It seems like it restarts a container on every request, and then does I-dont-know-what, but for any call that really should be like 300ms, you end up with 10 seconds request time.

Also, there're other issues - e.g. you cannot use "nameless" Dynamo tables, because if you omit the Dynamo table name in the CDK template, then the local lambda and the lambda in AWS assume different names for some reason. Also, by some reason the binary outputs don't work (e.g. if I want to return `image/png` from a lambda call). It ignores `isBase64Encoded` flag by some reason, and local lambda just returns Base64 output, instead of binary.

Luckily, you don't really need to run everything locally via `sam local start-api`. Lambdas have their own format of requests and responses, but it's pretty easy to simulate it and just convert e.g. regular requests/responses of built-in Node `http` module into Lambdas' specific ones. That's what I did - wrote a simple Node server and that request/response transformer, and it works perfectly - it's fast, it reloads on any code changes. And it's very simple, so easy to add or modify it if necessary. And it solves the SAM local lambda's issues, like unability to use nameless DynamoDB tables, or returning binary responses.

I created 2 environments via CDK - prod and dev, each with their own lambda, dynamo tables, S3 buckets, etc. Dev environment also has its own subdomain. When you run the server locally, it connects to the dynamo tables/S3 buckets from Dev environment, so when developing locally you interact with those, and don't mess with production databases.

Another nice thing that I'm paying only **~\$2.5/month** for all of this now, so seems like a pretty good deal.

## Starter skeleton for TypeScript/React projects on AWS Lambda

Migration to AWS wasn't that easy. I had some experience in AWS before, but mostly around EC2s, not Lambdas. It took me a while to figure out how to properly setup the infrastructure, how to describe it all in CDK, how to make it as cheap as possible for a low-traffic site like Liftosaur, how to set up local development environment properly, and multi-environment development in general.

To help other folks with that, and provide some template for cheap hosting on AWS Lambdas, I created a starter skeleton for the TypeScript/React projects on AWS Lambda and Dynamo. Here it is:

[https://github.com/astashov/aws-cdk-lambda-typescript-starter](https://github.com/astashov/aws-cdk-lambda-typescript-starter)

There, you can find:

- Minimal CDK template for the AWS infrastructure, optimized for simplest and cheapest (but still very performant) setup for low traffic websites.
- Fast and reliable local development environment - a server that restarts automatically and instantly on code changes. It regular Node's built-in `http` server for handling requests, and uses `esbuild` to blazingly fast compile/recompile the project - in less than a second.
- When you run the CDK script, it also deploys the app itself, and uploads CSS/JS bundles to S3 and CDN.
- It's a skeleton for NodeJS + TypeScript + React + server-side rendering support (SSR)
- Has multiple environments - so you can test the changes in development environment first, before deploying it fully to production. Development and production have separate S3 buckets, lambdas, databases, a separate domain, etc.
- Super easy to attach a public domain purchased via AWS Route53
- Super easy to attach a certificate created via AWS Certificate Manager.
- Serve the CSS, JS bundles and HTML from the same domain, to not worry about cross-domain issues. But still serve CSS and JS from CDN, to not sacrifice app performance.

IMHO it's pretty convenient for various small-traffic websites, pet projects, etc - you can start from it, and modify the CDK template if necessary to add more services if necessary (like email services, queues, etc).

So, try it out, hopefully you'll find it useful!
